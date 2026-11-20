from fastapi import APIRouter, Depends, Path, status, HTTPException
from typing import Optional
from dependencies.auth import verify_access_token
from dependencies.rbac import require_role
from schemas.doctor_schema import ReviewDiagnosisSchema
from models.doctor_model import DoctorModel  # Assuming your database model layer

# Protect all routes in this file for doctors and admins
router = APIRouter(
    dependencies=[
        Depends(verify_access_token),
        Depends(require_role("doctor", "admin"))
    ]
)

@router.get("/patients")
async def get_patients(current_user = Depends(verify_access_token)):
    """
    GET /api/doctor/patients
    Retrieve all patients list and calculate review counts.
    """
    doctor_id = current_user["id"]
    patients = await DoctorModel.get_all_patients(doctor_id)

    needs_review_count = sum(1 for p in patients if p.get("needs_review"))

    return {
        "success": True,
        "data": {
            "patients": patients,
            "total": len(patients),
            "needs_review_count": needs_review_count,
        },
    }


@router.get("/patients/{id}/records")
async def get_patient_records(
    id: str = Path(..., description="The unique UUID of the patient"),
    current_user = Depends(verify_access_token)
):
    """
    GET /api/doctor/patients/:id/records
    Retrieve comprehensive medical records, diagnoses, and stats for a patient.
    """
    doctor_id = current_user["id"]
    result = await DoctorModel.get_patient_records(patient_id=id, doctor_id=doctor_id)

    return {
        "success": True,
        "data": result,
    }


@router.get("/diagnoses/pending")
async def get_pending_diagnoses():
    """
    GET /api/doctor/diagnoses/pending
    Retrieve all pending diagnoses waiting for doctor review.
    """
    pending_diagnoses = await DoctorModel.get_pending_diagnoses()
    urgent_count = sum(1 for d in pending_diagnoses if d.get("is_urgent"))

    return {
        "success": True,
        "data": {
            "diagnoses": pending_diagnoses,
            "total": len(pending_diagnoses),
            "urgent_count": urgent_count,
        },
    }

@router.put("/diagnoses/{id}/review")
async def review_diagnosis(
    body: ReviewDiagnosisSchema,
    id: str = Path(..., description="Diagnosis ID UUID to review"),
    current_user=Depends(verify_access_token),
):
    """
    PUT /api/doctor/diagnoses/{id}/review

    Save doctor notes and update diagnosis status.
    """

    doctor_id = current_user["id"]

    print("\n" + "=" * 60)
    print("🩺 DOCTOR DIAGNOSIS REVIEW")
    print("=" * 60)
    print("👨‍⚕️ Doctor ID:", doctor_id)
    print("🆔 Diagnosis ID:", id)
    print("📝 Notes length:", len(body.doctor_notes or ""))
    print("🚦 Requested status:", body.status)

    try:
        updated_diagnosis = await DoctorModel.review_diagnosis(
            diagnosis_id=id,
            doctor_id=doctor_id,
            doctor_notes=body.doctor_notes,
            status_update=body.status,  # FIX: use status_update
        )

        if not updated_diagnosis:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Diagnosis not found.",
            )

        action_label = (
            "Diagnosis flagged as urgent"
            if updated_diagnosis.get("status") == "flagged"
            else "Diagnosis reviewed successfully"
        )

        print("✅ Diagnosis review saved successfully")
        print("🚦 Final status:", updated_diagnosis.get("status"))

        return {
            "success": True,
            "message": action_label,
            "data": {
                "diagnosis": updated_diagnosis,
            },
        }

    except HTTPException:
        raise

    except Exception as error:
        import traceback

        print("❌ FAILED TO SAVE DIAGNOSIS REVIEW")
        traceback.print_exc()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save diagnosis review: {str(error)}",
        ) from error
