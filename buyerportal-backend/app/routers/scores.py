from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User, Buyer, Fpo

router = APIRouter(prefix="/scores", tags=["scores"])

@router.get("/buyers")
def get_buyer_scores(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    buyers = db.query(Buyer).order_by(Buyer.reliability_score.desc()).all()
    return [
        {
            "id": b.id,
            "name": b.name,
            "score": b.reliability_score,
            "paymentDays": b.payment_days_avg,
            "volume": b.volume_traded
        }
        for b in buyers
    ]

@router.get("/fpos")
def get_fpo_scores(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    fpos = db.query(Fpo).all()
    def get_rating_val(f):
        try:
            return float(f.rating.split("/")[0].strip())
        except Exception:
            return 0.0
    
    sorted_fpos = sorted(fpos, key=get_rating_val, reverse=True)
    return [
        {
            "id": f.id,
            "name": f.name,
            "members": f.members_count,
            "gradeConformance": f.grade_conformance,
            "rating": f.rating
        }
        for f in sorted_fpos
    ]

@router.get("/fpo/{fpo_id}")
def get_fpo_score(fpo_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    fpo = db.query(Fpo).filter(Fpo.id == fpo_id).first()
    if not fpo:
        raise HTTPException(status_code=404, detail="FPO profile not found")
    return {
        "fpoId": fpo.id,
        "name": fpo.name,
        "rating": fpo.rating,
        "gradeConformance": fpo.grade_conformance,
        "membersCount": fpo.members_count
    }

@router.get("/buyer/{buyer_id}")
def get_buyer_score(buyer_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    buyer = db.query(Buyer).filter(Buyer.id == buyer_id).first()
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer profile not found")
    return {
        "buyerId": buyer.id,
        "name": buyer.name,
        "reliabilityScore": buyer.reliability_score,
        "paymentDaysAvg": buyer.payment_days_avg,
        "volumeTraded": buyer.volume_traded
    }
