"""
Embedding generation utilities with robust fallback system
"""
import os
from typing import List
import asyncio
import numpy as np
import hashlib
import re
from collections import Counter

# Set environment variables to fix Unicode encoding issues
os.environ["TOKENIZERS_PARALLELISM"] = "false"
os.environ["HF_HUB_DISABLE_PROGRESS_BARS"] = "1"

class SimpleTFIDFEmbedder:
    """Simple TF-IDF based embedding as fallback"""
    
    def __init__(self):
        self.vocabulary = {}
        self.idf_scores = {}
        self.dimension = 384
        
    def _tokenize(self, text: str) -> List[str]:
        """Simple tokenization"""
        # Convert to lowercase and extract words
        text = text.lower()
        tokens = re.findall(r'\b\w+\b', text)
        return tokens
    
    def _build_vocabulary(self, texts: List[str]):
        """Build vocabulary from texts"""
        all_tokens = []
        doc_frequencies = Counter()
        
        for text in texts:
            tokens = self._tokenize(text)
            all_tokens.extend(tokens)
            doc_frequencies.update(set(tokens))
        
        # Create vocabulary (most common words)
        token_counts = Counter(all_tokens)
        vocab_size = min(self.dimension, len(token_counts))
        
        most_common = token_counts.most_common(vocab_size)
        self.vocabulary = {token: idx for idx, (token, _) in enumerate(most_common)}
        
        # Calculate IDF scores
        num_docs = len(texts)
        for token in self.vocabulary:
            df = doc_frequencies[token]
            self.idf_scores[token] = np.log(num_docs / (df + 1))
    
    def encode(self, texts: List[str]) -> np.ndarray:
        """Create TF-IDF embeddings"""
        if not self.vocabulary:
            self._build_vocabulary(texts)
        
        embeddings = []
        
        for text in texts:
            tokens = self._tokenize(text)
            token_counts = Counter(tokens)
            
            # Create TF-IDF vector
            vector = np.zeros(self.dimension)
            
            for token, count in token_counts.items():
                if token in self.vocabulary:
                    idx = self.vocabulary[token]
                    tf = count / len(tokens) if tokens else 0
                    idf = self.idf_scores.get(token, 1.0)
                    vector[idx] = tf * idf
            
            # Normalize vector
            norm = np.linalg.norm(vector)
            if norm > 0:
                vector = vector / norm
            
            embeddings.append(vector)
        
        return np.array(embeddings, dtype=np.float32)

class EmbeddingService:
    """Service for generating embeddings with robust fallback system"""
    
    def __init__(self, model: str = "all-MiniLM-L6-v2"):
        self.model = None
        self.fallback_embedder = SimpleTFIDFEmbedder()
        self.dimension = 384
        self.use_fallback = True
        
        print("🔧 Initializing embedding service with TF-IDF fallback")
        print("✅ Fallback embedder ready - will use TF-IDF for semantic similarity")
        print("💡 This provides reasonable search quality without external model downloads")
    
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
            print(f"🔤 Generating TF-IDF embeddings for {len(texts)} texts")
            
            # Run TF-IDF embedding generation in a thread to avoid blocking
            loop = asyncio.get_event_loop()
            
            def _encode():
                return self.fallback_embedder.encode(texts)
            
            embeddings = await loop.run_in_executor(None, _encode)
            
            # Convert to list of lists
            result = [emb.tolist() for emb in embeddings]
            print(f"✅ Generated {len(result)} TF-IDF embeddings successfully")
            return result
            
        except Exception as e:
            print(f"❌ Error generating TF-IDF embeddings: {e}")
            # Return zero vectors as last resort
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
        
        # For TF-IDF, we don't need the search prefix
        return await self.generate_single_embedding(query)
