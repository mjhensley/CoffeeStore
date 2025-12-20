"""
Smart Website Cloner - Handles responsive image templates and CDN quirks
Intelligently resolves {width}, {height} placeholders in URLs
"""

import os
import re
import sys
import time
import hashlib
import random
from urllib.parse import urljoin, urlparse, unquote, parse_qs, urlencode
from collections import deque

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests", "beautifulsoup4", "lxml", "-q"])
    import requests
    from bs4 import BeautifulSoup


class SmartWebsiteCloner:
    def __init__(self, base_url, output_dir="cloned_site", max_depth=10, use_proxy=None):
        self.base_url = base_url.rstrip('/')
        self.parsed_base = urlparse(self.base_url)
        self.base_domain = self.parsed_base.netloc
        self.output_dir = output_dir
        self.max_depth = max_depth
        self.use_proxy = use_proxy  # socks5://user:pass@host:port
        
        self.visited_urls = set()
        self.downloaded_assets = set()
        self.url_to_local = {}
        self.failed_urls = set()
        self.skipped_urls = set()  # Template URLs that were cleaned
        self.pages_to_visit = deque()
        
        # Session setup
        self.session = requests.Session()
        
        if use_proxy:
            self.session.proxies = {
                'http': use_proxy,
                'https': use_proxy
            }
        
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ]
        
        self.session.headers.update({
            'User-Agent': random.choice(self.user_agents),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Cache-Control': 'no-cache',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
        })
        
        self.asset_extensions = {
            '.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico',
            '.woff', '.woff2', '.ttf', '.eot', '.otf', '.mp4', '.webm', '.mp3',
            '.pdf', '.json', '.xml', '.txt', '.map'
        }
        
        # Responsive image sizes to try (width in pixels)
        self.responsive_widths = [1920, 1200, 800, 600, 400]
        
        os.makedirs(self.output_dir, exist_ok=True)
    
    def clean_url(self, url):
        """
        Smart URL cleaning - handles template placeholders and malformed URLs
        Returns (cleaned_url, was_template)
        """
        if not url:
            return None, False
        
        was_template = False
        
        # Check for template placeholders
        template_patterns = ['{width}', '{height}', '{size}', '{quality}', '{format}']
        has_template = any(p in url for p in template_patterns)
        
        if has_template:
            was_template = True
            
            # Fix double query strings: ?v=123?w={width} -> ?v=123&w=1920
            if '?' in url:
                parts = url.split('?')
                base = parts[0]
                
                # Merge all query parts
                all_params = {}
                for qpart in parts[1:]:
                    if qpart:
                        for param in qpart.split('&'):
                            if '=' in param:
                                k, v = param.split('=', 1)
                                # Replace template values with actual values
                                if v == '{width}':
                                    v = '1920'
                                elif v == '{height}':
                                    v = '1080'
                                elif '{' in v:
                                    continue  # Skip other templates
                                all_params[k] = v
                            else:
                                # Handle cases like ?w={width} without =
                                if '{' not in param:
                                    all_params[param] = ''
                
                if all_params:
                    url = base + '?' + urlencode(all_params)
                else:
                    url = base
        
        # Remove any remaining template placeholders
        url = re.sub(r'\{[^}]+\}', '', url)
        
        # Clean up any double ? or trailing ?
        url = re.sub(r'\?+', '?', url)
        url = url.rstrip('?&')
        
        return url, was_template
    
    def normalize_url(self, url, base_url=None):
        """Normalize URL with smart cleaning"""
        if not url:
            return None
        
        if any(url.startswith(p) for p in ['data:', 'javascript:', 'mailto:', 'tel:', '#', 'about:', 'blob:']):
            return None
        
        # Clean template placeholders first
        url, was_template = self.clean_url(url)
        if not url:
            return None
        
        if was_template:
            self.skipped_urls.add(url)  # Track that we cleaned this
        
        if url.startswith('//'):
            url = self.parsed_base.scheme + ':' + url
        
        url = urljoin(base_url or self.base_url, url)
        parsed = urlparse(url)
        url = parsed._replace(fragment='').geturl()
        
        return url
    
    def generate_responsive_variants(self, url):
        """
        For Contentful/Shopify CDN URLs, generate multiple resolution variants
        """
        variants = [url]  # Original first
        
        # Contentful images
        if 'ctfassets.net' in url:
            parsed = urlparse(url)
            base = parsed._replace(query='').geturl()
            
            for width in self.responsive_widths:
                # Add width parameter
                variants.append(f"{base}?w={width}")
                variants.append(f"{base}?w={width}&fm=jpg&q=80")
            
            # Also try the base URL without any params
            variants.append(base)
        
        # Shopify images
        elif 'cdn.shopify.com' in url:
            parsed = urlparse(url)
            base = parsed._replace(query='').geturl()
            
            # Shopify uses _WIDTHx or _WIDTHxHEIGHT suffixes
            for width in self.responsive_widths:
                # Try adding size suffix before extension
                base_no_ext = os.path.splitext(base)[0]
                ext = os.path.splitext(base)[1]
                variants.append(f"{base_no_ext}_{width}x{ext}")
            
            variants.append(base)
        
        return list(dict.fromkeys(variants))  # Remove duplicates, preserve order
    
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
    
    def fetch_url(self, url, is_page=False, timeout=30):
        """Fetch URL with retries"""
        max_retries = 2
        
        for attempt in range(max_retries):
            try:
                time.sleep(random.uniform(0.5, 1.5) if is_page else 0.1)
                
                response = self.session.get(url, timeout=timeout, allow_redirects=True)
                response.raise_for_status()
                return response
                
            except requests.exceptions.HTTPError as e:
                if e.response.status_code in [403, 404]:
                    return None
                if attempt == max_retries - 1:
                    return None
            except Exception as e:
                if attempt == max_retries - 1:
                    return None
                time.sleep(2)
        
        return None
    
    def download_asset_smart(self, url):
        """
        Smart asset download - tries multiple URL variants for CDN images
        """
        if url in self.downloaded_assets or url in self.failed_urls:
            return self.url_to_local.get(url)
        
        # Generate variants for CDN URLs
        variants = self.generate_responsive_variants(url)
        
        for variant_url in variants:
            response = self.fetch_url(variant_url)
            if response:
                try:
                    content_type = response.headers.get('Content-Type', '')
                    local_path = self.url_to_filepath(url)  # Use original URL for path
                    
                    is_text = any(t in content_type for t in ['text', 'javascript', 'json', 'xml', 'css', 'svg'])
                    
                    if is_text:
                        with open(local_path, 'w', encoding='utf-8', errors='replace') as f:
                            f.write(response.text)
                    else:
                        with open(local_path, 'wb') as f:
                            f.write(response.content)
                    
                    self.downloaded_assets.add(url)
                    self.url_to_local[url] = local_path
                    
                    if variant_url != url:
                        print(f"  [OK+] {url[:50]}... (via variant)")
                    else:
                        print(f"  [OK] {url[:60]}...")
                    
                    return local_path
                    
                except Exception as e:
                    continue
        
        # All variants failed
        self.failed_urls.add(url)
        return None
    
    def extract_from_html(self, html_content, page_url):
        """Extract assets and links from HTML"""
        soup = BeautifulSoup(html_content, 'lxml')
        assets = set()
        pages = set()
        
        # Extract assets
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
        
        # Handle srcset - extract all image URLs
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
        
        # Data attributes
        for attr in ['data-background', 'data-bg', 'data-image', 'data-src', 'data-srcset']:
            for element in soup.find_all(attrs={attr: True}):
                value = element.get(attr)
                if value:
                    # Handle data-srcset
                    if 'srcset' in attr:
                        for part in value.split(','):
                            url_part = part.strip().split()[0] if part.strip() else None
                            if url_part:
                                url = self.normalize_url(url_part, page_url)
                                if url:
                                    assets.add(url)
                    else:
                        url = self.normalize_url(value, page_url)
                        if url:
                            assets.add(url)
        
        # Page links
        for a in soup.find_all('a', href=True):
            href = a.get('href')
            url = self.normalize_url(href, page_url)
            if url and self.is_same_domain(url):
                ext = os.path.splitext(urlparse(url).path)[1].lower()
                if not ext or ext in ['.html', '.htm', '.php', '']:
                    pages.add(url)
        
        # SEO meta images
        for meta in soup.find_all('meta'):
            prop = meta.get('property', '') or meta.get('name', '')
            if 'image' in prop.lower():
                url = self.normalize_url(meta.get('content', ''), page_url)
                if url:
                    assets.add(url)
        
        # Favicon
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
        print("SMART WEBSITE CLONER")
        print("="*60)
        print(f"Target: {self.base_url}")
        print(f"Output: {os.path.abspath(self.output_dir)}")
        print(f"Max depth: {self.max_depth}")
        if self.use_proxy:
            print(f"Proxy: {self.use_proxy[:30]}...")
        print("="*60)
        print("\nFeatures:")
        print("  - Handles responsive image templates ({width}, etc.)")
        print("  - Tries multiple CDN URL variants")
        print("  - Smart URL cleaning and normalization")
        print("="*60 + "\n")
        
        all_assets = set()
        self.pages_to_visit.append((self.base_url, 0))
        
        print("[PHASE 1] Crawling pages...\n")
        
        while self.pages_to_visit:
            url, depth = self.pages_to_visit.popleft()
            
            if url in self.visited_urls or depth > self.max_depth:
                continue
            
            self.visited_urls.add(url)
            
            print(f"[PAGE] Depth {depth}: {url[:55]}...")
            
            response = self.fetch_url(url, is_page=True)
            if not response:
                self.failed_urls.add(url)
                continue
            
            content_type = response.headers.get('Content-Type', '')
            
            if 'text/html' not in content_type:
                self.download_asset_smart(url)
                continue
            
            html_content = response.text
            local_path = self.url_to_filepath(url)
            
            with open(local_path, 'w', encoding='utf-8', errors='replace') as f:
                f.write(html_content)
            
            self.url_to_local[url] = local_path
            self.downloaded_assets.add(url)
            
            assets, pages = self.extract_from_html(html_content, url)
            all_assets.update(assets)
            
            print(f"       Found {len(assets)} assets, {len(pages)} links")
            
            for page_url in pages:
                if page_url not in self.visited_urls:
                    self.pages_to_visit.append((page_url, depth + 1))
        
        # Filter out obviously bad URLs before downloading
        print(f"\n[FILTER] Cleaning {len(all_assets)} asset URLs...")
        clean_assets = set()
        for url in all_assets:
            # Skip URLs that still have unresolved templates
            if '{' in url or '}' in url:
                self.skipped_urls.add(url)
                continue
            # Skip empty or malformed
            if not url or len(url) < 10:
                continue
            clean_assets.add(url)
        
        print(f"         {len(clean_assets)} valid URLs (skipped {len(all_assets) - len(clean_assets)} template URLs)")
        
        print(f"\n[PHASE 2] Downloading {len(clean_assets)} assets...\n")
        
        processed = set()
        to_process = clean_assets.copy()
        
        while to_process - processed:
            batch = list(to_process - processed)[:100]
            
            for asset_url in batch:
                processed.add(asset_url)
                local_path = self.download_asset_smart(asset_url)
                
                if local_path and local_path.endswith('.css'):
                    try:
                        with open(local_path, 'r', encoding='utf-8', errors='replace') as f:
                            css_content = f.read()
                        nested = self.extract_from_css(css_content, asset_url)
                        # Filter nested too
                        for nested_url in nested:
                            if '{' not in nested_url and '}' not in nested_url:
                                to_process.add(nested_url)
                    except:
                        pass
        
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
                pass
        
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
    <title>Stumptown Coffee - Cloned Site</title>
