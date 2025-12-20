"""
Visible Browser Website Cloner
Uses a visible browser window to bypass bot detection
Captures fully rendered pages with embedded resources
"""

import os
import sys
import time
import base64
import re
import hashlib
from urllib.parse import urljoin, urlparse, unquote
from collections import deque

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "playwright", "-q"])
    subprocess.check_call([sys.executable, "-m", "playwright", "install", "chromium"])
    from playwright.sync_api import sync_playwright


class VisibleCloner:
    def __init__(self, base_url, output_dir="cloned_site", max_depth=2):
        self.base_url = base_url.rstrip('/')
        self.parsed_base = urlparse(self.base_url)
        self.base_domain = self.parsed_base.netloc
        self.output_dir = output_dir
        self.max_depth = max_depth
        
        self.visited_urls = set()
        self.pages_to_visit = deque()
        self.page_files = {}
        
        os.makedirs(self.output_dir, exist_ok=True)
    
    def url_to_filename(self, url):
        parsed = urlparse(url)
        path = unquote(parsed.path).strip('/')
        if not path:
            return 'index.html'
        safe = re.sub(r'[<>:"/\\|?*]', '_', path.replace('/', '_'))
        if len(safe) > 80:
            safe = safe[:80]
        url_hash = hashlib.md5(url.encode()).hexdigest()[:6]
        return f"{safe}_{url_hash}.html"
    
    def is_same_domain(self, url):
        parsed = urlparse(url)
        d1 = parsed.netloc.replace('www.', '')
        d2 = self.base_domain.replace('www.', '')
        return d1 == d2
    
    def capture_page(self, page, url):
        """Capture page with resources embedded"""
        try:
            print(f"    Loading page...")
            
            # Navigate with longer timeout
            page.goto(url, wait_until='domcontentloaded', timeout=120000)
            
            # Wait for network to settle
            print(f"    Waiting for content...")
            time.sleep(8)
            
            # Try to wait for specific elements
            try:
                page.wait_for_selector('img', timeout=10000)
            except:
                pass
            
            # Scroll to load lazy content
            print(f"    Triggering lazy loading...")
            page.evaluate('''() => {
                return new Promise(resolve => {
                    let y = 0;
                    const step = () => {
                        y += 300;
                        window.scrollTo(0, y);
                        if (y < document.body.scrollHeight) {
                            setTimeout(step, 200);
                        } else {
                            window.scrollTo(0, 0);
                            setTimeout(resolve, 2000);
                        }
                    };
                    step();
                });
            }''')
            
            time.sleep(3)
            
            print(f"    Embedding resources...")
            
            # Embed all resources
            html = page.evaluate('''async () => {
                const toBase64 = async (url) => {
                    try {
                        const r = await fetch(url);
                        const blob = await r.blob();
                        return new Promise((res, rej) => {
                            const reader = new FileReader();
                            reader.onloadend = () => res(reader.result);
                            reader.onerror = rej;
                            reader.readAsDataURL(blob);
                        });
                    } catch { return null; }
                };
                
                // Process all images
                const imgs = document.querySelectorAll('img');
                for (const img of imgs) {
                    const src = img.src || img.dataset.src;
                    if (src && !src.startsWith('data:')) {
                        const data = await toBase64(src);
                        if (data) {
                            img.src = data;
                            img.removeAttribute('data-src');
                            img.removeAttribute('srcset');
                        }
                    }
                }
                
                // Process background images
                const allEls = document.querySelectorAll('*');
                for (const el of allEls) {
                    const style = window.getComputedStyle(el);
                    const bg = style.backgroundImage;
                    if (bg && bg !== 'none' && !bg.includes('data:')) {
                        const urls = bg.match(/url\\(["']?([^"')]+)["']?\\)/g) || [];
                        let newBg = bg;
                        for (const u of urls) {
                            const match = u.match(/url\\(["']?([^"')]+)["']?\\)/);
                            if (match && match[1]) {
                                const data = await toBase64(match[1]);
                                if (data) {
                                    newBg = newBg.replace(match[1], data);
                                }
                            }
                        }
                        if (newBg !== bg) {
                            el.style.backgroundImage = newBg;
                        }
                    }
                }
                
                // Inline CSS
                const links = document.querySelectorAll('link[rel="stylesheet"]');
                for (const link of links) {
                    try {
                        const href = link.href;
                        const r = await fetch(href);
                        let css = await r.text();
                        
                        // Replace urls in CSS
                        const cssUrls = css.match(/url\\(["']?([^"')]+)["']?\\)/g) || [];
                        for (const u of cssUrls) {
                            const m = u.match(/url\\(["']?([^"')]+)["']?\\)/);
                            if (m && m[1] && !m[1].startsWith('data:')) {
                                const fullUrl = new URL(m[1], href).href;
                                const data = await toBase64(fullUrl);
                                if (data) {
                                    css = css.split(m[1]).join(data);
                                }
                            }
                        }
                        
                        const style = document.createElement('style');
                        style.textContent = css;
                        link.replaceWith(style);
                    } catch {}
                }
                
                // Remove scripts
                document.querySelectorAll('script').forEach(s => s.remove());
                
                // Handle video posters
                for (const v of document.querySelectorAll('video[poster]')) {
                    const poster = v.poster;
                    if (poster && !poster.startsWith('data:')) {
                        const data = await toBase64(poster);
                        if (data) v.poster = data;
                    }
                }
                
                return '<!DOCTYPE html>\\n' + document.documentElement.outerHTML;
            }''')
            
            return html
            
        except Exception as e:
            print(f"    Error: {str(e)[:80]}")
            return None
    
    def extract_links(self, page):
        """Get same-domain links"""
        try:
            links = page.evaluate('''() => {
                return [...document.querySelectorAll('a[href]')]
                    .map(a => {
                        try { return new URL(a.href).href.split('#')[0]; }
                        catch { return null; }
                    })
                    .filter(Boolean);
            }''')
            return [l for l in set(links) if self.is_same_domain(l)]
        except:
            return []
    
    def clone(self):
        print("\n" + "="*65)
        print("  VISIBLE BROWSER WEBSITE CLONER")
        print("="*65)
        print(f"  Target: {self.base_url}")
        print(f"  Output: {os.path.abspath(self.output_dir)}")
        print("="*65)
        print("\n  Using VISIBLE browser to bypass bot detection")
        print("  A browser window will open - don't close it!\n")
        print("="*65 + "\n")
        
        self.pages_to_visit.append((self.base_url, 0))
        
        with sync_playwright() as p:
            # Launch VISIBLE browser
            browser = p.chromium.launch(
                headless=False,  # VISIBLE!
                slow_mo=100  # Slow down to appear more human
            )
            
            context = browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            
            page = context.new_page()
            
            while self.pages_to_visit:
                url, depth = self.pages_to_visit.popleft()
                
                if url in self.visited_urls or depth > self.max_depth:
                    continue
                
                self.visited_urls.add(url)
                filename = self.url_to_filename(url)
                self.page_files[url] = filename
                
                print(f"\n[PAGE {len(self.visited_urls)}] {url[:60]}...")
                
                html = self.capture_page(page, url)
                
                if html:
                    filepath = os.path.join(self.output_dir, filename)
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(html)
                    
                    size_kb = len(html) // 1024
                    print(f"    Saved: {filename} ({size_kb}KB)")
                    
                    if depth < self.max_depth:
                        links = self.extract_links(page)
                        new_links = [l for l in links if l not in self.visited_urls][:15]  # Limit
                        print(f"    Found {len(new_links)} new links to crawl")
                        
                        for link in new_links:
                            self.pages_to_visit.append((link, depth + 1))
                else:
                    print(f"    FAILED")
            
            browser.close()
        
        # Update links
        print("\n[FINALIZING] Updating internal links...")
        for url, filename in self.page_files.items():
            filepath = os.path.join(self.output_dir, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                for link_url, link_filename in self.page_files.items():
                    content = content.replace(f'href="{link_url}"', f'href="{link_filename}"')
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
            except:
                pass
        
        # Create index
        index_path = os.path.join(self.output_dir, 'index.html')
        main_file = self.page_files.get(self.base_url, list(self.page_files.values())[0] if self.page_files else 'index.html')
        
        # If main page was captured, just copy/rename it
        main_captured = os.path.join(self.output_dir, main_file)
        if os.path.exists(main_captured) and main_file != 'index.html':
            import shutil
            shutil.copy(main_captured, index_path)
        else:
            with open(index_path, 'w', encoding='utf-8') as f:
                f.write(f'''<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta http-equiv="refresh" content="0; url={main_file}">
<title>Loading...</title></head><body><a href="{main_file}">Click here</a></body></html>''')
        
        print("\n" + "="*65)
        print("  CLONE COMPLETE!")
        print("="*65)
        print(f"  Pages: {len(self.visited_urls)}")
        print(f"\n  >>> OPEN: {os.path.abspath(index_path)}")
        print("="*65 + "\n")


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('url', nargs='?', default='https://www.stumptowncoffee.com/')
    parser.add_argument('-o', '--output', default='stumptown_visible')
    parser.add_argument('-d', '--depth', type=int, default=2)
    args = parser.parse_args()
    
    cloner = VisibleCloner(args.url, args.output, args.depth)
    cloner.clone()


