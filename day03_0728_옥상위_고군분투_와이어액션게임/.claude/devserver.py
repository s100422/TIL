"""개발용 정적 파일 서버 (캐시 없음).

`python -m http.server`를 그냥 쓰면 브라우저가 JS 모듈을 캐시해서,
파일을 고쳐도 새로고침 시 예전 코드가 그대로 실행되는 일이 생긴다.
개발 중에는 항상 최신 파일을 받아야 하므로 no-store 헤더를 붙여서 내려준다.
"""

import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        # 조건부 요청(If-Modified-Since/If-None-Match) 헤더를 지워서
        # SimpleHTTPRequestHandler가 절대 304를 돌려주지 않고 항상 새 본문을 보내게 한다.
        # 304는 본문이 없으므로, 브라우저가 예전에 캐시해둔 본문을 계속 재사용해버린다 —
        # no-store 헤더를 응답에 붙여도 그 응답 자체가 304(본문 없음)면 소용이 없다.
        del self.headers["If-Modified-Since"]
        del self.headers["If-None-Match"]
        super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, *args):
        pass  # 요청 로그 억제


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
    ThreadingHTTPServer(("127.0.0.1", port), NoCacheHandler).serve_forever()
