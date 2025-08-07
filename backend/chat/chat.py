"""
Chat functionality and management using Groq
"""
from groq import Groq
from typing import List, Dict, Any, Optional
from bots.builder import BotBuilder
from database import db
import os
import uuid
from datetime import datetime

class ChatService:
    """Chat service for handling conversations with bots"""
    
    def __init__(self):
        self.groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        self.bot_builder = BotBuilder()
        self.default_system_prompt = """You are a helpful AI assistant specializing in answering questions based on the provided documents.

RULES:
1. For basic greetings (hi, hello, how are you), respond naturally and warmly
2. For questions about topics in your documents, use ONLY the information from the provided context
3. If asked about something not in your documents, politely say "I don't have information about that in my knowledge base. Please ask questions related to the documents I've been trained on."
4. Be conversational and helpful while staying within the bounds of your knowledge base
5. You can explain and elaborate on information from the documents, but don't add external knowledge

You are knowledgeable about the topics in your documents and can engage in friendly conversation."""
    
    async def chat(self, message: str, bot_id: str, user_id: str, conversation_history: Optional[List[Dict]] = None) -> Dict[str, Any]:
        """Process a chat message and return response"""
        try:
            # Get bot information
            bot = await db.get_bot_by_id(bot_id)
            if not bot:
                raise ValueError("Bot not found")
            
            # Handle basic greetings
            greeting_words = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening']
            if any(greeting.lower() in message.lower() for greeting in greeting_words) and len(message.split()) <= 3:
                bot_name = bot.get('name', 'Assistant')
                return {
                    "message": f"Hello! I'm {bot_name}. How can I help you today?",
                    "sources": [],
                    "timestamp": datetime.utcnow()
                }
            
            # Get relevant context chunks
            context_chunks = await self.bot_builder.search_similar_chunks(
                bot_id=bot_id,
                query=message,
                top_k=5
            )
            
            # Debug logging
            print(f"🔍 Query: {message}")
            print(f"📚 Found {len(context_chunks)} context chunks")
            for i, chunk in enumerate(context_chunks):
                print(f"  Chunk {i+1}: {chunk.get('source', 'unknown')} - {chunk.get('content', '')[:100]}...")
            
            # Prepare context for the LLM
            context_text = self._prepare_context(context_chunks)
            print(f"📝 Context text length: {len(context_text) if context_text else 0}")
            
            # Prepare system prompt
            system_prompt = bot.get("system_prompt", self.default_system_prompt)
            
            if context_text and len(context_chunks) > 0:
                system_prompt += f"\n\nContext information:\n{context_text}"
                system_prompt += "\n\nBased ONLY on the above context, answer the user's question. If the context doesn't contain the answer, say you don't have that information."
                print(f"✅ Using context in system prompt")
            else:
                # No context found - override with restrictive response
                messages = [
                    {"role": "system", "content": "You must respond exactly with: 'I don't have information about that in my knowledge base. Please ask questions related to the documents I've been trained on.'"},
                    {"role": "user", "content": message}
                ]
                response = await self._call_groq(messages)
                print(f"❌ No context found - forced restrictive response")
                
                # Return early with restrictive response
                return {
                    "message": "I don't have information about that in my knowledge base. Please ask questions related to the documents I've been trained on.",
                    "sources": [],
                    "timestamp": datetime.utcnow()
                }
            
            # Prepare conversation history
            messages = [{"role": "system", "content": system_prompt}]
            
            # Add conversation history if provided
            if conversation_history:
                for msg in conversation_history[-10:]:  # Last 10 messages
                    messages.append({"role": "user", "content": msg.get("user_message", "")})
                    messages.append({"role": "assistant", "content": msg.get("bot_response", "")})
            
            # Add current message
            messages.append({"role": "user", "content": message})
            
            # Call Groq API
            response = await self._call_groq(messages)
            
            # Prepare sources information
            sources = self._prepare_sources(context_chunks)
            
            # Save chat history (skip for now to avoid foreign key issues)
            # chat_data = {
            #     "user_message": message,
            #     "bot_response": response,
            #     "bot_id": bot_id,
            #     "user_id": str(uuid.uuid4()) if not user_id or len(user_id) != 36 else user_id,  # Generate UUID if user_id is not valid
            #     "sources": sources,
            #     "created_at": datetime.utcnow().isoformat()
            # }
            # await db.save_chat_history(chat_data)
            
            return {
                "message": response,
                "sources": sources,
                "timestamp": datetime.utcnow()
            }
            
        except Exception as e:
            print(f"❌ Chat error: {e}")
            import traceback
            traceback.print_exc()
            return {
                "message": "I apologize, but I encountered an error while processing your request. Please try again.",
                "error": str(e),
                "timestamp": datetime.utcnow()
            }
    
    def _prepare_context(self, chunks: List[Dict[str, Any]]) -> str:
        """Prepare context text from similar chunks"""
        if not chunks:
            print("📭 No chunks provided")
            return ""

        # Minimum similarity threshold for including chunks
        MIN_SIMILARITY_THRESHOLD = 0.1  # Lower threshold to capture more relevant content
        MAX_CONTEXT_LENGTH = 8000  # Limit context to prevent token overflow
        context_parts = []
        total_length = 0

        for i, chunk in enumerate(chunks, 1):
            source = chunk.get("source", "Unknown")
            content = chunk.get("content", "")
            score = chunk.get("similarity_score", 0)

            # Debug: Print similarity scores
            print(f"Chunk {i}: score={score:.3f}, source={source}, content={content[:50]}...")

            # Only include chunks with reasonable similarity scores
            if score >= MIN_SIMILARITY_THRESHOLD:
                chunk_text = f"[Source {i}: {source}]\n{content}\n"
                
                # Check if adding this chunk would exceed the limit
                if total_length + len(chunk_text) > MAX_CONTEXT_LENGTH:
                    print(f"  ❌ Excluding chunk {i} (would exceed {MAX_CONTEXT_LENGTH} char limit)")
                    break
                
                context_parts.append(chunk_text)
                total_length += len(chunk_text)
                print(f"  ✅ Including chunk {i} (score: {score:.3f} >= {MIN_SIMILARITY_THRESHOLD})")
            else:
                print(f"  ❌ Excluding chunk {i} (score: {score:.3f} < {MIN_SIMILARITY_THRESHOLD})")

        if not context_parts:
            print("📭 No chunks included - similarity too low")
            return ""

        context_text = "\n".join(context_parts)
        print(f"📝 Final context length: {len(context_text)} characters")
        return context_text
    
    def _prepare_sources(self, chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Prepare source information for the response"""
        sources = []
        seen_sources = set()
        
        for chunk in chunks:
            source = chunk.get("source", "Unknown")
            # Remove the strict similarity threshold - include all top results
            if source not in seen_sources:
                source_info = {
                    "filename": source,
                    "content_preview": chunk.get("content", "")[:200] + "...",
                    "similarity_score": chunk.get("similarity_score", 0),
                    "page": chunk.get("page", 1)
                }
                
                # Add source URL if available (for web scraped content)
                if chunk.get("source_url"):
                    source_info["source_url"] = chunk.get("source_url")
                
                sources.append(source_info)
                seen_sources.add(source)
        
        return sources[:3]  # Return top 3 sources
    
    async def _call_groq(self, messages: List[Dict[str, str]]) -> str:
        """Call Groq API and return response"""
        try:
            chat_completion = self.groq_client.chat.completions.create(
                messages=messages,
                model="llama3-8b-8192",  # Free Groq model
                max_tokens=1000,
                temperature=0.7,
                top_p=0.9,
                frequency_penalty=0.0,
                presence_penalty=0.0
            )
            
            return chat_completion.choices[0].message.content.strip()
            
        except Exception as e:
            print(f"Groq API error: {e}")
            raise Exception("Failed to generate response from AI model")
    
    async def get_conversation_history(self, bot_id: str, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get conversation history for a bot and user"""
        try:
            history = await db.get_chat_history(bot_id, user_id, limit)
            return history
        except Exception as e:
            print(f"Error retrieving chat history: {e}")
            return []
    
    async def clear_conversation_history(self, bot_id: str, user_id: str) -> bool:
        """Clear conversation history for a bot and user"""
        # This would require implementing a delete method in the database
        # For now, return True as placeholder
        return True
