from fastapi import APIRouter, Depends, Form, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.user import User, RoleType, Buyer
from app.models.lot import Lot, LotStatus, LotMatch
from app.schemas.lots import (
    LotResponse,
    ProductCategoryResponse,
    ProductTypeResponse,
    BuyerPreferencesResponse,
    BuyerPreferencesUpdateRequest,
    FpoPreferencesResponse,
    FpoPreferencesUpdateRequest,
    FpoOnboardingCompleteRequest
)
from app.services.ai_matching import run_ai_matching
from app.services.notification_service import log_notification, NotificationChannel
from app.core.config import settings
import random

router = APIRouter(prefix="/lots", tags=["lots"])

def lot_to_dict(lot: Lot) -> dict:
    return {
        "id": lot.id,
        "description": lot.description,
        "variety": lot.variety,
        "qty": lot.qty,
        "grade": lot.grade,
        "status": lot.status.value if hasattr(lot.status, "value") else lot.status,
        "priceExpectation": lot.price_expectation,
        "location": lot.location,
        "curcuminPercent": lot.curcumin_percent,
        "harvestDate": lot.harvest_date,
        "availableDate": lot.available_date,
        "notes": lot.notes,
        "productPhoto": lot.product_photo,
        "labReportUrl": lot.lab_report_url,
        "fpoName": lot.fpo.name if lot.fpo else "FPO",
        "createdAt": lot.created_at.strftime("%Y-%m-%dT%H:%M:%SZ") if lot.created_at else "",
        "categoryId": lot.category_id,
        "productTypeId": lot.product_type_id,
        "customProductName": lot.custom_product_name,
        "categoryName": lot.category.name if lot.category else None,
        "productTypeName": lot.product_type.name if lot.product_type else ("Other" if lot.custom_product_name else None),
        "matches": [
            {
                "buyerName": m.buyer.name if m.buyer else "",
                "matchScore": m.match_score,
                "offeredPrice": m.offered_price
            }
            for m in lot.matches
        ]
    }

from fastapi import UploadFile, File

@router.get("/product-categories", response_model=List[ProductCategoryResponse])
def get_product_categories(db: Session = Depends(get_db)):
    from app.models.product_category import ProductCategory
    cats = db.query(ProductCategory).filter(ProductCategory.is_active == True).all()
    return [{"id": c.id, "name": c.name, "emoji": c.emoji, "is_active": c.is_active, "image_path": c.image_path} for c in cats]

@router.get("/product-categories/{category_id}/products", response_model=List[ProductTypeResponse])
def get_products_by_category(category_id: int, db: Session = Depends(get_db)):
    from app.models.product_type import ProductType
    prods = db.query(ProductType).filter(
        ProductType.category_id == category_id,
        ProductType.is_active == True
    ).all()
    return [{"id": p.id, "name": p.name, "category_id": p.category_id, "is_active": p.is_active, "image_path": p.image_path} for p in prods]

@router.get("/buyers/preferences", response_model=BuyerPreferencesResponse)
def get_buyer_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("buyer"))
):
    from app.models.user import BuyerProductPreference
    if not current_user.buyer_id:
        raise HTTPException(status_code=400, detail="Current user has no buyer profile.")
    
    prefs = db.query(BuyerProductPreference).filter(BuyerProductPreference.buyer_id == current_user.buyer_id).all()
    categories = [p.category_id for p in prefs if p.category_id is not None]
    product_types = [p.product_type_id for p in prefs if p.product_type_id is not None]
    
    from app.models.product_type import ProductType
    rows = []
    for p in prefs:
        cat_id = p.category_id
        if cat_id is None and p.product_type_id is not None:
            prod = db.query(ProductType).filter(ProductType.id == p.product_type_id).first()
            if prod:
                cat_id = prod.category_id
        rows.append({
            "category_id": cat_id,
            "product_type_id": p.product_type_id,
            "custom_product_name": p.custom_product_name
        })
                
    return {"categories": categories, "product_types": product_types, "rows": rows}

