import uuid
import json
from datetime import datetime, timezone
from sqlalchemy import text
from config.database import AsyncSessionLocal

class DiagnosisModel:
    """
    Data Access Model for the 'diagnoses' table using SQLAlchemy async.
    """

    @staticmethod
    async def create(data: dict) -> dict:
        """Create a new diagnosis record."""
        diagnosis_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)

        # Ensure ai_report is stored as string/json properly
        ai_report_val = data.get("ai_report")
        if isinstance(ai_report_val, dict):
            ai_report_val = json.dumps(ai_report_val)

        async with AsyncSessionLocal() as session:
            query = text("""
                INSERT INTO diagnoses 
                (id, patient_id, doctor_id, symptoms_input, ai_report, 
                 confidence_score, doctor_notes, status, created_at, updated_at)
                VALUES 
                (:id, :patient_id, :doctor_id, :symptoms_input, :ai_report, 
                 :confidence_score, :doctor_notes, :status, :created_at, :updated_at)
            """)
            
            await session.execute(query, {
                "id": diagnosis_id,
                "patient_id": data["patient_id"],
                "doctor_id": data.get("doctor_id"),
                "symptoms_input": data.get("symptoms_input"),
                "ai_report": ai_report_val,
                "confidence_score": data.get("confidence_score"),
                "doctor_notes": data.get("doctor_notes"),
                "status": data.get("status", "pending"),
                "created_at": now,
                "updated_at": now
            })
            await session.commit()

        return await DiagnosisModel.find_by_id(diagnosis_id)

    @staticmethod
    async def find_by_id(diagnosis_id: str) -> dict | None:
        """Find a diagnosis record by its UUID."""
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                text("""
                    SELECT id, patient_id, doctor_id, symptoms_input, ai_report, 
                           confidence_score, doctor_notes, status, created_at, updated_at 
                    FROM diagnoses 
                    WHERE id = :id
                """),
                {"id": diagnosis_id}
            )
            row = result.mappings().fetchone()
            if not row:
                return None
            
            diag = dict(row)
            # Parse JSON ai_report back into a dict if stored as string
            if diag.get("ai_report") and isinstance(diag["ai_report"], str):
                try:
                    diag["ai_report"] = json.loads(diag["ai_report"])
                except Exception:
                    pass
            return diag

    @staticmethod
    async def find_by_patient_id(patient_id: str) -> list:
        """Find all diagnoses for a given patient, ordered newest-first."""
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                text("""
                    SELECT id, patient_id, doctor_id, symptoms_input, ai_report, 
                           confidence_score, doctor_notes, status, created_at, updated_at 
                    FROM diagnoses 
                    WHERE patient_id = :patient_id 
                    ORDER BY created_at DESC
                """),
                {"patient_id": patient_id}
            )
            rows = result.mappings().fetchall()
            diagnoses = []
            for row in rows:
                diag = dict(row)
                if diag.get("ai_report") and isinstance(diag["ai_report"], str):
                    try:
                        diag["ai_report"] = json.loads(diag["ai_report"])
                    except Exception:
                        pass
                diagnoses.append(diag)
            return diagnoses