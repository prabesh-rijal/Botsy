"""
Authentication router for Supabase integration
"""
from fastapi import APIRouter, HTTPException, Depends, status
from models import UserResponse, MessageResponse
from auth.auth import get_current_user
from datetime import datetime

router = APIRouter()

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user=Depends(get_current_user)):
    """Get current authenticated user information from Supabase token"""
    try:
        return UserResponse(
            id=current_user["id"],
            email=current_user["email"],
            full_name=current_user.get("company"),  # Using company from metadata
            created_at=datetime.fromisoformat(current_user["created_at"]) if current_user.get("created_at") else datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting user info: {str(e)}"
        )

@router.post("/verify", response_model=MessageResponse)
async def verify_token(current_user=Depends(get_current_user)):
    """Verify if the provided token is valid"""
    return MessageResponse(message="Token is valid")