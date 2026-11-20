from fastapi import Depends, HTTPException, status
from dependencies.auth import verify_access_token

def require_role(*allowed_roles: str):
    """
    Role-Based Access Control (RBAC) dependency factory.
    Directly translates your Express rbac middleware logic.
    """
    async def role_checker(current_user: dict = Depends(verify_access_token)):
        # Check if auth middleware provided user and role data
        if not current_user or "role" not in current_user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="RBAC used without auth middleware. Check route definition."
            )

        user_role = current_user.get("role")
        is_allowed = user_role in allowed_roles

        if not is_allowed:
            roles_str = " | ".join(allowed_roles)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden. This route requires role: [{roles_str}]. Your role is: '{user_role}'."
            )

        return current_user

    return role_checker