import json
from datetime import datetime, timezone
from sqlalchemy import text
from config.database import AsyncSessionLocal

class DoctorModel:
    """
    Data Access Model for Doctor dashboard operations, patient record reviews, 
    and diagnosis status management.
    """

    @staticmethod
    async def get_all_patients(doctor_id: str) -> list:
        """
        Retrieve all patients along with whether they have pending/flagged diagnoses needing review.
        """
        async with AsyncSessionLocal() as session:
            query = text("""
                SELECT 
                    u.id, 
                    u.name, 
                    u.email, 
                    u.created_at,
                    pr.date_of_birth, 
                    pr.blood_group, 
                    pr.gender, 
                    pr.chronic_conditions,
                    EXISTS (
                        SELECT 1 FROM diagnoses d 
                        WHERE d.patient_id = u.id AND d.status IN ('pending', 'flagged')
                    ) AS needs_review
                FROM users u
                LEFT JOIN patient_records pr ON u.id = pr.user_id
                WHERE u.role = 'patient'
                ORDER BY u.created_at DESC
            """)
            result = await session.execute(query)
            rows = result.mappings().fetchall()
            
            patients = []
            for row in rows:
                p = dict(row)
                # Convert tinyint/boolean flag correctly
                p["needs_review"] = bool(p["needs_review"])
                patients.append(p)
                
            return patients

    @staticmethod
    async def get_patient_records(patient_id: str, doctor_id: str) -> dict:
        """
        Retrieve comprehensive medical records, diagnoses list, and stats for a specific patient.
        """
        async with AsyncSessionLocal() as session:
            # 1. Fetch patient basic and medical info
            user_query = text("""
                SELECT u.id, u.name, u.email, u.created_at,
                       pr.date_of_birth, pr.blood_group, pr.gender, pr.allergies,
                       pr.chronic_conditions, pr.current_medications, 
                       pr.emergency_contact_name, pr.emergency_contact_phone
                FROM users u
                LEFT JOIN patient_records pr ON u.id = pr.user_id
                WHERE u.id = :patient_id AND u.role = 'patient'
            """)
            user_res = await session.execute(user_query, {"patient_id": patient_id})
            patient_row = user_res.mappings().fetchone()

            if not patient_row:
                return {}

            patient_data = dict(patient_row)

            # 2. Fetch all diagnoses for this patient
            diag_query = text("""
                SELECT id, patient_id, doctor_id, symptoms_input, ai_report, 
                       confidence_score, doctor_notes, status, created_at, updated_at 
                FROM diagnoses 
                WHERE patient_id = :patient_id 
                ORDER BY created_at DESC
            """)
            diag_res = await session.execute(diag_query, {"patient_id": patient_id})
            diag_rows = diag_res.mappings().fetchall()

            diagnoses = []
            for row in diag_rows:
                diag = dict(row)
                if diag.get("ai_report") and isinstance(diag["ai_report"], str):
                    try:
                        diag["ai_report"] = json.loads(diag["ai_report"])
                    except Exception:
                        pass
                diagnoses.append(diag)

            # 3. Compute stats
            total_diagnoses = len(diagnoses)
            flagged_count = sum(1 for d in diagnoses if d.get("status") == "flagged")
            pending_count = sum(1 for d in diagnoses if d.get("status") == "pending")

            stats = {
                "total_diagnoses": total_diagnoses,
                "flagged_count": flagged_count,
                "pending_count": pending_count,
            }

            return {
                "patient": patient_data,
                "diagnoses": diagnoses,
                "stats": stats,
            }

    @staticmethod
    async def get_pending_diagnoses() -> list:
        """
        Retrieve all diagnoses that are pending or flagged for doctor review.
        """
        async with AsyncSessionLocal() as session:
            query = text("""
                SELECT d.id, d.patient_id, d.doctor_id, d.symptoms_input, d.ai_report, 
                       d.confidence_score, d.doctor_notes, d.status, d.created_at, d.updated_at,
                       u.name as patient_name, u.email as patient_email
                FROM diagnoses d
                JOIN users u ON d.patient_id = u.id
                WHERE d.status IN ('pending', 'flagged')
                ORDER BY d.created_at ASC
            """)
            result = await session.execute(query)
            rows = result.mappings().fetchall()

            diagnoses = []
            for row in rows:
                diag = dict(row)
                if diag.get("ai_report") and isinstance(diag["ai_report"], str):
                    try:
                        diag["ai_report"] = json.loads(diag["ai_report"])
                    except Exception:
                        pass
                # Determine if urgent based on status or AI report content
                diag["is_urgent"] = diag.get("status") == "flagged"
                diagnoses.append(diag)

            return diagnoses

    @staticmethod
    async def review_diagnosis(diagnosis_id: str, doctor_id: str, doctor_notes: str, status_update: str = None) -> dict | None:
        """
        Update diagnosis record with doctor review notes, assigned doctor ID, and status ('reviewed' or 'flagged').
        """
        now = datetime.now(timezone.utc)
        new_status = status_update if status_update in ["reviewed", "flagged"] else "reviewed"

        async with AsyncSessionLocal() as session:
            query = text("""
                UPDATE diagnoses 
                SET doctor_id = :doctor_id,
                    doctor_notes = :doctor_notes,
                    status = :status,
                    updated_at = :updated_at
                WHERE id = :diagnosis_id
            """)
            await session.execute(query, {
                "doctor_id": doctor_id,
                "doctor_notes": doctor_notes,
                "status": new_status,
                "updated_at": now,
                "diagnosis_id": diagnosis_id
            })
            await session.commit()

        # Fetch and return the updated diagnosis record
        return await DoctorModel._find_diagnosis_by_id(diagnosis_id)

    @staticmethod
    async def _find_diagnosis_by_id(diagnosis_id: str) -> dict | None:
        """Internal helper to fetch a diagnosis by ID with parsed JSON."""
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
            if diag.get("ai_report") and isinstance(diag["ai_report"], str):
                try:
                    diag["ai_report"] = json.loads(diag["ai_report"])
                except Exception:
                    pass
            return diag