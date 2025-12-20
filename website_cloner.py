"""
Website Cloner - Downloads entire websites for offline viewing
Captures HTML, CSS, JavaScript, images, fonts, and all assets
"""

import os
import re
import sys
import time
import hashlib
import argparse
from urllib.parse import urljoin, urlparse, unquote
from collections import deque
from concurrent.futures import ThreadPoolExecutor, as_completed
import mimetypes

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Installing required packages...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests", "beautifulsoup4", "lxml"])
    import requests
    from bs4 import BeautifulSoup


class WebsiteCloner:
    def __init__(self, base_url, output_dir="cloned_site", max_depth=10, max_workers=10, delay=0.1):
        self.base_url = base_url.rstrip('/')
        self.parsed_base = urlparse(self.base_url)
        self.base_domain = self.parsed_base.netloc
        self.output_dir = output_dir
        self.max_depth = max_depth
        self.max_workers = max_workers
        self.delay = delay
        
        # Track visited URLs and downloaded assets
        self.visited_urls = set()
        self.downloaded_assets = set()
        self.url_to_local = {}  # Maps original URLs to local file paths
        self.failed_urls = set()
        
        # Queue for pages to visit: (url, depth)
        self.pages_to_visit = deque()
        
        # Session for connection pooling
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
        })
        
        # File extensions to download
        self.asset_extensions = {
            '.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico',
            '.woff', '.woff2', '.ttf', '.eot', '.otf',
            '.mp4', '.webm', '.mp3', '.ogg', '.wav',
            '.pdf', '.json', '.xml', '.txt', '.map'
        }
        
        # Create output directory
        os.makedirs(self.output_dir, exist_ok=True)
        
    def get_file_extension(self, url, content_type=None):
        """Determine file extension from URL or content type"""
        parsed = urlparse(url)
        path = unquote(parsed.path)
        
        # Get extension from path
        ext = os.path.splitext(path)[1].lower()
        if ext and len(ext) <= 10:
            return ext
            
        # Guess from content type
        if content_type:
            content_type = content_type.split(';')[0].strip()
            ext = mimetypes.guess_extension(content_type)
            if ext:
                return ext
                
        return '.html'
    
    def url_to_filepath(self, url, content_type=None):
        """Convert URL to local file path"""
        parsed = urlparse(url)
        path = unquote(parsed.path)
        
        # Handle root URL
        if not path or path == '/':
            path = '/index.html'
        
        # Handle paths without extension (likely HTML pages)
        ext = os.path.splitext(path)[1].lower()
        if not ext or ext not in self.asset_extensions:
            if not path.endswith('/'):
                path = path + '.html'
            else:
                path = path + 'index.html'
        
        # Handle query strings for unique files
        if parsed.query:
            query_hash = hashlib.md5(parsed.query.encode()).hexdigest()[:8]
            base, ext = os.path.splitext(path)
            path = f"{base}_{query_hash}{ext}"
        
        # Create full local path
        local_path = os.path.join(self.output_dir, parsed.netloc, path.lstrip('/'))
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        
        return local_path
    
    def is_same_domain(self, url):
        """Check if URL belongs to the same domain"""
        parsed = urlparse(url)
        # Allow subdomains and www variations
        return (parsed.netloc == self.base_domain or 
                parsed.netloc.endswith('.' + self.base_domain) or
                self.base_domain.endswith('.' + parsed.netloc) or
                parsed.netloc.replace('www.', '') == self.base_domain.replace('www.', ''))
    
    def normalize_url(self, url, base_url=None):
        """Normalize and clean URL"""
        if not url:
            return None
            
        # Skip data URIs, javascript, mailto, tel, etc.
        if any(url.startswith(prefix) for prefix in ['data:', 'javascript:', 'mailto:', 'tel:', '#', 'about:']):
            return None
        
        # Handle protocol-relative URLs
        if url.startswith('//'):
            url = self.parsed_base.scheme + ':' + url
        
        # Make absolute URL
        if base_url:
            url = urljoin(base_url, url)
        else:
            url = urljoin(self.base_url, url)
        
        # Parse and reconstruct to normalize
        parsed = urlparse(url)
        
        # Remove fragment
        url = parsed._replace(fragment='').geturl()
        
        return url
    
    def download_file(self, url, is_html=False):
        """Download a file and save it locally"""
        if url in self.downloaded_assets or url in self.failed_urls:
            return self.url_to_local.get(url)
        
        try:
            time.sleep(self.delay)
            response = self.session.get(url, timeout=30, allow_redirects=True)
            response.raise_for_status()
            
            content_type = response.headers.get('Content-Type', '')
            local_path = self.url_to_filepath(url, content_type)
            
            # Save the file
            if 'text' in content_type or is_html or content_type.startswith('application/javascript') or content_type.startswith('application/json'):
                with open(local_path, 'w', encoding='utf-8', errors='replace') as f:
                    f.write(response.text)
            else:
                with open(local_path, 'wb') as f:
                    f.write(response.content)
            
            self.downloaded_assets.add(url)
            self.url_to_local[url] = local_path
            
            print(f"[OK] Downloaded: {url[:80]}...")
            return local_path
            
        except Exception as e:
            print(f"[FAIL] Failed: {url[:60]}... - {str(e)[:50]}")
            self.failed_urls.add(url)
            return None
    
    def extract_assets_from_html(self, html_content, page_url):
        """Extract all asset URLs from HTML content"""
        soup = BeautifulSoup(html_content, 'lxml')
        assets = set()
        pages = set()
        
        # Extract from various HTML elements
        tag_attrs = [
            ('link', 'href'),      # CSS, icons, etc.
            ('script', 'src'),     # JavaScript
            ('img', 'src'),        # Images
            ('img', 'data-src'),   # Lazy-loaded images
            ('img', 'srcset'),     # Responsive images
            ('source', 'src'),     # Video/audio sources
            ('source', 'srcset'),  # Picture sources
            ('video', 'src'),      # Video
            ('video', 'poster'),   # Video poster
            ('audio', 'src'),      # Audio
            ('iframe', 'src'),     # Iframes
            ('embed', 'src'),      # Embeds
            ('object', 'data'),    # Objects
            ('use', 'xlink:href'), # SVG use
            ('image', 'xlink:href'), # SVG image
        ]
        
        for tag, attr in tag_attrs:
            for element in soup.find_all(tag):
                value = element.get(attr)
                if value:
                    # Handle srcset (multiple URLs)
                    if 'srcset' in attr:
                        for part in value.split(','):
                            url_part = part.strip().split()[0]
                            url = self.normalize_url(url_part, page_url)
                            if url:
                                assets.add(url)
                    else:
                        url = self.normalize_url(value, page_url)
                        if url:
                            assets.add(url)
        
        # Extract URLs from inline styles
        for element in soup.find_all(style=True):
            style = element.get('style', '')
            urls = re.findall(r'url\([\'"]?([^\'")\s]+)[\'"]?\)', style)
            for url in urls:
                normalized = self.normalize_url(url, page_url)
                if normalized:
                    assets.add(normalized)
        
        # Extract URLs from style tags
        for style_tag in soup.find_all('style'):
            if style_tag.string:
                urls = re.findall(r'url\([\'"]?([^\'")\s]+)[\'"]?\)', style_tag.string)
                for url in urls:
                    normalized = self.normalize_url(url, page_url)
                    if normalized:
                        assets.add(normalized)
        
        # Extract from data attributes
        for element in soup.find_all(attrs={'data-background': True}):
            url = self.normalize_url(element.get('data-background'), page_url)
            if url:
                assets.add(url)
        
        for element in soup.find_all(attrs={'data-bg': True}):
            url = self.normalize_url(element.get('data-bg'), page_url)
            if url:
                assets.add(url)
        
        # Extract page links (a href)
        for a_tag in soup.find_all('a', href=True):
            href = a_tag.get('href')
            url = self.normalize_url(href, page_url)
            if url and self.is_same_domain(url):
                # Check if it's a page (not an asset)
                parsed = urlparse(url)
                ext = os.path.splitext(parsed.path)[1].lower()
                if not ext or ext in ['.html', '.htm', '.php', '.asp', '.aspx', '']:
                    pages.add(url)
        
        # Extract canonical and alternate URLs
        for link in soup.find_all('link', rel=['canonical', 'alternate']):
            href = link.get('href')
            if href:
                url = self.normalize_url(href, page_url)
                if url and self.is_same_domain(url):
                    pages.add(url)
        
        # Extract meta refresh URLs
        for meta in soup.find_all('meta', attrs={'http-equiv': 'refresh'}):
            content = meta.get('content', '')
            match = re.search(r'url=([^\s;]+)', content, re.I)
            if match:
                url = self.normalize_url(match.group(1), page_url)
                if url and self.is_same_domain(url):
                    pages.add(url)
        
        # Extract Open Graph and Twitter Card images
        for meta in soup.find_all('meta', attrs={'property': re.compile(r'^og:')}):
            content = meta.get('content', '')
            if 'image' in meta.get('property', '').lower():
                url = self.normalize_url(content, page_url)
                if url:
                    assets.add(url)
        
        for meta in soup.find_all('meta', attrs={'name': re.compile(r'^twitter:')}):
            content = meta.get('content', '')
            if 'image' in meta.get('name', '').lower():
                url = self.normalize_url(content, page_url)
                if url:
                    assets.add(url)
        
        return assets, pages
    
    def extract_assets_from_css(self, css_content, css_url):
        """Extract asset URLs from CSS content"""
        assets = set()
        
        # Find url() references
        urls = re.findall(r'url\([\'"]?([^\'")\s]+)[\'"]?\)', css_content)
        for url in urls:
            normalized = self.normalize_url(url, css_url)
            if normalized:
                assets.add(normalized)
        
        # Find @import statements
        imports = re.findall(r'@import\s+[\'"]([^\'"]+)[\'"]', css_content)
        imports += re.findall(r'@import\s+url\([\'"]?([^\'")\s]+)[\'"]?\)', css_content)
        for url in imports:
            normalized = self.normalize_url(url, css_url)
            if normalized:
                assets.add(normalized)
        
        # Find @font-face src
        font_urls = re.findall(r'src:\s*[^;]*url\([\'"]?([^\'")\s]+)[\'"]?\)', css_content)
        for url in font_urls:
            normalized = self.normalize_url(url, css_url)
            if normalized:
                assets.add(normalized)
        
        return assets
    
    def extract_assets_from_js(self, js_content, js_url):
        """Extract potential asset URLs from JavaScript"""
        assets = set()
        
        # Find string URLs in JavaScript
        # Match URLs in strings
        patterns = [
            r'["\']([^"\']*\.(png|jpg|jpeg|gif|svg|webp|css|js|woff2?|ttf|eot|otf|ico))["\']',
            r'["\']((https?:)?//[^"\']+)["\']',
            r'src\s*[=:]\s*["\']([^"\']+)["\']',
            r'href\s*[=:]\s*["\']([^"\']+)["\']',
            r'url\s*[=:]\s*["\']([^"\']+)["\']',
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, js_content, re.I)
            for match in matches:
                url = match[0] if isinstance(match, tuple) else match
                normalized = self.normalize_url(url, js_url)
                if normalized and self.is_same_domain(normalized):
                    assets.add(normalized)
        
        return assets
    
    def rewrite_urls_in_html(self, html_content, page_url):
        """Rewrite URLs in HTML to use local paths"""
        soup = BeautifulSoup(html_content, 'lxml')
        
        # Rewrite various tag attributes
        tag_attrs = [
            ('link', 'href'),
            ('script', 'src'),
            ('img', 'src'),
            ('img', 'data-src'),
            ('source', 'src'),
            ('video', 'src'),
            ('video', 'poster'),
            ('audio', 'src'),
            ('iframe', 'src'),
            ('embed', 'src'),
            ('object', 'data'),
            ('a', 'href'),
        ]
        
        for tag, attr in tag_attrs:
            for element in soup.find_all(tag):
                value = element.get(attr)
                if value:
                    url = self.normalize_url(value, page_url)
                    if url and url in self.url_to_local:
                        # Calculate relative path
                        page_local = self.url_to_filepath(page_url)
                        asset_local = self.url_to_local[url]
                        try:
                            rel_path = os.path.relpath(asset_local, os.path.dirname(page_local))
                            rel_path = rel_path.replace('\\', '/')
                            element[attr] = rel_path
                        except ValueError:
                            # Different drives on Windows
                            element[attr] = asset_local
        
        # Rewrite srcset attributes
        for tag in ['img', 'source']:
            for element in soup.find_all(tag, srcset=True):
                srcset = element.get('srcset', '')
                new_srcset_parts = []
                for part in srcset.split(','):
                    parts = part.strip().split()
                    if parts:
                        url = self.normalize_url(parts[0], page_url)
                        if url and url in self.url_to_local:
                            page_local = self.url_to_filepath(page_url)
                            asset_local = self.url_to_local[url]
                            try:
                                rel_path = os.path.relpath(asset_local, os.path.dirname(page_local))
                                rel_path = rel_path.replace('\\', '/')
                                parts[0] = rel_path
                            except ValueError:
                                parts[0] = asset_local
                        new_srcset_parts.append(' '.join(parts))
                element['srcset'] = ', '.join(new_srcset_parts)
        
        # Rewrite inline styles
        for element in soup.find_all(style=True):
            style = element.get('style', '')
            element['style'] = self.rewrite_urls_in_css(style, page_url)
        
        # Rewrite style tags
        for style_tag in soup.find_all('style'):
            if style_tag.string:
                style_tag.string = self.rewrite_urls_in_css(style_tag.string, page_url)
        
        return str(soup)
    
    def rewrite_urls_in_css(self, css_content, css_url):
        """Rewrite URLs in CSS to use local paths"""
        def replace_url(match):
            url = match.group(1)
            normalized = self.normalize_url(url, css_url)
            if normalized and normalized in self.url_to_local:
                css_local = self.url_to_filepath(css_url)
                asset_local = self.url_to_local[normalized]
                try:
                    rel_path = os.path.relpath(asset_local, os.path.dirname(css_local))
                    rel_path = rel_path.replace('\\', '/')
                    return f'url("{rel_path}")'
                except ValueError:
                    return f'url("{asset_local}")'
            return match.group(0)
        
        # Replace url() references
        css_content = re.sub(r'url\([\'"]?([^\'")\s]+)[\'"]?\)', replace_url, css_content)
        
        return css_content
    
    def process_page(self, url, depth):
        """Process a single page: download, extract assets, find links"""
        if url in self.visited_urls or depth > self.max_depth:
            return set(), set()
        
        self.visited_urls.add(url)
        
        try:
            time.sleep(self.delay)
            response = self.session.get(url, timeout=30, allow_redirects=True)
            response.raise_for_status()
            
            content_type = response.headers.get('Content-Type', '')
            
            if 'text/html' not in content_type and 'application/xhtml' not in content_type:
                # Not an HTML page, download as asset
                self.download_file(url)
                return set(), set()
            
            html_content = response.text
            local_path = self.url_to_filepath(url)
            
            self.url_to_local[url] = local_path
            self.downloaded_assets.add(url)
            
            # Extract assets and pages
            assets, pages = self.extract_assets_from_html(html_content, url)
            
            print(f"[PAGE] Page: {url[:70]}... (found {len(assets)} assets, {len(pages)} links)")
            
            # Save HTML temporarily (will be rewritten later)
            with open(local_path, 'w', encoding='utf-8', errors='replace') as f:
                f.write(html_content)
            
            return assets, pages
            
        except Exception as e:
            print(f"[FAIL] Page failed: {url[:60]}... - {str(e)[:50]}")
            self.failed_urls.add(url)
            return set(), set()
    
    def download_and_process_asset(self, url):
        """Download an asset and extract any nested assets (CSS, JS)"""
        if url in self.downloaded_assets or url in self.failed_urls:
            return set()
        
        local_path = self.download_file(url)
        if not local_path:
            return set()
        
        nested_assets = set()
        
        # Process CSS files for nested assets
        if local_path.endswith('.css'):
            try:
                with open(local_path, 'r', encoding='utf-8', errors='replace') as f:
                    css_content = f.read()
                nested_assets = self.extract_assets_from_css(css_content, url)
            except Exception as e:
                print(f"  Warning: Could not process CSS {url}: {e}")
        
        # Process JS files for asset URLs
        elif local_path.endswith('.js'):
            try:
                with open(local_path, 'r', encoding='utf-8', errors='replace') as f:
                    js_content = f.read()
                nested_assets = self.extract_assets_from_js(js_content, url)
            except Exception as e:
                print(f"  Warning: Could not process JS {url}: {e}")
        
        return nested_assets
    
    def rewrite_all_files(self):
        """Rewrite all URLs in downloaded files to use local paths"""
        print("\n[REWRITE] Rewriting URLs to local paths...")
        
        for url, local_path in self.url_to_local.items():
            try:
                if local_path.endswith('.html') or local_path.endswith('.htm'):
                    with open(local_path, 'r', encoding='utf-8', errors='replace') as f:
                        content = f.read()
                    rewritten = self.rewrite_urls_in_html(content, url)
                    with open(local_path, 'w', encoding='utf-8', errors='replace') as f:
                        f.write(rewritten)
                elif local_path.endswith('.css'):
                    with open(local_path, 'r', encoding='utf-8', errors='replace') as f:
                        content = f.read()
                    rewritten = self.rewrite_urls_in_css(content, url)
                    with open(local_path, 'w', encoding='utf-8', errors='replace') as f:
                        f.write(rewritten)
            except Exception as e:
                print(f"  Warning: Could not rewrite {local_path}: {e}")
    
    def clone(self):
        """Main method to clone the website"""
        print(f"\n{'='*60}")
        print(f"WEBSITE CLONER")
        print(f"{'='*60}")
        print(f"Target: {self.base_url}")
        print(f"Output: {os.path.abspath(self.output_dir)}")
        print(f"Max depth: {self.max_depth}")
        print(f"{'='*60}\n")
        
        # Start with the base URL
        self.pages_to_visit.append((self.base_url, 0))
        all_assets = set()
        
        # Phase 1: Crawl all pages
        print("[PHASE 1] Crawling pages...\n")
        while self.pages_to_visit:
            url, depth = self.pages_to_visit.popleft()
            
            if url in self.visited_urls:
                continue
            
            assets, pages = self.process_page(url, depth)
            all_assets.update(assets)
            
            # Add new pages to queue
            for page_url in pages:
                if page_url not in self.visited_urls:
                    self.pages_to_visit.append((page_url, depth + 1))
        
        # Phase 2: Download all assets
        print(f"\n[PHASE 2] Downloading {len(all_assets)} assets...\n")
        
        assets_to_process = all_assets.copy()
        processed_assets = set()
        
        while assets_to_process:
            current_batch = list(assets_to_process - processed_assets)[:100]  # Process in batches
            
            if not current_batch:
                break
            
            with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                futures = {executor.submit(self.download_and_process_asset, url): url 
                          for url in current_batch}
                
                for future in as_completed(futures):
                    url = futures[future]
                    processed_assets.add(url)
                    try:
                        nested = future.result()
                        assets_to_process.update(nested)
                    except Exception as e:
                        print(f"  Error processing {url}: {e}")
        
        # Phase 3: Rewrite URLs
        self.rewrite_all_files()
        
        # Phase 4: Create index redirect if needed
        main_index = os.path.join(self.output_dir, self.base_domain, 'index.html')
        root_index = os.path.join(self.output_dir, 'index.html')
        
        if os.path.exists(main_index) and not os.path.exists(root_index):
            # Create a redirect page at the root
            redirect_html = f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0; url={self.base_domain}/index.html">
    <title>Redirecting...</title>
