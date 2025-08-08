"""
Pydantic models for the RAG Botsy application
"""
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import datetime

# User models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    created_at: datetime

# Bot models
class MenuOption(BaseModel):
    option_name: str
    prompt: str

class BotCreate(BaseModel):
    name: str
    description: Optional[str] = None
    system_prompt: Optional[str] = None
    menu_options: Optional[List[MenuOption]] = None
    greeting_message: Optional[str] = None
    avatar: Optional[str] = None


class BotUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    system_prompt: Optional[str] = None
    menu_options: Optional[List[MenuOption]] = None
    greeting_message: Optional[str] = None
    avatar: Optional[str] = None


class BotResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    system_prompt: Optional[str] = None
    user_id: str
    created_at: datetime
    updated_at: datetime
    document_count: int = 0
    menu_options: Optional[List[MenuOption]] = None
    greeting_message: Optional[str] = None
    avatar: Optional[str] = None

# Document models
class DocumentUpload(BaseModel):
    filename: str
    content_type: str
    size: int

class DocumentResponse(BaseModel):
    id: str
    filename: str
    content_type: str
    size: int
    bot_id: str
    uploaded_at: datetime
    processed: bool = False

# Chat models
class ChatMessage(BaseModel):
    content: str

class ChatResponse(BaseModel):
    message: str
    sources: Optional[List[dict]] = None
    timestamp: datetime

class ChatHistory(BaseModel):
    id: str
    user_message: str
    bot_response: str
    bot_id: str
    user_id: str
    created_at: datetime
    sources: Optional[List[dict]] = None

# Generic response models
class MessageResponse(BaseModel):
    message: str
    success: bool = True

class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
    success: bool = False
