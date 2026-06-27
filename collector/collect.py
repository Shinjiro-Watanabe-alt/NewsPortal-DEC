#!/usr/bin/env python3
"""
NewsPortal(DEC) ニュース収集スクリプト

官公庁・関連機関のRSS/Atomフィードを巡回し、脱炭素・水素・再生可能エネルギー
関連の記事のみを抽出して site/data/{articles,feed,categories,topics,ranks}.json
を更新する。GitHub Actions から3時間おきに実行される想定。

あわせて、キー登録不要で取得できる外部公開データを使って以下も実数値で更新する
(取得に失敗した場合は前回値を保持し、エラーにはしない):
  - 環境省サイトの「ゼロカーボンシティ」表明自治体数 → kpis.json / dashboard.json
  - JEPX(日本卸電力取引所)スポット市場CSVのシステムプライス平均 → rail-data.json

events.json / glossary.json / shortcuts.json、および dashboard.json の地域別
ゼロカーボン内訳・電源構成・CO2排出量トレンド等は、統一的に取得できる公開API/
ファイルが確認できなかったため対象外（静的データのまま）としている。
"""
import csv
import hashlib
import io
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone, timedelta
from pathlib import Path
from xml.etree import ElementTree

BASE_DIR = Path(__file__).resolve().parent
SITE_DATA_DIR = BASE_DIR.parent / "site" / "data"
SOURCES_FILE = BASE_DIR / "sources.json"

JST = timezone(timedelta(hours=9))
WEEKDAY_JA = ["月", "火", "水", "木", "金", "土", "日"]

MAX_ARTICLES = 1000
MAX_FEED_ITEMS = 30
FETCH_TIMEOUT = 15
USER_AGENT = "Mozilla/5.0 (compatible; NewsPortalDEC-Collector/1.0)"

# 脱炭素・水素・再エネ関連かどうかを判定するキーワード
KEYWORDS = [
    "脱炭素", "カーボン", "CO2", "CO₂", "温室効果ガス", "GHG", "GX",
    "再生可能エネルギー", "再エネ", "太陽光", "風力", "洋上風力", "地熱",
    "水素", "燃料電池", "FCV", "アンモニア", "蓄電池", "蓄電", "EV",
    "ゼロカーボン", "カーボンニュートラル", "省エネ", "排出量取引",
    "Jクレジット", "J-クレジット", "SAF", "e-fuel", "合成燃料",
]
KEYWORD_RE = re.compile("|".join(re.escape(k) for k in KEYWORDS))

# カテゴリ自動分類（一致したら上書き、優先順位は上から）
CATEGORY_RULES = [
    (re.compile("水素|燃料電池|FCV|アンモニア"), "技術"),
    (re.compile("自治体|地方公共団体|ゼロカーボンシティ|地域|港湾|都市"), "自治体"),
    (re.compile("海外|米国|アメリカ|欧州|ヨーロッパ|英国|イギリス|ドイツ|フランス|中国|インド|韓国|台湾|アジア|中東|国連|世界|COP\d+"), "国際"),
    (re.compile("住宅|家庭|くらし|生活者|家電|節電|電気料金|ZEH"), "暮らし"),
]

# 「国」カテゴリは政府系の報道発表のみに限定する。引き継ぎデータ(articles.json)に
# 過去の分類ルールなどで「国」として残っている他発行元の記事は再分類の対象とする。
APPROVED_NATIONAL_SOURCES = {"環境省", "経済産業省", "資源エネルギー庁"}

XML_NS = {
    "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    "rss1": "http://purl.org/rss/1.0/",
    "atom": "http://www.w3.org/2005/Atom",
    "dc": "http://purl.org/dc/elements/1.1/",
}

GOOGLE_NEWS_RSS = "https://news.google.com/rss/search"
# Googleニュース検索RSSのタイトルは「本文 - 配信元」の形式になっている
TITLE_SOURCE_SUFFIX_RE = re.compile(r"^(?P<title>.+?)\s+-\s+(?P<source>[^-]+)$")


def build_search_url(query: str) -> str:
    """検索キーワードから Google ニュース検索RSSのURLを組み立てる"""
    params = urllib.parse.urlencode({"q": query, "hl": "ja", "gl": "JP", "ceid": "JP:ja"})
    return f"{GOOGLE_NEWS_RSS}?{params}"