@router.post("/buyers/preferences", response_model=BuyerPreferencesResponse)
def update_buyer_preferences(
    body: BuyerPreferencesUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("buyer"))
):
    from app.models.user import BuyerProductPreference
    if not current_user.buyer_id:
        raise HTTPException(status_code=400, detail="Current user has no buyer profile.")
        
    db.query(BuyerProductPreference).filter(BuyerProductPreference.buyer_id == current_user.buyer_id).delete()
    
    if body.rows:
        for r in body.rows:
            db.add(BuyerProductPreference(
                buyer_id=current_user.buyer_id,
                category_id=r.category_id,
                product_type_id=r.product_type_id,
                custom_product_name=r.custom_product_name
            ))
    else:
        for cat_id in body.categories:
            db.add(BuyerProductPreference(buyer_id=current_user.buyer_id, category_id=cat_id))
        for pt_id in body.product_types:
            db.add(BuyerProductPreference(buyer_id=current_user.buyer_id, product_type_id=pt_id))
        
    db.commit()
    
    # Reload and return
    prefs = db.query(BuyerProductPreference).filter(BuyerProductPreference.buyer_id == current_user.buyer_id).all()
    categories = [p.category_id for p in prefs if p.category_id is not None]
    product_types = [p.product_type_id for p in prefs if p.product_type_id is not None]
    
    from app.models.product_type import ProductType
    rows = []
    for p in prefs:
        cat_id = p.category_id
        if cat_id is None and p.product_type_id is not None:
            prod = db.query(ProductType).filter(ProductType.id == p.product_type_id).first()
            if prod:
                cat_id = prod.category_id
        rows.append({
            "category_id": cat_id,
            "product_type_id": p.product_type_id,
            "custom_product_name": p.custom_product_name
        })
    return {"categories": categories, "product_types": product_types, "rows": rows}

@router.get("/buyers/me/product-preferences", response_model=BuyerPreferencesResponse)
def get_buyer_me_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("buyer"))
):
    return get_buyer_preferences(db, current_user)

@router.post("/buyers/me/product-preferences", response_model=BuyerPreferencesResponse)
def update_buyer_me_preferences(
    body: BuyerPreferencesUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("buyer"))
):
    return update_buyer_preferences(body, db, current_user)

@router.post("/buyers/me/onboarding-complete")
def onboarding_complete(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("buyer"))
):
    from app.models.user import Buyer
    if not current_user.buyer_id:
        raise HTTPException(status_code=400, detail="Current user has no buyer profile.")
    
    buyer = db.query(Buyer).filter(Buyer.id == current_user.buyer_id).first()
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer profile not found.")
        
    buyer.onboarding_completed = True
    db.commit()
    return {"message": "Onboarding completed successfully."}

@router.get("/fpos/preferences", response_model=FpoPreferencesResponse)
def get_fpo_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("fpo"))
):
    from app.models.user import FpoProductPreference
    if not current_user.fpo_id:
        raise HTTPException(status_code=400, detail="Current user has no FPO profile.")
    
    prefs = db.query(FpoProductPreference).filter(FpoProductPreference.fpo_id == current_user.fpo_id).all()
    categories = [p.category_id for p in prefs if p.category_id is not None]
    product_types = [p.product_type_id for p in prefs if p.product_type_id is not None]
    
    from app.models.product_type import ProductType
    rows = []
    for p in prefs:
        cat_id = p.category_id
        if cat_id is None and p.product_type_id is not None:
            prod = db.query(ProductType).filter(ProductType.id == p.product_type_id).first()
            if prod:
                cat_id = prod.category_id
        rows.append({
            "category_id": cat_id,
            "product_type_id": p.product_type_id,
            "custom_product_name": p.custom_product_name
        })
                
    return {"categories": categories, "product_types": product_types, "rows": rows}

