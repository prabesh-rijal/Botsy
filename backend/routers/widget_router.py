"""
Widget management router for one-bot-one-widget functionality
"""
from fastapi import APIRouter, HTTPException, Depends, status
from typing import Optional
from models import MessageResponse
from auth.auth import get_current_user, verify_bot_ownership
from database import db
from chat.chat import ChatService
import uuid
from datetime import datetime
import os

router = APIRouter()
chat_service = ChatService()

@router.post("/{widget_id}/chat")
async def widget_chat(
    widget_id: str,
    message_data: dict
):
    """Handle chat messages through widget (public endpoint)"""
    try:
        message = message_data.get("message", "").strip()
        if not message:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message is required"
            )
        
        # Get widget and associated bot
        widget = await db.get_widget_by_id(widget_id)
        if not widget:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Widget not found"
            )
        
        if not widget.get("is_active", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Widget is not active"
            )
        
        bot_id = widget["bot_id"]
        
        # Get chat response using the chat service
        chat_response = await chat_service.get_chat_response(message, bot_id, is_widget=True)
        
        return {
            "response": chat_response["response"],
            "sources": chat_response.get("sources", []),
            "widget_id": widget_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing chat: {str(e)}"
        )

@router.get("/{widget_id}")
async def get_widget_public(widget_id: str):
    """Get widget configuration (public endpoint for embedding)"""
    try:
        widget = await db.get_widget_by_id(widget_id)
        if not widget:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Widget not found"
            )
        
        if not widget.get("is_active", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Widget is not active"
            )
        
        # Return only public configuration
        return {
            "widget_id": widget["id"],
            "name": widget["name"],
            "theme": widget["theme"],
            "position": widget["position"],
            "welcome_message": widget["welcome_message"],
            "placeholder": widget["placeholder"],
            "primary_color": widget["primary_color"],
            "branding_visible": widget["branding_visible"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving widget: {str(e)}"
        )

@router.put("/{widget_id}")
async def update_widget(
    widget_id: str,
    widget_data: dict,
    current_user=Depends(get_current_user)
):
    """Update widget configuration"""
    try:
        # Get widget and verify ownership through bot
        widget = await db.get_widget_by_id(widget_id)
        if not widget:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Widget not found"
            )
        
        await verify_bot_ownership(widget["bot_id"], current_user["id"])
        
        # Prepare update data
        updates = {"updated_at": datetime.utcnow().isoformat()}
        
        allowed_fields = [
            "name", "theme", "position", "welcome_message", 
            "placeholder", "primary_color", "branding_visible", "is_active"
        ]
        
        for field in allowed_fields:
            if field in widget_data:
                updates[field] = widget_data[field]
        
        updated_widget = await db.update_widget(widget_id, updates)
        
        if not updated_widget:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update widget"
            )
        
        return updated_widget
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating widget: {str(e)}"
        )

@router.delete("/{widget_id}")
async def delete_widget(
    widget_id: str,
    current_user=Depends(get_current_user)
):
    """Delete widget"""
    try:
        # Get widget and verify ownership through bot
        widget = await db.get_widget_by_id(widget_id)
        if not widget:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Widget not found"
            )
        
        await verify_bot_ownership(widget["bot_id"], current_user["id"])
        
        await db.delete_widget(widget_id)
        
        return MessageResponse(message="Widget deleted successfully")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting widget: {str(e)}"
        )
