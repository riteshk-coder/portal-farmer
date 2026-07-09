from pydantic import BaseModel
from typing import Dict, Any

class RoleCreate(BaseModel):
    name: str
    description: str

class RoleUpdate(BaseModel):
    name: str
    description: str

class AssignRoleRequest(BaseModel):
    roleId: int

class SystemRoleResponse(BaseModel):
    id: int
    name: str
    description: str
    is_superadmin: bool
    usersAssigned: int
    created: str

class PermissionsUpdate(BaseModel):
    permissions: Dict[str, Dict[str, bool]]
