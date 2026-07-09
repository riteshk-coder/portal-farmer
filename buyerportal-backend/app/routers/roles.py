from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.role import SystemRole, RolePermission
from app.schemas.role import RoleCreate, RoleUpdate, AssignRoleRequest, SystemRoleResponse, PermissionsUpdate

router = APIRouter(prefix="/roles", tags=["roles"])

@router.get("", response_model=List[SystemRoleResponse])
def get_roles(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    roles = db.query(SystemRole).all()
    return [
        {
            "id": r.id,
            "name": r.name,
            "description": r.description,
            "is_superadmin": r.is_superadmin,
            "usersAssigned": r.users_assigned,
            "created": r.created_at.strftime("%Y-%m-%dT%H:%M:%SZ") if r.created_at else ""
        }
        for r in roles
    ]

@router.post("", response_model=SystemRoleResponse)
def create_role(body: RoleCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    exists = db.query(SystemRole).filter(SystemRole.name == body.name).first()
    if exists:
        raise HTTPException(status_code=400, detail="Role already exists")
    
    r = SystemRole(name=body.name, description=body.description)
    db.add(r)
    db.commit()
    db.refresh(r)

    modules = ["Dashboard", "Users", "Roles", "Reports", "Settings", "Billing", "Audit Logs"]
    for m in modules:
        db.add(RolePermission(
            role_id=r.id,
            module=m,
            can_view=False,
            can_add=False,
            can_edit=False,
            can_delete=False
        ))
    db.commit()

    return {
        "id": r.id,
        "name": r.name,
        "description": r.description,
        "is_superadmin": r.is_superadmin,
        "usersAssigned": r.users_assigned,
        "created": r.created_at.strftime("%Y-%m-%dT%H:%M:%SZ") if r.created_at else ""
    }

@router.put("/{id}", response_model=SystemRoleResponse)
def update_role(id: int, body: RoleUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    r = db.query(SystemRole).filter(SystemRole.id == id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Role not found")
    r.name = body.name
    r.description = body.description
    db.commit()
    return {
        "id": r.id,
        "name": r.name,
        "description": r.description,
        "is_superadmin": r.is_superadmin,
        "usersAssigned": r.users_assigned,
        "created": r.created_at.strftime("%Y-%m-%dT%H:%M:%SZ") if r.created_at else ""
    }

@router.delete("/{id}")
def delete_role(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    r = db.query(SystemRole).filter(SystemRole.id == id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Role not found")
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
def update_role_permissions(id: int, body: PermissionsUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.query(RolePermission).filter(RolePermission.role_id == id).delete()
    for mod, actions in body.permissions.items():
        db.add(RolePermission(
            role_id=id,
            module=mod,
            can_view=actions.get("view", False),
            can_add=actions.get("add", False),
            can_edit=actions.get("edit", False),
            can_delete=actions.get("delete", False)
        ))
    db.commit()
    return {"status": "success"}

@router.post("/users/{user_id}/assign-role")
def assign_role(user_id: int, body: AssignRoleRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
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
