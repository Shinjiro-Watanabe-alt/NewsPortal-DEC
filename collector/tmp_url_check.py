#!/usr/bin/env python3
import re
import sys
import urllib.error
import urllib.request

UA = "Mozilla/5.0 (compatible; NewsPortalDEC-URLCheck/1.0)"
TIMEOUT = 20

TARGET = "https://www.env.go.jp/guide/kobo.html"


def main():
    req = urllib.request.Request(TARGET, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as res:
            body = res.read().decode("utf-8", errors="ignore")
    except (urllib.error.URLError, TimeoutError) as e:
        print(f"[ERROR] {TARGET} -> {e}", file=sys.stderr)
        return

    print(f"[info] ページ長={len(body)}文字", file=sys.stderr)

    # <main> ~ </main> があればその範囲、なければ id="main" 以降を本文とみなす
    m = re.search(r"<main\b.*?</main>", body, re.S | re.I)
    if not m:
        m = re.search(r'id="main".*', body, re.S | re.I)
    section = m.group(0) if m else body

    print(f"[info] 本文候補長={len(section)}文字", file=sys.stderr)
    # タグを除去して読める形にする
    text_only = re.sub(r"<script.*?</script>", "", section, flags=re.S | re.I)
    text_only = re.sub(r"<style.*?</style>", "", text_only, flags=re.S | re.I)
    text_only = re.sub(r"<[^>]+>", "\n", text_only)
    text_only = re.sub(r"\n\s*\n+", "\n", text_only).strip()
    print("[body-text-start]", file=sys.stderr)
    print(text_only[:3000], file=sys.stderr)
    print("[body-text-end]", file=sys.stderr)


if __name__ == "__main__":
    main()
