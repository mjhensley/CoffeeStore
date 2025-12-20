"""
Full Render Website Cloner
Captures pages AFTER JavaScript renders them, with all styles inlined
Creates truly offline-functional websites
"""

import os
import re
import sys
import time
import base64
import hashlib
from urllib.parse import urljoin, urlparse, unquote
from collections import deque

try:
    from playwright.sync_api import sync_playwright
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "playwright", "requests", "beautifulsoup4", "lxml", "-q"])
    subprocess.check_call([sys.executable, "-m", "playwright", "install", "chromium"])
    from playwright.sync_api import sync_playwright
    import requests
    from bs4 import BeautifulSoup


class FullRenderCloner:
    def __init__(self, base_url, output_dir="cloned_site", max_depth=5):
        self.base_url = base_url.rstrip('/')
        self.parsed_base = urlparse(self.base_url)
        self.base_domain = self.parsed_base.netloc
        self.output_dir = output_dir
        self.max_depth = max_depth
        
        self.visited_urls = set()
        self.downloaded_assets = {}  # url -> local_path
        self.failed_urls = set()
        self.pages_to_visit = deque()
        
        # For downloading external assets
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        })
        
        os.makedirs(self.output_dir, exist_ok=True)
        os.makedirs(os.path.join(self.output_dir, 'assets'), exist_ok=True)
    
    def url_to_filename(self, url):
        """Generate a safe filename from URL"""
        parsed = urlparse(url)
        path = unquote(parsed.path).strip('/')
        
        if not path:
            path = 'index'
        
        # Create hash for uniqueness
        url_hash = hashlib.md5(url.encode()).hexdigest()[:8]
        
        # Get extension
        ext = os.path.splitext(path)[1]
        if not ext or len(ext) > 10:
            ext = '.html'
        
        # Clean filename
        safe_name = re.sub(r'[<>:"/\\|?*]', '_', path.replace('/', '_'))
        if len(safe_name) > 100:
            safe_name = safe_name[:100]
        
        return f"{safe_name}_{url_hash}{ext}"
    
    def is_same_domain(self, url):
        """Check if URL is same domain"""
        parsed = urlparse(url)
        domain = parsed.netloc.replace('www.', '')
        base = self.base_domain.replace('www.', '')
        return domain == base
    
    def normalize_url(self, url, base_url=None):
        """Normalize URL"""
        if not url:
            return None
        
        if any(url.startswith(p) for p in ['data:', 'javascript:', 'mailto:', 'tel:', '#', 'blob:']):
            return None
        
        if url.startswith('//'):
            url = 'https:' + url
        
        url = urljoin(base_url or self.base_url, url)
        parsed = urlparse(url)
        return parsed._replace(fragment='').geturl()
    
    def download_asset(self, url):
        """Download an asset and return local path"""
        if url in self.downloaded_assets:
            return self.downloaded_assets[url]
        
        if url in self.failed_urls:
            return None
        
        try:
            response = self.session.get(url, timeout=15)
            response.raise_for_status()
            
            # Determine filename
            content_type = response.headers.get('Content-Type', '')
            filename = self.url_to_filename(url)
            
            # Fix extension based on content type
            if 'image/jpeg' in content_type and not filename.endswith(('.jpg', '.jpeg')):
                filename = os.path.splitext(filename)[0] + '.jpg'
            elif 'image/png' in content_type and not filename.endswith('.png'):
                filename = os.path.splitext(filename)[0] + '.png'
            elif 'image/webp' in content_type and not filename.endswith('.webp'):
                filename = os.path.splitext(filename)[0] + '.webp'
            elif 'image/svg' in content_type and not filename.endswith('.svg'):
                filename = os.path.splitext(filename)[0] + '.svg'
            elif 'text/css' in content_type and not filename.endswith('.css'):
                filename = os.path.splitext(filename)[0] + '.css'
            elif 'javascript' in content_type and not filename.endswith('.js'):
                filename = os.path.splitext(filename)[0] + '.js'
            elif 'video/mp4' in content_type and not filename.endswith('.mp4'):
                filename = os.path.splitext(filename)[0] + '.mp4'
            
            local_path = os.path.join(self.output_dir, 'assets', filename)
            
            with open(local_path, 'wb') as f:
                f.write(response.content)
            
            self.downloaded_assets[url] = local_path
            return local_path
            
        except Exception as e:
            self.failed_urls.add(url)
            return None
    
    def inline_image_as_base64(self, url):
        """Download image and return as base64 data URI"""
        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            content_type = response.headers.get('Content-Type', 'image/jpeg')
            if ';' in content_type:
                content_type = content_type.split(';')[0]
            
            b64 = base64.b64encode(response.content).decode('utf-8')
            return f"data:{content_type};base64,{b64}"
            
        except:
            return None
    
    def process_page_with_playwright(self, page, url, inline_images=False):
        """
        Navigate to page, wait for render, and extract processed HTML
        """
        try:
            # Navigate and wait for network idle
            page.goto(url, wait_until='networkidle', timeout=60000)
            
            # Wait for main content to load
            time.sleep(3)
            
            # Scroll to trigger lazy loading
            page.evaluate('''() => {
                return new Promise((resolve) => {
                    let totalHeight = 0;
                    const distance = 500;
                    const timer = setInterval(() => {
                        window.scrollBy(0, distance);
                        totalHeight += distance;
                        if (totalHeight >= document.body.scrollHeight) {
                            clearInterval(timer);
                            window.scrollTo(0, 0);
                            setTimeout(resolve, 1000);
                        }
                    }, 100);
                });
            }''')
            
            # Get all computed styles and inline them
            rendered_html = page.evaluate('''() => {
                // Clone the document
                const clone = document.cloneNode(true);
                
                // Get all elements
                const elements = clone.querySelectorAll('*');
                
                // For critical elements, inline computed styles
                elements.forEach(el => {
                    if (el.tagName === 'SCRIPT' || el.tagName === 'NOSCRIPT') {
                        el.remove();
                        return;
                    }
                    
                    // Get corresponding original element
                    try {
                        const origEl = document.querySelector(
                            el.tagName.toLowerCase() + 
                            (el.id ? '#' + CSS.escape(el.id) : '') +
                            (el.className && typeof el.className === 'string' ? 
                                '.' + el.className.split(' ').filter(c => c).map(c => CSS.escape(c)).join('.') : '')
                        );
                        
                        if (origEl) {
                            const computed = window.getComputedStyle(origEl);
                            
                            // Only inline critical visual styles
                            const criticalProps = [
                                'display', 'position', 'top', 'left', 'right', 'bottom',
                                'width', 'height', 'max-width', 'max-height', 'min-width', 'min-height',
                                'margin', 'padding', 'border', 'border-radius',
                                'background', 'background-color', 'background-image', 'background-size', 'background-position',
                                'color', 'font-family', 'font-size', 'font-weight', 'line-height', 'text-align',
                                'flex', 'flex-direction', 'justify-content', 'align-items', 'gap',
                                'grid', 'grid-template-columns', 'grid-template-rows',
                                'overflow', 'opacity', 'visibility', 'z-index',
                                'transform', 'box-shadow', 'text-shadow'
                            ];
                            
                            let inlineStyle = '';
                            criticalProps.forEach(prop => {
                                const value = computed.getPropertyValue(prop);
                                if (value && value !== 'none' && value !== 'auto' && value !== 'normal' && value !== '0px') {
                                    inlineStyle += `${prop}:${value};`;
                                }
                            });
                            
                            if (inlineStyle) {
                                el.setAttribute('style', (el.getAttribute('style') || '') + inlineStyle);
                            }
                        }
                    } catch(e) {}
                });
                
                // Remove script tags
                clone.querySelectorAll('script').forEach(s => s.remove());
                clone.querySelectorAll('noscript').forEach(s => s.remove());
                
                return clone.documentElement.outerHTML;
            }''')
            
            return rendered_html
            
        except Exception as e:
            print(f"    Error rendering: {str(e)[:50]}")
            return None
    
    def extract_and_download_assets(self, html_content, page_url):
        """Extract all asset URLs and download them"""
        soup = BeautifulSoup(html_content, 'lxml')
        
        # Image sources
        for img in soup.find_all('img'):
            for attr in ['src', 'data-src', 'data-lazy-src', 'srcset']:
                value = img.get(attr)
                if value:
                    if 'srcset' in attr:
                        for part in value.split(','):
                            url_part = part.strip().split()[0]
                            if url_part and not url_part.startswith('data:'):
                                full_url = self.normalize_url(url_part, page_url)
                                if full_url:
                                    local = self.download_asset(full_url)
                                    if local:
                                        # Update srcset
                                        value = value.replace(url_part, 'assets/' + os.path.basename(local))
                        img[attr] = value
                    else:
                        if not value.startswith('data:'):
                            full_url = self.normalize_url(value, page_url)
                            if full_url:
                                local = self.download_asset(full_url)
                                if local:
                                    img[attr] = 'assets/' + os.path.basename(local)
        
        # CSS files
        for link in soup.find_all('link', rel='stylesheet'):
            href = link.get('href')
            if href and not href.startswith('data:'):
                full_url = self.normalize_url(href, page_url)
                if full_url:
                    local = self.download_asset(full_url)
                    if local:
                        link['href'] = 'assets/' + os.path.basename(local)
        
        # Background images in inline styles
        for el in soup.find_all(style=True):
            style = el.get('style', '')
            urls = re.findall(r'url\([\'"]?([^\'")\s]+)[\'"]?\)', style)
            for url in urls:
                if not url.startswith('data:'):
                    full_url = self.normalize_url(url, page_url)
                    if full_url:
                        local = self.download_asset(full_url)
                        if local:
                            style = style.replace(url, 'assets/' + os.path.basename(local))
            el['style'] = style
        
        # Video sources
        for video in soup.find_all(['video', 'source']):
            for attr in ['src', 'poster']:
                value = video.get(attr)
                if value and not value.startswith('data:'):
                    full_url = self.normalize_url(value, page_url)
                    if full_url:
                        local = self.download_asset(full_url)
                        if local:
                            video[attr] = 'assets/' + os.path.basename(local)
        
        # Extract page links
        pages = set()
        for a in soup.find_all('a', href=True):
            href = a.get('href')
            full_url = self.normalize_url(href, page_url)
            if full_url and self.is_same_domain(full_url):
                pages.add(full_url)
                # Update link to local file
                a['href'] = self.url_to_filename(full_url)
        
        return str(soup), pages
    
    def clone(self):
        """Main cloning method"""
        print("\n" + "="*60)
        print("FULL RENDER WEBSITE CLONER")
        print("="*60)
        print(f"Target: {self.base_url}")
        print(f"Output: {os.path.abspath(self.output_dir)}")
        print("="*60)
        print("\nThis captures FULLY RENDERED pages after JavaScript execution")
        print("="*60 + "\n")
        
        self.pages_to_visit.append((self.base_url, 0))
        
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            page = context.new_page()
            
            # Capture all network requests for assets
            asset_urls = set()
            
            def handle_response(response):
                url = response.url
                content_type = response.headers.get('content-type', '')
                if any(t in content_type for t in ['image', 'video', 'font', 'css']):
                    asset_urls.add(url)
            
            page.on('response', handle_response)
            
            print("[PHASE 1] Rendering and capturing pages...\n")
            
            while self.pages_to_visit:
                url, depth = self.pages_to_visit.popleft()
                
                if url in self.visited_urls or depth > self.max_depth:
                    continue
                
                self.visited_urls.add(url)
                
                print(f"[RENDER] Depth {depth}: {url[:55]}...")
                
                html = self.process_page_with_playwright(page, url)
                if not html:
                    self.failed_urls.add(url)
                    continue
                
                # Process and save
                processed_html, new_pages = self.extract_and_download_assets(html, url)
                
                # Save the page
                filename = self.url_to_filename(url)
                filepath = os.path.join(self.output_dir, filename)
                
                # Add DOCTYPE and wrap properly
                final_html = f"<!DOCTYPE html>\n<html>\n{processed_html}\n</html>"
                
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(final_html)
                
                print(f"         Saved: {filename}")
                print(f"         Found {len(new_pages)} links, {len(asset_urls)} assets")
                
                # Queue new pages
                for page_url in new_pages:
                    if page_url not in self.visited_urls:
                        self.pages_to_visit.append((page_url, depth + 1))
                
                # Download captured network assets
                for asset_url in list(asset_urls):
                    if asset_url not in self.downloaded_assets:
                        self.download_asset(asset_url)
                asset_urls.clear()
            
            browser.close()
        
        # Create index.html redirect
        index_file = os.path.join(self.output_dir, 'index.html')
        main_page = self.url_to_filename(self.base_url)
        
        with open(index_file, 'w', encoding='utf-8') as f:
            f.write(f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0; url={main_page}">
    <title>Stumptown Coffee</title>
</head>
<body>
    <p>Loading <a href="{main_page}">Stumptown Coffee</a>...</p>
</body>
</html>''')
        
        print("\n" + "="*60)
        print("CLONE COMPLETE!")
        print("="*60)
        print(f"Pages rendered: {len(self.visited_urls)}")
        print(f"Assets downloaded: {len(self.downloaded_assets)}")
        print(f"Failed: {len(self.failed_urls)}")
        print(f"\nOpen: {os.path.abspath(index_file)}")
        print("="*60 + "\n")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Full render website cloner')
    parser.add_argument('url', nargs='?', default='https://www.stumptowncoffee.com/')
    parser.add_argument('-o', '--output', default='stumptown_rendered')
    parser.add_argument('-d', '--depth', type=int, default=3)
    
    args = parser.parse_args()
    
    cloner = FullRenderCloner(
        base_url=args.url,
        output_dir=args.output,
        max_depth=args.depth
    )
    
    cloner.clone()


if __name__ == '__main__':
    main()