def split_title_source(raw_title: str, fallback: str):
    m = TITLE_SOURCE_SUFFIX_RE.match(raw_title)
    if m:
        return m.group("title").strip(), m.group("source").strip()
    return raw_title.strip(), fallback


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=FETCH_TIMEOUT) as res:
        return res.read()


def strip_html(text: str) -> str:
    text = re.sub(r"<[^>]+>", "", text or "")
    return re.sub(r"\s+", " ", text).strip()


def parse_feed(xml_bytes: bytes):
    """RSS2.0 / RDF(RSS1.0) / Atom を雑にまとめてパースし (title, link, desc, pubdate) を返す"""
    items = []
    try:
        root = ElementTree.fromstring(xml_bytes)
    except ElementTree.ParseError:
        return items

    tag = root.tag.lower()

    if tag.endswith("rdf"):
        for item in root.findall("rss1:item", XML_NS):
            title = item.findtext("rss1:title", default="", namespaces=XML_NS)
            link = item.findtext("rss1:link", default="", namespaces=XML_NS)
            desc = item.findtext("rss1:description", default="", namespaces=XML_NS)
            date = item.findtext("dc:date", default="", namespaces=XML_NS)
            items.append((title, link, desc, date))
    elif tag.endswith("feed"):  # Atom
        for entry in root.findall("atom:entry", XML_NS):
            title = entry.findtext("atom:title", default="", namespaces=XML_NS)
            link_el = entry.find("atom:link", XML_NS)
            link = link_el.get("href") if link_el is not None else ""
            desc = entry.findtext("atom:summary", default="", namespaces=XML_NS)
            date = entry.findtext("atom:updated", default="", namespaces=XML_NS)
            items.append((title, link, desc, date))
    else:  # RSS 2.0
        for item in root.iter("item"):
            title = item.findtext("title", default="")
            link = item.findtext("link", default="")
            desc = item.findtext("description", default="")
            date = item.findtext("pubDate", default="")
            items.append((title, link, desc, date))

    return items


PRESS_LIST_BLOCK_RE = re.compile(
    r'<span class="p-press-release-list__heading">([^<]+)</span>(.*?)</details>',
    re.S,
)
PRESS_LIST_ITEM_RE = re.compile(r'<a href="([^"]+)" class="c-news-link__link">([^<]+)</a>')


def parse_press_html_list(html_bytes: bytes, base_url: str):
    """RSSを提供していない環境省 報道発表一覧ページ(HTML)から (title, link, desc, date_raw) を抜き出す"""
    html_text = html_bytes.decode("utf-8", errors="ignore")
    items = []
    for date_raw, body in PRESS_LIST_BLOCK_RE.findall(html_text):
        for href, title in PRESS_LIST_ITEM_RE.findall(body):
            link = urllib.parse.urljoin(base_url, href)
            items.append((title, link, "", date_raw))
    return items


def parse_date(raw: str):
    if not raw:
        return None
    fmts = [
        "%a, %d %b %Y %H:%M:%S %z",
        "%a, %d %b %Y %H:%M:%S %Z",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
        "%Y年%m月%d日発表",
    ]
    for fmt in fmts:
        try:
            dt = datetime.strptime(raw.strip(), fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=JST)
            return dt.astimezone(JST)
        except ValueError:
            continue
    return None


def format_time(dt: datetime) -> str:
    wd = WEEKDAY_JA[dt.weekday()]
    return f"{dt.month}/{dt.day}({wd}) {dt.hour}:{dt.minute:02d}"


def make_id(link: str) -> str:
    return "auto-" + hashlib.sha1(link.encode("utf-8")).hexdigest()[:12]


def classify_category(text: str, fallback: str) -> str:
    for pattern, category in CATEGORY_RULES:
        if pattern.search(text):
            return category
    return fallback


def reclassify_carried_over_national(carried_over: dict) -> None:
    """引き継ぎ記事のうち、政府系3省庁以外の発行元で「国」のまま残っているものを
    現行のCATEGORY_RULESで再判定し、該当なしなら「その他」に変更する"""
    for article in carried_over.values():
        if article.get("category") != "国" or article.get("source") in APPROVED_NATIONAL_SOURCES:
            continue
        haystack = article.get("title", "") + " " + article.get("summary", "")
        article["category"] = classify_category(haystack, "その他")


