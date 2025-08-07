"""
Bot management router
"""
from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File
from typing import List
from models import BotCreate, BotUpdate, BotResponse, DocumentResponse, MessageResponse
from auth.auth import get_current_user, verify_bot_ownership
from database import db
from bots.builder import BotBuilder
from utils.file import FileProcessor
import uuid
from datetime import datetime
import os
import tempfile

router = APIRouter()
bot_builder = BotBuilder()
file_processor = FileProcessor()

@router.get("/", response_model=List[BotResponse])
async def get_user_bots(current_user=Depends(get_current_user)):
    """Get all bots for the current user"""
    try:
        bots = await db.get_user_bots(current_user["id"])
        
        bot_responses = []
        for bot in bots:
            # Get bot stats
            stats = await bot_builder.get_bot_stats(bot["id"])
            
            bot_responses.append(BotResponse(
                id=bot["id"],
                name=bot["name"],
                description=bot.get("description"),
                system_prompt=bot.get("system_prompt"),
                user_id=bot["user_id"],
                created_at=datetime.fromisoformat(bot["created_at"]),
                updated_at=datetime.fromisoformat(bot.get("updated_at", bot["created_at"])),
                document_count=stats.get("total_documents", 0)
            ))
        
        return bot_responses
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving bots: {str(e)}"
        )

@router.post("/", response_model=BotResponse)
async def create_bot(bot_data: BotCreate, current_user=Depends(get_current_user)):
    """Create a new bot"""
    try:
        bot_create_data = {
            "id": str(uuid.uuid4()),
            "name": bot_data.name,
            "description": bot_data.description,
            "system_prompt": bot_data.system_prompt,
            "user_id": current_user["id"],
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        created_bot = await db.create_bot(bot_create_data)
        
        if not created_bot:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create bot"
            )
        
        return BotResponse(
            id=created_bot["id"],
            name=created_bot["name"],
            description=created_bot.get("description"),
            system_prompt=created_bot.get("system_prompt"),
            user_id=created_bot["user_id"],
            created_at=datetime.fromisoformat(created_bot["created_at"]),
            updated_at=datetime.fromisoformat(created_bot["updated_at"]),
            document_count=0
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating bot: {str(e)}"
        )

@router.get("/{bot_id}", response_model=BotResponse)
async def get_bot(bot_id: str, current_user=Depends(get_current_user)):
    """Get a specific bot"""
    try:
        await verify_bot_ownership(bot_id, current_user["id"])
        
        bot = await db.get_bot_by_id(bot_id)
        stats = await bot_builder.get_bot_stats(bot_id)
        
        return BotResponse(
            id=bot["id"],
            name=bot["name"],
            description=bot.get("description"),
            system_prompt=bot.get("system_prompt"),
            user_id=bot["user_id"],
            created_at=datetime.fromisoformat(bot["created_at"]),
            updated_at=datetime.fromisoformat(bot.get("updated_at", bot["created_at"])),
            document_count=stats.get("total_documents", 0)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving bot: {str(e)}"
        )

@router.put("/{bot_id}", response_model=BotResponse)
async def update_bot(
    bot_id: str,
    bot_update: BotUpdate,
    current_user=Depends(get_current_user)
):
    """Update a bot"""
    try:
        await verify_bot_ownership(bot_id, current_user["id"])
        
        # Prepare update data
        updates = {"updated_at": datetime.utcnow().isoformat()}
        
        if bot_update.name is not None:
            updates["name"] = bot_update.name
        if bot_update.description is not None:
            updates["description"] = bot_update.description
        if bot_update.system_prompt is not None:
            updates["system_prompt"] = bot_update.system_prompt
        
        updated_bot = await db.update_bot(bot_id, updates)
        
        if not updated_bot:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update bot"
            )
        
        stats = await bot_builder.get_bot_stats(bot_id)
        
        return BotResponse(
            id=updated_bot["id"],
            name=updated_bot["name"],
            description=updated_bot.get("description"),
            system_prompt=updated_bot.get("system_prompt"),
            user_id=updated_bot["user_id"],
            created_at=datetime.fromisoformat(updated_bot["created_at"]),
            updated_at=datetime.fromisoformat(updated_bot["updated_at"]),
            document_count=stats.get("total_documents", 0)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating bot: {str(e)}"
        )

