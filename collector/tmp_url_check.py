#!/usr/bin/env python3
import re
import sys
import urllib.error
import urllib.request

UA = "Mozilla/5.0 (compatible; NewsPortalDEC-URLCheck/1.0)"
TIMEOUT = 25

CANDIDATES = [
    # 政策スケジュール系
    "https://www.enecho.meti.go.jp/category/others/basic_plan/",
    "https://www.meti.go.jp/policy/energy_environment/global_warming/global_warming_top.html",
    "https://www.meti.go.jp/policy/energy_environment/global_warming/index.html",
    "https://gx-league.go.jp/",
    "https://gx-league.go.jp/ets/",
    "https://www.env.go.jp/earth/ondanka/keikaku/global.html",
    "https://www.env.go.jp/earth/ondanka/",
    "https://www.env.go.jp/earth/2050carbon_neutral.html",
    "https://www.cas.go.jp/jp/seisaku/2050carbon_neutral/",
    "https://www.cas.go.jp/jp/seisaku/2050carbon_neutral/index.html",
    "https://www.meti.go.jp/policy/energy_environment/global_warming/2050carbonneutral.html",
    # 補助金系
    "https://www.env.go.jp/policy/hojokin/",
    "https://www.env.go.jp/policy/hojokin/index.html",
    "https://www.env.go.jp/policy/hojokin/r07.html",
    "https://www.meti.go.jp/information/publicoffer/kobo/index.html",
    "https://www.nedo.go.jp/koubo/index.html",
]

TITLE_RE = re.compile(rb"<title[^>]*>([^<]*)</title>", re.I)


def check(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as res:
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
    for url in CANDIDATES:
        check(url)


if __name__ == "__main__":
    main()
