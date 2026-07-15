from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.user import User, RoleType
from app.models.role import SystemRole, RolePermission
from app.schemas.roles import RoleCreate, RoleUpdate, AssignRoleRequest, SystemRoleResponse, PermissionsUpdate
from datetime import datetime

router = APIRouter(prefix="/roles", tags=["roles"])

@router.get("", response_model=List[SystemRoleResponse])
def get_roles(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(SystemRole).all()

@router.post("", response_model=SystemRoleResponse)
def create_role(
    body: RoleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("mahafpc"))
):
    exists = db.query(SystemRole).filter(SystemRole.name == body.name).first()
    if exists:
        raise HTTPException(status_code=400, detail="Role already exists")
    
    r = SystemRole(
        name=body.name,
        description=body.description,
        email=body.email.strip().lower() if body.email else None,
        updated_by=current_user.id
    )
    db.add(r)
    db.commit()
    db.refresh(r)

    # Link/Auto-create user if email is provided
    if body.email:
        email = body.email.strip().lower()
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.system_role_id = r.id
            user.employee_role = r.name
            user.role_type = RoleType.mahafpc
            db.commit()
        else:
            import random
            name_parts = email.split("@")[0].split(".")
            user_name = " ".join([p.capitalize() for p in name_parts])
            new_user = User(
                name=user_name,
                email=email,
                role_type=RoleType.mahafpc,
                system_role_id=r.id,
                employee_role=r.name,
                employee_id=f"EMP-{random.randint(1000, 9999)}",
                is_active=True
            )
            db.add(new_user)
            db.commit()

    modules = ["Dashboard", "Users", "Roles", "Reports", "Settings", "Billing", "Audit Logs"]
    for m in modules:
        db.add(RolePermission(
            role_id=r.id,
            module=m,
            can_view=False,
            can_add=False,
            can_edit=False,
            can_delete=False,
            updated_by=current_user.id
        ))
    db.commit()

    return r

@router.put("/{id}", response_model=SystemRoleResponse)
def update_role(
    id: int,
    body: RoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("mahafpc"))
):
    r = db.query(SystemRole).filter(SystemRole.id == id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Role not found")
        
    # Superadmin safety guard (G7)
    if r.is_superadmin:
        raise HTTPException(status_code=403, detail="Superadmin role details cannot be updated")

    r.name = body.name
    r.description = body.description
    r.email = body.email.strip().lower() if body.email else None
    r.updated_by = current_user.id
    r.updated_at = datetime.utcnow()
    db.commit()

    # Re-sync user mapping if email is provided
    if body.email:
        email = body.email.strip().lower()
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.system_role_id = r.id
            user.employee_role = r.name
            user.role_type = RoleType.mahafpc
            db.commit()
        else:
            import random
            name_parts = email.split("@")[0].split(".")
            user_name = " ".join([p.capitalize() for p in name_parts])
            new_user = User(
                name=user_name,
                email=email,
                role_type=RoleType.mahafpc,
                system_role_id=r.id,
                employee_role=r.name,
                employee_id=f"EMP-{random.randint(1000, 9999)}",
                is_active=True
            )
            db.add(new_user)
            db.commit()

    return r

@router.delete("/{id}")
def delete_role(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("mahafpc"))
):
    r = db.query(SystemRole).filter(SystemRole.id == id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Role not found")
        
    # Superadmin safety guard (G7)
    if r.is_superadmin:
        raise HTTPException(status_code=403, detail="Superadmin role cannot be deleted")

    # Assigned users check (G8)
    if r.users_assigned > 0:
        raise HTTPException(status_code=409, detail="Role cannot be deleted while users are assigned to it")

    db.query(RolePermission).filter(RolePermission.role_id == id).delete()
    db.delete(r)
    db.commit()
    return {"status": "success"}

@router.get("/{id}/permissions")
def get_role_permissions(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    perms = db.query(RolePermission).filter(RolePermission.role_id == id).all()
    res = {}
    for p in perms:
        res[p.module] = {
            "view": p.can_view,
            "add": p.can_add,
            "edit": p.can_edit,
            "delete": p.can_delete
        }
    return res

@router.put("/{id}/permissions")
def update_role_permissions(
    id: int,
    body: PermissionsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("mahafpc"))
):
    r = db.query(SystemRole).filter(SystemRole.id == id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Role not found")
        
    # Superadmin safety guard (G7)
    if r.is_superadmin:
        raise HTTPException(status_code=403, detail="Superadmin permissions cannot be modified")

    db.query(RolePermission).filter(RolePermission.role_id == id).delete()
    for mod, actions in body.permissions.items():
        db.add(RolePermission(
            role_id=id,
            module=mod,
            can_view=actions.get("view", False),
            can_add=actions.get("add", False),
            can_edit=actions.get("edit", False),
            can_delete=actions.get("delete", False),
            updated_by=current_user.id
        ))
    r.updated_by = current_user.id
    r.updated_at = datetime.utcnow()
    db.commit()
    return {"status": "success"}

@router.post("/users/{user_id}/assign-role")
def assign_role(
    user_id: int,
    body: AssignRoleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("mahafpc"))
):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    
    old_role_id = u.system_role_id
    u.system_role_id = body.roleId

    if old_role_id:
        old_r = db.query(SystemRole).filter(SystemRole.id == old_role_id).first()
        if old_r: old_r.users_assigned = max(0, old_r.users_assigned - 1)
        
    new_r = db.query(SystemRole).filter(SystemRole.id == body.roleId).first()
    if new_r:
        new_r.users_assigned += 1
        
    db.commit()
    return {"status": "success"}