@router.delete("/{bot_id}", response_model=MessageResponse)
async def delete_bot(bot_id: str, current_user=Depends(get_current_user)):
    """Delete a bot and all its data"""
    try:
        await verify_bot_ownership(bot_id, current_user["id"])
        
        # Delete bot data from file system
        await bot_builder.delete_bot_data(bot_id)
        
        # Delete bot from database
        await db.delete_bot(bot_id)
        
        return MessageResponse(message="Bot deleted successfully")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting bot: {str(e)}"
        )

@router.post("/{bot_id}/documents", response_model=DocumentResponse)
async def upload_document(
    bot_id: str,
    file: UploadFile = File(...),
    current_user=Depends(get_current_user)
):
    """Upload a document to a bot"""
    try:
        await verify_bot_ownership(bot_id, current_user["id"])
        
        # Validate file
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No file provided"
            )
        
        # Read file content
        file_content = await file.read()
        
        # Save file temporarily for processing
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            temp_file.write(file_content)
            temp_file_path = temp_file.name
        
        try:
            # Validate file
            validation = file_processor.validate_file(temp_file_path, file.filename)
            if not validation["valid"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=validation["error"]
                )
            
            # Process document
            result = await bot_builder.process_document(temp_file_path, file.filename, bot_id)
            
            if not result["success"]:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=result.get("error", "Failed to process document")
                )
            
            # Save document record to database
            document_data = {
                "id": result["document_id"],
                "filename": file.filename,
                "content_type": file.content_type or "application/octet-stream",
                "size": len(file_content),
                "bot_id": bot_id,
                "uploaded_at": datetime.utcnow().isoformat(),
                "processed": True
            }
            
            created_document = await db.create_document(document_data)
            
            return DocumentResponse(
                id=created_document["id"],
                filename=created_document["filename"],
                content_type=created_document["content_type"],
                size=created_document["size"],
                bot_id=created_document["bot_id"],
                uploaded_at=datetime.fromisoformat(created_document["uploaded_at"]),
                processed=created_document["processed"]
            )
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading document: {str(e)}"
        )

@router.post("/{bot_id}/documents/url", response_model=DocumentResponse)
async def upload_document_from_url(
    bot_id: str,
    url_data: dict,
    current_user=Depends(get_current_user)
):
    """Upload a document from URL to a bot"""
    try:
        await verify_bot_ownership(bot_id, current_user["id"])
        
        url = url_data.get("url")
        if not url:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="URL is required"
            )
        
        # Validate URL
        if not url.startswith(("http://", "https://")):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid URL format"
            )
        
        # Create document record
        document_id = str(uuid.uuid4())
        created_document = {
            "id": document_id,
            "filename": f"URL: {url}",  # Store the full URL for better identification
            "content_type": "text/html",
            "size": 0,  # Will be updated after processing
            "bot_id": bot_id,
            "uploaded_at": datetime.utcnow().isoformat(),
            "processed": False
        }
        
        # Save document to database
        await db.create_document(created_document)
        
        # Process URL in background (add to queue or process directly)
        try:
            result = await bot_builder.process_url(url, bot_id)
            if result.get("success"):
                # Mark as processed
                await db.update_document(document_id, {"processed": True})
            else:
                # Mark as failed
                await db.update_document(document_id, {"processed": False})
        except Exception as e:
            print(f"Error processing URL: {e}")
            # Keep document but mark as failed
            await db.update_document(document_id, {"processed": False})
        
        return DocumentResponse(
            id=created_document["id"],
            filename=created_document["filename"],
            content_type=created_document["content_type"],
            size=created_document["size"],
            bot_id=created_document["bot_id"],
            uploaded_at=datetime.fromisoformat(created_document["uploaded_at"]),
            processed=created_document["processed"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading URL: {str(e)}"
        )

@router.get("/{bot_id}/documents", response_model=List[DocumentResponse])
async def get_bot_documents(bot_id: str, current_user=Depends(get_current_user)):
    """Get all documents for a bot"""
    try:
        await verify_bot_ownership(bot_id, current_user["id"])
        
        documents = await db.get_bot_documents(bot_id)
        
        return [
            DocumentResponse(
                id=doc["id"],
                filename=doc["filename"],
                content_type=doc["content_type"],
                size=doc["size"],
                bot_id=doc["bot_id"],
                uploaded_at=datetime.fromisoformat(doc["uploaded_at"]),
                processed=doc["processed"]
            )
            for doc in documents
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving documents: {str(e)}"
        )

@router.delete("/{bot_id}/documents/{document_id}", response_model=MessageResponse)
async def delete_document(
    bot_id: str, 
    document_id: str, 
    current_user=Depends(get_current_user)
):
    """Delete a specific document from a bot"""
    try:
        await verify_bot_ownership(bot_id, current_user["id"])
        
        # Delete document from database
        deleted = await db.delete_document(document_id)
        
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        # Note: For now, we don't remove individual chunks from FAISS index
        # as it would require rebuilding the entire index
        # This is a limitation that could be improved in the future
        
        return MessageResponse(message="Document deleted successfully")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting document: {str(e)}"
        )

