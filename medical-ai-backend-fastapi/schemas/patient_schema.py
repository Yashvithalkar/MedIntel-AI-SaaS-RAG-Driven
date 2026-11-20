from pydantic import BaseModel, Field
from typing import Optional, Literal

class PatientProfileUpdateSchema(BaseModel):
    """
    Schema validating patient profile and medical record updates.
    Replaces Express profileRules / recordRules validators.
    """
    name: Optional[str] = Field(None, min_length=2, max_length=100, description="Patient full name")
    date_of_birth: Optional[str] = Field(None, description="Date of birth in YYYY-MM-DD format")
    blood_group: Optional[str] = Field(None, max_length=5, description="Blood group e.g., O+, A-, B+")
    gender: Optional[Literal["male", "female", "other"]] = Field(None, description="Gender identity")
    allergies: Optional[str] = Field(None, description="Known allergies description")
    chronic_conditions: Optional[str] = Field(None, description="Existing chronic conditions")
    current_medications: Optional[str] = Field(None, description="Currently active medications")
    emergency_contact_name: Optional[str] = Field(None, max_length=100, description="Emergency contact person name")
    emergency_contact_phone: Optional[str] = Field(None, max_length=20, description="Emergency contact phone number")


class SubmitSymptomsSchema(BaseModel):
    """
    Schema validating symptom submissions for RAG diagnosis.
    Replaces Express symptomRules validator.
    """
    symptoms_input: str = Field(
        ..., 
        min_length=10, 
        max_length=5000, 
        description="Detailed description of symptoms (minimum 10 characters)"
    )