</head>
<body>
    <p>Redirecting to <a href="{self.base_domain}/index.html">site</a>...</p>
</body>
</html>'''
            with open(root_index, 'w', encoding='utf-8') as f:
                f.write(redirect_html)
        
        # Summary
        print(f"\n{'='*60}")
        print(f"CLONE COMPLETE!")
        print(f"{'='*60}")
        print(f"Pages downloaded: {len(self.visited_urls)}")
        print(f"Assets downloaded: {len(self.downloaded_assets)}")
        print(f"Failed downloads: {len(self.failed_urls)}")
        print(f"Output directory: {os.path.abspath(self.output_dir)}")
        print(f"\nTo view the site, open: {os.path.abspath(root_index)}")
        
        if self.failed_urls:
            failed_log = os.path.join(self.output_dir, 'failed_urls.txt')
            with open(failed_log, 'w', encoding='utf-8') as f:
                f.write('\n'.join(sorted(self.failed_urls)))
            print(f"Failed URLs logged to: {failed_log}")
        
        print(f"{'='*60}\n")
        
        return self.output_dir


def main():
    parser = argparse.ArgumentParser(
        description='Clone a website for offline viewing',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  python website_cloner.py https://example.com
  python website_cloner.py https://example.com -o my_clone -d 5
  python website_cloner.py https://example.com --max-workers 20
        '''
    )
    
    parser.add_argument('url', nargs='?', default='https://www.stumptowncoffee.com/',
                       help='URL of the website to clone')
    parser.add_argument('-o', '--output', default='cloned_site',
                       help='Output directory (default: cloned_site)')
    parser.add_argument('-d', '--depth', type=int, default=10,
                       help='Maximum crawl depth (default: 10)')
    parser.add_argument('-w', '--max-workers', type=int, default=10,
                       help='Maximum concurrent downloads (default: 10)')
    parser.add_argument('--delay', type=float, default=0.1,
                       help='Delay between requests in seconds (default: 0.1)')
    
    args = parser.parse_args()
    
    cloner = WebsiteCloner(
        base_url=args.url,
        output_dir=args.output,
        max_depth=args.depth,
        max_workers=args.max_workers,
        delay=args.delay
    )
    
    cloner.clone()


if __name__ == '__main__':
    main()

