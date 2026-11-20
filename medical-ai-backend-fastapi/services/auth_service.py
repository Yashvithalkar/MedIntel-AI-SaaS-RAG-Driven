import os
import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from fastapi import Response, status, HTTPException
from models.user_model import UserModel  # Assumes you have or will convert your user model

JWT_SECRET = os.getenv("JWT_SECRET", "your_super_secret_jwt_key")
JWT_EXPIRES_IN_DAYS = 7  # Default 7 days
IS_PRODUCTION = os.getenv("NODE_ENV") == "production"

async def register_user(body):
    """
    Register a new user, check for existing email, hash password, and save.
    """
    print("yash1")
    
    # --- Step 1: Check if email already registered ---
    exists = await UserModel.email_exists(body.email)
    if exists:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists"
        )

    # --- Step 2: Hash password using bcrypt (Salt rounds = 12) ---
    salt = bcrypt.gensalt(rounds=12)
    password_bytes = body.password.encode("utf-8")
    password_hash = bcrypt.hashpw(password_bytes, salt).decode("utf-8")

    # --- Step 3: Create user in database ---
    user = await UserModel.create_user({
        "name": body.name,
        "email": body.email,
        "password_hash": password_hash,
        "role": body.role or "patient",
    })

    return {
        "success": True,
        "message": "Account created successfully. Please log in.",
        "data": {"user": user}
    }


async def authenticate_user(body, response: Response):
    """
    Authenticate user credentials, generate JWT token, and set HttpOnly cookie.
    """
    print(f"--> Login attempted for email: {body.email}")

    user = await UserModel.find_by_email(body.email)
    print(f"--> DB User found: {user['email'] if user else 'NO USER FOUND'}")

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # --- Verify Password ---
    is_password_correct = bcrypt.checkpw(
        body.password.encode("utf-8"),
        user["password_hash"].encode("utf-8")
    )
    print(f"--> Password match result: {is_password_correct}")

    if not is_password_correct:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # --- Generate JWT Token ---
    payload = {
        "id": user["id"],       # UUID
        "role": user["role"],   # 'patient' | 'doctor' | 'admin'
        "name": user["name"],
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRES_IN_DAYS)
    }
    
    token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")

    # --- Set Secure HttpOnly Cookie ---
    response.set_cookie(
        key="token",
        value=token,
        httponly=True,                        # JavaScript cannot read this cookie -> XSS safe
        secure=IS_PRODUCTION,                 # True in production (HTTPS only)
        samesite="strict",                    # Strict cross-site protection
        max_age=7 * 24 * 60 * 60              # 7 days in seconds
    )

    safe_user = {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "created_at": user.get("created_at"),
    }

    return {
        "success": True,
        "message": "Login successful",
        "data": {"user": safe_user}
    }


async def logout_user(response: Response):
    """
    Clear authentication cookie immediately.
    """
    response.set_cookie(
        key="token",
        value="",
        httponly=True,
        secure=IS_PRODUCTION,
        samesite="strict",
        max_age=0  # Expire immediately
    )

    return {
        "success": True,
        "message": "Logged out successfully"
    }


async def get_current_user_profile(current_user):
    """
    Retrieve profile for the currently authenticated user.
    """
    user = await UserModel.find_by_id(current_user["id"])

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return {
        "success": True,
        "data": {"user": user}
    }