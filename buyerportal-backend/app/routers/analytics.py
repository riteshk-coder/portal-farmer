from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.lot import Lot, LotStatus
from app.models.contract import Contract, EscrowStatus
from app.models.dispute import Dispute, DisputeStatus
from app.models.user import User, Fpo, Buyer, RoleType

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/overview")
def get_overview(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Return platform-wide overview counters.
    """
    total_transactions = db.query(Contract).count()
    
    volume_res = db.query(func.sum(Contract.qty)).filter(Contract.escrow_status == EscrowStatus.released).scalar()
    volume_mt = float(volume_res) if volume_res else 0.0

    gmv_res = db.query(func.sum(Contract.amount)).filter(Contract.escrow_status.in_([EscrowStatus.deposited, EscrowStatus.released])).scalar()
    gmv_lakhs = float(gmv_res) if gmv_res else 0.0

    open_disputes = db.query(Dispute).filter(Dispute.status != DisputeStatus.resolved).count()
    active_fpos = db.query(Fpo).count()
    active_buyers = db.query(Buyer).count()
    active_escrows = db.query(User).filter(User.role_type == RoleType.escrow).count()

    return {
        "totalTransactions": total_transactions,
        "volumeMT": volume_mt,
        "gmvLakhs": gmv_lakhs,
        "openDisputes": open_disputes,
        "activeFpos": active_fpos,
        "activeBuyers": active_buyers,
        "activeEscrows": active_escrows
    }

@router.get("/price-trends")
def get_price_trends(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Return simple price trend series for chart visualization.
    """
    return [
        {"month": "Jan", "Erode Finger": 128.5, "Salem Bulb": 122.0, "Nizamabad": 126.0},
        {"month": "Feb", "Erode Finger": 130.0, "Salem Bulb": 124.5, "Nizamabad": 127.5},
        {"month": "Mar", "Erode Finger": 132.5, "Salem Bulb": 126.0, "Nizamabad": 129.0},
        {"month": "Apr", "Erode Finger": 131.0, "Salem Bulb": 125.0, "Nizamabad": 128.0},
        {"month": "May", "Erode Finger": 134.0, "Salem Bulb": 128.0, "Nizamabad": 131.0},
        {"month": "Jun", "Erode Finger": 135.5, "Salem Bulb": 129.5, "Nizamabad": 132.5}
    ]
