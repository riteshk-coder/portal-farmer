from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.user import User, RoleType, Buyer, Fpo
from app.models.dispute import Dispute, DisputeType, DisputeStatus, DisputeMessage
from app.models.lot import Lot, LotMatch
from app.models.contract import Contract
from app.schemas.disputes import DisputeCreate, DisputeResponse, DisputeMessageCreate, DisputeStatusUpdate
from datetime import datetime
import random

router = APIRouter(prefix="/disputes", tags=["disputes"])

def dispute_to_dict(d: Dispute) -> dict:
    return {
        "id": d.id,
        "type": d.type.value if hasattr(d.type, "value") else d.type,
        "lotId": d.lot_id,
        "buyerName": d.buyer.name if d.buyer else "Buyer Partner",
        "fpoName": d.fpo.name if d.fpo else "FPO Partner",
        "description": d.description,
        "status": d.status.value if hasattr(d.status, "value") else d.status,
        "filedAt": d.filed_at.strftime("%Y-%m-%dT%H:%M:%SZ") if d.filed_at else "",
        "creatorRole": d.creator_role,
        "attachmentUrl": d.attachment_url,
        "messages": [
            {
                "id": m.id,
                "senderName": m.sender.name if m.sender else "System",
                "senderRole": m.sender_role,
                "message": m.message,
                "attachmentUrl": m.attachment_url,
                "createdAt": m.created_at.strftime("%Y-%m-%dT%H:%M:%SZ") if m.created_at else ""
            }
            for m in d.messages
        ]
    }

@router.get("", response_model=List[DisputeResponse])
def get_disputes(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Dispute)
    if current_user.role_type == RoleType.fpo:
        query = query.filter(Dispute.fpo_id == current_user.fpo_id)
    elif current_user.role_type == RoleType.buyer:
        query = query.filter(Dispute.buyer_id == current_user.buyer_id)
    disputes = query.limit(limit).offset(offset).all()
    return [dispute_to_dict(d) for d in disputes]

