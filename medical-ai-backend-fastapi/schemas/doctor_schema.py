from pydantic import BaseModel, Field
from typing import Optional, Literal

class ReviewDiagnosisSchema(BaseModel):
    doctor_notes: str = Field(..., min_length=10, description="Notes from the reviewing doctor (min 10 characters)")
    status: Optional[Literal["reviewed", "flagged"]] = Field(None, description="Optional status update for the diagnosis")