from fastapi import APIRouter, Depends, Response, status
from schemas.auth_schema import UserRegisterSchema, UserLoginSchema
from services import auth_service
from dependencies.auth import verify_access_token  # Equivalent to your Express 'auth' middleware

router = APIRouter()

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: UserRegisterSchema):
    """
    Register a new user.
    FastAPI automatically validates the request body against UserRegisterSchema 
    (replacing express-validator + validate middleware).
    """
    return await auth_service.register_user(body)


@router.post("/login")
async def login(body: UserLoginSchema, response: Response):
    """
    Authenticate user and set cookies/tokens.
    """
    return await auth_service.authenticate_user(body, response)


@router.post("/logout")
async def logout(response: Response):
    """
    Clear authentication cookies.
    """
    return await auth_service.logout_user(response)


@router.get("/me")
async def get_me(current_user = Depends(verify_access_token)):
    """
    Get current logged-in user profile. 
    Depends() acts as your Express auth middleware, protecting the route 
    and injecting the verified user into the function.
    """
    return await auth_service.get_current_user_profile(current_user)