"""
Robust Website Cloner with anti-detection measures
Handles compression, cookies, and bot protection
"""

import os
import re
import sys
import time
import hashlib
import random
from urllib.parse import urljoin, urlparse, unquote
from collections import deque

try:
    import requests
    from bs4 import BeautifulSoup
    import brotli
except ImportError:
    print("Installing required packages...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests", "beautifulsoup4", "lxml", "brotli", "-q"])
    import requests
    from bs4 import BeautifulSoup
    import brotli


class RobustWebsiteCloner:
    def __init__(self, base_url, output_dir="cloned_site", max_depth=10):
        self.base_url = base_url.rstrip('/')
        self.parsed_base = urlparse(self.base_url)
        self.base_domain = self.parsed_base.netloc
        self.output_dir = output_dir
        self.max_depth = max_depth
        
        self.visited_urls = set()
        self.downloaded_assets = set()
        self.url_to_local = {}
        self.failed_urls = set()
        self.pages_to_visit = deque()
        
        # More realistic browser session
        self.session = requests.Session()
        
        # Rotate user agents
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ]
        
        self.session.headers.update({
            'User-Agent': random.choice(self.user_agents),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate',  # Skip brotli to avoid issues
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
        })
        
        self.asset_extensions = {
            '.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico',
            '.woff', '.woff2', '.ttf', '.eot', '.otf',
            '.mp4', '.webm', '.mp3', '.ogg', '.wav',
            '.pdf', '.json', '.xml', '.txt', '.map'
        }
        
        os.makedirs(self.output_dir, exist_ok=True)
    
    def get_random_delay(self):
        """Random delay to appear more human"""
        return random.uniform(1.0, 3.0)
    
    def url_to_filepath(self, url, content_type=None):
        """Convert URL to local file path"""
        parsed = urlparse(url)
        path = unquote(parsed.path)
        
        if not path or path == '/':
            path = '/index.html'
        
        ext = os.path.splitext(path)[1].lower()
        if not ext or ext not in self.asset_extensions:
            if not path.endswith('/'):
                path = path + '.html'
            else:
                path = path + 'index.html'
        
        if parsed.query:
            query_hash = hashlib.md5(parsed.query.encode()).hexdigest()[:8]
            base, ext = os.path.splitext(path)
            path = f"{base}_{query_hash}{ext}"
        
        # Clean path for Windows
        path = re.sub(r'[<>:"|?*]', '_', path)
        
        local_path = os.path.join(self.output_dir, parsed.netloc.replace(':', '_'), path.lstrip('/'))
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        
        return local_path
    
    def is_same_domain(self, url):
        """Check if URL belongs to the same domain"""
        parsed = urlparse(url)
        domain = parsed.netloc.replace('www.', '')
        base = self.base_domain.replace('www.', '')
        return domain == base or domain.endswith('.' + base) or base.endswith('.' + domain)
    
    def is_asset_url(self, url):
        """Check if URL is an asset based on extension or CDN patterns"""
        parsed = urlparse(url)
        path = parsed.path.lower()
        
        # Check extension
        ext = os.path.splitext(path)[1]
        if ext in self.asset_extensions:
            return True
        
        # Check common CDN patterns
        cdn_patterns = ['cdn', 'assets', 'static', 'images', 'img', 'fonts', 'media']
        if any(p in parsed.netloc.lower() or p in path for p in cdn_patterns):
            return True
        
        return False
    
    def normalize_url(self, url, base_url=None):
        """Normalize URL"""
        if not url:
            return None
        
        if any(url.startswith(p) for p in ['data:', 'javascript:', 'mailto:', 'tel:', '#', 'about:', 'blob:']):
            return None
        
        if url.startswith('//'):
            url = self.parsed_base.scheme + ':' + url
        
        url = urljoin(base_url or self.base_url, url)
        parsed = urlparse(url)
        url = parsed._replace(fragment='').geturl()
        
        return url
    
    def fetch_url(self, url, is_page=False):
        """Fetch a URL with retries and error handling"""
        max_retries = 3
        
        for attempt in range(max_retries):
            try:
                time.sleep(self.get_random_delay() if is_page else 0.2)
                
                # Rotate user agent occasionally
                if random.random() < 0.1:
                    self.session.headers['User-Agent'] = random.choice(self.user_agents)
                
                response = self.session.get(url, timeout=30, allow_redirects=True)
                response.raise_for_status()
                
                return response
                
            except requests.exceptions.Timeout:
                print(f"  Timeout (attempt {attempt + 1}/{max_retries}): {url[:50]}...")
                if attempt < max_retries - 1:
                    time.sleep(5)
            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 403:
                    print(f"  Access denied (403): {url[:50]}...")
                    return None
                elif e.response.status_code == 404:
                    print(f"  Not found (404): {url[:50]}...")
                    return None
                else:
                    print(f"  HTTP error {e.response.status_code}: {url[:50]}...")
            except Exception as e:
                print(f"  Error: {str(e)[:50]} - {url[:50]}...")
        
        return None
    
    def download_asset(self, url):
        """Download an asset"""
        if url in self.downloaded_assets or url in self.failed_urls:
            return self.url_to_local.get(url)
        
        response = self.fetch_url(url)
        if not response:
            self.failed_urls.add(url)
            return None
        
        try:
            content_type = response.headers.get('Content-Type', '')
            local_path = self.url_to_filepath(url, content_type)
            
            is_text = any(t in content_type for t in ['text', 'javascript', 'json', 'xml', 'css', 'svg'])
            
            if is_text:
                with open(local_path, 'w', encoding='utf-8', errors='replace') as f:
                    f.write(response.text)
            else:
                with open(local_path, 'wb') as f:
                    f.write(response.content)
            
            self.downloaded_assets.add(url)
            self.url_to_local[url] = local_path
            print(f"  [OK] {url[:70]}...")
            return local_path
            
        except Exception as e:
            print(f"  [FAIL] Save error: {str(e)[:40]} - {url[:40]}...")
            self.failed_urls.add(url)
            return None
    
    def extract_from_html(self, html_content, page_url):
        """Extract assets and links from HTML"""
        soup = BeautifulSoup(html_content, 'lxml')
        assets = set()
        pages = set()
        
        # Extract assets from various elements
        asset_selectors = [
            ('link[href]', 'href'),
            ('script[src]', 'src'),
            ('img[src]', 'src'),
            ('img[data-src]', 'data-src'),
            ('img[data-lazy-src]', 'data-lazy-src'),
            ('source[src]', 'src'),
            ('video[src]', 'src'),
            ('video[poster]', 'poster'),
            ('audio[src]', 'src'),
        ]
        
        for selector, attr in asset_selectors:
            for element in soup.select(selector):
                value = element.get(attr)
                if value:
                    url = self.normalize_url(value, page_url)
                    if url:
                        assets.add(url)
        
        # Handle srcset
        for element in soup.select('[srcset]'):
            srcset = element.get('srcset', '')
            for part in srcset.split(','):
                url_part = part.strip().split()[0] if part.strip() else None
                if url_part:
                    url = self.normalize_url(url_part, page_url)
                    if url:
                        assets.add(url)
        
        # Extract from inline styles
        style_pattern = r'url\([\'"]?([^\'")\s]+)[\'"]?\)'
        
        for element in soup.find_all(style=True):
            for url in re.findall(style_pattern, element.get('style', '')):
                normalized = self.normalize_url(url, page_url)
                if normalized:
                    assets.add(normalized)
        
        for style in soup.find_all('style'):
            if style.string:
                for url in re.findall(style_pattern, style.string):
                    normalized = self.normalize_url(url, page_url)
                    if normalized:
                        assets.add(normalized)
        
        # Extract background images from data attributes
        for attr in ['data-background', 'data-bg', 'data-image', 'data-src']:
            for element in soup.find_all(attrs={attr: True}):
                url = self.normalize_url(element.get(attr), page_url)
                if url:
                    assets.add(url)
        
        # Extract page links
        for a in soup.find_all('a', href=True):
            href = a.get('href')
            url = self.normalize_url(href, page_url)
            if url and self.is_same_domain(url) and not self.is_asset_url(url):
                pages.add(url)
        
        # Extract SEO meta images
        for meta in soup.find_all('meta'):
            prop = meta.get('property', '') or meta.get('name', '')
            if 'image' in prop.lower():
                url = self.normalize_url(meta.get('content', ''), page_url)
                if url:
                    assets.add(url)
        
        # Extract favicon
        for link in soup.find_all('link', rel=lambda x: x and 'icon' in str(x).lower()):
            url = self.normalize_url(link.get('href'), page_url)
            if url:
                assets.add(url)
        
        return assets, pages
    
    def extract_from_css(self, css_content, css_url):
        """Extract assets from CSS"""
        assets = set()
        patterns = [
            r'url\([\'"]?([^\'")\s]+)[\'"]?\)',
            r'@import\s+[\'"]([^\'"]+)[\'"]',
        ]
        for pattern in patterns:
            for match in re.findall(pattern, css_content):
                url = self.normalize_url(match, css_url)
                if url:
                    assets.add(url)
        return assets
    
    def rewrite_html(self, html_content, page_url):
        """Rewrite URLs to local paths"""
        soup = BeautifulSoup(html_content, 'lxml')
        page_local = self.url_to_filepath(page_url)
        
        # Rewrite element attributes
        attrs_to_rewrite = ['href', 'src', 'data-src', 'data-lazy-src', 'poster', 'data-background', 'data-bg', 'data-image']
        
        for attr in attrs_to_rewrite:
            for element in soup.find_all(attrs={attr: True}):
                value = element.get(attr)
                if value:
                    url = self.normalize_url(value, page_url)
                    if url and url in self.url_to_local:
                        try:
                            rel_path = os.path.relpath(self.url_to_local[url], os.path.dirname(page_local))
                            element[attr] = rel_path.replace('\\', '/')
                        except ValueError:
                            pass
        
        # Rewrite srcset
        for element in soup.find_all(srcset=True):
            srcset = element.get('srcset', '')
            new_parts = []
            for part in srcset.split(','):
                parts = part.strip().split()
                if parts:
                    url = self.normalize_url(parts[0], page_url)
                    if url and url in self.url_to_local:
                        try:
                            rel_path = os.path.relpath(self.url_to_local[url], os.path.dirname(page_local))
                            parts[0] = rel_path.replace('\\', '/')
                        except ValueError:
                            pass
                    new_parts.append(' '.join(parts))
            element['srcset'] = ', '.join(new_parts)
        
        # Rewrite inline styles
        def rewrite_css_url(match):
            url = match.group(1)
            normalized = self.normalize_url(url, page_url)
            if normalized and normalized in self.url_to_local:
                try:
                    rel_path = os.path.relpath(self.url_to_local[normalized], os.path.dirname(page_local))
                    return f'url("{rel_path.replace(chr(92), "/")}")'
                except ValueError:
                    pass
            return match.group(0)
        
        for element in soup.find_all(style=True):
            style = element.get('style', '')
            element['style'] = re.sub(r'url\([\'"]?([^\'")\s]+)[\'"]?\)', rewrite_css_url, style)
        
        for style in soup.find_all('style'):
            if style.string:
                style.string = re.sub(r'url\([\'"]?([^\'")\s]+)[\'"]?\)', rewrite_css_url, style.string)
        
        return str(soup)
    
    def rewrite_css(self, css_content, css_url, css_local):
        """Rewrite URLs in CSS"""
        def replace_url(match):
            url = match.group(1)
            normalized = self.normalize_url(url, css_url)
            if normalized and normalized in self.url_to_local:
                try:
                    rel_path = os.path.relpath(self.url_to_local[normalized], os.path.dirname(css_local))
                    return f'url("{rel_path.replace(chr(92), "/")}")'
                except ValueError:
                    pass
            return match.group(0)
        
        return re.sub(r'url\([\'"]?([^\'")\s]+)[\'"]?\)', replace_url, css_content)
    
    def clone(self):
        """Main cloning method"""
        print("\n" + "="*60)
        print("ROBUST WEBSITE CLONER")
        print("="*60)
        print(f"Target: {self.base_url}")
        print(f"Output: {os.path.abspath(self.output_dir)}")
        print(f"Max depth: {self.max_depth}")
        print("="*60 + "\n")
        
        # First, establish a session by visiting the homepage
        print("[INIT] Establishing session...")
        
        all_assets = set()
        self.pages_to_visit.append((self.base_url, 0))
        
        print("\n[PHASE 1] Crawling pages...\n")
        
        while self.pages_to_visit:
            url, depth = self.pages_to_visit.popleft()
            
            if url in self.visited_urls or depth > self.max_depth:
                continue
            
            self.visited_urls.add(url)
            
            print(f"[PAGE] Depth {depth}: {url[:60]}...")
            
            response = self.fetch_url(url, is_page=True)
            if not response:
                self.failed_urls.add(url)
                continue
            
            content_type = response.headers.get('Content-Type', '')
            
            if 'text/html' not in content_type:
                # Not a page, download as asset
                self.download_asset(url)
                continue
            
            html_content = response.text
            local_path = self.url_to_filepath(url)
            
            # Save HTML
            with open(local_path, 'w', encoding='utf-8', errors='replace') as f:
                f.write(html_content)
            
            self.url_to_local[url] = local_path
            self.downloaded_assets.add(url)
            
            # Extract assets and links
            assets, pages = self.extract_from_html(html_content, url)
            all_assets.update(assets)
            
            print(f"       Found {len(assets)} assets, {len(pages)} links")
            
            # Queue new pages
            for page_url in pages:
                if page_url not in self.visited_urls:
                    self.pages_to_visit.append((page_url, depth + 1))
        
        # Phase 2: Download assets
        print(f"\n[PHASE 2] Downloading {len(all_assets)} assets...\n")
        
        processed = set()
        to_process = all_assets.copy()
        
        while to_process - processed:
            for asset_url in list(to_process - processed):
                processed.add(asset_url)
                local_path = self.download_asset(asset_url)
                
                # Process CSS for nested assets
                if local_path and local_path.endswith('.css'):
                    try:
                        with open(local_path, 'r', encoding='utf-8', errors='replace') as f:
                            css_content = f.read()
                        nested = self.extract_from_css(css_content, asset_url)
                        to_process.update(nested)
                    except:
                        pass
        
        # Phase 3: Rewrite URLs
        print("\n[PHASE 3] Rewriting URLs to local paths...")
        
        for url, local_path in self.url_to_local.items():
            try:
                if local_path.endswith(('.html', '.htm')):
                    with open(local_path, 'r', encoding='utf-8', errors='replace') as f:
                        content = f.read()
                    rewritten = self.rewrite_html(content, url)
                    with open(local_path, 'w', encoding='utf-8') as f:
                        f.write(rewritten)
                elif local_path.endswith('.css'):
                    with open(local_path, 'r', encoding='utf-8', errors='replace') as f:
                        content = f.read()
                    rewritten = self.rewrite_css(content, url, local_path)
                    with open(local_path, 'w', encoding='utf-8') as f:
                        f.write(rewritten)
            except Exception as e:
                print(f"  Warning: {local_path}: {e}")
        
        # Create root redirect
        main_domain_dir = os.path.join(self.output_dir, self.base_domain.replace(':', '_'))
        main_index = os.path.join(main_domain_dir, 'index.html')
        root_index = os.path.join(self.output_dir, 'index.html')
        
        if os.path.exists(main_index):
            redirect_html = f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0; url={self.base_domain.replace(':', '_')}/index.html">
    <title>Stumptown Coffee - Local Clone</title>
