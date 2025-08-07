"""
Embedding generation utilities using free sentence transformers
"""
import os
from typing import List
import asyncio
import numpy as np
from sentence_transformers import SentenceTransformer

class EmbeddingService:
    """Service for generating embeddings using free sentence transformers"""
    
    def __init__(self, model: str = "all-MiniLM-L6-v2"):
        # Use a free, lightweight embedding model
        self.model = SentenceTransformer(model)
        self.dimension = 384  # all-MiniLM-L6-v2 dimension
    
    async def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for a list of texts
        
        Args:
            texts: List of text strings to embed
            
        Returns:
            List of embedding vectors
        """
        if not texts:
            return []
        
        try:
            # Run embedding generation in a thread to avoid blocking
            import asyncio
            loop = asyncio.get_event_loop()
            
            def _encode():
                return self.model.encode(texts, convert_to_tensor=False)
            
            embeddings = await loop.run_in_executor(None, _encode)
            
            # Convert to list of lists
            return [emb.tolist() for emb in embeddings]
            
        except Exception as e:
            print(f"Error generating embeddings: {e}")
            # Return zero vectors as fallback
            return [[0.0] * self.dimension for _ in texts]
    
    async def generate_single_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for a single text
        
        Args:
            text: Text string to embed
            
        Returns:
            Embedding vector
        """
        embeddings = await self.generate_embeddings([text])
        return embeddings[0] if embeddings else [0.0] * self.dimension
    
    async def generate_embeddings_batch(self, texts: List[str], batch_size: int = 100) -> List[List[float]]:
        """
        Generate embeddings in batches to handle large lists
        
        Args:
            texts: List of text strings to embed
            batch_size: Number of texts to process per batch
            
        Returns:
            List of embedding vectors
        """
        all_embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            batch_embeddings = await self.generate_embeddings(batch)
            all_embeddings.extend(batch_embeddings)
            
            # Small delay to avoid overloading
            if i + batch_size < len(texts):
                await asyncio.sleep(0.1)
        
        return all_embeddings
    
    def cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """
        Calculate cosine similarity between two vectors
        
        Args:
            vec1: First vector
            vec2: Second vector
            
        Returns:
            Cosine similarity score
        """
        try:
            vec1_np = np.array(vec1)
            vec2_np = np.array(vec2)
            
            dot_product = np.dot(vec1_np, vec2_np)
            norm1 = np.linalg.norm(vec1_np)
            norm2 = np.linalg.norm(vec2_np)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            return dot_product / (norm1 * norm2)
        except Exception:
            return 0.0
    
    def find_most_similar(self, query_embedding: List[float], embeddings: List[List[float]], top_k: int = 5) -> List[tuple]:
        """
        Find the most similar embeddings to a query embedding
        
        Args:
            query_embedding: Query vector
            embeddings: List of vectors to search
            top_k: Number of top results to return
            
        Returns:
            List of (index, similarity_score) tuples
        """
        similarities = []
        
        for i, embedding in enumerate(embeddings):
            similarity = self.cosine_similarity(query_embedding, embedding)
            similarities.append((i, similarity))
        
        # Sort by similarity score in descending order
        similarities.sort(key=lambda x: x[1], reverse=True)
        
        return similarities[:top_k]
    
    def normalize_embedding(self, embedding: List[float]) -> List[float]:
        """
        Normalize an embedding vector to unit length
        
        Args:
            embedding: Vector to normalize
            
        Returns:
            Normalized vector
        """
        try:
            vec = np.array(embedding)
            norm = np.linalg.norm(vec)
            
            if norm == 0:
                return embedding
            
            normalized = vec / norm
            return normalized.tolist()
        except Exception:
            return embedding
    
    async def embed_query_for_search(self, query: str) -> List[float]:
        """
        Prepare a query embedding for search, with query optimization
        
        Args:
            query: Search query string
            
        Returns:
            Optimized query embedding
        """
        # Simple query preprocessing
        query = query.strip()
        
        # Add search context prefix to improve relevance
        search_query = f"search query: {query}"
        
        return await self.generate_single_embedding(search_query)
