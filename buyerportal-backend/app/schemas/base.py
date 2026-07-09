from pydantic import BaseModel, ConfigDict

def to_camel(string: str) -> str:
    """Convert snake_case string to camelCase."""
    components = string.split("_")
    return components[0] + "".join(x.title() for x in components[1:])

class BaseSchema(BaseModel):
    """Base schema class that automatically converts snake_case database fields to camelCase."""
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )
