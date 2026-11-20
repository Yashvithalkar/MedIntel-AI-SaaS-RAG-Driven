import uuid
from datetime import datetime, timezone
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from config.database import AsyncSessionLocal  # Assumes your async database session factory

class UserModel:
    """
    Data Access Model for the 'users' table using SQLAlchemy async.
    """

    @staticmethod
    async def email_exists(email: str) -> bool:
        """Check if an account already exists with the given email."""
        async with AsyncSessionLocal() as session:
            from sqlalchemy import text
            result = await session.execute(
                text("SELECT id FROM users WHERE email = :email"),
                {"email": email}
            )
            return result.fetchone() is not None

    @staticmethod
    async def create_user(data: dict) -> dict:
        """Create a new user record in the database."""
        user_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)

        async with AsyncSessionLocal() as session:
            from sqlalchemy import text
            query = text("""
                INSERT INTO users (id, name, email, password_hash, role, is_active, created_at, updated_at)
                VALUES (:id, :name, :email, :password_hash, :role, :is_active, :created_at, :updated_at)
            """)
            
            await session.execute(query, {
                "id": user_id,
                "name": data["name"],
                "email": data["email"],
                "password_hash": data["password_hash"],
                "role": data.get("role", "patient"),
                "is_active": 1,
                "created_at": now,
                "updated_at": now
            })
            await session.commit()

        return await UserModel.find_by_id(user_id)

    @staticmethod
    async def find_by_email(email: str) -> dict | None:
        """Find a user record by email address."""
        async with AsyncSessionLocal() as session:
            from sqlalchemy import text
            result = await session.execute(
                text("SELECT id, name, email, password_hash, role, is_active, created_at, updated_at FROM users WHERE email = :email"),
                {"email": email}
            )
            row = result.mappings().fetchone()
            return dict(row) if row else None

    @staticmethod
    async def find_by_id(user_id: str) -> dict | None:
        """Find a user record by UUID (excluding password_hash for safety if needed)."""
        async with AsyncSessionLocal() as session:
            from sqlalchemy import text
            result = await session.execute(
                text("SELECT id, name, email, password_hash, role, is_active, created_at, updated_at FROM users WHERE id = :id"),
                {"id": user_id}
            )
            row = result.mappings().fetchone()
            if not row:
                return None
            
            user_dict = dict(row)
            # Remove password_hash when returning public user profiles
            user_dict.pop("password_hash", None)
            return user_dict

    @staticmethod
    async def update_user(user_id: str, data: dict) -> bool:
        """Update user details like name."""
        now = datetime.now(timezone.utc)
        async with AsyncSessionLocal() as session:
            from sqlalchemy import text
            query = text("""
                UPDATE users 
                SET name = COALESCE(:name, name), updated_at = :updated_at
                WHERE id = :id
            """)
            await session.execute(query, {
                "id": user_id,
                "name": data.get("name"),
                "updated_at": now
            })
            await session.commit()
            return True