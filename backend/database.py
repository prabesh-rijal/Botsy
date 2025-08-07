"""
Database configuration and Supabase client setup
"""
import os
from dotenv import load_dotenv
from supabase import create_client, Client
from typing import Optional

# Load environment variables from .env file
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # Use service role key for backend

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables")

# Create Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

class Database:
    """Database operations using Supabase"""
    
    def __init__(self):
        self.client = supabase
    
    async def get_user_by_id(self, user_id: str):
        """Get user by ID"""
        response = self.client.table("users").select("*").eq("id", user_id).execute()
        return response.data[0] if response.data else None
    
    async def get_user_by_email(self, email: str):
        """Get user by email"""
        response = self.client.table("users").select("*").eq("email", email).execute()
        return response.data[0] if response.data else None
    
    async def create_user(self, user_data: dict):
        """Create a new user"""
        response = self.client.table("users").insert(user_data).execute()
        return response.data[0] if response.data else None
    
    async def update_user(self, user_id: str, updates: dict):
        """Update user"""
        response = self.client.table("users").update(updates).eq("id", user_id).execute()
        return response.data[0] if response.data else None
    
    async def get_user_bots(self, user_id: str):
        """Get all bots for a user"""
        response = self.client.table("bots").select("*").eq("user_id", user_id).execute()
        return response.data
    
    async def create_bot(self, bot_data: dict):
        """Create a new bot"""
        response = self.client.table("bots").insert(bot_data).execute()
        return response.data[0] if response.data else None
    
    async def get_bot_by_id(self, bot_id: str):
        """Get bot by ID"""
        response = self.client.table("bots").select("*").eq("id", bot_id).execute()
        return response.data[0] if response.data else None
    
    async def update_bot(self, bot_id: str, updates: dict):
        """Update bot"""
        response = self.client.table("bots").update(updates).eq("id", bot_id).execute()
        return response.data[0] if response.data else None
    
    async def delete_bot(self, bot_id: str):
        """Delete bot"""
        response = self.client.table("bots").delete().eq("id", bot_id).execute()
        return response.data
    
    async def create_document(self, document_data: dict):
        """Create a new document record"""
        response = self.client.table("documents").insert(document_data).execute()
        return response.data[0] if response.data else None
    
    async def get_bot_documents(self, bot_id: str):
        """Get all documents for a bot"""
        response = self.client.table("documents").select("*").eq("bot_id", bot_id).execute()
        return response.data
    
    async def delete_document(self, document_id: str):
        """Delete a document by ID"""
        response = self.client.table("documents").delete().eq("id", document_id).execute()
        return len(response.data) > 0  # Return True if document was deleted
    
    async def save_chat_history(self, chat_data: dict):
        """Save chat history"""
        response = self.client.table("chat_history").insert(chat_data).execute()
        return response.data[0] if response.data else None
    
    async def get_chat_history(self, bot_id: str, user_id: str, limit: int = 50):
        """Get chat history for a bot and user"""
        response = (
            self.client.table("chat_history")
            .select("*")
            .eq("bot_id", bot_id)
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return response.data

    # Widget methods (simplified)
    async def create_widget(self, widget_data: dict):
        """Create a new widget"""
        response = self.client.table("widgets").insert(widget_data).execute()
        return response.data[0] if response.data else None
    
    async def get_widget_by_id(self, widget_id: str):
        """Get widget by ID"""
        response = self.client.table("widgets").select("*").eq("id", widget_id).execute()
        return response.data[0] if response.data else None
    
    async def get_bot_widgets(self, bot_id: str):
        """Get all widgets for a bot (should be only one in simplified version)"""
        response = self.client.table("widgets").select("*").eq("bot_id", bot_id).execute()
        return response.data
    
    async def update_widget(self, widget_id: str, updates: dict):
        """Update widget"""
        response = self.client.table("widgets").update(updates).eq("id", widget_id).execute()
        return response.data[0] if response.data else None
    
    async def delete_widget(self, widget_id: str):
        """Delete widget"""
        response = self.client.table("widgets").delete().eq("id", widget_id).execute()
        return response.data
    
    async def update_document(self, document_id: str, updates: dict):
        """Update document"""
        response = self.client.table("documents").update(updates).eq("id", document_id).execute()
        return response.data[0] if response.data else None

# Global database instance
db = Database()
