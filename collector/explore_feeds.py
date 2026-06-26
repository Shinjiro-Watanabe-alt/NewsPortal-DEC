#!/usr/bin/env python3
"""
ニュースフィード探索スクリプト(診断専用)

このサンドボックス開発環境からは外部サイトに到達できないため、実際にネット
アクセスできるGitHub Actions上で、Google News経由ではない直リンクのフィード
候補(og:image取得が期待できるもの)を調査するための一時的なツール。
site/data/ には一切書き込まず、調査結果をログに出力するだけ。
"""
import urllib.error
import urllib.request

import collect

# 既存の直接フィード型5つ(現状404/タイムアウト) — 生きているか再確認
EXISTING_FEEDS = [
    ("環境省 報道発表", "https://www.env.go.jp/press/release.rdf"),
    ("経済産業省 ニュースリリース", "https://www.meti.go.jp/ml_index_release.rdf"),
    ("資源エネルギー庁 トピックス", "https://www.enecho.meti.go.jp/topics/release.rdf"),
    ("NEDO ニュースリリース", "https://www.nedo.go.jp/news/press/index.rdf"),
    ("JOGMEC プレスリリース", "https://www.jogmec.go.jp/rss/news.xml"),
]

# 新規候補(直リンクでog:image取得が期待できそうなもの)
CANDIDATE_FEEDS = [
    ("PR TIMES 全件", "https://prtimes.jp/index.rdf"),
]

# Googleニュースのリダイレクトページの実体を確認するためのサンプルURL
SAMPLE_GOOGLE_NEWS_URL = (
    "https://news.google.com/rss/articles/"
    "CBMiSkFVX3lxTE0tSWNnVDJDdzdfa2g2SXNRdzNoc2RMdUpoWjdLTW5TV1pxLTFZc1ZIZDF3"
    "Tlk3REJJQW5sNFlwS3ZuMUh3VWwxOEtn?oc=5"
)


def check_google_news_redirect():
    print("\n=== [診断] Googleニュースのリダイレクトページの実体 ===")
    req = urllib.request.Request(SAMPLE_GOOGLE_NEWS_URL, headers={"User-Agent": collect.USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            final_url = res.geturl()
            raw = res.read(4000)
    except (urllib.error.URLError, TimeoutError, ValueError, OSError) as exc:
        print(f"  取得失敗: {exc}")
        return
    text = raw.decode("utf-8", errors="ignore")
    print(f"  final_url: {final_url}")
    print(f"  og:image を含む: {'og:image' in text}")
    print(f"  c-wiz/batchexecute らしき要素を含む: {'c-wiz' in text or 'batchexecute' in text}")
    print("  先頭800文字:")
    print(text[:800])


def check_feed(name, url, sample_count=2):
    print(f"\n=== [フィード] {name} ({url}) ===")
    try:
        raw = collect.fetch(url)
    except (urllib.error.URLError, TimeoutError, ValueError) as exc:
        print(f"  取得失敗: {exc}")
        return
    items = collect.parse_feed(raw)
    print(f"  パース成功: {len(items)}件")
    for raw_title, link, desc, date_raw in items[:sample_count]:
        title = collect.strip_html(raw_title)
        print(f"  - title: {title}")
        print(f"    link : {link}")
        image = collect.fetch_article_image(link)
        print(f"    image: {image}")


def main():
    check_google_news_redirect()

    print("\n\n########## 既存の直接フィード(現状404/タイムアウト)再確認 ##########")
    for name, url in EXISTING_FEEDS:
        check_feed(name, url)

    print("\n\n########## 新規候補フィード ##########")
    for name, url in CANDIDATE_FEEDS:
        check_feed(name, url)


if __name__ == "__main__":
    main()