@router.post("/{bot_id}/urls")
async def process_url(
    bot_id: str, 
    url_data: dict,  # Expected: {"url": "https://example.com"}
    current_user=Depends(get_current_user)
):
    """Process a URL and add its content to the bot's knowledge base"""
    try:
        await verify_bot_ownership(bot_id, current_user["id"])
        
        url = url_data.get("url")
        if not url:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="URL is required"
            )
        
        # Process URL content
        result = await bot_builder.process_url(url, bot_id)
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("error", "Failed to process URL")
            )
        
        # Save URL record to database as a document
        document_data = {
            "id": result["document_id"],
            "filename": f"URL: {url}",
            "content_type": "text/html",
            "size": result.get("content_length", 0),
            "bot_id": bot_id,
            "uploaded_at": datetime.utcnow().isoformat(),
            "processed": True
        }
        
        created_document = await db.create_document(document_data)
        
        return {
            "success": True,
            "message": f"Successfully processed URL: {url}",
            "document_id": created_document["id"],
            "chunks_created": result.get("chunks_created", 0)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing URL: {str(e)}"
        )

@router.get("/{bot_id}/stats")
async def get_bot_stats(bot_id: str, current_user=Depends(get_current_user)):
    """Get bot statistics"""
    try:
        await verify_bot_ownership(bot_id, current_user["id"])
        
        stats = await bot_builder.get_bot_stats(bot_id)
        
        return {
            "bot_id": bot_id,
            "total_chunks": stats.get("total_chunks", 0),
            "total_documents": stats.get("total_documents", 0),
            "index_size_bytes": stats.get("index_size", 0)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving bot stats: {str(e)}"
        )

