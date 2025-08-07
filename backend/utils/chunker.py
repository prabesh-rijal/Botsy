"""
Text chunking utilities for processing documents
"""
try:
    import tiktoken
except ImportError:
    print("Warning: tiktoken not installed. Install with: pip install tiktoken")
    tiktoken = None

from typing import List, Dict, Any
import re

class DocumentChunker:
    """Document chunking service for breaking down text into manageable pieces"""
    
    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200, model: str = "gpt-3.5-turbo"):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        if tiktoken:
            self.encoding = tiktoken.encoding_for_model(model)
        else:
            self.encoding = None
    
    def chunk_text(self, text: str, source: str = "unknown") -> List[Dict[str, Any]]:
        """
        Split text into chunks with overlap
        
        Args:
            text: The text to chunk
            source: Source identifier (filename, URL, etc.)
            
        Returns:
            List of chunk dictionaries with metadata
        """
        # Clean the text
        text = self._clean_text(text)
        
        # Split into sentences first
        sentences = self._split_into_sentences(text)
        
        chunks = []
        current_chunk = ""
        current_tokens = 0
        
        for sentence in sentences:
            if self.encoding:
                sentence_tokens = len(self.encoding.encode(sentence))
            else:
                # Fallback: estimate tokens as words * 1.3
                sentence_tokens = int(len(sentence.split()) * 1.3)
            
            # If adding this sentence would exceed chunk size, save current chunk
            if current_tokens + sentence_tokens > self.chunk_size and current_chunk:
                chunks.append(self._create_chunk(current_chunk, source, len(chunks)))
                
                # Start new chunk with overlap
                overlap_text = self._get_overlap_text(current_chunk)
                current_chunk = overlap_text + " " + sentence if overlap_text else sentence
                if self.encoding:
                    current_tokens = len(self.encoding.encode(current_chunk))
                else:
                    current_tokens = int(len(current_chunk.split()) * 1.3)
            else:
                # Add sentence to current chunk
                current_chunk += " " + sentence if current_chunk else sentence
                current_tokens += sentence_tokens
        
        # Add the last chunk if it has content
        if current_chunk.strip():
            chunks.append(self._create_chunk(current_chunk, source, len(chunks)))
        
        return chunks
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize text"""
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove special characters but keep punctuation
        text = re.sub(r'[^\w\s\.\,\!\?\;\:\-\(\)\[\]\{\}\"\'\/]', '', text)
        
        # Remove multiple consecutive periods
        text = re.sub(r'\.{3,}', '...', text)
        
        return text.strip()
    
    def _split_into_sentences(self, text: str) -> List[str]:
        """Split text into sentences using regex"""
        # Basic sentence splitting - can be improved with more sophisticated NLP
        sentences = re.split(r'(?<=[.!?])\s+', text)
        
        # Filter out very short sentences
        sentences = [s.strip() for s in sentences if len(s.strip()) > 10]
        
        return sentences
    
    def _get_overlap_text(self, text: str) -> str:
        """Get overlap text from the end of current chunk"""
        if self.encoding:
            tokens = self.encoding.encode(text)
            overlap_tokens = tokens[-self.chunk_overlap:] if len(tokens) > self.chunk_overlap else tokens
            return self.encoding.decode(overlap_tokens)
        else:
            # Fallback: use character-based overlap
            overlap_chars = min(self.chunk_overlap * 4, len(text))  # Estimate 4 chars per token
            return text[-overlap_chars:] if overlap_chars < len(text) else text
    
    def _create_chunk(self, content: str, source: str, index: int) -> Dict[str, Any]:
        """Create a chunk dictionary with metadata"""
        if self.encoding:
            token_count = len(self.encoding.encode(content))
        else:
            token_count = int(len(content.split()) * 1.3)  # Estimate
            
        return {
            "content": content.strip(),
            "source": source,
            "chunk_index": index,
            "token_count": token_count,
            "char_count": len(content)
        }
    
    def chunk_by_paragraphs(self, text: str, source: str = "unknown") -> List[Dict[str, Any]]:
        """
        Alternative chunking method that respects paragraph boundaries
        """
        paragraphs = text.split('\n\n')
        chunks = []
        current_chunk = ""
        
        for paragraph in paragraphs:
            paragraph = paragraph.strip()
            if not paragraph:
                continue

            if self.encoding:
                paragraph_tokens = len(self.encoding.encode(paragraph))
                current_tokens = len(self.encoding.encode(current_chunk))
            else:
                paragraph_tokens = int(len(paragraph.split()) * 1.3)
                current_tokens = int(len(current_chunk.split()) * 1.3)            # If paragraph alone exceeds chunk size, split it
            if paragraph_tokens > self.chunk_size:
                if current_chunk:
                    chunks.append(self._create_chunk(current_chunk, source, len(chunks)))
                    current_chunk = ""
                
                # Split large paragraph into smaller chunks
                paragraph_chunks = self.chunk_text(paragraph, source)
                chunks.extend(paragraph_chunks)
            
            # If adding paragraph would exceed chunk size, save current chunk
            elif current_tokens + paragraph_tokens > self.chunk_size and current_chunk:
                chunks.append(self._create_chunk(current_chunk, source, len(chunks)))
                current_chunk = paragraph
            else:
                current_chunk += "\n\n" + paragraph if current_chunk else paragraph
        
        # Add the last chunk
        if current_chunk.strip():
            chunks.append(self._create_chunk(current_chunk, source, len(chunks)))
        
        return chunks
    
    def get_chunk_stats(self, chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Get statistics about the chunks"""
        if not chunks:
            return {"total_chunks": 0, "total_tokens": 0, "avg_tokens": 0}
        
        total_tokens = sum(chunk["token_count"] for chunk in chunks)
        avg_tokens = total_tokens / len(chunks)
        
        return {
            "total_chunks": len(chunks),
            "total_tokens": total_tokens,
            "avg_tokens": round(avg_tokens, 2),
            "min_tokens": min(chunk["token_count"] for chunk in chunks),
            "max_tokens": max(chunk["token_count"] for chunk in chunks)
        }