IMAGE_FETCH_TIMEOUT = 8
MAX_IMAGE_FETCH_BYTES = 200_000
META_IMAGE_PATTERNS = [
    re.compile(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', re.I),
    re.compile(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']', re.I),
    re.compile(r'<meta[^>]+name=["\']twitter:image["\'][^>]+content=["\']([^"\']+)["\']', re.I),
    re.compile(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+name=["\']twitter:image["\']', re.I),
]


def extract_og_image(html_text: str):
    """HTML文字列からog:image(なければtwitter:image)のURLを抜き出す"""
    for pattern in META_IMAGE_PATTERNS:
        m = pattern.search(html_text)
        if m:
            return m.group(1).strip()
    return None


def fetch_article_image(url: str):
    """記事の元ページを取得し、OGP画像(og:image / twitter:image)のURLを返す(失敗時はNone)"""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=IMAGE_FETCH_TIMEOUT) as res:
            content_type = res.headers.get("Content-Type", "")
            if "html" not in content_type.lower():
                return None
            raw = res.read(MAX_IMAGE_FETCH_BYTES)
            final_url = res.geturl()
    except (urllib.error.URLError, TimeoutError, ValueError, OSError) as exc:
        print(f"[skip] 画像取得失敗 ({url}): {exc}", file=sys.stderr)
        return None

    image_url = extract_og_image(raw.decode("utf-8", errors="ignore"))
    if not image_url:
        return None
    return urllib.parse.urljoin(final_url, image_url)


def collect_one_source(source: dict, now: datetime):
    results = []
    source_type = source.get("type", "feed")
    url = build_search_url(source["query"]) if source_type == "search" else source["url"]

    try:
        raw = fetch(url)
    except (urllib.error.URLError, TimeoutError, ValueError) as exc:
        print(f"[skip] {source['name']}: 取得失敗 ({exc})", file=sys.stderr)
        return results

    items = parse_press_html_list(raw, url) if source_type == "html_list" else parse_feed(raw)

    for raw_title, link, desc, date_raw in items:
        raw_title = strip_html(raw_title)
        desc = strip_html(desc)
        if not raw_title or not link:
            continue

        if source_type == "search":
            # 検索RSSはGoogleニュースの仲介リンクなので「本文 - 配信元」を分離する
            title, source_label = split_title_source(raw_title, source.get("default_source_label", source["name"]))
        else:
            title, source_label = raw_title, source["default_source_label"]

        haystack = title + " " + desc
        if not KEYWORD_RE.search(haystack):
            continue  # 脱炭素・水素・再エネに無関係な記事は除外

        dt = parse_date(date_raw) or now
        matched_tags = list(dict.fromkeys(KEYWORD_RE.findall(haystack)))[:4]

        results.append({
            "id": make_id(link),
            "category": classify_category(haystack, source["category"]),
            "title": title,
            "source": source_label,
            "source_url": link,
            "time": format_time(dt),
            "_sort_key": dt.isoformat(),
            "comments": 0,
            "tags": matched_tags,
            "summary": (desc[:140] + "…") if len(desc) > 140 else (desc or title),
            "body": [desc] if desc else [title],
            "related": [],
            "collected": True,
        })

    return results


def build_topics(articles: dict, ordered_ids: list, categories: list, new_ids: set):
    """直近の収集記事から、主要トピック(トップ記事+見出しリスト)を組み立てる"""
    tabs = ["総合"] + [c["label"] for c in categories]

    if not ordered_ids:
        return None

    lead_id = ordered_ids[0]
    lead_a = articles[lead_id]
    lead = {
        "id": lead_id,
        "title": lead_a["title"],
        "summary": lead_a["summary"],
        "category": lead_a["category"],
        "source": lead_a["source"],
        "time": lead_a["time"],
        "comments": 0,
        "source_url": lead_a["source_url"],
        "image": lead_a.get("image"),
    }

    headlines = []
    for rank, aid in enumerate(ordered_ids[1:9], start=1):
        a = articles[aid]
        headlines.append({
            "id": aid,
            "rank": rank,
            "title": a["title"],
            "category": a["category"],
            "source": a["source"],
            "time": a["time"],
            "tag": "NEW" if aid in new_ids else "",
            "pr": False,
            "source_url": a["source_url"],
        })

    return {"tabs": tabs, "lead": lead, "headlines": headlines}


def build_ranks(articles: dict, previous_ranks: list, top_n: int = 8):
    """記事に付与済みのタグ(キーワード)の出現頻度からトレンドキーワードを集計する"""
    counts = {}
    for a in articles.values():
        for tag in a.get("tags", []):
            counts[tag] = counts.get(tag, 0) + 1

    if not counts:
        return None

    ranked = sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))[:top_n]
    prev_index = {r["keyword"]: i for i, r in enumerate(previous_ranks)}

    result = []
    for i, (keyword, _count) in enumerate(ranked):
        if keyword not in prev_index:
            trend = "NEW"
        elif prev_index[keyword] - i >= 3:
            trend = "急上昇"
        else:
            trend = ""
        result.append({"keyword": keyword, "trend": trend})
    return result


