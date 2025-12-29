"""Simple HTTP server for TempMail web interface."""

import http.server
import socketserver
import os
import webbrowser
from pathlib import Path

PORT = 8000
WEB_DIR = Path(__file__).parent / "web"


class Handler(http.server.SimpleHTTPRequestHandler):
    """Custom handler to serve from web directory."""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB_DIR), **kwargs)
    
    def end_headers(self):
        # Add CORS headers for API requests
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()
    
    def log_message(self, format, *args):
        # Suppress default logging
        pass


def find_free_port(start_port=8000, max_attempts=10):
    """Find a free port starting from start_port."""
    import socket
    for port in range(start_port, start_port + max_attempts):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('', port))
                return port
        except OSError:
            continue
    return None


def main():
    os.chdir(WEB_DIR)
    
    # Find a free port
    port = find_free_port(PORT)
    if port is None:
        print("❌ Could not find a free port!")
        return
    
    try:
        with socketserver.TCPServer(("", port), Handler) as httpd:
            url = f"http://localhost:{port}"
            print(f"\n{'='*50}")
            print(f"  🌐 TempMail Web Server")
            print(f"{'='*50}")
            print(f"\n  ✅ Server running at: {url}")
            print(f"\n  📧 Open in browser: {url}")
            print(f"\n  Press Ctrl+C to stop the server")
            print(f"{'='*50}\n")
            
            # Open browser automatically
            webbrowser.open(url)
            
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print("\n\n👋 Server stopped.")
    except OSError as e:
        print(f"❌ Error starting server: {e}")
        print("Try closing any other applications using port 8000")


if __name__ == "__main__":
    main()
