import os
import jwt
from fastapi import Request, HTTPException, status

JWT_SECRET = os.getenv("JWT_SECRET", "your_super_secret_jwt_key")

async def verify_access_token(request: Request) -> dict:
    """
    Extracts and verifies the JWT token from HttpOnly cookies or Authorization header.
    Populates current_user data for protected routes.
    """
    token = None

    # 1. Try reading token from HttpOnly cookie (set during login)
    token = request.cookies.get("token")

    # 2. Fallback: Check Authorization Bearer header if cookie is missing
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token missing. Please log in."
        )

    try:
        # Decode and verify JWT payload
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload  # Contains id, role, name, etc.
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please log in again."
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token."
        )