ZERO_CARBON_URL = "https://www.env.go.jp/policy/zerocarbon.html"
# ページ本文には総数の記載がなく、リンク先の「一覧図」PDFに埋め込まれていることが
# 実際のページ調査で判明した。まずページ本文を試し、駄目なら一覧図PDFのテキストを試す。
# 最終的にもありえない値は採用しない(ZERO_CARBON_PLAUSIBLE_RANGE)。
ZERO_CARBON_STRICT_RE = re.compile(r"表明した地方公共団体は.{0,60}?(\d[\d,]{2,})\s*(?:自治体|団体)")
ZERO_CARBON_PDF_COUNT_RE = re.compile(r"表明自治体数\D{0,10}?(\d[\d,]{2,})")
# 一覧図PDFの実際の文言「〇〇を始めとする1215自治体(...)が...を表明。」に合わせて、
# 「を始めとする」直後の数値だけを拾う。単純な「数値+団体」のみだと無関係な箇所
# (例:本文中の年号と「団体」が偶然隣接する箇所)に誤マッチするため。
ZERO_CARBON_LOOSE_RE = re.compile(r"を始めとする(\d[\d,]{2,})\s*(?:自治体|団体)")
ZERO_CARBON_PDF_LINK_RE = re.compile(r'<a\b[^>]*href="([^"]+)"[^>]*>([^<]{0,80})')
ZERO_CARBON_PLAUSIBLE_RANGE = (300, 1800)

JEPX_DOWNLOAD_URL = "https://www.jepx.jp/_download.php"
JEPX_SPOT_PAGE_URL = "https://www.jepx.jp/electricpower/market-data/spot/"

try:
    import pypdf
except Exception:
    pypdf = None


def extract_zero_carbon_total_from_text(text: str):
    m = (
        ZERO_CARBON_STRICT_RE.search(text)
        or ZERO_CARBON_PDF_COUNT_RE.search(text)
        or ZERO_CARBON_LOOSE_RE.search(text)
    )
    if not m:
        return None
    total = int(m.group(1).replace(",", ""))
    lo, hi = ZERO_CARBON_PLAUSIBLE_RANGE
    if not (lo <= total <= hi):
        print(f"[skip] ゼロカーボン自治体数: 抽出値 {total} が妥当な範囲外", file=sys.stderr)
        return None
    return total


def find_zero_carbon_pdf_url(html_text: str):
    """ページ内のリンクから「一覧図」PDFのURLを探す"""
    for href, link_text in ZERO_CARBON_PDF_LINK_RE.findall(html_text):
        if "一覧図" in link_text:
            return urllib.parse.urljoin(ZERO_CARBON_URL, href)
    return None


def fetch_zero_carbon_pdf_text(pdf_url: str):
    """一覧図PDFを取得し、抽出できたテキストを返す(失敗時はNone)"""
    if pypdf is None:
        print("[skip] ゼロカーボン自治体数: pypdf未インストールのためPDF解析不可", file=sys.stderr)
        return None
    try:
        pdf_raw = fetch(pdf_url)
    except (urllib.error.URLError, TimeoutError, ValueError) as exc:
        print(f"[skip] ゼロカーボン自治体数: PDF取得失敗 ({exc})", file=sys.stderr)
        return None
    try:
        reader = pypdf.PdfReader(io.BytesIO(pdf_raw))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    except Exception as exc:  # PDF解析エラーは多岐にわたるため広めに捕捉する
        print(f"[skip] ゼロカーボン自治体数: PDF解析失敗 ({exc})", file=sys.stderr)
        return None


