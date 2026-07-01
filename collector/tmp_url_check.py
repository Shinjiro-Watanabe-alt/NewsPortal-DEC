#!/usr/bin/env python3
import re
import sys
import urllib.error
import urllib.request

UA = "Mozilla/5.0 (compatible; NewsPortalDEC-URLCheck/1.0)"

CANDIDATES = [
    # 第7次エネルギー基本計画（前回15秒でタイムアウト。経産省系ドメインは接続が遅い
    # 傾向があるため、タイムアウトを伸ばして再試行する）
    ("https://www.enecho.meti.go.jp/category/others/basic_plan/", 50),
    # 地球温暖化対策計画2030年目標（新規候補パス）
    ("https://www.env.go.jp/earth/ondanka.html", 15),
    ("https://www.env.go.jp/earth/index.html", 15),
    ("https://www.env.go.jp/earth/ondanka/keikaku/index.html", 15),
    ("https://www.env.go.jp/earth/2030ghg.html", 15),
    # 環境省 補助金一覧（新規候補パス）
    ("https://www.env.go.jp/guide/budget/", 15),
    ("https://www.env.go.jp/guide/budget/index.html", 15),
    ("https://www.env.go.jp/earth/ondanka/keiei/index.html", 15),
]

TITLE_RE = re.compile(rb"<title[^>]*>([^<]*)</title>", re.I)


def check(url: str, timeout: int):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            body = res.read(4000)
            status = res.status
            final_url = res.geturl()
    except urllib.error.HTTPError as e:
        print(f"[HTTP {e.code}] {url}", file=sys.stderr)
        return
    except (urllib.error.URLError, TimeoutError) as e:
        print(f"[ERROR] {url} -> {e}", file=sys.stderr)
        return

    m = TITLE_RE.search(body)
    title = m.group(1).decode("utf-8", errors="ignore").strip() if m else "(no title)"
    redirect_note = f" (redirected to {final_url})" if final_url != url else ""
    print(f"[OK {status}] {url}{redirect_note} title={title!r}", file=sys.stderr)


def main():
    for url, timeout in CANDIDATES:
        check(url, timeout)


if __name__ == "__main__":
    main()
