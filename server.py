#!/usr/bin/env python3
"""Offline static server; serves only this app's public files on loopback."""
import argparse
import functools
import http.server
import pathlib
import socket
import threading
import urllib.parse
import webbrowser

ROOT = pathlib.Path(__file__).resolve().parent

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        path = urllib.parse.unquote(urllib.parse.urlsplit(self.path).path)
        if path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'frame-lab-v1')
            return
        if path not in ('/', '/index.html', '/style.css', '/layout.css', '/dist/app.js'):
            self.send_error(404)
            return
        super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--no-open', action='store_true')
    parser.add_argument('--port', type=int, default=8769)
    args = parser.parse_args()
    factory = functools.partial(Handler, directory=str(ROOT))
    try:
        server = http.server.ThreadingHTTPServer(('127.0.0.1', args.port), factory)
    except OSError:
        server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), factory)
    url = 'http://127.0.0.1:%d/' % server.server_port
    print('人像摄影练习室：' + url, flush=True)
    print('此终端保持打开；按 Control+C 关闭摄影棚。', flush=True)
    if not args.no_open:
        threading.Timer(.4, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
