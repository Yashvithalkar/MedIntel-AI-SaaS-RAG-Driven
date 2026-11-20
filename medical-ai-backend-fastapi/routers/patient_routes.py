
import json
import traceback
from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    Path,
    Request,
    status,
    HTTPException,
)

from dependencies.auth import verify_access_token
from dependencies.rbac import require_role
from schemas.patient_schema import PatientProfileUpdateSchema
from services.patient_service import patient_service
from services.diagnosis_service import diagnosis_service
from models.patient_model import PatientModel
from models.diagnosis_model import DiagnosisModel
from utils.triage import evaluate_risk_status


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    dependencies=[
        Depends(verify_access_token),
        Depends(require_role("patient")),
    ]
)


# ============================================================
# GET PATIENT PROFILE
# ============================================================

@router.get("/profile")
async def get_profile(
    current_user: dict = Depends(verify_access_token),
):
    try:
        user_id = current_user.get("id")

        print("\n📤 GET PATIENT PROFILE")
        print("👤 User ID:", user_id)

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User ID missing from authenticated session.",
            )

        result = await patient_service.get_profile(user_id=user_id)

        print("✅ Patient profile retrieved")
        return result

    except HTTPException:
        raise

    except Exception:
        print("❌ GET PATIENT PROFILE FAILED")
        traceback.print_exc()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve patient profile.",
        )


# ============================================================
# UPDATE PATIENT PROFILE
# ============================================================

@router.put("/profile")
async def update_profile(
    body: PatientProfileUpdateSchema,
    current_user: dict = Depends(verify_access_token),
):
    try:
        user_id = current_user.get("id")

        print("\n📤 UPDATE PATIENT PROFILE")
        print("👤 User ID:", user_id)

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User ID missing from authenticated session.",
            )

        result = await patient_service.update_profile(
            user_id=user_id,
            update_data=body,
        )

        print("✅ Patient profile updated")
        return result

    except HTTPException:
        raise

    except Exception:
        print("❌ UPDATE PATIENT PROFILE FAILED")
        traceback.print_exc()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update patient profile.",
        )


# ============================================================
# GET ALL PATIENT DIAGNOSES
# ============================================================

@router.get("/diagnoses")
async def get_diagnoses(
    current_user: dict = Depends(verify_access_token),
):
    try:
        user_id = current_user.get("id")

        print("\n📤 GET PATIENT DIAGNOSES")
        print("👤 User ID:", user_id)

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User ID missing from authenticated session.",
            )

        result = await patient_service.get_diagnoses(
            user_id=user_id,
        )

        print("✅ Patient diagnoses retrieved")
        print(
            "📦 Result type:",
            type(result).__name__,
        )

        return result

    except HTTPException:
        raise

    except Exception:
        print("❌ GET PATIENT DIAGNOSES FAILED")
        traceback.print_exc()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve patient diagnoses.",
        )


# ============================================================
# GET SINGLE DIAGNOSIS
# ============================================================

@router.get("/diagnoses/{id}")
async def get_diagnosis_by_id(
    id: str = Path(
        ...,
        description="The unique diagnosis ID",
    ),
    current_user: dict = Depends(verify_access_token),
):
    try:
        user_id = current_user.get("id")

        print("\n📤 GET SINGLE DIAGNOSIS")
        print("👤 User ID:", user_id)
        print("🩺 Diagnosis ID:", id)

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User ID missing from authenticated session.",
            )

        result = await patient_service.get_diagnosis_by_id(
            user_id=user_id,
            diagnosis_id=id,
        )

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Diagnosis not found.",
            )

        print("✅ Diagnosis retrieved")
        return result

    except HTTPException:
        raise

    except Exception:
        print("❌ GET SINGLE DIAGNOSIS FAILED")
        traceback.print_exc()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve diagnosis.",
        )


# ============================================================
# SUBMIT SYMPTOMS + OPTIONAL MEDICAL REPORT
# ============================================================