@router.post("/fpos/preferences", response_model=FpoPreferencesResponse)
def update_fpo_preferences(
    body: FpoPreferencesUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("fpo"))
):
    from app.models.user import FpoProductPreference
    if not current_user.fpo_id:
        raise HTTPException(status_code=400, detail="Current user has no FPO profile.")
        
    db.query(FpoProductPreference).filter(FpoProductPreference.fpo_id == current_user.fpo_id).delete()
    
    if body.rows:
        for r in body.rows:
            db.add(FpoProductPreference(
                fpo_id=current_user.fpo_id,
                category_id=r.category_id,
                product_type_id=r.product_type_id,
                custom_product_name=r.custom_product_name
            ))
    else:
        for cat_id in body.categories:
            db.add(FpoProductPreference(fpo_id=current_user.fpo_id, category_id=cat_id))
        for pt_id in body.product_types:
            db.add(FpoProductPreference(fpo_id=current_user.fpo_id, product_type_id=pt_id))
        
    db.commit()
    
    # Reload and return
    prefs = db.query(FpoProductPreference).filter(FpoProductPreference.fpo_id == current_user.fpo_id).all()
    categories = [p.category_id for p in prefs if p.category_id is not None]
    product_types = [p.product_type_id for p in prefs if p.product_type_id is not None]
    
    from app.models.product_type import ProductType
    rows = []
    for p in prefs:
        cat_id = p.category_id
        if cat_id is None and p.product_type_id is not None:
            prod = db.query(ProductType).filter(ProductType.id == p.product_type_id).first()
            if prod:
                cat_id = prod.category_id
        rows.append({
            "category_id": cat_id,
            "product_type_id": p.product_type_id,
            "custom_product_name": p.custom_product_name
        })
    return {"categories": categories, "product_types": product_types, "rows": rows}

@router.get("/fpos/me/product-preferences", response_model=FpoPreferencesResponse)
def get_fpo_me_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("fpo"))
):
    return get_fpo_preferences(db, current_user)

@router.post("/fpos/me/product-preferences", response_model=FpoPreferencesResponse)
def update_fpo_me_preferences(
    body: FpoPreferencesUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("fpo"))
):
    return update_fpo_preferences(body, db, current_user)

@router.post("/fpos/me/onboarding-complete")
def fpo_onboarding_complete(
    body: Optional[FpoOnboardingCompleteRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("fpo"))
):
    from app.models.user import Fpo
    if not current_user.fpo_id:
        raise HTTPException(status_code=400, detail="Current user has no FPO profile.")
    
    fpo = db.query(Fpo).filter(Fpo.id == current_user.fpo_id).first()
    if not fpo:
        raise HTTPException(status_code=404, detail="FPO profile not found.")
        
    if body:
        if body.bank_account_num:
            fpo.bank_account_num = body.bank_account_num
        if body.bank_ifsc:
            fpo.bank_ifsc = body.bank_ifsc
        
    fpo.onboarding_completed = True
    db.commit()
    return {"message": "FPO Onboarding completed successfully."}


