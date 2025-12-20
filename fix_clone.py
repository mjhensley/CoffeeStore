"""
Clone Fixer - Repairs downloaded website to work properly offline
Fixes image paths and embeds images as base64
"""

import os
import re
import base64
import shutil
from urllib.parse import urlparse, unquote
from bs4 import BeautifulSoup


def find_local_image(image_url, clone_dir):
    """Find a local image file that matches the URL"""
    parsed = urlparse(image_url)
    path = unquote(parsed.path)
    filename = os.path.basename(path)
    filename_clean = re.sub(r'[<>:"|?*]', '_', filename)
    
    search_dirs = [
        os.path.join(clone_dir, 'images.ctfassets.net'),
        os.path.join(clone_dir, 'cdn.shopify.com'),
        os.path.join(clone_dir, 'www.stumptowncoffee.com', 'cdn'),
    ]
    
    for search_dir in search_dirs:
        if os.path.exists(search_dir):
            for root, dirs, files in os.walk(search_dir):
                for f in files:
                    if f == filename or f == filename_clean:
                        return os.path.join(root, f)
    
    # Contentful specific
    if 'ctfassets.net' in image_url:
        parts = path.strip('/').split('/')
        if len(parts) >= 2:
            asset_id = parts[1] if len(parts) > 1 else parts[0]
            search_path = os.path.join(clone_dir, 'images.ctfassets.net', 'tnildlcl6i5t', asset_id)
            if os.path.exists(search_path):
                for f in os.listdir(search_path):
                    return os.path.join(search_path, f)
    
    return None


def image_to_base64(image_path):
    """Convert image to base64 data URI"""
    try:
        ext = os.path.splitext(image_path)[1].lower()
        mime_types = {
            '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
            '.png': 'image/png', '.gif': 'image/gif',
            '.svg': 'image/svg+xml', '.webp': 'image/webp',
        }
        mime = mime_types.get(ext, 'image/jpeg')
        
        with open(image_path, 'rb') as f:
            data = base64.b64encode(f.read()).decode('utf-8')
        return f"data:{mime};base64,{data}"
    except:
        return None


def fix_html_file(html_path, clone_dir, output_dir):
    """Fix a single HTML file by embedding images"""
    try:
        with open(html_path, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()
    except:
        return 0
    
    soup = BeautifulSoup(content, 'lxml')
    images_fixed = 0
    
    # Fix img tags
    for img in soup.find_all('img'):
        for attr in ['src', 'data-src']:
            src = img.get(attr)
            if src and not src.startswith('data:') and 'http' in src:
                local_path = find_local_image(src, clone_dir)
                if local_path:
                    b64 = image_to_base64(local_path)
                    if b64:
                        img[attr] = b64
                        images_fixed += 1
        # Clear srcset
        if img.get('srcset'):
            img['srcset'] = ''
    
    # Fix background images
    for el in soup.find_all(style=True):
        style = el.get('style', '')
        urls = re.findall(r'url\([\'"]?([^\'")\s]+)[\'"]?\)', style)
        for url in urls:
            if not url.startswith('data:') and 'http' in url:
                local_path = find_local_image(url, clone_dir)
                if local_path:
                    b64 = image_to_base64(local_path)
                    if b64:
                        style = style.replace(url, b64)
                        images_fixed += 1
        el['style'] = style
    
    # Save
    output_path = os.path.join(output_dir, os.path.basename(html_path))
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(str(soup))
    
    return images_fixed


def create_index(output_dir, pages):
    """Create navigation index"""
    html = '''<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<title>Stumptown Coffee - Offline</title>
<style>
body{font-family:system-ui;background:#1a1a2e;color:#fff;padding:40px;margin:0}
h1{color:#c9a96e;text-align:center}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:15px;max-width:1200px;margin:30px auto}
a{display:block;padding:15px;background:rgba(255,255,255,0.05);border-radius:8px;color:#c9a96e;text-decoration:none}
a:hover{background:rgba(255,255,255,0.1)}
</style>
</head><body>
<h1>Stumptown Coffee - Offline Clone</h1>
<div class="grid">
'''
    for page in sorted(pages)[:100]:
        name = page.replace('.html', '').replace('_', ' ').replace('-', ' ').title()
        name = re.sub(r'\s+[a-f0-9]{6}$', '', name)
        html += f'<a href="{page}">{name}</a>\n'
    
    html += '</div></body></html>'
    
    with open(os.path.join(output_dir, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(html)


def main():
    clone_dir = r"C:\Users\Michael 2\Desktop\CoffeeStore\stumptown_smart"
    output_dir = r"C:\Users\Michael 2\Desktop\CoffeeStore\stumptown_fixed"
    
    print("\n" + "="*50)
    print("FIXING CLONED WEBSITE")
    print("="*50)
    
    os.makedirs(output_dir, exist_ok=True)
    
    # Find HTML files
    html_files = []
    main_dir = os.path.join(clone_dir, 'www.stumptowncoffee.com')
    for root, dirs, files in os.walk(main_dir):
        for f in files:
            if f.endswith('.html'):
                html_files.append(os.path.join(root, f))
    
    print(f"Found {len(html_files)} HTML files\n")
    
    # Process files
    fixed_pages = []
    total_fixed = 0
    
    for i, html_file in enumerate(html_files[:80]):
        basename = os.path.basename(html_file)
        count = fix_html_file(html_file, clone_dir, output_dir)
        total_fixed += count
        fixed_pages.append(basename)
        if (i+1) % 10 == 0:
            print(f"  Processed {i+1} files...")
    
    # Create index
    create_index(output_dir, fixed_pages)
    
    print(f"\n" + "="*50)
    print(f"DONE! Fixed {len(fixed_pages)} pages, {total_fixed} images")
    print(f"\nOPEN: {os.path.join(output_dir, 'index.html')}")
    print("="*50)


if __name__ == '__main__':
    main()

