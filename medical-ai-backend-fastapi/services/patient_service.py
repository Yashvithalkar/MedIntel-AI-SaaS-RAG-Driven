from fastapi import HTTPException, status
from models.user_model import UserModel
from models.patient_model import PatientModel
from models.diagnosis_model import DiagnosisModel

class PatientService:
    """
    Handles patient profile management, medical records syncing, 
    and diagnostic history retrieval.
    """

    async def get_profile(self, user_id: str):
        user = await UserModel.find_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User account not found"
            )

        medical_record = await PatientModel.find_by_user_id(user_id)

        profile = {
            # Identity from users table
            "id": user.get("id"),
            "name": user.get("name"),
            "email": user.get("email"),
            "role": user.get("role"),
            "created_at": user.get("created_at"),

            # Medical record fields
            "date_of_birth": medical_record.get("date_of_birth") if medical_record else None,
            "blood_group": medical_record.get("blood_group") if medical_record else None,
            "gender": medical_record.get("gender") if medical_record else None,
            "allergies": medical_record.get("allergies") if medical_record else None,
            "chronic_conditions": medical_record.get("chronic_conditions") if medical_record else None,
            "current_medications": medical_record.get("current_medications") if medical_record else None,
            "emergency_contact_name": medical_record.get("emergency_contact_name") if medical_record else None,
            "emergency_contact_phone": medical_record.get("emergency_contact_phone") if medical_record else None,

            # Meta attributes
            "profile_complete": medical_record is not None,
            "profile_updated_at": medical_record.get("updated_at") if medical_record else None,
        }

        # Dual-compatible return: provides both 'profile' wrapper AND flat top-level keys 
        # so it works whether patientApi.js looks for response.data.profile or response.data
        return {
            "profile": profile,
            **profile
        }

    async def update_profile(self, user_id: str, update_data):
        """
        Updates user basic info and/or patient medical record.
        """
        data_dict = (
            update_data.model_dump(exclude_unset=True) 
            if hasattr(update_data, "model_dump") 
            else update_data.dict(exclude_unset=True)
        )

        if "name" in data_dict and data_dict["name"] is not None:
            await UserModel.update_user(user_id, {"name": data_dict["name"]})

        medical_data = {k: v for k, v in data_dict.items() if k != "name"}

        if medical_data:
            await PatientModel.create_or_update_record(user_id, medical_data)

        return await self.get_profile(user_id)

    async def get_diagnoses(self, user_id: str):
        diagnoses = await DiagnosisModel.find_by_patient_id(user_id)
        return diagnoses

    async def submit_symptoms(self, user_id: str, symptoms_input: str):
        diagnosis = await DiagnosisModel.create({
            "patient_id": user_id,  # Always from authenticated JWT, never from body
            "symptoms_input": symptoms_input,
            "ai_report": None,
            "confidence_score": None,
        })
        return diagnosis

    async def get_diagnosis_by_id(self, user_id: str, diagnosis_id: str):
        diagnoses = await self.get_diagnoses(user_id)
        diagnosis = next((d for d in diagnoses if str(d.get("id")) == str(diagnosis_id)), None)

        if not diagnosis:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Diagnosis not found"
            )

        return diagnosis

patient_service = PatientService()