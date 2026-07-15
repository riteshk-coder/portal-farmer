from datetime import datetime
from typing import Optional, Dict
from pydantic import Field, field_serializer
from app.schemas.base import BaseSchema

class RoleCreateRequest(BaseSchema):
    name: str
    description: Optional[str] = None
    email: Optional[str] = None

class RoleUpdateRequest(BaseSchema):
    name: str
    description: Optional[str] = None
    email: Optional[str] = None

class PermissionActionsSchema(BaseSchema):
    view: bool = False
    add: bool = False
    edit: bool = False
    delete: bool = False

class AssignRoleRequest(BaseSchema):
    role_id: Optional[int] = Field(None, alias="roleId")

class RoleResponse(BaseSchema):
    id: int
    name: str
    description: Optional[str] = None
    email: Optional[str] = None
    is_superadmin: bool = Field(..., serialization_alias="is_superadmin")  # Snake case in frontend
    users_assigned: int = Field(0, serialization_alias="usersAssigned")
    created_at: datetime = Field(..., serialization_alias="created")  # Maps created_at to 'created' in frontend

    @field_serializer("created_at")
    def serialize_created_at(self, dt: datetime) -> str:
        # Format as e.g. "Jun 30, 2026" to match frontend format: "Jan 1, 2024"
        return dt.strftime("%b %d, %Y")

class PermissionsUpdate(BaseSchema):
    permissions: Dict[str, Dict[str, bool]]

# Backward-compatible aliases
RoleCreate = RoleCreateRequest
RoleUpdate = RoleUpdateRequest
SystemRoleResponse = RoleResponse