def fetch_zero_carbon_total():
    """環境省サイトから「ゼロカーボンシティ」表明自治体の総数を取得する(失敗時はNone)"""
    try:
        raw = fetch(ZERO_CARBON_URL)
    except (urllib.error.URLError, TimeoutError, ValueError) as exc:
        print(f"[skip] ゼロカーボン自治体数: 取得失敗 ({exc})", file=sys.stderr)
        return None

    html_raw_text = raw.decode("utf-8", errors="ignore")
    total = extract_zero_carbon_total_from_text(strip_html(html_raw_text))
    if total is not None:
        return total

    pdf_url = find_zero_carbon_pdf_url(html_raw_text)
    if not pdf_url:
        print("[skip] ゼロカーボン自治体数: 一覧図PDFへのリンクが見つからず", file=sys.stderr)
        return None

    pdf_text = fetch_zero_carbon_pdf_text(pdf_url)
    if pdf_text:
        total = extract_zero_carbon_total_from_text(pdf_text)
        if total is not None:
            return total
        print(
            f"[debug] ゼロカーボン自治体数: PDFテキスト長={len(pdf_text)} 先頭300文字={pdf_text[:300]!r}",
            file=sys.stderr,
        )

    print("[skip] ゼロカーボン自治体数: 数値を抽出できず", file=sys.stderr)
    return None


def fetch_jepx_spot_average(now: datetime):
    """JEPXスポット市場CSVから直近日のシステムプライス平均(円/kWh)を取得する(失敗時はNone)"""
    for year in (now.year, now.year - 1):
        try:
            body = urllib.parse.urlencode({
                "dir": "spot_summary", "file": f"spot_summary_{year}.csv",
            }).encode("utf-8")
            req = urllib.request.Request(JEPX_DOWNLOAD_URL, data=body, headers={
                "User-Agent": USER_AGENT,
                "Referer": JEPX_SPOT_PAGE_URL,
                "Content-Type": "application/x-www-form-urlencoded",
            })
            with urllib.request.urlopen(req, timeout=FETCH_TIMEOUT) as res:
                raw = res.read()
                content_type = res.headers.get("Content-Type", "")
        except (urllib.error.URLError, TimeoutError, ValueError) as exc:
            print(f"[skip] JEPXスポット価格({year}): 取得失敗 ({exc})", file=sys.stderr)
            continue

        try:
            text = raw.decode("shift_jis", errors="ignore")
            rows = list(csv.DictReader(io.StringIO(text)))
        except csv.Error as exc:
            print(f"[skip] JEPXスポット価格({year}): CSV解析失敗 ({exc})", file=sys.stderr)
            continue
        if not rows:
            print(
                f"[debug] JEPXスポット価格({year}): 行なし content-type={content_type!r} "
                f"先頭300文字={text[:300]!r}",
                file=sys.stderr,
            )
            continue

        date_col = next((k for k in rows[0] if k and ("受渡日" in k or "年月日" in k)), None)
        price_col = next((k for k in rows[0] if k and "システムプライス" in k), None)
        if not date_col or not price_col:
            print(
                f"[debug] JEPXスポット価格({year}): 列一覧={list(rows[0].keys())} "
                f"content-type={content_type!r} 先頭300文字={text[:300]!r}",
                file=sys.stderr,
            )
            print(f"[skip] JEPXスポット価格({year}): 想定する列が見つからず", file=sys.stderr)
            continue

        latest_date = max((r[date_col] for r in rows if r.get(date_col)), default=None)
        if not latest_date:
            continue

        prices = []
        for r in rows:
            if r.get(date_col) != latest_date:
                continue
            try:
                prices.append(float(r[price_col]))
            except (TypeError, ValueError):
                continue
        if prices:
            return round(sum(prices) / len(prices), 1)

    return None


