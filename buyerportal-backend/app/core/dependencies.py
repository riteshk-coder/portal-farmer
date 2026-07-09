from typing import List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import jwt

from app.database import get_db
from app.core.config import settings
from app.models.user import User, RolePermission

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """Dependency to retrieve the current logged-in user from the JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception

    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception

    return user

class RoleTypeChecker:
    """Dependency to check if the user has an allowed role_type."""
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        if current_user.role_type not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. User role type '{current_user.role_type}' is not authorized. Allowed: {self.allowed_roles}"
            )
        return current_user

def require_role_type(allowed_roles: List[str]):
    return RoleTypeChecker(allowed_roles)

class PermissionChecker:
    """Dependency to check if the user has permission for a specific module and action."""
    def __init__(self, module: str, action: str):
        self.module = module
        self.action = action

    def __call__(self, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
        # Superadmin bypasses all custom permission checks
        if current_user.role and current_user.role.is_superadmin:
            return current_user

        # If user has no custom role assigned
        if not current_user.role_id:
            # For mahafpc, check if we need to enforce. By default, let's deny if role is required.
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. User has no role assigned for permission validation."
            )

        # Query permission matrix
        permission = db.query(RolePermission).filter(
            RolePermission.role_id == current_user.role_id,
            RolePermission.module == self.module
        ).first()

        if not permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. No permissions configured for module '{self.module}'."
            )

        # Check action permission
        allowed = False
        if self.action == "view":
            allowed = permission.can_view
        elif self.action == "add":
            allowed = permission.can_add
        elif self.action == "edit":
            allowed = permission.can_edit
        elif self.action == "delete":
            allowed = permission.can_delete

        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required action '{self.action}' is not allowed on module '{self.module}'."
            )

        return current_user

def require_permission(module: str, action: str):
    return PermissionChecker(module, action)

