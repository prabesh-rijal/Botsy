"""
Bot builder and management utilities
"""
import os
import json
import uuid
import shutil
from typing import List, Dict, Any
from pathlib import Path
from utils.chunker import DocumentChunker
from utils.embedder import EmbeddingService
from utils.file import FileProcessor
import faiss
import numpy as np

class BotBuilder:
    """Bot building and management service"""
    
    def __init__(self):
        self.chunker = DocumentChunker()
        self.embedder = EmbeddingService()
        self.file_processor = FileProcessor()
        self.data_dir = Path("data")
        self.data_dir.mkdir(exist_ok=True)
    
    def get_bot_data_path(self, bot_id: str) -> Path:
        """Get the data directory path for a bot"""
        bot_path = self.data_dir / bot_id
        bot_path.mkdir(parents=True, exist_ok=True)
        return bot_path
    
    def get_faiss_index_path(self, bot_id: str) -> Path:
        """Get FAISS index file path"""
        return self.get_bot_data_path(bot_id) / "faiss.index"
    
    def get_chunks_file_path(self, bot_id: str) -> Path:
        """Get chunks JSON file path"""
        return self.get_bot_data_path(bot_id) / "chunks.json"
    
    async def process_document(self, file_path: str, filename: str, bot_id: str) -> Dict[str, Any]:
        """Process a document and add it to the bot's knowledge base"""
        try:
            print(f"📄 Processing document: {filename} for bot {bot_id}")
            
            # Extract text from the file
            text_content = await self.file_processor.extract_text(file_path, filename)
            print(f"📝 Extracted {len(text_content)} characters")
            
            # Chunk the text
            chunks = self.chunker.chunk_text(text_content, filename)
            print(f"🔢 Created {len(chunks)} chunks")
            
            # Generate embeddings
            embeddings = await self.embedder.generate_embeddings([chunk["content"] for chunk in chunks])
            print(f"🧠 Generated {len(embeddings)} embeddings")
            
            # Add chunks with embeddings
            for i, chunk in enumerate(chunks):
                chunk["embedding"] = embeddings[i]
                chunk["id"] = str(uuid.uuid4())
            
            # Add to bot's knowledge base
            await self._add_chunks_to_bot(bot_id, chunks)
            print(f"✅ Added {len(chunks)} chunks to bot {bot_id}")
            
            return {
                "success": True,
                "chunks_added": len(chunks),
                "document_id": str(uuid.uuid4())
            }
            
        except Exception as e:
            print(f"❌ Error processing document {filename}: {e}")
            import traceback
            traceback.print_exc()
            return {
                "success": False,
                "error": str(e)
            }
    
    async def process_url(self, url: str, bot_id: str) -> Dict[str, Any]:
        """Process a URL and add its content to the bot's knowledge base"""
        try:
            print(f"🌐 Processing URL: {url} for bot {bot_id}")
            
            import requests
            from bs4 import BeautifulSoup
            
            # Fetch the webpage
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            print(f"📥 Fetched {len(response.content)} bytes from {url}")
            
            # Parse HTML and extract text
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style"]):
                script.decompose()
            
            # Get text content
            text_content = soup.get_text()
            
            # Clean up text
            lines = (line.strip() for line in text_content.splitlines())
            chunks_text = '\n'.join(chunk for chunk in lines if chunk)
            print(f"📝 Extracted {len(chunks_text)} characters of text")
            
            # Chunk the text
            chunks = self.chunker.chunk_text(chunks_text, f"URL: {url}")
            print(f"🔢 Created {len(chunks)} chunks from URL")
            
            # Generate embeddings
            embeddings = await self.embedder.generate_embeddings([chunk["content"] for chunk in chunks])
            
            # Add chunks with embeddings
            for i, chunk in enumerate(chunks):
                chunk["embedding"] = embeddings[i]
                chunk["id"] = str(uuid.uuid4())
                chunk["source_url"] = url
            
            # Add to bot's knowledge base
            await self._add_chunks_to_bot(bot_id, chunks)
            
            return {
                "success": True,
                "chunks_created": len(chunks),
                "document_id": str(uuid.uuid4()),
                "content_length": len(chunks_text)
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def _add_chunks_to_bot(self, bot_id: str, new_chunks: List[Dict[str, Any]]):
        """Add chunks to bot's FAISS index and chunks file"""
        bot_path = self.get_bot_data_path(bot_id)
        faiss_path = self.get_faiss_index_path(bot_id)
        chunks_path = self.get_chunks_file_path(bot_id)
        
        # Load existing chunks or create new list
        existing_chunks = []
        if chunks_path.exists():
            with open(chunks_path, 'r', encoding='utf-8') as f:
                existing_chunks = json.load(f)
        
        # Load or create FAISS index
        dimension = 384  # Free embedding model dimension
        if faiss_path.exists():
            index = faiss.read_index(str(faiss_path))
        else:
            index = faiss.IndexFlatIP(dimension)
        
        # Prepare embeddings for FAISS (normalize for cosine similarity)
        embeddings = np.array([chunk["embedding"] for chunk in new_chunks]).astype('float32')
        
        # Normalize embeddings for cosine similarity with IndexFlatIP
        faiss.normalize_L2(embeddings)
        
        # Add to FAISS index
        index.add(embeddings)
        
        # Combine chunks (remove embeddings from JSON for storage efficiency)
        chunks_for_storage = []
        for chunk in new_chunks:
            chunk_copy = chunk.copy()
            del chunk_copy["embedding"]  # Don't store embeddings in JSON
            chunks_for_storage.append(chunk_copy)
        
        all_chunks = existing_chunks + chunks_for_storage
        
        # Save updated FAISS index
        faiss.write_index(index, str(faiss_path))
        
        # Save updated chunks
        with open(chunks_path, 'w', encoding='utf-8') as f:
            json.dump(all_chunks, f, ensure_ascii=False, indent=2)
    
    async def search_similar_chunks(self, bot_id: str, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Search for similar chunks in the bot's knowledge base"""
        faiss_path = self.get_faiss_index_path(bot_id)
        chunks_path = self.get_chunks_file_path(bot_id)
        
        print(f"🔍 Searching for bot {bot_id}")
        print(f"📁 FAISS path: {faiss_path}")
        print(f"📁 Chunks path: {chunks_path}")
        print(f"📁 FAISS exists: {faiss_path.exists()}")
        print(f"📁 Chunks exists: {chunks_path.exists()}")
        
        if not faiss_path.exists() or not chunks_path.exists():
            print(f"❌ Missing files for bot {bot_id}")
            return []
        
        try:
            # Load FAISS index and chunks
            index = faiss.read_index(str(faiss_path))
            with open(chunks_path, 'r', encoding='utf-8') as f:
                chunks = json.load(f)
            
            print(f"📊 Loaded {len(chunks)} chunks from storage")
            print(f"🔢 FAISS index has {index.ntotal} vectors")
            
            # Generate embedding for query
            query_embedding = await self.embedder.generate_embeddings([query])
            query_vector = np.array(query_embedding).astype('float32')
            
            # Normalize query vector for cosine similarity
            faiss.normalize_L2(query_vector)
            
            # Search in FAISS
            scores, indices = index.search(query_vector, min(top_k, len(chunks)))
            
            print(f"🎯 Search results: {len(scores[0])} matches")
            print(f"📈 Top scores: {scores[0][:3]}")
            
            # Return matching chunks with scores
            results = []
            
            for score, idx in zip(scores[0], indices[0]):
                if idx < len(chunks):
                    chunk = chunks[idx].copy()
                    chunk["similarity_score"] = float(score)
                    results.append(chunk)
                    print(f"  📄 Match {len(results)}: {chunk.get('source', 'unknown')} (score: {score:.3f})")
            
            print(f"✅ Returning {len(results)} results")
            return results
            
        except Exception as e:
            print(f"❌ Error searching chunks: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    async def delete_bot_data(self, bot_id: str):
        """Delete all data for a bot"""
        bot_path = self.get_bot_data_path(bot_id)
        if bot_path.exists():
            shutil.rmtree(bot_path)
    
    async def get_bot_stats(self, bot_id: str) -> Dict[str, Any]:
        """Get statistics about a bot's knowledge base"""
        chunks_path = self.get_chunks_file_path(bot_id)
        
        if not chunks_path.exists():
            return {
                "total_chunks": 0,
                "total_documents": 0,
                "index_size": 0
            }
        
        try:
            with open(chunks_path, 'r', encoding='utf-8') as f:
                chunks = json.load(f)
            
            documents = set(chunk.get("source", "") for chunk in chunks)
            
            faiss_path = self.get_faiss_index_path(bot_id)
            index_size = faiss_path.stat().st_size if faiss_path.exists() else 0
            
            return {
                "total_chunks": len(chunks),
                "total_documents": len(documents),
                "index_size": index_size
            }
            
        except Exception as e:
            print(f"Error getting bot stats: {e}")
            return {
                "total_chunks": 0,
                "total_documents": 0,
                "index_size": 0
            }

    async def get_bot_chunks(self, bot_id: str) -> List[Dict[str, Any]]:
        """Get all chunks for a bot"""
        chunks_path = self.get_chunks_file_path(bot_id)
        
        if not chunks_path.exists():
            return []
        
        try:
            with open(chunks_path, 'r', encoding='utf-8') as f:
                chunks = json.load(f)
            return chunks
        except Exception as e:
            print(f"Error reading chunks for bot {bot_id}: {e}")
            return []
