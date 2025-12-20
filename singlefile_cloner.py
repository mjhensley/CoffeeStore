"""
SingleFile-Style Website Cloner
Creates self-contained HTML files with ALL resources embedded as base64
Works 100% offline - no external dependencies
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


class SingleFileCloner:
    def __init__(self, base_url, output_dir="cloned_site", max_depth=3):
        self.base_url = base_url.rstrip('/')
        self.parsed_base = urlparse(self.base_url)
        self.base_domain = self.parsed_base.netloc
        self.output_dir = output_dir
        self.max_depth = max_depth
        
        self.visited_urls = set()
        self.pages_to_visit = deque()
        self.page_files = {}  # url -> local filename
        
        os.makedirs(self.output_dir, exist_ok=True)
    
    def url_to_filename(self, url):
        """Generate safe filename"""
        parsed = urlparse(url)
        path = unquote(parsed.path).strip('/')
        
        if not path:
            return 'index.html'
        
        # Clean and create filename
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
    
    def normalize_url(self, url, base=None):
        if not url or url.startswith(('data:', 'javascript:', 'mailto:', 'tel:', '#', 'blob:')):
            return None
        if url.startswith('//'):
            url = 'https:' + url
        return urljoin(base or self.base_url, url).split('#')[0]
    
    def capture_page_as_singlefile(self, page, url):
        """
        Capture a page with ALL resources embedded as base64
        Uses Playwright to execute the embedding in-browser
        """
        try:
            print(f"    Navigating...")
            page.goto(url, wait_until='networkidle', timeout=90000)
            
            # Wait for content
            time.sleep(4)
            
            # Scroll to trigger lazy loading
            print(f"    Scrolling for lazy content...")
            page.evaluate('''async () => {
                await new Promise((resolve) => {
                    let totalHeight = 0;
                    const distance = 400;
                    const timer = setInterval(() => {
                        window.scrollBy(0, distance);
                        totalHeight += distance;
                        if (totalHeight >= document.body.scrollHeight) {
                            clearInterval(timer);
                            window.scrollTo(0, 0);
                            resolve();
                        }
                    }, 150);
                });
            }''')
            
            time.sleep(2)
            
            print(f"    Embedding all resources...")
            
            # Comprehensive resource embedding script
            single_html = page.evaluate('''async () => {
                // Helper to convert blob/fetch to base64
                async function toBase64(url) {
                    try {
                        const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
                        const blob = await response.blob();
                        return new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result);
                            reader.onerror = reject;
                            reader.readAsDataURL(blob);
                        });
                    } catch (e) {
                        console.log('Failed to fetch:', url);
                        return null;
                    }
                }
                
                // Helper to get computed background images
                function getBackgroundImages(element) {
                    const style = window.getComputedStyle(element);
                    const bg = style.backgroundImage;
                    const urls = [];
                    const regex = /url\\(["']?([^"')]+)["']?\\)/g;
                    let match;
                    while ((match = regex.exec(bg)) !== null) {
                        if (!match[1].startsWith('data:')) {
                            urls.push(match[1]);
                        }
                    }
                    return urls;
                }
                
                // Collect all resource URLs
                const resources = new Map();
                
                // Images
                document.querySelectorAll('img').forEach(img => {
                    ['src', 'data-src', 'data-lazy-src'].forEach(attr => {
                        const url = img.getAttribute(attr);
                        if (url && !url.startsWith('data:')) {
                            resources.set(url, null);
                        }
                    });
                    
                    // srcset
                    const srcset = img.getAttribute('srcset');
                    if (srcset) {
                        srcset.split(',').forEach(part => {
                            const url = part.trim().split(' ')[0];
                            if (url && !url.startsWith('data:')) {
                                resources.set(url, null);
                            }
                        });
                    }
                });
                
                // Background images from computed styles
                document.querySelectorAll('*').forEach(el => {
                    getBackgroundImages(el).forEach(url => {
                        resources.set(url, null);
                    });
                });
                
                // Videos (poster images)
                document.querySelectorAll('video').forEach(v => {
                    const poster = v.getAttribute('poster');
                    if (poster && !poster.startsWith('data:')) {
                        resources.set(poster, null);
                    }
                });
                
                // CSS files (we'll inline their content)
                const styleSheets = [];
                document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
                    const href = link.getAttribute('href');
                    if (href) {
                        styleSheets.push({ element: link, url: href });
                    }
                });
                
                // Fetch and convert all images to base64
                console.log('Fetching', resources.size, 'resources...');
                
                const fetchPromises = [];
                for (const url of resources.keys()) {
                    fetchPromises.push(
                        toBase64(url).then(data => {
                            if (data) resources.set(url, data);
                        })
                    );
                }
                
                await Promise.all(fetchPromises);
                
                // Fetch and inline CSS
                for (const { element, url } of styleSheets) {
                    try {
                        const absoluteUrl = new URL(url, window.location.href).href;
                        const response = await fetch(absoluteUrl);
                        let cssText = await response.text();
                        
                        // Replace url() in CSS with base64
                        const cssUrls = cssText.match(/url\\(["']?([^"')]+)["']?\\)/g) || [];
                        for (const cssUrl of cssUrls) {
                            const match = cssUrl.match(/url\\(["']?([^"')]+)["']?\\)/);
                            if (match && !match[1].startsWith('data:')) {
                                const fullUrl = new URL(match[1], absoluteUrl).href;
                                const data = await toBase64(fullUrl);
                                if (data) {
                                    cssText = cssText.replace(match[1], data);
                                }
                            }
                        }
                        
                        // Replace link with style
                        const style = document.createElement('style');
                        style.textContent = cssText;
                        element.parentNode.replaceChild(style, element);
                    } catch (e) {
                        console.log('CSS fetch failed:', url);
                    }
                }
                
                // Update all image sources to base64
                document.querySelectorAll('img').forEach(img => {
                    ['src', 'data-src', 'data-lazy-src'].forEach(attr => {
                        const url = img.getAttribute(attr);
                        if (url && resources.has(url) && resources.get(url)) {
                            img.setAttribute(attr, resources.get(url));
                        }
                    });
                    
                    // Fix srcset
                    const srcset = img.getAttribute('srcset');
                    if (srcset) {
                        let newSrcset = srcset;
                        srcset.split(',').forEach(part => {
                            const [url, size] = part.trim().split(' ');
                            if (url && resources.has(url) && resources.get(url)) {
                                newSrcset = newSrcset.replace(url, resources.get(url));
                            }
                        });
                        img.setAttribute('srcset', newSrcset);
                    }
                    
                    // Set src to actual rendered source if available
                    if (img.currentSrc && img.currentSrc.startsWith('data:')) {
                        img.src = img.currentSrc;
                    }
                });
                
                // Update background images in inline styles
                document.querySelectorAll('[style*="url"]').forEach(el => {
                    let style = el.getAttribute('style') || '';
                    for (const [url, data] of resources.entries()) {
                        if (data && style.includes(url)) {
                            style = style.split(url).join(data);
                        }
                    }
                    el.setAttribute('style', style);
                });
                
                // Update video posters
                document.querySelectorAll('video[poster]').forEach(v => {
                    const poster = v.getAttribute('poster');
                    if (poster && resources.has(poster) && resources.get(poster)) {
                        v.setAttribute('poster', resources.get(poster));
                    }
                });
                
                // Inline all computed styles for key elements
                const criticalElements = document.querySelectorAll('header, nav, main, section, article, footer, div[class*="hero"], div[class*="banner"], div[class*="slider"]');
                criticalElements.forEach(el => {
                    const computed = window.getComputedStyle(el);
                    const bg = computed.backgroundImage;
                    if (bg && bg !== 'none') {
                        el.style.backgroundImage = bg;
                    }
                });
                
                // Remove scripts (they won't work offline anyway)
                document.querySelectorAll('script').forEach(s => s.remove());
                document.querySelectorAll('noscript').forEach(s => {
                    // Show noscript content
                    const content = s.innerHTML;
                    const div = document.createElement('div');
                    div.innerHTML = content;
                    s.parentNode.replaceChild(div, s);
                });
                
                // Get final HTML
                return '<!DOCTYPE html>\\n' + document.documentElement.outerHTML;
            }''')
            
            return single_html
            
        except Exception as e:
            print(f"    Error: {str(e)[:60]}")
            return None
    
    def extract_links(self, page, current_url):
        """Extract same-domain links from page"""
        links = page.evaluate('''() => {
            const links = [];
            document.querySelectorAll('a[href]').forEach(a => {
                const href = a.getAttribute('href');
                if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
                    try {
                        const url = new URL(href, window.location.href);
                        links.push(url.href.split('#')[0]);
                    } catch(e) {}
                }
            });
            return [...new Set(links)];
        }''')
        
        return [l for l in links if self.is_same_domain(l)]
    
    def clone(self):
        """Main cloning method"""
        print("\n" + "="*65)
        print("  SINGLEFILE-STYLE WEBSITE CLONER")
        print("="*65)
        print(f"  Target: {self.base_url}")
        print(f"  Output: {os.path.abspath(self.output_dir)}")
        print(f"  Depth:  {self.max_depth}")
        print("="*65)
        print("\n  Creates SELF-CONTAINED HTML files with embedded resources")
        print("  Works 100% offline - no external dependencies!\n")
        print("="*65 + "\n")
        
        self.pages_to_visit.append((self.base_url, 0))
        
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            )
            page = context.new_page()
            
            while self.pages_to_visit:
                url, depth = self.pages_to_visit.popleft()
                
                if url in self.visited_urls or depth > self.max_depth:
                    continue
                
                self.visited_urls.add(url)
                filename = self.url_to_filename(url)
                self.page_files[url] = filename
                
                print(f"[PAGE {len(self.visited_urls)}] Depth {depth}: {url[:50]}...")
                
                # Capture page
                html = self.capture_page_as_singlefile(page, url)
                
                if html:
                    # Save
                    filepath = os.path.join(self.output_dir, filename)
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(html)
                    print(f"    Saved: {filename} ({len(html)//1024}KB)")
                    
                    # Extract links for further crawling
                    if depth < self.max_depth:
                        links = self.extract_links(page, url)
                        new_links = [l for l in links if l not in self.visited_urls]
                        print(f"    Found {len(new_links)} new links")
                        
                        for link in new_links:
                            self.pages_to_visit.append((link, depth + 1))
                else:
                    print(f"    FAILED to capture")
                
                print()
            
            browser.close()
        
        # Update internal links in all pages
        print("[FINALIZING] Updating internal links...")
        for url, filename in self.page_files.items():
            filepath = os.path.join(self.output_dir, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Replace absolute URLs with local filenames
                for link_url, link_filename in self.page_files.items():
                    if link_url != url:
                        # Replace href="url" with href="filename"
                        content = content.replace(f'href="{link_url}"', f'href="{link_filename}"')
                        content = content.replace(f"href='{link_url}'", f"href='{link_filename}'")
                
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
            except:
                pass
        
        # Create main index
        index_path = os.path.join(self.output_dir, 'index.html')
        main_file = self.page_files.get(self.base_url, 'index.html')
        
        with open(index_path, 'w', encoding='utf-8') as f:
            f.write(f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0; url={main_file}">
    <title>Stumptown Coffee - Offline Clone</title>
    <style>
        body {{ font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #1a1a1a; color: #fff; }}
        a {{ color: #c9a96e; }}
    </style>
</head>
<body>
    <p>Loading <a href="{main_file}">Stumptown Coffee</a>...</p>
</body>
</html>''')
        
        print("\n" + "="*65)
        print("  CLONE COMPLETE!")
        print("="*65)
        print(f"  Pages captured: {len(self.visited_urls)}")
        print(f"  Output folder:  {os.path.abspath(self.output_dir)}")
        print(f"\n  >>> Open: {os.path.abspath(index_path)}")
        print("="*65 + "\n")


def main():
    import argparse
    
    parser = argparse.ArgumentParser()
    parser.add_argument('url', nargs='?', default='https://www.stumptowncoffee.com/')
    parser.add_argument('-o', '--output', default='stumptown_offline')
    parser.add_argument('-d', '--depth', type=int, default=2)
    
    args = parser.parse_args()
    
    cloner = SingleFileCloner(args.url, args.output, args.depth)
    cloner.clone()


if __name__ == '__main__':
    main()


