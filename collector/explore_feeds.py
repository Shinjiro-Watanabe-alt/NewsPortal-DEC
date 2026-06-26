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
    ("環境省 脱炭素ポータル 新着情報", "https://ondankataisaku.env.go.jp/carbon_neutral/topics/feed/"),
    ("経済産業省 政策ニュース総合", "https://www.meti.go.jp/press/press.xml"),
    ("NEDO 新着情報", "https://www.nedo.go.jp/news/index.xml"),
    ("スマートジャパン(ITmedia)", "https://rss.itmedia.co.jp/rss/2.0/smartjapan.xml"),
    ("EnergyShift", "https://energy-shift.com/feed"),
    ("PR TIMES キーワード:脱炭素", "https://prtimes.jp/main/html/searchrlp/search_key/%E8%84%B1%E7%82%AD%E7%B4%A0/rss"),
    ("PR TIMES キーワード:再生可能エネルギー", "https://prtimes.jp/main/html/searchrlp/search_key/%E5%86%8D%E7%94%9F%E5%8F%AF%E8%83%BD%E3%82%A8%E3%83%8D%E3%83%AB%E3%82%AE%E3%83%BC/rss"),
    ("PR TIMES キーワード:水素", "https://prtimes.jp/main/html/searchrlp/search_key/%E6%B0%B4%E7%B4%A0/rss"),
    ("PR TIMES キーワード:GX", "https://prtimes.jp/main/html/searchrlp/search_key/GX/rss"),
]

# Googleニュース検索型(リダイレクト問題の再確認用、画像取得は期待しない)
GOOGLE_NEWS_KEYWORD_FEEDS = [
    ("Googleニュース 検索:脱炭素", "https://news.google.com/rss/search?q=%E8%84%B1%E7%82%AD%E7%B4%A0&hl=ja&gl=JP&ceid=JP:ja"),
    ("Googleニュース 検索:再生可能エネルギー", "https://news.google.com/rss/search?q=%E5%86%8D%E7%94%9F%E5%8F%AF%E8%83%BD%E3%82%A8%E3%83%8D%E3%83%AB%E3%82%AE%E3%83%BC&hl=ja&gl=JP&ceid=JP:ja"),
    ("Googleニュース 検索:水素エネルギー", "https://news.google.com/rss/search?q=%E6%B0%B4%E7%B4%A0%E3%82%A8%E3%83%8D%E3%83%AB%E3%82%AE%E3%83%BC&hl=ja&gl=JP&ceid=JP:ja"),
    ("Googleニュース 検索:GXグリーントランスフォーメーション", "https://news.google.com/rss/search?q=GX%20%E3%82%B0%E3%83%AA%E3%83%BC%E3%83%B3%E3%83%88%E3%83%A9%E3%83%B3%E3%82%B9%E3%83%95%E3%82%A9%E3%83%BC%E3%83%A1%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%B3&hl=ja&gl=JP&ceid=JP:ja"),
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

    print("\n\n########## Googleニュース検索型(リダイレクト問題の再確認用) ##########")
    for name, url in GOOGLE_NEWS_KEYWORD_FEEDS:
        check_feed(name, url)


if __name__ == "__main__":
    main()
