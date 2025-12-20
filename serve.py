"""
Simple HTTP server to view Grainhouse Coffee site
Serves the static site with all pages and cart functionality
"""

import http.server
import os
import socketserver
import webbrowser
import sys

PORT = 8080
# Use relative path from script location
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DIRECTORY = os.path.join(SCRIPT_DIR, "stumptown_static")

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def end_headers(self):
        # Allow CORS for local testing
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

if __name__ == "__main__":
    os.chdir(DIRECTORY)
    
    print("\n" + "="*55)
    print("   GRAINHOUSE COFFEE - LOCAL SERVER")
    print("="*55)
    print(f"\n  Serving from: {DIRECTORY}")
    print(f"\n  Open in browser:")
    print(f"    http://localhost:{PORT}/")
    print(f"\n  Available pages:")
    print(f"    - Home:        http://localhost:{PORT}/index.html")
    print(f"    - Shop:        http://localhost:{PORT}/collections.html")
    print(f"    - Subscribe:   http://localhost:{PORT}/subscribe.html")
    print(f"    - Locations:   http://localhost:{PORT}/locations.html")
    print(f"    - Brew Guides: http://localhost:{PORT}/brew-guides.html")
    print(f"    - Our Story:   http://localhost:{PORT}/our-story.html")
    print(f"    - Gear:        http://localhost:{PORT}/gear.html")
    print(f"\n  Press Ctrl+C to stop the server")
    print("="*55 + "\n")
    
    # Try to open browser
    try:
        webbrowser.open(f"http://localhost:{PORT}/")
    except:
        pass
    
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n  Server stopped. Thanks for brewing with us!\n")

