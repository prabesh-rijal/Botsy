"""
File processing utilities for handling various document types
"""
import os
import mimetypes
from typing import Dict, Any, Optional
from pathlib import Path
import PyPDF2
import docx
import aiofiles

class FileProcessor:
    """Service for processing various file types and extracting text content"""
    
    def __init__(self):
        self.supported_types = {
            'application/pdf': self._extract_pdf,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': self._extract_docx,
            'text/plain': self._extract_text,
            'text/markdown': self._extract_text,
            'text/html': self._extract_html,
        }
    
    async def extract_text(self, file_path: str, filename: str) -> str:
        """
        Extract text content from a file
        
        Args:
            file_path: Path to the file
            filename: Original filename for type detection
            
        Returns:
            Extracted text content
        """
        try:
            # Determine file type
            mime_type = self._get_mime_type(file_path, filename)
            
            if mime_type not in self.supported_types:
                raise ValueError(f"Unsupported file type: {mime_type}")
            
            # Extract text using appropriate method
            extractor = self.supported_types[mime_type]
            text = await extractor(file_path)
            
            return text
            
        except Exception as e:
            raise Exception(f"Error extracting text from {filename}: {str(e)}")
    
    def _get_mime_type(self, file_path: str, filename: str) -> str:
        """Determine MIME type of file"""
        # First try by filename extension
        mime_type, _ = mimetypes.guess_type(filename)
        
        if mime_type:
            return mime_type
        
        # Try by file extension as fallback
        extension = Path(filename).suffix.lower()
        extension_map = {
            '.pdf': 'application/pdf',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.txt': 'text/plain',
            '.md': 'text/markdown',
            '.html': 'text/html',
            '.htm': 'text/html',
        }
        
        return extension_map.get(extension, 'application/octet-stream')
    
    async def _extract_pdf(self, file_path: str) -> str:
        """Extract text from PDF file"""
        try:
            text_content = []
            
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                
                for page_num, page in enumerate(pdf_reader.pages):
                    try:
                        text = page.extract_text()
                        if text.strip():
                            text_content.append(text)
                    except Exception as e:
                        print(f"Error extracting text from page {page_num + 1}: {e}")
                        continue
            
            return '\n\n'.join(text_content)
            
        except Exception as e:
            raise Exception(f"Error reading PDF file: {str(e)}")
    
    async def _extract_docx(self, file_path: str) -> str:
        """Extract text from DOCX file"""
        try:
            doc = docx.Document(file_path)
            text_content = []
            
            for paragraph in doc.paragraphs:
                if paragraph.text.strip():
                    text_content.append(paragraph.text)
            
            return '\n\n'.join(text_content)
            
        except Exception as e:
            raise Exception(f"Error reading DOCX file: {str(e)}")
    
    async def _extract_text(self, file_path: str) -> str:
        """Extract text from plain text files"""
        try:
            async with aiofiles.open(file_path, mode='r', encoding='utf-8') as file:
                content = await file.read()
                return content
        except UnicodeDecodeError:
            # Try with different encoding
            try:
                async with aiofiles.open(file_path, mode='r', encoding='latin-1') as file:
                    content = await file.read()
                    return content
            except Exception as e:
                raise Exception(f"Error reading text file: {str(e)}")
        except Exception as e:
            raise Exception(f"Error reading text file: {str(e)}")
    
    async def _extract_html(self, file_path: str) -> str:
        """Extract text from HTML files"""
        try:
            from bs4 import BeautifulSoup
            
            async with aiofiles.open(file_path, mode='r', encoding='utf-8') as file:
                content = await file.read()
            
            soup = BeautifulSoup(content, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style"]):
                script.decompose()
            
            # Extract text
            text = soup.get_text()
            
            # Clean up whitespace
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            text = '\n'.join(chunk for chunk in chunks if chunk)
            
            return text
            
        except ImportError:
            # Fallback if BeautifulSoup is not available
            return await self._extract_text(file_path)
        except Exception as e:
            raise Exception(f"Error reading HTML file: {str(e)}")
    
    def get_file_info(self, file_path: str, filename: str) -> Dict[str, Any]:
        """Get information about a file"""
        try:
            stat = os.stat(file_path)
            mime_type = self._get_mime_type(file_path, filename)
            
            return {
                "filename": filename,
                "size": stat.st_size,
                "mime_type": mime_type,
                "is_supported": mime_type in self.supported_types,
                "modified_time": stat.st_mtime
            }
        except Exception as e:
            return {
                "filename": filename,
                "error": str(e),
                "is_supported": False
            }
    
    def validate_file(self, file_path: str, filename: str, max_size: int = 10 * 1024 * 1024) -> Dict[str, Any]:
        """
        Validate file for processing
        
        Args:
            file_path: Path to file
            filename: Original filename
            max_size: Maximum file size in bytes (default 10MB)
            
        Returns:
            Validation result
        """
        try:
            # Check if file exists
            if not os.path.exists(file_path):
                return {"valid": False, "error": "File does not exist"}
            
            # Get file info
            file_info = self.get_file_info(file_path, filename)
            
            if "error" in file_info:
                return {"valid": False, "error": file_info["error"]}
            
            # Check file size
            if file_info["size"] > max_size:
                return {"valid": False, "error": f"File size exceeds {max_size} bytes"}
            
            # Check if file type is supported
            if not file_info["is_supported"]:
                return {"valid": False, "error": f"Unsupported file type: {file_info['mime_type']}"}
            
            return {"valid": True, "file_info": file_info}
            
        except Exception as e:
            return {"valid": False, "error": str(e)}
    
    async def save_uploaded_file(self, file_content: bytes, filename: str, upload_dir: str) -> str:
        """
        Save uploaded file content to disk
        
        Args:
            file_content: File content as bytes
            filename: Original filename
            upload_dir: Directory to save file
            
        Returns:
            Path to saved file
        """
        try:
            # Create upload directory if it doesn't exist
            os.makedirs(upload_dir, exist_ok=True)
            
            # Generate unique filename to avoid conflicts
            file_path = os.path.join(upload_dir, filename)
            counter = 1
            base_name, extension = os.path.splitext(filename)
            
            while os.path.exists(file_path):
                new_filename = f"{base_name}_{counter}{extension}"
                file_path = os.path.join(upload_dir, new_filename)
                counter += 1
            
            # Save file
            async with aiofiles.open(file_path, mode='wb') as file:
                await file.write(file_content)
            
            return file_path
            
        except Exception as e:
            raise Exception(f"Error saving file: {str(e)}")
