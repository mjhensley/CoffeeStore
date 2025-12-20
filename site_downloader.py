#!/usr/bin/env python3
"""
Complete Website Downloader - Downloads entire websites for offline viewing
Includes HTML, CSS, JavaScript, images, fonts, and all assets
Preserves SEO elements, meta tags, and site structure
"""

import os
import re
import sys
import time
import hashlib
import mimetypes
from urllib.parse import urljoin, urlparse, unquote, urlunparse
from collections import deque
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from bs4 import BeautifulSoup
from tqdm import tqdm


class WebsiteDownloader:
    def __init__(self, base_url, output_dir="downloaded_site", max_workers=10):
        self.base_url = base_url.rstrip('/')
        self.parsed_base = urlparse(self.base_url)
        self.base_domain = self.parsed_base.netloc
        self.output_dir = output_dir
        self.max_workers = max_workers
        
        # Tracking sets
        self.visited_urls = set()
        self.downloaded_assets = set()
        self.urls_to_visit = deque()
        self.failed_downloads = []
        
        # Session with retry logic
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        })
        
        # Asset types to download
        self.asset_extensions = {
            '.css', '.js', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico',
            '.woff', '.woff2', '.ttf', '.eot', '.otf',
            '.mp4', '.webm', '.mp3', '.wav', '.ogg',
            '.pdf', '.json', '.xml', '.txt'
        }
        
        # Create output directory
        os.makedirs(self.output_dir, exist_ok=True)
        
    def normalize_url(self, url):
        """Normalize URL for consistent comparison"""
        parsed = urlparse(url)
        # Remove fragments and normalize
        normalized = urlunparse((
            parsed.scheme or 'https',
            parsed.netloc,
            parsed.path.rstrip('/') or '/',
            parsed.params,
            parsed.query,
            ''  # Remove fragment
        ))
        return normalized
    
    def is_same_domain(self, url):
        """Check if URL belongs to the same domain"""
        parsed = urlparse(url)
        # Handle relative URLs
        if not parsed.netloc:
            return True
        # Check if same domain or subdomain
        return parsed.netloc == self.base_domain or parsed.netloc.endswith('.' + self.base_domain)
    
    def url_to_filepath(self, url, is_html=False):
        """Convert URL to local file path"""
        parsed = urlparse(url)
        path = unquote(parsed.path)
        
        # Handle root path
        if not path or path == '/':
            path = '/index.html'
        
        # Handle paths without extensions for HTML pages
        if is_html and not os.path.splitext(path)[1]:
            if not path.endswith('/'):
                path = path + '/index.html'
            else:
                path = path + 'index.html'
        
        # Handle query strings by encoding them into filename
        if parsed.query:
            base, ext = os.path.splitext(path)
            query_hash = hashlib.md5(parsed.query.encode()).hexdigest()[:8]
            path = f"{base}_{query_hash}{ext}"
        
        # Clean path for Windows
        path = path.replace('/', os.sep)
        if path.startswith(os.sep):
            path = path[1:]
            
        # Remove invalid characters for Windows
        invalid_chars = '<>:"|?*'
        for char in invalid_chars:
            path = path.replace(char, '_')
        
        return os.path.join(self.output_dir, path)
    
    def download_file(self, url, filepath=None, timeout=30):
        """Download a file from URL"""
        try:
            response = self.session.get(url, timeout=timeout, allow_redirects=True)
            response.raise_for_status()
            
            if filepath:
                os.makedirs(os.path.dirname(filepath), exist_ok=True)
                with open(filepath, 'wb') as f:
                    f.write(response.content)
            
            return response
        except Exception as e:
            self.failed_downloads.append((url, str(e)))
            return None
    
    def extract_urls_from_css(self, css_content, base_url):
        """Extract URLs from CSS content (url() references)"""
        urls = set()
        # Match url() patterns in CSS
        url_pattern = r'url\(["\']?([^"\')\s]+)["\']?\)'
        matches = re.findall(url_pattern, css_content)
        
        for match in matches:
            if not match.startswith('data:'):  # Skip data URIs
                full_url = urljoin(base_url, match)
                urls.add(full_url)
        
        # Also match @import statements
        import_pattern = r'@import\s+["\']([^"\']+)["\']'
        import_matches = re.findall(import_pattern, css_content)
        for match in import_matches:
            full_url = urljoin(base_url, match)
            urls.add(full_url)
            
        return urls
    
    def extract_urls_from_js(self, js_content, base_url):
        """Extract potential asset URLs from JavaScript"""
        urls = set()
        # Common patterns for asset paths in JS
        patterns = [
            r'["\'](/[^"\']*\.(jpg|jpeg|png|gif|svg|webp|css|js))["\']',
            r'["\'](\./[^"\']*\.(jpg|jpeg|png|gif|svg|webp|css|js))["\']',
            r'src\s*[=:]\s*["\']([^"\']+)["\']',
            r'href\s*[=:]\s*["\']([^"\']+)["\']',
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, js_content, re.IGNORECASE)
            for match in matches:
                if isinstance(match, tuple):
                    match = match[0]
                if not match.startswith(('data:', 'javascript:', '#')):
                    full_url = urljoin(base_url, match)
                    if self.is_same_domain(full_url):
                        urls.add(full_url)
        
        return urls
    
    def rewrite_urls_in_content(self, content, base_url, current_filepath):
        """Rewrite absolute URLs to relative paths for local viewing"""
        # Calculate relative path from current file to output root
        current_dir = os.path.dirname(current_filepath)
        rel_to_root = os.path.relpath(self.output_dir, current_dir)
        if rel_to_root == '.':
            rel_to_root = ''
        else:
            rel_to_root = rel_to_root.replace(os.sep, '/') + '/'
        
        # Replace absolute URLs with the base domain
        def replace_url(match):
            url = match.group(1) or match.group(2)
            quote_char = '"' if match.group(1) else "'"
            
            parsed = urlparse(url)
            
            # Skip data URIs, javascript:, mailto:, tel:, and external URLs
            if url.startswith(('data:', 'javascript:', 'mailto:', 'tel:', '#')):
                return match.group(0)
            
            # Check if it's same domain
            if parsed.netloc and not self.is_same_domain(url):
                return match.group(0)
            
            # Convert to local path
            if parsed.netloc:
                # Absolute URL with domain
                path = parsed.path or '/'
            else:
                # Relative URL - resolve it
                full_url = urljoin(base_url, url)
                path = urlparse(full_url).path or '/'
            
            # Handle root path
            if path == '/':
                path = '/index.html'
            elif not os.path.splitext(path)[1]:
                # Check if it might be HTML
                path = path.rstrip('/') + '/index.html'
            
            # Remove leading slash and convert to relative
            local_path = path.lstrip('/')
            
            return f'{quote_char}{rel_to_root}{local_path}{quote_char}'
        
        # Pattern to match URLs in href and src attributes
        pattern = r'"(https?://[^"]+)"|\'(https?://[^\']+)\''
        content = re.sub(pattern, replace_url, content)
        
        # Also handle protocol-relative URLs
        protocol_pattern = r'"(//[^"]+)"|\'(//[^\']+)\''
        def replace_protocol_relative(match):
            url = match.group(1) or match.group(2)
            quote_char = '"' if match.group(1) else "'"
            full_url = 'https:' + url
            parsed = urlparse(full_url)
            
            if not self.is_same_domain(full_url):
                return match.group(0)
            
            path = parsed.path or '/index.html'
            if path == '/':
                path = '/index.html'
            local_path = path.lstrip('/')
            
            return f'{quote_char}{rel_to_root}{local_path}{quote_char}'
        
        content = re.sub(protocol_pattern, replace_protocol_relative, content)
        
        return content
    
    def process_html(self, html_content, page_url):
        """Process HTML content - extract links and assets"""
        soup = BeautifulSoup(html_content, 'lxml')
        assets = set()
        pages = set()
        
        # Extract all links (pages to crawl)
        for tag in soup.find_all('a', href=True):
            href = tag['href']
            if href.startswith(('#', 'javascript:', 'mailto:', 'tel:')):
                continue
            full_url = urljoin(page_url, href)
            if self.is_same_domain(full_url):
                normalized = self.normalize_url(full_url)
                pages.add(normalized)
        
        # Extract CSS files
        for tag in soup.find_all('link', rel='stylesheet'):
            href = tag.get('href')
            if href:
                full_url = urljoin(page_url, href)
                assets.add(full_url)
        
        # Extract all link tags (icons, preload, etc)
        for tag in soup.find_all('link', href=True):
            href = tag['href']
            full_url = urljoin(page_url, href)
            assets.add(full_url)
        
        # Extract JavaScript files
        for tag in soup.find_all('script', src=True):
            src = tag['src']
            full_url = urljoin(page_url, src)
            assets.add(full_url)
        
        # Extract images
        for tag in soup.find_all('img', src=True):
            src = tag['src']
            if not src.startswith('data:'):
                full_url = urljoin(page_url, src)
                assets.add(full_url)
            # Also check srcset
            srcset = tag.get('srcset')
            if srcset:
                for src_item in srcset.split(','):
                    src_url = src_item.strip().split()[0]
                    if not src_url.startswith('data:'):
                        full_url = urljoin(page_url, src_url)
                        assets.add(full_url)
        
        # Extract picture sources
        for tag in soup.find_all('source'):
            srcset = tag.get('srcset')
            if srcset:
                for src_item in srcset.split(','):
                    src_url = src_item.strip().split()[0]
                    if not src_url.startswith('data:'):
                        full_url = urljoin(page_url, src_url)
                        assets.add(full_url)
        
        # Extract video/audio sources
        for tag in soup.find_all(['video', 'audio']):
            src = tag.get('src')
            if src:
                full_url = urljoin(page_url, src)
                assets.add(full_url)
            poster = tag.get('poster')
            if poster:
                full_url = urljoin(page_url, poster)
                assets.add(full_url)
        
        for tag in soup.find_all('source', src=True):
            src = tag['src']
            full_url = urljoin(page_url, src)
            assets.add(full_url)
        
        # Extract background images from inline styles
        for tag in soup.find_all(style=True):
            style = tag['style']
            urls = self.extract_urls_from_css(style, page_url)
            assets.update(urls)
        
        # Extract from style tags
        for tag in soup.find_all('style'):
            if tag.string:
                urls = self.extract_urls_from_css(tag.string, page_url)
                assets.update(urls)
        
        # Extract meta images (OG, Twitter cards for SEO)
        for tag in soup.find_all('meta', attrs={'property': True}):
            if 'image' in tag.get('property', ''):
                content = tag.get('content')
                if content and not content.startswith('data:'):
                    full_url = urljoin(page_url, content)
                    assets.add(full_url)
        
        for tag in soup.find_all('meta', attrs={'name': True}):
            if 'image' in tag.get('name', ''):
                content = tag.get('content')
                if content and not content.startswith('data:'):
                    full_url = urljoin(page_url, content)
                    assets.add(full_url)
        
        # Extract data-* attributes that might contain URLs
        for tag in soup.find_all(True):
            for attr, value in tag.attrs.items():
                if attr.startswith('data-') and isinstance(value, str):
                    if any(ext in value.lower() for ext in ['.jpg', '.png', '.gif', '.svg', '.webp', '.css', '.js']):
                        if not value.startswith('data:'):
                            full_url = urljoin(page_url, value)
                            assets.add(full_url)
        
        return pages, assets
    
    def download_asset(self, url):
        """Download a single asset"""
        if url in self.downloaded_assets:
            return True
        
        self.downloaded_assets.add(url)
        filepath = self.url_to_filepath(url)
        
        response = self.download_file(url, filepath)
        if response is None:
            return False
        
        # If it's CSS, extract and download referenced assets
        content_type = response.headers.get('content-type', '')
        if 'css' in content_type or url.endswith('.css'):
            try:
                css_content = response.text
                css_urls = self.extract_urls_from_css(css_content, url)
                
                # Download CSS-referenced assets
                for css_url in css_urls:
                    if css_url not in self.downloaded_assets and self.is_same_domain(css_url):
                        self.download_asset(css_url)
                
                # Rewrite URLs in CSS
                rewritten_css = self.rewrite_css_urls(css_content, url, filepath)
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(rewritten_css)
            except Exception:
                pass
        
        # If it's JS, try to extract asset URLs
        elif 'javascript' in content_type or url.endswith('.js'):
            try:
                js_content = response.text
                js_urls = self.extract_urls_from_js(js_content, url)
                for js_url in js_urls:
                    if js_url not in self.downloaded_assets:
                        self.download_asset(js_url)
            except Exception:
                pass
        
        return True
    
    def rewrite_css_urls(self, css_content, base_url, css_filepath):
        """Rewrite URLs in CSS to relative paths"""
        css_dir = os.path.dirname(css_filepath)
        
        def replace_url(match):
            url = match.group(1)
            
            # Skip data URIs
            if url.startswith('data:'):
                return match.group(0)
            
            # Resolve to absolute URL first
            full_url = urljoin(base_url, url)
            parsed = urlparse(full_url)
            
            # Skip external URLs
            if parsed.netloc and not self.is_same_domain(full_url):
                return match.group(0)
            
            # Convert to local path
            asset_filepath = self.url_to_filepath(full_url)
            
            # Calculate relative path from CSS file to asset
            rel_path = os.path.relpath(asset_filepath, css_dir)
            rel_path = rel_path.replace(os.sep, '/')
            
            return f'url("{rel_path}")'
        
        pattern = r'url\(["\']?([^"\')\s]+)["\']?\)'
        return re.sub(pattern, replace_url, css_content)
    
    def download_page(self, url):
        """Download a single page and extract links"""
        if url in self.visited_urls:
            return set(), set()
        
        self.visited_urls.add(url)
        
        response = self.download_file(url)
        if response is None:
            return set(), set()
        
        content_type = response.headers.get('content-type', '')
        if 'text/html' not in content_type:
            # Not an HTML page, treat as asset
            filepath = self.url_to_filepath(url)
            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            with open(filepath, 'wb') as f:
                f.write(response.content)
            return set(), set()
        
        # Process HTML
        html_content = response.text
        pages, assets = self.process_html(html_content, url)
        
        # Save HTML with rewritten URLs
        filepath = self.url_to_filepath(url, is_html=True)
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        rewritten_html = self.rewrite_urls_in_content(html_content, url, filepath)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(rewritten_html)
        
        return pages, assets
    
    def crawl(self):
        """Main crawl function"""
        print(f"\n{'='*60}")
        print(f"Website Downloader - Mirroring: {self.base_url}")
        print(f"Output Directory: {os.path.abspath(self.output_dir)}")
        print(f"{'='*60}\n")
        
        # Start with base URL
        self.urls_to_visit.append(self.base_url)
        all_assets = set()
        
        # Phase 1: Crawl all pages
        print("[Phase 1] Discovering and downloading pages...")
        pbar = tqdm(desc="Pages", unit="page")
        
        while self.urls_to_visit:
            current_url = self.urls_to_visit.popleft()
            
            if current_url in self.visited_urls:
                continue
            
            pages, assets = self.download_page(current_url)
            all_assets.update(assets)
            
            # Add new pages to queue
            for page in pages:
                if page not in self.visited_urls:
                    self.urls_to_visit.append(page)
            
            pbar.update(1)
            pbar.set_postfix({'queued': len(self.urls_to_visit), 'found': len(all_assets)})
            
            # Small delay to be polite to the server
            time.sleep(0.1)
        
        pbar.close()
        print(f"\n✓ Downloaded {len(self.visited_urls)} pages")
        
        # Phase 2: Download all assets
        print(f"\n[Phase 2] Downloading {len(all_assets)} assets...")
        
        # Filter to same-domain assets only
        same_domain_assets = [a for a in all_assets if self.is_same_domain(a)]
        
        with tqdm(total=len(same_domain_assets), desc="Assets", unit="file") as pbar:
            with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                futures = {executor.submit(self.download_asset, url): url for url in same_domain_assets}
                for future in as_completed(futures):
                    pbar.update(1)
        
        print(f"\n✓ Downloaded {len(self.downloaded_assets)} assets")
        
        # Create a simple local server script
        self.create_server_script()
        
        # Summary
        print(f"\n{'='*60}")
        print("Download Complete!")
        print(f"{'='*60}")
        print(f"Pages downloaded: {len(self.visited_urls)}")
        print(f"Assets downloaded: {len(self.downloaded_assets)}")
        print(f"Failed downloads: {len(self.failed_downloads)}")
        print(f"\nSite saved to: {os.path.abspath(self.output_dir)}")
        print(f"\nTo view the site:")
        print(f"  1. Run: python serve_local.py")
        print(f"  2. Open: http://localhost:8000")
        
        if self.failed_downloads:
            print(f"\n⚠ Failed downloads saved to: failed_downloads.txt")
            with open(os.path.join(self.output_dir, 'failed_downloads.txt'), 'w') as f:
                for url, error in self.failed_downloads:
                    f.write(f"{url}\n  Error: {error}\n\n")
        
        return True
    
    def create_server_script(self):
        """Create a simple Python HTTP server script"""
        server_script = '''#!/usr/bin/env python3
"""Simple HTTP server for viewing the downloaded site locally"""

import http.server
import socketserver
import os
import webbrowser
from functools import partial

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def end_headers(self):
        # Add CORS headers for local development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    
    def do_GET(self):
        # Serve index.html for directory requests
        if self.path.endswith('/'):
            self.path += 'index.html'
        elif not os.path.splitext(self.path)[1]:
            # No extension, try to serve as directory with index.html
            test_path = os.path.join(DIRECTORY, self.path.lstrip('/'), 'index.html')
            if os.path.exists(test_path):
                self.path = self.path + '/index.html'
        return super().do_GET()

if __name__ == '__main__':
    os.chdir(DIRECTORY)
    
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"\\nServing downloaded site at: http://localhost:{PORT}")
        print(f"Directory: {DIRECTORY}")
        print("Press Ctrl+C to stop\\n")
        
        # Open browser automatically
        webbrowser.open(f'http://localhost:{PORT}')
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\\nServer stopped.")
'''
        
        server_path = os.path.join(self.output_dir, 'serve_local.py')
        with open(server_path, 'w') as f:
            f.write(server_script)


def main():
    # Target website
    target_url = "https://www.stumptowncoffee.com/"
    output_directory = "stumptowncoffee_mirror"
    
    print("\n" + "="*60)
    print("  COMPLETE WEBSITE DOWNLOADER")
    print("  Downloads entire websites for offline viewing")
    print("="*60)
    
    downloader = WebsiteDownloader(
        base_url=target_url,
        output_dir=output_directory,
        max_workers=8
    )
    
    try:
        downloader.crawl()
    except KeyboardInterrupt:
        print("\n\nDownload interrupted by user.")
        print(f"Partial download saved to: {os.path.abspath(output_directory)}")
    except Exception as e:
        print(f"\nError: {e}")
        raise


if __name__ == "__main__":
    main()

