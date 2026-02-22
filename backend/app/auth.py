from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.settings import settings

_bearer = HTTPBearer()

SUPABASE_JWT_ALGORITHM = "HS256"


def require_auth(
    credentials: Annotated[HTTPAuthorizationCredentials, Security(_bearer)],
) -> dict:
    """
    Validates the Supabase JWT from the Authorization: Bearer header.
    Returns the decoded claims dict (sub, role, email, etc.) on success.
    Raises 401 on any failure.
    """
    if not settings.supabase_jwt_secret:
        raise HTTPException(status_code=500, detail="Auth not configured (SUPABASE_JWT_SECRET missing).")
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=[SUPABASE_JWT_ALGORITHM],
            audience="authenticated",  # Supabase sets this on user JWTs
        )
        return payload
    except JWTError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid or expired token: {exc}") from exc


# Typed alias for cleaner route signatures
AuthClaims = Annotated[dict, Depends(require_auth)]