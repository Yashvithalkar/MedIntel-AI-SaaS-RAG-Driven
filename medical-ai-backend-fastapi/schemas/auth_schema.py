from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal

class UserRegisterSchema(BaseModel):
    """
    Schema validating user registration requests.
    Replaces Express register validator rules.
    """
    name: str = Field(..., min_length=2, max_length=100, description="Full name of the user")
    email: EmailStr = Field(..., description="Valid email address")
    password: str = Field(..., min_length=6, description="Account password (minimum 6 characters)")
    role: Optional[Literal["patient", "doctor", "admin"]] = Field("patient", description="User role assignment")


class UserLoginSchema(BaseModel):
    """
    Schema validating user login requests.
    Replaces Express login validator rules.
    """
    email: EmailStr = Field(..., description="Registered email address")
    password: str = Field(..., description="Account password")