def update_zero_carbon_kpi(total: int):
    """kpis.json / dashboard.json の「ゼロカーボン宣言」KPIを実数値で更新する"""
    formatted = f"{total:,}"

    kpis = load_json("kpis.json", [])
    for k in kpis:
        if k.get("label") == "ゼロカーボン宣言":
            prev = int(str(k.get("value", "0")).replace(",", "") or 0)
            diff = total - prev
            k["value"] = formatted
            k["delta"] = f"{diff:+d}"
            k["dir"] = "down" if diff < 0 else "up"
            k["period"] = "前回更新比"
    save_json("kpis.json", kpis)

    dashboard = load_json("dashboard.json", None)
    if dashboard is None:
        return
    for k in dashboard.get("kpis", []):
        if k.get("label") == "ゼロカーボン宣言自治体":
            prev = int(str(k.get("value", "0")).replace(",", "") or 0)
            diff = total - prev
            k["value"] = formatted
            k["delta"] = f"{diff:+d}"
            k["dir"] = "down" if diff < 0 else "up"
            k["period"] = "前回更新比"
    save_json("dashboard.json", dashboard)


def update_jepx_price(price: float):
    """rail-data.json の卸電力価格(スポット平均)を実データで更新する"""
    rows = load_json("rail-data.json", [])
    for r in rows:
        if r.get("label") == "卸電力価格":
            r["value"] = f"{price:.1f}"
            r["unit"] = "円/kWh"
    save_json("rail-data.json", rows)


def load_json(name: str, default):
    path = SITE_DATA_DIR / name
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return default


def save_json(name: str, data):
    path = SITE_DATA_DIR / name
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def main():
    sources = json.loads(SOURCES_FILE.read_text(encoding="utf-8"))
    now = datetime.now(JST)

    existing_articles = load_json("articles.json", {})
    # 過去にこのスクリプトが収集した記事のみ引き継ぎ、デザイン用サンプル記事は初回実行時に置き換える
    carried_over = {
        aid: a for aid, a in existing_articles.items() if a.get("collected")
    }
    reclassify_carried_over_national(carried_over)

    collected = dict(carried_over)
    new_ids = set()
    for source in sources:
        for article in collect_one_source(source, now):
            prev = collected.get(article["id"])
            if prev is None:
                new_ids.add(article["id"])
            elif "image" in prev:
                # 既知記事を再収集しても、取得済みの画像URLは失わないように引き継ぐ
                article["image"] = prev["image"]
            collected[article["id"]] = article
    new_count = len(new_ids)

    # 新しい順にソートし、上限件数で切る
    ordered_ids = sorted(
        collected, key=lambda k: collected[k].get("_sort_key", ""), reverse=True
    )[:MAX_ARTICLES]
    articles = {aid: collected[aid] for aid in ordered_ids}
    for a in articles.values():
        a.pop("_sort_key", None)

    # 画像は記事ごとに一度だけ取得する(成功・失敗とも結果を保持し、以後は再取得しない)
    for article in articles.values():
        if "image" not in article:
            article["image"] = fetch_article_image(article["source_url"])

    feed = [
        {
            "id": aid,
            "title": articles[aid]["title"],
            "category": articles[aid]["category"],
            "accent": i % 3 == 1,
            "source": articles[aid]["source"],
            "time": articles[aid]["time"].split(" ")[-1],
            "source_url": articles[aid]["source_url"],
            "image": articles[aid].get("image"),
        }
        for i, aid in enumerate(ordered_ids[:MAX_FEED_ITEMS])
    ]

    category_counts = {}
    for a in articles.values():
        category_counts[a["category"]] = category_counts.get(a["category"], 0) + 1

    categories = load_json("categories.json", [])
    for c in categories:
        c["count"] = category_counts.get(c["label"], 0)

    previous_ranks = load_json("ranks.json", [])
    topics = build_topics(articles, ordered_ids, categories, new_ids)
    ranks = build_ranks(articles, previous_ranks)

    save_json("articles.json", articles)
    save_json("feed.json", feed)
    save_json("categories.json", categories)
    if topics is not None:
        save_json("topics.json", topics)
    if ranks is not None:
        save_json("ranks.json", ranks)

    zero_carbon_total = fetch_zero_carbon_total()
    if zero_carbon_total is not None:
        update_zero_carbon_kpi(zero_carbon_total)

    jepx_price = fetch_jepx_spot_average(now)
    if jepx_price is not None:
        update_jepx_price(jepx_price)

    print(f"収集完了: 新規 {new_count} 件 / 合計 {len(articles)} 件 ({now.isoformat()})")


if __name__ == "__main__":
    SITE_DATA_DIR.mkdir(parents=True, exist_ok=True)
    main()
