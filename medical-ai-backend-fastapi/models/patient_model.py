import uuid
from datetime import datetime, timezone
from sqlalchemy import text
from config.database import AsyncSessionLocal

class PatientModel:
    """
    Data Access Model for the 'patient_records' table using SQLAlchemy async.
    """

    @staticmethod
    async def find_by_user_id(user_id: str) -> dict | None:
        """Find a patient medical record by the user's UUID."""
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                text("""
                    SELECT id, user_id, date_of_birth, blood_group, gender, 
                           allergies, chronic_conditions, current_medications, 
                           emergency_contact_name, emergency_contact_phone, 
                           created_at, updated_at 
                    FROM patient_records 
                    WHERE user_id = :user_id
                """),
                {"user_id": user_id}
            )
            row = result.mappings().fetchone()
            return dict(row) if row else None

    @staticmethod
    async def create_or_update_record(user_id: str, data: dict) -> dict:
        """Create a new patient record or update it if it already exists (Upsert)."""
        now = datetime.now(timezone.utc)
        existing = await PatientModel.find_by_user_id(user_id)

        async with AsyncSessionLocal() as session:
            if existing:
                # Update existing record
                query = text("""
                    UPDATE patient_records 
                    SET date_of_birth = COALESCE(:date_of_birth, date_of_birth),
                        blood_group = COALESCE(:blood_group, blood_group),
                        gender = COALESCE(:gender, gender),
                        allergies = COALESCE(:allergies, allergies),
                        chronic_conditions = COALESCE(:chronic_conditions, chronic_conditions),
                        current_medications = COALESCE(:current_medications, current_medications),
                        emergency_contact_name = COALESCE(:emergency_contact_name, emergency_contact_name),
                        emergency_contact_phone = COALESCE(:emergency_contact_phone, emergency_contact_phone),
                        updated_at = :updated_at
                    WHERE user_id = :user_id
                """)
                await session.execute(query, {
                    "user_id": user_id,
                    "date_of_birth": data.get("date_of_birth"),
                    "blood_group": data.get("blood_group"),
                    "gender": data.get("gender"),
                    "allergies": data.get("allergies"),
                    "chronic_conditions": data.get("chronic_conditions"),
                    "current_medications": data.get("current_medications"),
                    "emergency_contact_name": data.get("emergency_contact_name"),
                    "emergency_contact_phone": data.get("emergency_contact_phone"),
                    "updated_at": now
                })
            else:
                # Insert new record
                record_id = str(uuid.uuid4())
                query = text("""
                    INSERT INTO patient_records 
                    (id, user_id, date_of_birth, blood_group, gender, allergies, 
                     chronic_conditions, current_medications, emergency_contact_name, 
                     emergency_contact_phone, created_at, updated_at)
                    VALUES 
                    (:id, :user_id, :date_of_birth, :blood_group, :gender, :allergies, 
                     :chronic_conditions, :current_medications, :emergency_contact_name, 
                     :emergency_contact_phone, :created_at, :updated_at)
                """)
                await session.execute(query, {
                    "id": record_id,
                    "user_id": user_id,
                    "date_of_birth": data.get("date_of_birth"),
                    "blood_group": data.get("blood_group"),
                    "gender": data.get("gender"),
                    "allergies": data.get("allergies"),
                    "chronic_conditions": data.get("chronic_conditions"),
                    "current_medications": data.get("current_medications"),
                    "emergency_contact_name": data.get("emergency_contact_name"),
                    "emergency_contact_phone": data.get("emergency_contact_phone"),
                    "created_at": now,
                    "updated_at": now
                })
            
            await session.commit()

        return await PatientModel.find_by_user_id(user_id)