@router.post("/diagnoses")
async def submit_diagnosis_symptoms(
    request: Request,
    current_user: dict = Depends(verify_access_token),
):
    """
    POST /api/patient/diagnoses

    Accepts:
    - JSON containing symptoms_input
    - multipart/form-data containing symptoms_input
      and an optional medical_file

    Generates an AI-assisted clinical assessment, evaluates urgency,
    and saves the diagnosis.
    """

    print("\n" + "=" * 65)
    print("🩺 SUBMIT DIAGNOSIS REQUEST")
    print("=" * 65)

    try:
        # ----------------------------------------------------
        # STEP 1: Authenticate user context
        # ----------------------------------------------------

        user_id = current_user.get("id")

        print("👤 User ID:", user_id)

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User ID missing from authenticated session.",
            )

        # ----------------------------------------------------
        # STEP 2: Parse request
        # ----------------------------------------------------

        symptoms_input = ""
        medical_file = None

        content_type = request.headers.get(
            "content-type",
            "",
        ).lower()

        print("📨 Content-Type:", content_type)

        try:
            if "application/json" in content_type:
                body = await request.json()

                if not isinstance(body, dict):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Request body must be a JSON object.",
                    )

                symptoms_input = body.get("symptoms_input") or ""

            elif (
                "multipart/form-data" in content_type
                or "application/x-www-form-urlencoded" in content_type
            ):
                form = await request.form()

                symptoms_input = form.get("symptoms_input") or ""
                uploaded_file = form.get("medical_file")

                if uploaded_file and hasattr(uploaded_file, "filename"):
                    if uploaded_file.filename:
                        medical_file = uploaded_file

            else:
                raise HTTPException(
                    status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                    detail=(
                        "Unsupported request content type. "
                        "Send JSON or multipart/form-data."
                    ),
                )

        except HTTPException:
            raise

        except Exception as error:
            print("❌ REQUEST PARSING FAILED")
            traceback.print_exc()

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unable to parse request body: {str(error)}",
            ) from error

        # ----------------------------------------------------
        # STEP 3: Normalize and validate symptoms
        # ----------------------------------------------------

        cleaned_symptoms = (
            symptoms_input.strip()
            if isinstance(symptoms_input, str)
            else ""
        )

        file_name = (
            medical_file.filename
            if medical_file
            else ""
        )

        print("📝 Parsed symptoms:", repr(cleaned_symptoms))
        print("📏 Symptoms length:", len(cleaned_symptoms))
        print("📎 Medical file:", file_name or "None")

        # Keep route validation aligned with the diagnosis service:
        # the service requires 10 characters if there is no file.
        if len(cleaned_symptoms) < 10 and not medical_file:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Please provide a more detailed description of your "
                    "symptoms (at least 10 characters) or upload a medical report."
                ),
            )

        # ----------------------------------------------------
        # STEP 4: Retrieve patient profile
        # ----------------------------------------------------

        print("🔍 Fetching patient profile...")

        patient_profile = await PatientModel.find_by_user_id(
            user_id,
        )

        if not patient_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=(
                    "Patient profile not found. "
                    "Please complete your profile first."
                ),
            )

        print("✅ Patient profile found")

        # ----------------------------------------------------
        # STEP 5: Generate AI-assisted assessment
        # ----------------------------------------------------

        print("🤖 Calling diagnosis_service.generate_rag_diagnosis...")

        try:
            ai_report = await diagnosis_service.generate_rag_diagnosis(
                patient_profile=patient_profile,
                symptoms_input=cleaned_symptoms,
                report_file=medical_file,
            )

            print("✅ AI assessment generated")
            print(
                "📦 AI report type:",
                type(ai_report).__name__,
            )

        except HTTPException:
            raise

        except Exception:
            print("❌ AI ASSESSMENT GENERATION FAILED")
            traceback.print_exc()
            raise

        if not isinstance(ai_report, (dict, list)):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="The AI service returned an invalid assessment format.",
            )

        # ----------------------------------------------------
        # STEP 6: Evaluate triage risk
        # ----------------------------------------------------

        print("🚦 Evaluating risk status...")

        input_for_triage = f"{cleaned_symptoms} {file_name}".strip()

        try:
            risk_status = evaluate_risk_status(
                input_for_triage,
                ai_report,
            )

            print("✅ Risk status:", risk_status)

        except Exception:
            print("❌ TRIAGE EVALUATION FAILED")
            traceback.print_exc()

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to evaluate the assessment urgency.",
            )

        # ----------------------------------------------------
        # STEP 7: Prepare database record
        # ----------------------------------------------------

        if cleaned_symptoms and medical_file:
            symptoms_description = (
                f"{cleaned_symptoms} "
                f"[Attached Report: {file_name}]"
            )
        elif cleaned_symptoms:
            symptoms_description = cleaned_symptoms
        else:
            symptoms_description = (
                f"Uploaded Diagnostic Report: {file_name}"
            )

        diagnosis_data = {
            "patient_id": user_id,
            "symptoms_input": symptoms_description,
            "ai_report": json.dumps(
                ai_report,
                ensure_ascii=False,
            ),
            "status": risk_status,
        }

        print("💾 Saving diagnosis record...")
        print("📏 Description length:", len(symptoms_description))
        print("🚦 Status:", risk_status)

        # ----------------------------------------------------
        # STEP 8: Save diagnosis
        # ----------------------------------------------------

        try:
            saved_diagnosis = await DiagnosisModel.create(
                diagnosis_data,
            )

            print("📦 Database create result:", saved_diagnosis)

        except Exception:
            print("❌ DATABASE INSERT FAILED")
            traceback.print_exc()

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save the diagnosis record.",
            )

        if not saved_diagnosis:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="The database did not confirm diagnosis creation.",
            )

        if not isinstance(saved_diagnosis, dict):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="The database returned an unexpected insert result.",
            )

        diagnosis_id = (
            saved_diagnosis.get("insert_id")
            or saved_diagnosis.get("id")
        )

        if diagnosis_id is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=(
                    "Diagnosis insert completed, but no diagnosis ID "
                    "was returned. Check DiagnosisModel.create()."
                ),
            )

        print("🆔 Saved diagnosis ID:", diagnosis_id)

        # ----------------------------------------------------
        # STEP 9: Fetch saved diagnosis
        # ----------------------------------------------------

        try:
            diagnosis = await DiagnosisModel.find_by_id(
                diagnosis_id,
            )

        except Exception:
            print("❌ FAILED TO FETCH SAVED DIAGNOSIS")
            traceback.print_exc()

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Diagnosis was saved but could not be retrieved.",
            )

        if not diagnosis:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Diagnosis was created but could not be retrieved.",
            )

        # ----------------------------------------------------
        # STEP 10: Return response
        # ----------------------------------------------------

        print("✅ DIAGNOSIS SUBMITTED SUCCESSFULLY")
        print("=" * 65)

        return {
            "success": True,
            "message": (
                "Clinical assessment generated and saved successfully."
            ),
            "data": {
                "diagnosis": diagnosis,
            },
        }

    except HTTPException:
        raise

    except Exception:
        print("❌ UNEXPECTED DIAGNOSIS ROUTE ERROR")
        traceback.print_exc()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "An unexpected error occurred while submitting "
                "the clinical assessment. Check the backend terminal logs."
            ),
        )