@router.post("/{bot_id}/widget")
async def create_bot_widget(
    bot_id: str,
    widget_config: dict,
    current_user=Depends(get_current_user)
):
    """Create or update widget for a bot (one-bot-one-widget)"""
    try:
        await verify_bot_ownership(bot_id, current_user["id"])
        
        # Get bot details
        bot = await db.get_bot_by_id(bot_id)
        if not bot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bot not found"
            )
        
        # Check if widget already exists for this bot
        existing_widgets = await db.get_bot_widgets(bot_id)
        
        widget_data = {
            "bot_id": bot_id,
            "name": widget_config.get("name", f"{bot['name']} Widget"),
            "theme": widget_config.get("theme", "light"),
            "position": widget_config.get("position", "bottom-right"),
            "welcome_message": widget_config.get("welcome_message", "Hi! How can I help you?"),
            "placeholder": widget_config.get("placeholder", "Type your message..."),
            "primary_color": widget_config.get("primary_color", "#3b82f6"),
            "branding_visible": widget_config.get("branding_visible", True),
            "is_active": True,
            "updated_at": datetime.utcnow().isoformat()
        }
        
        if existing_widgets:
            # Update existing widget (one-bot-one-widget)
            widget_id = existing_widgets[0]["id"]
            await db.update_widget(widget_id, widget_data)
            updated_widget = await db.get_widget_by_id(widget_id)
            status_message = "updated"
        else:
            # Create new widget
            widget_id = str(uuid.uuid4())
            widget_data["id"] = widget_id
            
            # Save widget to database (UNIQUE constraint will prevent duplicates)
            try:
                await db.create_widget(widget_data)
                updated_widget = await db.get_widget_by_id(widget_id)
                status_message = "created"
            except Exception as e:
                # If constraint violation, try to update existing
                existing_widgets = await db.get_bot_widgets(bot_id)
                if existing_widgets:
                    widget_id = existing_widgets[0]["id"]
                    await db.update_widget(widget_id, widget_data)
                    updated_widget = await db.get_widget_by_id(widget_id)
                    status_message = "updated"
                else:
                    raise e
        
        # Generate embed code
        embed_code = f"""
<!-- RAG Botsy Widget -->
<script>
  (function() {{
    var widget = document.createElement('script');
    widget.src = '{os.getenv("FRONTEND_URL", "http://localhost:5173")}/widget.js';
    widget.setAttribute('data-widget-id', '{widget_id}');
    widget.setAttribute('data-api-endpoint', '{os.getenv("API_URL", "http://localhost:8000")}/api/widgets');
    document.head.appendChild(widget);
  }})();
</script>
        """.strip()
        
        return {
            "widget_id": widget_id,
            "name": updated_widget["name"],
            "theme": updated_widget["theme"],
            "position": updated_widget["position"],
            "welcome_message": updated_widget["welcome_message"],
            "placeholder": updated_widget["placeholder"],
            "primary_color": updated_widget["primary_color"],
            "branding_visible": updated_widget["branding_visible"],
            "embed_code": embed_code,
            "api_endpoint": f"/api/widgets/{widget_id}/chat",
            "status": status_message
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating widget: {str(e)}"
        )

@router.get("/{bot_id}/widgets")
async def get_bot_widgets(
    bot_id: str,
    current_user=Depends(get_current_user)
):
    """Get all widgets for a bot"""
    try:
        await verify_bot_ownership(bot_id, current_user["id"])
        
        widgets = await db.get_bot_widgets(bot_id)
        
        return [
            {
                "widget_id": widget["id"],
                "name": widget["name"],
                "theme": widget["theme"],
                "position": widget["position"],
                "welcome_message": widget["welcome_message"],
                "placeholder": widget["placeholder"],
                "primary_color": widget["primary_color"],
                "branding_visible": widget["branding_visible"],
                "is_active": widget["is_active"],
                "created_at": widget["created_at"],
                "api_endpoint": f"/api/widgets/{widget['id']}/chat"
            }
            for widget in widgets
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving widgets: {str(e)}"
        )

@router.get("/{bot_id}/api-key")
async def get_bot_api_key(
    bot_id: str,
    current_user=Depends(get_current_user)
):
    """Get API key for bot"""
    try:
        await verify_bot_ownership(bot_id, current_user["id"])
        
        # Generate or retrieve API key for bot
        api_key = await db.get_or_create_bot_api_key(bot_id, current_user["id"])
        
        return {
            "bot_id": bot_id,
            "api_key": api_key,
            "api_endpoint": f"/api/bots/{bot_id}/chat",
            "usage": {
                "monthly_requests": await db.get_bot_monthly_usage(bot_id),
                "total_requests": await db.get_bot_total_usage(bot_id)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving API key: {str(e)}"
        )

@router.get("/{bot_id}/chunks")
async def get_bot_chunks(
    bot_id: str,
    current_user=Depends(get_current_user)
):
    """Get chunks data for a bot to extract URLs and other metadata"""
    try:
        await verify_bot_ownership(bot_id, current_user["id"])
        
        # Get chunks from bot's data directory
        chunks_data = await bot_builder.get_bot_chunks(bot_id)
        
        return chunks_data
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving chunks: {str(e)}"
        )