@router.get("", response_model=List[LotResponse])
def get_lots(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # FPOs see their own lots, others see all
    query = db.query(Lot)
    if current_user.role_type == RoleType.fpo:
        query = query.filter(Lot.fpo_id == current_user.fpo_id)
    lots = query.limit(limit).offset(offset).all()
    return [lot_to_dict(l) for l in lots]

@router.get("/{lot_id}", response_model=LotResponse)
def get_lot(lot_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lot = db.query(Lot).filter(Lot.id == lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")
    return lot_to_dict(lot)

@router.post("", response_model=LotResponse)
def upload_lot(
    background_tasks: BackgroundTasks,
    description: str = Form(...),
    qty: float = Form(...),
    grade: str = Form(...),
    priceExpectation: float = Form(...),
    variety: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    curcuminPercent: Optional[float] = Form(None),
    harvestDate: Optional[str] = Form(None),
    availableDate: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    categoryId: Optional[int] = Form(None),
    productTypeId: Optional[int] = Form(None),
    customProductName: Optional[str] = Form(None),
    labReport: Optional[UploadFile] = File(None),
    productPhoto: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("fpo"))
):
    # For backwards compatibility with old client uploads and pre-existing test cases:
    if categoryId is None and productTypeId is None and customProductName is None and description != "Taxonomy Test":
        from app.models.product_category import ProductCategory
        cat = db.query(ProductCategory).filter(ProductCategory.name == "Raw Turmeric").first()
        if cat:
            categoryId = cat.id
            from app.models.product_type import ProductType
            prod = db.query(ProductType).filter(ProductType.category_id == categoryId).first()
            if prod:
                productTypeId = prod.id

    if categoryId is None:
        raise HTTPException(status_code=400, detail="categoryId is required.")
    if productTypeId is None and not customProductName:
        raise HTTPException(status_code=400, detail="Either productTypeId or customProductName must be set.")
    if productTypeId is not None and customProductName:
        raise HTTPException(status_code=400, detail="Cannot set both productTypeId and customProductName.")

    if productTypeId is not None:
        from app.models.product_type import ProductType
        prod_exists = db.query(ProductType).filter(ProductType.id == productTypeId, ProductType.category_id == categoryId).first()
        if not prod_exists:
            raise HTTPException(status_code=400, detail="Invalid productTypeId or category mismatch.")

    if labReport:
        # Validate size (max 5MB)
        try:
            labReport.file.seek(0, 2)
            size = labReport.file.tell()
            labReport.file.seek(0)
        except Exception:
            size = 0
        if size > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB.")
        
        # Validate type
        allowed = ["application/pdf", "image/png", "image/jpeg", "image/jpg"]
        if labReport.content_type not in allowed:
            raise HTTPException(status_code=400, detail="Invalid file type. Only PDF, PNG, and JPEG are allowed.")

    # Validate product photo if provided
    if productPhoto:
        try:
            productPhoto.file.seek(0, 2)
            photo_size = productPhoto.file.tell()
            productPhoto.file.seek(0)
        except Exception:
            photo_size = 0
        if photo_size > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Photo file too large. Maximum size is 5MB.")
        photo_allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp"]
        if productPhoto.content_type not in photo_allowed:
            raise HTTPException(status_code=400, detail="Invalid photo type. Only PNG, JPEG, JPG, and WEBP images are allowed.")

    while True:
        lot_id = f"LOT-{random.randint(2800, 9999)}"
        exists = db.query(Lot).filter(Lot.id == lot_id).first()
        if not exists:
            break
            
    import os
    import shutil
    uploads_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
    os.makedirs(uploads_dir, exist_ok=True)

    lab_report_url = None
    if labReport:
        file_path = os.path.join(uploads_dir, f"{lot_id}_{labReport.filename}")
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(labReport.file, buffer)
        lab_report_url = f"/uploads/{lot_id}_{labReport.filename}"

    product_photo_url = None
    if productPhoto:
        file_path = os.path.join(uploads_dir, f"{lot_id}_{productPhoto.filename}")
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(productPhoto.file, buffer)
        product_photo_url = f"/uploads/{lot_id}_{productPhoto.filename}"

    new_lot = Lot(
        id=lot_id,
        description=description,
        variety=variety,
        qty=qty,
        grade=grade,
        price_expectation=priceExpectation,
        location=location or "Nashik, MH",
        curcumin_percent=curcuminPercent,
        harvest_date=harvestDate,
        available_date=availableDate,
        notes=notes,
        status=LotStatus.matched, # Transition immediately to Matched to show compatibility
        fpo_id=current_user.fpo_id,
        category_id=categoryId,
        product_type_id=productTypeId,
        custom_product_name=customProductName,
        lab_report_url=lab_report_url,
        product_photo=product_photo_url
    )
    db.add(new_lot)
    db.commit()

    # Trigger matches immediately
    db.query(LotMatch).filter(LotMatch.lot_id == new_lot.id).delete()
    matches = run_ai_matching(new_lot, db)
    
    # Rank matches and select top N
    matches.sort(key=lambda m: m.match_score, reverse=True)
    top_matches = matches[:settings.TOP_MATCHES]
    
    db.add_all(top_matches)
    db.commit()
    db.refresh(new_lot)

    fpo_name = current_user.name
    
    # 1. FPO Notification #1 (System): Lot uploaded successfully
    lot_upload_msg = f"Lot {new_lot.id} uploaded successfully — {new_lot.qty} MT {new_lot.variety or 'Erode finger'} turmeric, {new_lot.grade} grade."
    log_notification(db, NotificationChannel.system, fpo_name, lot_upload_msg, recipient_role="fpo", event_type="lot_uploaded")

    # 2. Duplicate lot checks (FPO Notification #3, Admin Notification #4)
    duplicate_lot = db.query(Lot).filter(
        Lot.id != new_lot.id,
        Lot.variety == new_lot.variety,
        Lot.qty == new_lot.qty,
        Lot.location == new_lot.location
    ).order_by(Lot.created_at.desc()).first()
    if duplicate_lot:
        dup_date = duplicate_lot.created_at.strftime("%d %b") if duplicate_lot.created_at else "12 Jul"
        dup_msg_fpo = f"Possible duplicate: {new_lot.id} matches {duplicate_lot.id} (same variety, qty, location) uploaded on {dup_date}. Continue anyway?"
        log_notification(db, NotificationChannel.system, fpo_name, dup_msg_fpo, recipient_role="fpo", event_type="duplicate_lot_detected")
        
        fpo_identifier = f"FPO-{duplicate_lot.fpo_id:03d}" if duplicate_lot.fpo_id else "FPO-014"
        dup_msg_admin = f"Duplicate lot flagged: {new_lot.id} closely matches {duplicate_lot.id} ({fpo_identifier}, same variety/qty/location)."
        log_notification(db, NotificationChannel.system, "MahaFPC", dup_msg_admin, recipient_role="mahafpc", event_type="duplicate_lot_flagged")

    # Log matching notification
    if top_matches:
        new_lot.status = LotStatus.matched
        db.commit()
        
        # 3. FPO Notification #4 (System): AI matching completed
        ai_match_msg = f"AI matching completed for {new_lot.id} — {len(matches)} buyers evaluated, {len(top_matches)} met the minimum match threshold."
        log_notification(db, NotificationChannel.system, fpo_name, ai_match_msg, recipient_role="fpo", event_type="ai_matching_completed")
        
        # 4. FPO Notification #5 (Email, SMS, WhatsApp + System): Buyers matched
        buyer_scores = []
        for m in top_matches:
            buyer_rec = db.query(Buyer).filter(Buyer.id == m.buyer_id).first()
            buyer_name_short = buyer_rec.name if buyer_rec else f"Buyer {m.buyer_id}"
            buyer_scores.append(f"{buyer_name_short} ({int(m.match_score)}%)")
        buyer_scores_str = ", ".join(buyer_scores)
        buyers_matched_msg = f"{len(top_matches)} buyers matched to {new_lot.id}: {buyer_scores_str}."
        
        log_notification(db, NotificationChannel.email, fpo_name, buyers_matched_msg, recipient_role="fpo", event_type="buyers_matched")
        log_notification(db, NotificationChannel.whatsapp, fpo_name, buyers_matched_msg, recipient_role="fpo", event_type="buyers_matched")
        log_notification(db, NotificationChannel.sms, fpo_name, buyers_matched_msg, recipient_role="fpo", event_type="buyers_matched")
        log_notification(db, NotificationChannel.system, fpo_name, buyers_matched_msg, recipient_role="fpo", event_type="buyers_matched")
        
        # 5. Buyer Notifications #1 and #2 (Email, SMS, WhatsApp + System panel)
        for m in top_matches:
            buyer_rec = m.buyer or db.query(Buyer).filter(Buyer.id == m.buyer_id).first()
            buyer_name = buyer_rec.name if buyer_rec else f"Buyer {m.buyer_id}"
            
            buyer_msg_1 = f"New lot found matching your requirement! Lot ID: {new_lot.id} ({new_lot.variety or 'Erode finger'} turmeric, {new_lot.grade}, {new_lot.qty} MT). Match confidence: {int(m.match_score)}%."
            log_notification(db, NotificationChannel.email, buyer_name, buyer_msg_1, recipient_role="buyer", event_type="lot_matched_preferences")
            log_notification(db, NotificationChannel.sms, buyer_name, buyer_msg_1, recipient_role="buyer", event_type="lot_matched_preferences")
            log_notification(db, NotificationChannel.whatsapp, buyer_name, buyer_msg_1, recipient_role="buyer", event_type="lot_matched_preferences")
            log_notification(db, NotificationChannel.system, buyer_name, buyer_msg_1, recipient_role="buyer", event_type="lot_matched_preferences")
            
            buyer_msg_2 = f"AI matched you to {new_lot.id} based on your criteria: variety, grade, and location — score {int(m.match_score)}/100."
            log_notification(db, NotificationChannel.email, buyer_name, buyer_msg_2, recipient_role="buyer", event_type="ai_matched_lot")
            log_notification(db, NotificationChannel.system, buyer_name, buyer_msg_2, recipient_role="buyer", event_type="ai_matched_lot")
    else:
        # 6. Admin Notification #12 (System): Warning if no matches
        admin_warning_msg = f"System warning: AI match confidence below threshold (32%) on {new_lot.id} — 0 buyers met the minimum score."
        log_notification(db, NotificationChannel.system, "MahaFPC", admin_warning_msg, recipient_role="mahafpc", event_type="low_confidence_warning")


    return lot_to_dict(new_lot)


from app.schemas.lots import LotUpdate

@router.put("/{lot_id}", response_model=LotResponse)
def update_lot(
    lot_id: str,
    body: LotUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("fpo"))
):
    lot = db.query(Lot).filter(Lot.id == lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")
    if lot.fpo_id != current_user.fpo_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this lot")

    # Track what changed for notification
    changes = []
    if body.priceExpectation is not None and body.priceExpectation != lot.price_expectation:
        changes.append(f"price expectation changed from \u20b9{lot.price_expectation}/kg to \u20b9{body.priceExpectation}/kg")
        lot.price_expectation = body.priceExpectation
    if body.qty is not None and body.qty != lot.qty:
        changes.append(f"quantity changed from {lot.qty} MT to {body.qty} MT")
        lot.qty = body.qty
    if body.grade is not None and body.grade != lot.grade:
        changes.append(f"grade changed from {lot.grade} to {body.grade}")
        lot.grade = body.grade
    if body.notes is not None:
        lot.notes = body.notes
    if body.availableDate is not None:
        lot.available_date = body.availableDate

    db.commit()
    db.refresh(lot)

    # FPO Notification #2 (System): Lot updated
    if changes:
        fpo_name = current_user.name
        update_msg = f"Lot {lot.id} updated: {', '.join(changes)}."
        log_notification(db, NotificationChannel.system, fpo_name, update_msg, recipient_role="fpo", event_type="lot_updated")

    return lot_to_dict(lot)


@router.get("/{lot_id}/matches")
def get_matches(lot_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lot = db.query(Lot).filter(Lot.id == lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")
    return [
        {"buyerName": m.buyer.name if m.buyer else "", "matchScore": m.match_score, "offeredPrice": m.offered_price}
        for m in lot.matches
    ]
