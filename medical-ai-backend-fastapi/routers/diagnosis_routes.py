from fastapi import APIRouter, Depends, File, UploadFile, Form, status, HTTPException
from typing import Optional
from dependencies.auth import verify_access_token
from dependencies.rbac import require_role
from models.patient_model import PatientModel
from models.diagnosis_model import DiagnosisModel
from services.diagnosis_service import diagnosis_service
from utils.triage import evaluate_risk_status

router = APIRouter()

@router.post("/diagnose")
@router.post("/diagnoses")
async def submit_symptom_for_diagnosis(
    symptoms_input: Optional[str] = Form(None),
    medical_file: Optional[UploadFile] = File(None),
    current_user = Depends(verify_access_token),
    _=Depends(require_role("patient"))
):
    """
    Processing diagnosis submission with optional multimodal file support.
    """
    print("ganpat - Processing diagnosis submission (FastAPI)...")
    user_id = current_user["id"]

    # 1. Fetch patient profile
    patient_profile = await PatientModel.find_by_user_id(user_id)
    if not patient_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found"
        )

    # 2. Generate AI diagnosis
    ai_report = await diagnosis_service.generate_rag_diagnosis(
        patient_profile=patient_profile,
        symptoms_input=symptoms_input,
        report_file=medical_file
    )

    # 3. Evaluate risk
    input_for_triage = f"{symptoms_input or ''} {medical_file.filename if medical_file else ''}"
    risk_status = evaluate_risk_status(input_for_triage, ai_report)

    # 4. Format description & save diagnosis
    symptoms_description = (
        f"{symptoms_input} [Attached Report: {medical_file.filename}]" if symptoms_input and medical_file
        else symptoms_input or f"Uploaded Diagnostic Report: {medical_file.filename}"
    )

    saved_diagnosis = await DiagnosisModel.create({
        "patient_id": user_id,
        "symptoms_input": symptoms_description,
        "ai_report": json.dumps(ai_report),
        "status": risk_status,
    })

    diagnosis_id = saved_diagnosis.get("insert_id") or saved_diagnosis.get("id")
    diagnosis = await DiagnosisModel.find_by_id(diagnosis_id)

    if not diagnosis:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Diagnosis was created but could not be retrieved"
        )

    return {
        "success": True,
        "message": "Diagnostic assessment generated successfully via multimodal RAG engine.",
        "data": {
            "diagnosis": diagnosis,
        },
    }