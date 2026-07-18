from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user(request: Request, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.role_type.value == "buyer" and user.buyer_id is not None:
        path = request.url.path
        allowed_paths = [
            "/lots/buyers/preferences",
            "/buyers/me/product-preferences",
            "/buyers/me/onboarding-complete",
            "/lots/product-categories",
            "/auth/me"
        ]
        is_allowed = any(p in path for p in allowed_paths)
        if not is_allowed:
            from app.models.user import Buyer
            buyer = db.query(Buyer).filter(Buyer.id == user.buyer_id).first()
            if buyer and not buyer.onboarding_completed:
                raise HTTPException(
                    status_code=403,
                    detail="Onboarding not completed. Please complete buyer onboarding first."
                )
    elif user.role_type.value == "fpo" and user.fpo_id is not None:
        path = request.url.path
        allowed_paths = [
            "/lots/fpos/preferences",
            "/fpos/me/product-preferences",
            "/fpos/me/onboarding-complete",
            "/lots/product-categories",
            "/auth/me"
        ]
        is_allowed = any(p in path for p in allowed_paths)
        if not is_allowed:
            from app.models.user import Fpo
            fpo = db.query(Fpo).filter(Fpo.id == user.fpo_id).first()
            if fpo and not fpo.onboarding_completed:
                raise HTTPException(
                    status_code=403,
                    detail="Onboarding not completed. Please complete FPO onboarding first."
                )
    return user

def require_role(*roles):
    def checker(request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
        if current_user.role_type.value not in roles:
            raise HTTPException(status_code=403, detail="Access denied for this role")
        
        if current_user.role_type.value == "buyer":
            path = request.url.path
            allowed_paths = [
                "/lots/buyers/preferences",
                "/buyers/me/product-preferences",
                "/buyers/me/onboarding-complete",
                "/lots/product-categories"
            ]
            is_allowed = any(path.endswith(p) for p in allowed_paths)
            
            if not is_allowed and current_user.buyer_id is not None:
                from app.models.user import Buyer
                buyer = db.query(Buyer).filter(Buyer.id == current_user.buyer_id).first()
                if buyer and not buyer.onboarding_completed:
                    raise HTTPException(
                        status_code=403,
                        detail="Onboarding not completed. Please complete buyer onboarding first."
                    )
        elif current_user.role_type.value == "fpo":
            path = request.url.path
            allowed_paths = [
                "/lots/fpos/preferences",
                "/fpos/me/product-preferences",
                "/fpos/me/onboarding-complete",
                "/lots/product-categories"
            ]
            is_allowed = any(path.endswith(p) for p in allowed_paths)
            
            if not is_allowed and current_user.fpo_id is not None:
                from app.models.user import Fpo
                fpo = db.query(Fpo).filter(Fpo.id == current_user.fpo_id).first()
                if fpo and not fpo.onboarding_completed:
                    raise HTTPException(
                        status_code=403,
                        detail="Onboarding not completed. Please complete FPO onboarding first."
                    )
        return current_user
    return checker
