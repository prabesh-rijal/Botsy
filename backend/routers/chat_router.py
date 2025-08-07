"""
Chat router for bot conversations
"""
import os
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional
from models import ChatMessage, ChatResponse, ChatHistory
from auth.auth import get_current_user, verify_bot_ownership
from chat.chat import ChatService
from database import db

router = APIRouter()
chat_service = ChatService()

@router.post("/{bot_id}", response_model=ChatResponse)
async def chat_with_bot(
    bot_id: str,
    message: ChatMessage,
    current_user=Depends(get_current_user)
):
    """Send a message to a bot and get response"""
    try:
        await verify_bot_ownership(bot_id, current_user["id"])
        
        # Get recent conversation history for context
        conversation_history = await chat_service.get_conversation_history(
            bot_id=bot_id,
            user_id=current_user["id"],
            limit=10
        )
        
        # Process the chat message
        response = await chat_service.chat(
            message=message.content,
            bot_id=bot_id,
            user_id=current_user["id"],
            conversation_history=conversation_history
        )
        
        return ChatResponse(
            message=response["message"],
            sources=response.get("sources"),
            timestamp=response["timestamp"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing chat message: {str(e)}"
        )

@router.get("/{bot_id}/history", response_model=List[ChatHistory])
async def get_chat_history(
    bot_id: str,
    limit: int = 50,
    current_user=Depends(get_current_user)
):
    """Get chat history for a bot"""
    try:
        await verify_bot_ownership(bot_id, current_user["id"])
        
        history = await chat_service.get_conversation_history(
            bot_id=bot_id,
            user_id=current_user["id"],
            limit=limit
        )
        
        return [
            ChatHistory(
                id=chat["id"],
                user_message=chat["user_message"],
                bot_response=chat["bot_response"],
                bot_id=chat["bot_id"],
                user_id=chat["user_id"],
                created_at=chat["created_at"],
                sources=chat.get("sources")
            )
            for chat in history
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving chat history: {str(e)}"
        )

@router.delete("/{bot_id}/history")
async def clear_chat_history(
    bot_id: str,
    current_user=Depends(get_current_user)
):
    """Clear chat history for a bot"""
    try:
        await verify_bot_ownership(bot_id, current_user["id"])
        
        success = await chat_service.clear_conversation_history(
            bot_id=bot_id,
            user_id=current_user["id"]
        )
        
        if success:
            return {"message": "Chat history cleared successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to clear chat history"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error clearing chat history: {str(e)}"
        )

@router.post("/{bot_id}/search")
async def search_bot_knowledge(
    bot_id: str,
    query: str,
    top_k: int = 5,
    current_user=Depends(get_current_user)
):
    """Search the bot's knowledge base"""
    try:
        await verify_bot_ownership(bot_id, current_user["id"])
        
        from bots.builder import BotBuilder
        bot_builder = BotBuilder()
        
        results = await bot_builder.search_similar_chunks(
            bot_id=bot_id,
            query=query,
            top_k=top_k
        )
        
        return {
            "query": query,
            "results": results,
            "total_results": len(results)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error searching knowledge base: {str(e)}"
        )

@router.get("/{bot_id}/embed")
async def get_embed_info(
    bot_id: str,
    current_user=Depends(get_current_user)
):
    """Get embed information for a bot (for public sharing)"""
    try:
        await verify_bot_ownership(bot_id, current_user["id"])
        
        bot = await db.get_bot_by_id(bot_id)
        
        return {
            "bot_id": bot_id,
            "bot_name": bot["name"],
            "embed_url": f"/embed/{bot_id}",
            "iframe_code": f'<iframe src="{os.getenv("BASE_URL", "http://localhost:3000")}/embed/{bot_id}" width="400" height="600" frameborder="0"></iframe>'
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting embed info: {str(e)}"
        )

# Public endpoint for embedded chat (no authentication required)
@router.post("/public/{bot_id}")
async def public_chat_with_bot(bot_id: str, message: ChatMessage):
    """Public endpoint for embedded bot chat"""
    try:
        # Verify bot exists
        bot = await db.get_bot_by_id(bot_id)
        if not bot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bot not found"
            )
        
        # Process the chat message without user context
        response = await chat_service.chat(
            message=message.content,
            bot_id=bot_id,
            user_id="anonymous",  # Anonymous user for public access
            conversation_history=[]
        )
        
        return ChatResponse(
            message=response["message"],
            sources=response.get("sources"),
            timestamp=response["timestamp"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing public chat message: {str(e)}"
        )