</head>
<body>
    <p>Loading <a href="{self.base_domain.replace(':', '_')}/index.html">Stumptown Coffee</a>...</p>
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
        print(f"Template URLs cleaned: {len(self.skipped_urls)}")
        print(f"Failed downloads: {len(self.failed_urls)}")
        print(f"Output directory: {os.path.abspath(self.output_dir)}")
        
        if os.path.exists(root_index):
            print(f"\nOpen in browser: {os.path.abspath(root_index)}")
        
        if self.failed_urls:
            # Only log real failures, not template URLs
            real_failures = [u for u in self.failed_urls if '{' not in u]
            if real_failures:
                failed_log = os.path.join(self.output_dir, 'failed_urls.txt')
                with open(failed_log, 'w', encoding='utf-8') as f:
                    f.write('\n'.join(sorted(real_failures)))
                print(f"Failed URLs: {failed_log} ({len(real_failures)} real failures)")
        
        print("="*60 + "\n")
        
        return self.output_dir


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Smart website cloner with CDN handling')
    parser.add_argument('url', nargs='?', default='https://www.stumptowncoffee.com/',
                       help='URL to clone')
    parser.add_argument('-o', '--output', default='stumptown_clone',
                       help='Output directory')
    parser.add_argument('-d', '--depth', type=int, default=5,
                       help='Max crawl depth')
    parser.add_argument('--proxy', default=None,
                       help='SOCKS5 proxy (socks5://user:pass@host:port)')
    
    args = parser.parse_args()
    
    cloner = SmartWebsiteCloner(
        base_url=args.url,
        output_dir=args.output,
        max_depth=args.depth,
        use_proxy=args.proxy
    )
    
    cloner.clone()


if __name__ == '__main__':
    main()


