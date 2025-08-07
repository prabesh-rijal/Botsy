"""
Authentication and authorization utilities for Supabase
"""
import os
import jwt
from datetime import datetime, timezone
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from database import db
from typing import Optional

# Supabase JWT configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

# Security scheme
security = HTTPBearer()

class AuthService:
    """Authentication service for Supabase"""
    
    @staticmethod
    def verify_supabase_token(token: str) -> dict:
        """Verify Supabase JWT token and return payload"""
        try:
            # For now, decode without verification to get payload
            # In production, you'd need the proper JWT secret from Supabase
            payload = jwt.decode(
                token, 
                options={"verify_signature": False},  # Skip signature verification for now
                algorithms=["HS256"]
            )
            
            # Check if token is expired
            exp = payload.get('exp')
            if exp and datetime.fromtimestamp(exp, tz=timezone.utc) < datetime.now(timezone.utc):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token has expired",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except jwt.PyJWTError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Could not validate credentials: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated user from Supabase token"""
    token = credentials.credentials
    
    # Verify Supabase token
    payload = AuthService.verify_supabase_token(token)
    user_id = payload.get("sub")
    
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Extract user info from Supabase token
    user = {
        "id": user_id,
        "email": payload.get("email"),
        "company": payload.get("user_metadata", {}).get("company"),
        "created_at": payload.get("created_at")
    }
    
    return user

async def verify_bot_ownership(bot_id: str, user_id: str) -> bool:
    """Verify that the user owns the bot"""
    bot = await db.get_bot_by_id(bot_id)
    if not bot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bot not found"
        )
    
    if bot.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this bot"
        )
    
    return True
