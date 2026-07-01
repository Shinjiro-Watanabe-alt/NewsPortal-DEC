#!/usr/bin/env python3
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

UA = "Mozilla/5.0 (compatible; NewsPortalDEC-URLCheck/1.0)"
TARGET = "https://www.enecho.meti.go.jp/statistics/electric_power/ep002/results.html"
A_RE = re.compile(r'<a\b[^>]*href="([^"]*)"[^>]*>\s*([^<]{2,150})\s*</a>', re.S)


def fetch_with_retry(url: str, attempts: int = 4, timeout: int = 40):
    for i in range(1, attempts + 1):
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as res:
                return res.read()
        except (urllib.error.URLError, TimeoutError) as e:
            print(f"[retry {i}/{attempts}] {url} -> {e}", file=sys.stderr)
            if i < attempts:
                time.sleep(3)
    return None


def main():
    body_bytes = fetch_with_retry(TARGET)
    if body_bytes is None:
        print(f"[ERROR] 全試行失敗: {TARGET}", file=sys.stderr)
        return

    body = body_bytes.decode("utf-8", errors="ignore")
    print(f"[info] ページ長={len(body)}文字", file=sys.stderr)
    count = 0
    for href, text in A_RE.findall(body):
        text = re.sub(r"\s+", " ", text).strip()
        if not text:
            continue
        if not (re.search(r"\.(xlsx?|csv)(\?|$)", href, re.I) or "都道府県" in text):
            continue
        full = urllib.parse.urljoin(TARGET, href)
        print(f"[link] href={href!r} full={full!r} text={text!r}", file=sys.stderr)
        count += 1
    print(f"[info] 該当リンク数={count}", file=sys.stderr)


if __name__ == "__main__":
    main()
