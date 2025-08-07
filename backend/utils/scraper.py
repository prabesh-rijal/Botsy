"""
Web scraping utilities for extracting content from URLs
"""
import requests
from bs4 import BeautifulSoup
from typing import Dict, List, Optional
import re
from urllib.parse import urljoin, urlparse
import time

class WebScraper:
    """Web scraping service for extracting content from websites"""
    
    def __init__(self, timeout: int = 30, delay: float = 1.0):
        self.timeout = timeout
        self.delay = delay  # Delay between requests to be respectful
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'RAG-Botsy/1.0 (Educational Bot Builder)'
        })
    
    async def scrape_url(self, url: str) -> Dict[str, any]:
        """
        Scrape content from a single URL
        
        Args:
            url: URL to scrape
            
        Returns:
            Dictionary with scraped content and metadata
        """
        try:
            # Add delay to be respectful
            time.sleep(self.delay)
            
            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract content
            content = self._extract_content(soup)
            title = self._extract_title(soup)
            meta_description = self._extract_meta_description(soup)
            
            return {
                "url": url,
                "title": title,
                "content": content,
                "meta_description": meta_description,
                "status_code": response.status_code,
                "content_type": response.headers.get('content-type', ''),
                "success": True
            }
            
        except requests.RequestException as e:
            return {
                "url": url,
                "error": str(e),
                "success": False
            }
        except Exception as e:
            return {
                "url": url,
                "error": f"Parsing error: {str(e)}",
                "success": False
            }
    
    async def scrape_multiple_urls(self, urls: List[str]) -> List[Dict[str, any]]:
        """
        Scrape content from multiple URLs
        
        Args:
            urls: List of URLs to scrape
            
        Returns:
            List of dictionaries with scraped content
        """
        results = []
        
        for url in urls:
            result = await self.scrape_url(url)
            results.append(result)
        
        return results
    
    def _extract_content(self, soup: BeautifulSoup) -> str:
        """Extract main content from HTML"""
        # Remove script and style elements
        for script in soup(["script", "style", "nav", "header", "footer", "aside"]):
            script.decompose()
        
        # Try to find main content areas
        main_content = None
        
        # Look for common main content selectors
        content_selectors = [
            'main',
            'article',
            '.content',
            '.main-content',
            '.post-content',
            '.entry-content',
            '#content',
            '#main'
        ]
        
        for selector in content_selectors:
            main_content = soup.select_one(selector)
            if main_content:
                break
        
        # If no main content found, use body
        if not main_content:
            main_content = soup.find('body')
        
        if not main_content:
            return ""
        
        # Extract text and clean it
        text = main_content.get_text()
        return self._clean_text(text)
    
    def _extract_title(self, soup: BeautifulSoup) -> str:
        """Extract page title"""
        title_tag = soup.find('title')
        if title_tag:
            return title_tag.get_text().strip()
        
        # Try h1 as fallback
        h1_tag = soup.find('h1')
        if h1_tag:
            return h1_tag.get_text().strip()
        
        return "No title found"
    
    def _extract_meta_description(self, soup: BeautifulSoup) -> str:
        """Extract meta description"""
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        if meta_desc and meta_desc.get('content'):
            return meta_desc['content'].strip()
        
        # Try og:description as fallback
        og_desc = soup.find('meta', attrs={'property': 'og:description'})
        if og_desc and og_desc.get('content'):
            return og_desc['content'].strip()
        
        return ""
    
    def _clean_text(self, text: str) -> str:
        """Clean extracted text"""
        # Remove extra whitespace and normalize
        text = re.sub(r'\s+', ' ', text)
        
        # Remove empty lines
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        
        return '\n'.join(lines)
    
    def extract_links(self, url: str, soup: BeautifulSoup) -> List[str]:
        """Extract all links from a page"""
        links = []
        base_domain = urlparse(url).netloc
        
        for link in soup.find_all('a', href=True):
            href = link['href']
            
            # Convert relative URLs to absolute
            absolute_url = urljoin(url, href)
            
            # Only include HTTP/HTTPS links from the same domain
            parsed = urlparse(absolute_url)
            if parsed.scheme in ['http', 'https'] and parsed.netloc == base_domain:
                links.append(absolute_url)
        
        return list(set(links))  # Remove duplicates
    
    async def scrape_sitemap(self, sitemap_url: str) -> List[str]:
        """
        Extract URLs from a sitemap
        
        Args:
            sitemap_url: URL of the sitemap
            
        Returns:
            List of URLs found in the sitemap
        """
        try:
            response = self.session.get(sitemap_url, timeout=self.timeout)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'xml')
            
            # Extract URLs from sitemap
            urls = []
            for loc in soup.find_all('loc'):
                url = loc.get_text().strip()
                if url:
                    urls.append(url)
            
            return urls
            
        except Exception as e:
            print(f"Error scraping sitemap {sitemap_url}: {e}")
            return []
    
    def is_valid_url(self, url: str) -> bool:
        """Check if URL is valid and scrapeable"""
        try:
            parsed = urlparse(url)
            return bool(parsed.netloc) and parsed.scheme in ['http', 'https']
        except Exception:
            return False
