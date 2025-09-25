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
        self.default_system_prompt = """You are a specialized Legal Research Assistant designed to provide accurate, well-cited legal analysis.

INSTRUCTIONS:
1. Provide responses in the following structured format:
   - Short summary (2-3 sentences)
   - Applicable statutes/articles with exact citations
   - Step-by-step legal reasoning
   - Confidence score (0.0-1.0)

2. For each citation, include:
   - Document title
   - Article/section number
   - Direct quote from the document
   - Chunk reference ID

3. Base your confidence score on:
   - Relevance of found documents (0.3 weight)
   - Clarity of applicable law (0.4 weight) 
   - Completeness of information (0.3 weight)

4. If insufficient information is available, clearly state limitations and suggest what additional information would be needed.

5. Use formal legal language but ensure clarity for legal professionals.

You must ONLY use information from the provided legal documents. Do not add external legal knowledge."""
    
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
            
            # Prepare system prompt for legal analysis
            system_prompt = bot.get("system_prompt", self.default_system_prompt)
            
            if context_text and len(context_chunks) > 0:
                system_prompt += f"\n\nLEGAL DOCUMENTS:\n{context_text}"
                system_prompt += "\n\nAnalyze the user's question using ONLY the above legal documents. Provide a structured response with summary, citations, reasoning, and confidence score."
                print(f"✅ Using legal documents in system prompt")
            else:
                # No context found - return structured response
                return {
                    "message": "I don't have relevant legal documents to answer this question.",
                    "legal_response": {
                        "summary": "No relevant legal documents found in the knowledge base for this query.",
                        "applicable_statutes": [],
                        "reasoning": "Unable to provide legal analysis due to lack of relevant documents. Please ask questions related to the uploaded legal documents.",
                        "confidence_score": 0.0
                    },
                    "sources": [],
                    "timestamp": datetime.utcnow()
                }
            
            # Prepare conversation history
            messages = [{"role": "system", "content": system_prompt}]
            
            # Add conversation history if provided
            if conversation_history:
                for msg in conversation_history[-5:]:  # Last 5 messages for legal context
                    messages.append({"role": "user", "content": msg.get("user_message", "")})
                    messages.append({"role": "assistant", "content": msg.get("bot_response", "")})
            
            # Add current message with legal analysis request
            legal_query = f"""
Question: {message}

Please provide a structured legal analysis with:
1. SUMMARY: Brief 2-3 sentence overview
2. APPLICABLE STATUTES: List each relevant law with exact citations
3. REASONING: Step-by-step legal analysis with chunk references
4. CONFIDENCE: Score from 0.0 to 1.0 based on document relevance, law clarity, and completeness

Format your response clearly with these sections.
"""
            messages.append({"role": "user", "content": legal_query})
            
            # Call Groq API
            response = await self._call_groq(messages)
            
            # Parse the structured response
            legal_response = self._parse_legal_response(response, context_chunks)
            
            # Prepare sources information with legal citations
            sources = self._prepare_legal_sources(context_chunks)
            
            return {
                "message": legal_response.get("summary", response),
                "legal_response": legal_response,
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
        MIN_SIMILARITY_THRESHOLD = 0.0  # Set to 0 to handle zero vector embeddings
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
            print("📭 No chunks included based on similarity - using fallback")
            # Fallback: include at least the first 2 chunks if embeddings are failing
            for i, chunk in enumerate(chunks[:2], 1):
                content = chunk.get("content", "")
                source = chunk.get("source", "Unknown")
                chunk_text = f"[Source {i}: {source}]\n{content}\n"
                
                if total_length + len(chunk_text) <= MAX_CONTEXT_LENGTH:
                    context_parts.append(chunk_text)
                    total_length += len(chunk_text)
                    print(f"  📋 Fallback: Including chunk {i} from {source}")
            
            if not context_parts:
                print("📭 No chunks could be included even with fallback")
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
    
    def _parse_legal_response(self, response: str, context_chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Parse the AI response into structured legal format"""
        try:
            import re
            
            # Initialize default structure
            legal_response = {
                "summary": "",
                "applicable_statutes": [],
                "reasoning": "",
                "confidence_score": 0.5
            }
            
            # Extract summary
            summary_match = re.search(r'SUMMARY:?\s*(.*?)(?=APPLICABLE|REASONING|CONFIDENCE|$)', response, re.IGNORECASE | re.DOTALL)
            if summary_match:
                legal_response["summary"] = summary_match.group(1).strip()
            
            # Extract reasoning
            reasoning_match = re.search(r'REASONING:?\s*(.*?)(?=CONFIDENCE|$)', response, re.IGNORECASE | re.DOTALL)
            if reasoning_match:
                legal_response["reasoning"] = reasoning_match.group(1).strip()
            
            # Extract confidence score
            confidence_match = re.search(r'CONFIDENCE:?\s*([0-9.]+)', response, re.IGNORECASE)
            if confidence_match:
                try:
                    score = float(confidence_match.group(1))
                    legal_response["confidence_score"] = min(max(score, 0.0), 1.0)  # Clamp between 0 and 1
                except ValueError:
                    pass
            
            # Create applicable statutes from context chunks
            statutes = []
            for i, chunk in enumerate(context_chunks[:3]):  # Top 3 chunks
                source = chunk.get("source", "Unknown Document")
                content = chunk.get("content", "")
                chunk_id = chunk.get("id", f"chunk_{i}")
                
                # Try to extract article/section info from content
                article_match = re.search(r'(Article\s+\d+|Section\s+\d+|Chapter\s+\d+)', content, re.IGNORECASE)
                article_section = article_match.group(1) if article_match else "General Provision"
                
                # Get a meaningful quote (first sentence or up to 150 chars)
                sentences = content.split('.')
                direct_quote = sentences[0][:150] + "..." if len(sentences[0]) > 150 else sentences[0]
                if not direct_quote.endswith('.') and len(sentences) > 1:
                    direct_quote += "."
                
                # Calculate confidence based on similarity score and content quality
                similarity_score = chunk.get("similarity_score", 0.0)
                content_quality = min(len(content) / 200, 1.0)  # Quality based on content length
                chunk_confidence = (similarity_score * 0.7 + content_quality * 0.3)
                
                statute = {
                    "document_title": source,
                    "article_section": article_section,
                    "chunk_id": chunk_id,
                    "direct_quote": direct_quote,
                    "confidence_score": chunk_confidence
                }
                
                # Add page number if available
                if chunk.get("page"):
                    statute["page"] = chunk.get("page")
                
                statutes.append(statute)
            
            legal_response["applicable_statutes"] = statutes
            
            # If no summary was extracted, create one from the response
            if not legal_response["summary"]:
                # Take first few sentences as summary
                sentences = response.split('.')[:2]
                legal_response["summary"] = '. '.join(sentences) + '.' if sentences else response[:200] + "..."
            
            # If no reasoning was extracted, use the full response
            if not legal_response["reasoning"]:
                legal_response["reasoning"] = response
            
            return legal_response
            
        except Exception as e:
            print(f"Error parsing legal response: {e}")
            # Return fallback structure
            return {
                "summary": response[:200] + "..." if len(response) > 200 else response,
                "applicable_statutes": [],
                "reasoning": response,
                "confidence_score": 0.3
            }
    
    def _prepare_legal_sources(self, chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Prepare legal sources with enhanced citation information"""
        sources = []
        seen_sources = set()
        
        for chunk in chunks:
            source = chunk.get("source", "Unknown")
            if source not in seen_sources:
                source_info = {
                    "filename": source,
                    "content_preview": chunk.get("content", "")[:300] + "...",
                    "similarity_score": chunk.get("similarity_score", 0),
                    "chunk_id": chunk.get("id", "unknown"),
                    "page": chunk.get("page", 1)
                }
                
                # Add legal-specific metadata
                content = chunk.get("content", "")
                
                # Try to extract article/section
                import re
                article_match = re.search(r'(Article\s+\d+|Section\s+\d+|Chapter\s+\d+)', content, re.IGNORECASE)
                if article_match:
                    source_info["article_section"] = article_match.group(1)
                
                # Add source URL if available (for web scraped content)
                if chunk.get("source_url"):
                    source_info["source_url"] = chunk.get("source_url")
                
                sources.append(source_info)
                seen_sources.add(source)
        
        return sources[:5]  # Return top 5 legal sources
    
    async def _call_groq(self, messages: List[Dict[str, str]]) -> str:
        """Call Groq API and return response"""
        try:
            chat_completion = self.groq_client.chat.completions.create(
                messages=messages,
                model="llama-3.1-8b-instant",  # Updated Groq model
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
