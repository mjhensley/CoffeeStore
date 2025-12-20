"""
Advanced Website Cloner using Playwright
Handles JavaScript-rendered websites, SPAs, and modern web apps
"""

import os
import re
import sys
import time
import hashlib
import asyncio
from urllib.parse import urljoin, urlparse, unquote
from collections import deque
import mimetypes

# Install required packages
try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Installing required packages...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests", "beautifulsoup4", "lxml", "-q"])
    import requests
    from bs4 import BeautifulSoup

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("Installing Playwright...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "playwright", "-q"])
    subprocess.check_call([sys.executable, "-m", "playwright", "install", "chromium"])
    from playwright.sync_api import sync_playwright


class AdvancedWebsiteCloner:
    def __init__(self, base_url, output_dir="cloned_site", max_depth=10, delay=1.0):
        self.base_url = base_url.rstrip('/')
        self.parsed_base = urlparse(self.base_url)
        self.base_domain = self.parsed_base.netloc
        self.output_dir = output_dir
        self.max_depth = max_depth
        self.delay = delay
        
        # Track visited URLs and downloaded assets
        self.visited_urls = set()
        self.downloaded_assets = set()
        self.url_to_local = {}
        self.failed_urls = set()
        
        # Queue for pages: (url, depth)
        self.pages_to_visit = deque()
        
        # Session for asset downloads
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
        })
        
        self.asset_extensions = {
            '.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico',
            '.woff', '.woff2', '.ttf', '.eot', '.otf',
            '.mp4', '.webm', '.mp3', '.ogg', '.wav',
            '.pdf', '.json', '.xml', '.txt', '.map'
        }
        
        os.makedirs(self.output_dir, exist_ok=True)
        
    def url_to_filepath(self, url, content_type=None):
        """Convert URL to local file path"""
        parsed = urlparse(url)
        path = unquote(parsed.path)
        
        if not path or path == '/':
            path = '/index.html'
        
        ext = os.path.splitext(path)[1].lower()
        if not ext or (ext not in self.asset_extensions and 'html' not in (content_type or '')):
            if not path.endswith('/'):
                path = path + '.html'
            else:
                path = path + 'index.html'
        
        if parsed.query:
            query_hash = hashlib.md5(parsed.query.encode()).hexdigest()[:8]
            base, ext = os.path.splitext(path)
            path = f"{base}_{query_hash}{ext}"
        
        local_path = os.path.join(self.output_dir, parsed.netloc, path.lstrip('/'))
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        
        return local_path
    
    def is_same_domain(self, url):
        """Check if URL belongs to the same domain"""
        parsed = urlparse(url)
        domain = parsed.netloc.replace('www.', '')
        base = self.base_domain.replace('www.', '')
        return domain == base or domain.endswith('.' + base) or base.endswith('.' + domain)
    
    def normalize_url(self, url, base_url=None):
        """Normalize and clean URL"""
        if not url:
            return None
            
        if any(url.startswith(prefix) for prefix in ['data:', 'javascript:', 'mailto:', 'tel:', '#', 'about:', 'blob:']):
            return None
        
        if url.startswith('//'):
            url = self.parsed_base.scheme + ':' + url
        
        if base_url:
            url = urljoin(base_url, url)
        else:
            url = urljoin(self.base_url, url)
        
        parsed = urlparse(url)
        url = parsed._replace(fragment='').geturl()
        
        return url
    
    def download_asset(self, url):
        """Download an asset file"""
        if url in self.downloaded_assets or url in self.failed_urls:
            return self.url_to_local.get(url)
        
        try:
            time.sleep(0.1)
            response = self.session.get(url, timeout=30, allow_redirects=True)
            response.raise_for_status()
            
            content_type = response.headers.get('Content-Type', '')
            local_path = self.url_to_filepath(url, content_type)
            
            # Determine if text or binary
            is_text = any(t in content_type for t in ['text', 'javascript', 'json', 'xml', 'css'])
            
            if is_text:
                with open(local_path, 'w', encoding='utf-8', errors='replace') as f:
                    f.write(response.text)
            else:
                with open(local_path, 'wb') as f:
                    f.write(response.content)
            
            self.downloaded_assets.add(url)
            self.url_to_local[url] = local_path
            print(f"  [OK] Asset: {url[:70]}...")
            return local_path
            
        except Exception as e:
            print(f"  [FAIL] Asset: {url[:50]}... - {str(e)[:40]}")
            self.failed_urls.add(url)
            return None
    
    def extract_from_html(self, html_content, page_url):
        """Extract assets and links from HTML"""
        soup = BeautifulSoup(html_content, 'lxml')
        assets = set()
        pages = set()
        
        # Asset extraction
        tag_attrs = [
            ('link', 'href'), ('script', 'src'), ('img', 'src'), ('img', 'data-src'),
            ('source', 'src'), ('video', 'src'), ('video', 'poster'), ('audio', 'src'),
            ('iframe', 'src'), ('embed', 'src'), ('object', 'data'),
        ]
        
        for tag, attr in tag_attrs:
            for element in soup.find_all(tag):
                value = element.get(attr)
                if value:
                    url = self.normalize_url(value, page_url)
                    if url:
                        assets.add(url)
        
        # srcset handling
        for element in soup.find_all(['img', 'source'], srcset=True):
            srcset = element.get('srcset', '')
            for part in srcset.split(','):
                url_part = part.strip().split()[0] if part.strip() else None
                if url_part:
                    url = self.normalize_url(url_part, page_url)
                    if url:
                        assets.add(url)
        
        # Inline styles
        for element in soup.find_all(style=True):
            urls = re.findall(r'url\([\'"]?([^\'")\s]+)[\'"]?\)', element.get('style', ''))
            for url in urls:
                normalized = self.normalize_url(url, page_url)
                if normalized:
                    assets.add(normalized)
        
        # Style tags
        for style in soup.find_all('style'):
            if style.string:
                urls = re.findall(r'url\([\'"]?([^\'")\s]+)[\'"]?\)', style.string)
                for url in urls:
                    normalized = self.normalize_url(url, page_url)
                    if normalized:
                        assets.add(normalized)
        
        # Page links
        for a in soup.find_all('a', href=True):
            href = a.get('href')
            url = self.normalize_url(href, page_url)
            if url and self.is_same_domain(url):
                ext = os.path.splitext(urlparse(url).path)[1].lower()
                if not ext or ext in ['.html', '.htm', '.php', '.asp', '.aspx', '']:
                    pages.add(url)
        
        # Meta tags for SEO
        for meta in soup.find_all('meta', attrs={'property': re.compile(r'^og:')}):
            if 'image' in meta.get('property', '').lower():
                url = self.normalize_url(meta.get('content', ''), page_url)
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
        """Rewrite URLs in HTML to local paths"""
        soup = BeautifulSoup(html_content, 'lxml')
        page_local = self.url_to_filepath(page_url)
        
        tag_attrs = [
            ('link', 'href'), ('script', 'src'), ('img', 'src'), ('img', 'data-src'),
            ('source', 'src'), ('video', 'src'), ('video', 'poster'), ('audio', 'src'),
            ('a', 'href'),
        ]
        
        for tag, attr in tag_attrs:
            for element in soup.find_all(tag):
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
        for element in soup.find_all(['img', 'source'], srcset=True):
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
        for element in soup.find_all(style=True):
            style = element.get('style', '')
            element['style'] = self._rewrite_css_urls(style, page_url, page_local)
        
        for style in soup.find_all('style'):
            if style.string:
                style.string = self._rewrite_css_urls(style.string, page_url, page_local)
        
        return str(soup)
    
    def _rewrite_css_urls(self, css_content, css_url, css_local):
        """Helper to rewrite URLs in CSS content"""
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
        """Main cloning method using Playwright"""
        print("\n" + "="*60)
        print("ADVANCED WEBSITE CLONER (Playwright)")
        print("="*60)
        print(f"Target: {self.base_url}")
        print(f"Output: {os.path.abspath(self.output_dir)}")
        print(f"Max depth: {self.max_depth}")
        print("="*60 + "\n")
        
        all_assets = set()
        
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            page = context.new_page()
            
            # Track network requests for assets
            captured_assets = set()
            
            def handle_response(response):
                url = response.url
                if any(ext in url.lower() for ext in ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.woff', '.woff2', '.ttf', '.ico']):
                    captured_assets.add(url)
            
            page.on('response', handle_response)
            
            self.pages_to_visit.append((self.base_url, 0))
            
            print("[PHASE 1] Crawling pages with JavaScript rendering...\n")
            
            while self.pages_to_visit:
                url, depth = self.pages_to_visit.popleft()
                
                if url in self.visited_urls or depth > self.max_depth:
                    continue
                
                self.visited_urls.add(url)
                
                try:
                    print(f"[PAGE] {url[:70]}...")
                    
                    # Navigate and wait for network idle
                    page.goto(url, wait_until='networkidle', timeout=60000)
                    time.sleep(self.delay)  # Extra wait for dynamic content
                    
                    # Scroll to trigger lazy loading
                    page.evaluate('''() => {
                        return new Promise((resolve) => {
                            let totalHeight = 0;
                            let distance = 500;
                            let timer = setInterval(() => {
                                window.scrollBy(0, distance);
                                totalHeight += distance;
                                if(totalHeight >= document.body.scrollHeight){
                                    clearInterval(timer);
                                    window.scrollTo(0, 0);
                                    resolve();
                                }
                            }, 100);
                        });
                    }''')
                    
                    time.sleep(0.5)
                    
                    # Get rendered HTML
                    html_content = page.content()
                    
                    # Save the page
                    local_path = self.url_to_filepath(url)
                    with open(local_path, 'w', encoding='utf-8') as f:
                        f.write(html_content)
                    
                    self.url_to_local[url] = local_path
                    self.downloaded_assets.add(url)
                    
                    # Extract assets and links
                    assets, pages = self.extract_from_html(html_content, url)
                    all_assets.update(assets)
                    all_assets.update(captured_assets)
                    captured_assets.clear()
                    
                    print(f"       Found {len(assets)} assets, {len(pages)} links")
                    
                    # Queue new pages
                    for page_url in pages:
                        if page_url not in self.visited_urls:
                            self.pages_to_visit.append((page_url, depth + 1))
                    
                except Exception as e:
                    print(f"[FAIL] {url[:50]}... - {str(e)[:40]}")
                    self.failed_urls.add(url)
            
            browser.close()
        
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
                if local_path.endswith('.html') or local_path.endswith('.htm'):
                    with open(local_path, 'r', encoding='utf-8', errors='replace') as f:
                        content = f.read()
                    rewritten = self.rewrite_html(content, url)
                    with open(local_path, 'w', encoding='utf-8') as f:
                        f.write(rewritten)
                elif local_path.endswith('.css'):
                    with open(local_path, 'r', encoding='utf-8', errors='replace') as f:
                        content = f.read()
                    rewritten = self._rewrite_css_urls(content, url, local_path)
                    with open(local_path, 'w', encoding='utf-8') as f:
                        f.write(rewritten)
            except Exception as e:
                print(f"  Warning: Could not rewrite {local_path}: {e}")
        
        # Create root redirect
        main_index = os.path.join(self.output_dir, self.base_domain, 'index.html')
        root_index = os.path.join(self.output_dir, 'index.html')
        
        if os.path.exists(main_index) and not os.path.exists(root_index):
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
        print("\n" + "="*60)
        print("CLONE COMPLETE!")
        print("="*60)
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
        
        print("="*60 + "\n")
        
        return self.output_dir


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Clone a website using Playwright for JS rendering')
    parser.add_argument('url', nargs='?', default='https://www.stumptowncoffee.com/',
                       help='URL to clone')
    parser.add_argument('-o', '--output', default='stumptown_clone',
                       help='Output directory')
    parser.add_argument('-d', '--depth', type=int, default=10,
                       help='Max crawl depth')
    parser.add_argument('--delay', type=float, default=1.0,
                       help='Delay between pages')
    
    args = parser.parse_args()
    
    cloner = AdvancedWebsiteCloner(
        base_url=args.url,
        output_dir=args.output,
        max_depth=args.depth,
        delay=args.delay
    )
    
    cloner.clone()


if __name__ == '__main__':
    main()


