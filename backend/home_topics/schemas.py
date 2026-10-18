from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class HomeTopicCreate(BaseModel):
    label: str = Field(..., min_length=1, max_length=120)
    order_no: int = 0
    is_active: bool = True

    @field_validator("label")
    @classmethod
    def strip_label(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Label cannot be empty")
        return v


class HomeTopicUpdate(BaseModel):
    label: Optional[str] = Field(None, min_length=1, max_length=120)
    order_no: Optional[int] = None
    is_active: Optional[bool] = None

    @field_validator("label")
    @classmethod
    def strip_label(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("Label cannot be empty")
        return v


class HomeTopicResponse(BaseModel):
    id: int
    label: str
    order_no: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