</head>
<body>
    <p>Redirecting to <a href="{self.base_domain.replace(':', '_')}/index.html">Stumptown Coffee</a>...</p>
</body>
</html>'''
            with open(root_index, 'w', encoding='utf-8') as f:
                f.write(redirect_html)
        
        # Summary
        print("\n" + "="*60)
        print("CLONE COMPLETE!")
        print("="*60)
        print(f"Pages downloaded: {len(self.visited_urls)}")
        print(f"Assets downloaded: {len(self.downloaded_assets)}")
        print(f"Failed downloads: {len(self.failed_urls)}")
        print(f"Output directory: {os.path.abspath(self.output_dir)}")
        
        if os.path.exists(root_index):
            print(f"\nTo view: {os.path.abspath(root_index)}")
        elif os.path.exists(main_index):
            print(f"\nTo view: {os.path.abspath(main_index)}")
        
        if self.failed_urls:
            failed_log = os.path.join(self.output_dir, 'failed_urls.txt')
            with open(failed_log, 'w', encoding='utf-8') as f:
                f.write('\n'.join(sorted(self.failed_urls)))
            print(f"Failed URLs: {failed_log}")
        
        print("="*60 + "\n")
        
        return self.output_dir


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Robust website cloner')
    parser.add_argument('url', nargs='?', default='https://www.stumptowncoffee.com/',
                       help='URL to clone')
    parser.add_argument('-o', '--output', default='stumptown_clone',
                       help='Output directory')
    parser.add_argument('-d', '--depth', type=int, default=5,
                       help='Max crawl depth')
    
    args = parser.parse_args()
    
    cloner = RobustWebsiteCloner(
        base_url=args.url,
        output_dir=args.output,
        max_depth=args.depth
    )
    
    cloner.clone()


if __name__ == '__main__':
    main()