@router.post("", response_model=DisputeResponse)
def file_dispute(body: DisputeCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lot = db.query(Lot).filter(Lot.id == body.lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")
        
    while True:
        dispute_id = f"DSP-{random.randint(100, 9999):04d}"
        exists = db.query(Dispute).filter(Dispute.id == dispute_id).first()
        if not exists:
            break
        
    # Resolve creator role, buyer_id and fpo_id dynamically
    if current_user.role_type == RoleType.fpo:
        creator_role = "fpo"
        fpo_id = current_user.fpo_id
        
        # Lookup buyer ID from contract or match
        contract = db.query(Contract).filter(Contract.lot_id == body.lot_id).first()
        if contract:
            buyer_id = contract.buyer_id
        else:
            match = db.query(LotMatch).filter(LotMatch.lot_id == body.lot_id).first()
            buyer_id = match.buyer_id if match else 1
    else:
        # Default to buyer role (e.g. buyer or admin)
        creator_role = "buyer"
        buyer_id = current_user.buyer_id if current_user.buyer_id else 1
        fpo_id = lot.fpo_id

    new_dispute = Dispute(
        id=dispute_id,
        type=DisputeType.quality_mismatch if "Quality" in body.type else DisputeType.payment_delay,
        lot_id=body.lot_id,
        buyer_id=buyer_id,
        fpo_id=fpo_id,
        description=body.description,
        status=DisputeStatus.open,
        creator_role=creator_role,
        attachment_url=body.attachment_url
    )
    db.add(new_dispute)
    db.flush()

    # Save initial complaint description as first message in thread
    first_msg = DisputeMessage(
        dispute_id=new_dispute.id,
        sender_id=current_user.id,
        sender_role=current_user.role_type.value,
        message=body.description,
        attachment_url=body.attachment_url
    )
    db.add(first_msg)
    db.commit()
    db.refresh(new_dispute)

    # Log notifications
    from app.services.notification_service import log_notification, NotificationChannel
    fpo_name = lot.fpo.name if lot.fpo else "FPO"
    buyer_name = current_user.name
    if current_user.buyer_id:
        buyer_rec = db.query(Buyer).filter(Buyer.id == current_user.buyer_id).first()
        if buyer_rec:
            buyer_name = buyer_rec.name
    elif creator_role == "fpo" and buyer_id:
        buyer_rec = db.query(Buyer).filter(Buyer.id == buyer_id).first()
        if buyer_rec:
            buyer_name = buyer_rec.name

    dispute_type_str = "Quality Mismatch" if new_dispute.type == DisputeType.quality_mismatch else "Payment Delay"
    
    # Notify FPO
    fpo_complaint_msg = f"A complaint has been filed regarding lot {new_dispute.lot_id} — {new_dispute.id} ({dispute_type_str}). Please respond."
    log_notification(db, NotificationChannel.email, fpo_name, fpo_complaint_msg, recipient_role="fpo", event_type="complaint_received")
    log_notification(db, NotificationChannel.system, fpo_name, fpo_complaint_msg, recipient_role="fpo", event_type="complaint_received")
    
    # Notify Admin
    admin_complaint_msg = f"New complaint filed — {new_dispute.id}, Type: {dispute_type_str}, Lot {new_dispute.lot_id}. Filed by {current_user.name}."
    log_notification(db, NotificationChannel.system, "MahaFPC", admin_complaint_msg, recipient_role="mahafpc", event_type="complaint_raised")
    
    # Notify Buyer
    buyer_complaint_msg = f"Complaint {new_dispute.id} on {new_dispute.lot_id} has been opened."
    log_notification(db, NotificationChannel.email, buyer_name, buyer_complaint_msg, recipient_role="buyer", event_type="complaint_status_updated")
    log_notification(db, NotificationChannel.system, buyer_name, buyer_complaint_msg, recipient_role="buyer", event_type="complaint_status_updated")

    return dispute_to_dict(new_dispute)

@router.post("/{dispute_id}/messages", response_model=DisputeResponse)
def add_dispute_message(
    dispute_id: str,
    body: DisputeMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dispute = db.query(Dispute).filter(Dispute.id == dispute_id).first()
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")
        
    # Check access permission
    if current_user.role_type == RoleType.buyer:
        if dispute.buyer_id != current_user.buyer_id:
            raise HTTPException(status_code=403, detail="Not authorized to participate in this dispute.")
    elif current_user.role_type == RoleType.fpo:
        if dispute.fpo_id != current_user.fpo_id:
            raise HTTPException(status_code=403, detail="Not authorized to participate in this dispute.")
            
    new_msg = DisputeMessage(
        dispute_id=dispute_id,
        sender_id=current_user.id,
        sender_role=current_user.role_type.value,
        message=body.message,
        attachment_url=body.attachment_url
    )
    db.add(new_msg)
    db.commit()
    db.refresh(dispute)
    
    # Log notifications
    from app.services.notification_service import log_notification, NotificationChannel
    buyer_name = dispute.buyer.name if dispute.buyer else "Buyer"
    fpo_name = dispute.fpo.name if dispute.fpo else "FPO"
    
    msg_desc = f"New message in dispute {dispute.id} on lot {dispute.lot_id} from {current_user.name}."
    
    if current_user.role_type == RoleType.buyer:
        log_notification(db, NotificationChannel.system, fpo_name, msg_desc, recipient_role="fpo", event_type="dispute_message_received")
        log_notification(db, NotificationChannel.system, "MahaFPC", msg_desc, recipient_role="mahafpc", event_type="dispute_message_received")
    elif current_user.role_type == RoleType.fpo:
        log_notification(db, NotificationChannel.system, buyer_name, msg_desc, recipient_role="buyer", event_type="dispute_message_received")
        log_notification(db, NotificationChannel.system, "MahaFPC", msg_desc, recipient_role="mahafpc", event_type="dispute_message_received")
    else:
        log_notification(db, NotificationChannel.system, buyer_name, msg_desc, recipient_role="buyer", event_type="dispute_message_received")
        log_notification(db, NotificationChannel.system, fpo_name, msg_desc, recipient_role="fpo", event_type="dispute_message_received")
        
    return dispute_to_dict(dispute)

@router.post("/{dispute_id}/status", response_model=DisputeResponse)
def update_dispute_status(
    dispute_id: str,
    body: DisputeStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("mahafpc"))
):
    try:
        d = db.query(Dispute).filter(Dispute.id == dispute_id).with_for_update().first()
        if not d:
            raise HTTPException(status_code=404, detail="Dispute not found")
            
        old_status = d.status
        new_status = body.status.strip()
        
        d.status = DisputeStatus(new_status)
        
        # Apply reliability score adjustments
        if new_status == "Resolved" and old_status != "Resolved":
            if d.creator_role == "buyer":
                if d.fpo:
                    from app.services.scoring_service import recalculate_fpo_score
                    recalculate_fpo_score(d.fpo, db, "dispute_lost")
            else:
                if d.buyer:
                    from app.services.scoring_service import recalculate_buyer_score
                    recalculate_buyer_score(d.buyer, db, "dispute_lost")
        elif new_status == "Rejected" and old_status != "Rejected":
            if d.creator_role == "buyer":
                if d.buyer:
                    from app.services.scoring_service import recalculate_buyer_score
                    recalculate_buyer_score(d.buyer, db, "dispute_lost")
            else:
                if d.fpo:
                    from app.services.scoring_service import recalculate_fpo_score
                    recalculate_fpo_score(d.fpo, db, "dispute_lost")
                    
        d.updated_by = current_user.id
        d.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(d)
        
        # Log notifications
        from app.services.notification_service import log_notification, NotificationChannel
        fpo_name = d.fpo.name if d.fpo else "FPO"
        buyer_name = d.buyer.name if d.buyer else "Buyer"
        
        admin_msg = f"Dispute {d.id} status updated to: {new_status}."
        log_notification(db, NotificationChannel.system, "MahaFPC", admin_msg, recipient_role="mahafpc", event_type="dispute_status_changed")
        
        buyer_msg = f"Dispute {d.id} status changed to: {new_status}."
        log_notification(db, NotificationChannel.system, buyer_name, buyer_msg, recipient_role="buyer", event_type="dispute_status_changed")
        
        fpo_msg = f"Dispute {d.id} status changed to: {new_status}."
        log_notification(db, NotificationChannel.system, fpo_name, fpo_msg, recipient_role="fpo", event_type="dispute_status_changed")
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Transaction failed: {str(e)}")
        
    return dispute_to_dict(d)

@router.post("/{dispute_id}/resolve")
def resolve_dispute(
    dispute_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("mahafpc"))
):
    return update_dispute_status(dispute_id, DisputeStatusUpdate(status="Resolved"), db, current_user)
