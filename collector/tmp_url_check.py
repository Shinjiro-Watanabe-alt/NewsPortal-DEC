#!/usr/bin/env python3
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

UA = "Mozilla/5.0 (compatible; NewsPortalDEC-URLCheck/1.0)"
TIMEOUT = 25

TARGET = "https://www.enecho.meti.go.jp/statistics/electric_power/ep002/results.html"

A_RE = re.compile(r'<a\b[^>]*href="([^"]*)"[^>]*>\s*([^<]{2,150})\s*</a>', re.S)


def main():
    req = urllib.request.Request(TARGET, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as res:
            body = res.read().decode("utf-8", errors="ignore")
    except (urllib.error.URLError, TimeoutError) as e:
        print(f"[ERROR] {TARGET} -> {e}", file=sys.stderr)
        return

    print(f"[info] ページ長={len(body)}文字", file=sys.stderr)
    count = 0
    for href, text in A_RE.findall(body):
        text = re.sub(r"\s+", " ", text).strip()
        if not text:
            continue
        # Excel/CSVファイルへのリンク、または「都道府県」を含むリンクテキストのみ表示
        if not (re.search(r"\.(xlsx?|csv)(\?|$)", href, re.I) or "都道府県" in text):
            continue
        full = urllib.parse.urljoin(TARGET, href)
        print(f"[link] href={href!r} full={full!r} text={text!r}", file=sys.stderr)
        count += 1
    print(f"[info] 該当リンク数={count}", file=sys.stderr)


if __name__ == "__main__":
    main()
