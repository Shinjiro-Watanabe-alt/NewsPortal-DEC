# NewsPortal-DEC

Claude Designで作成した「Decarbonation News Portal」デザインを使い、国内の脱炭素・水素・再生可能エネルギー関連ニュースを自動収集・公開するポータルサイト。GitHub Pagesでの公開用に、本リポジトリ単体で収集からデプロイまで完結するスタンドアロン構成になっている。

## 構成

- `site/` — Claude Designからエクスポートしたフロントエンド一式（変更なし）。`site/data/*.json` をデータソースとして表示する。
- `collector/collect.py` — 官公庁・関連機関のRSS/Atomフィードと、検索キーワードベースのGoogleニュース検索RSSを巡回し、脱炭素・水素・再エネ関連のキーワードに一致する記事のみ抽出して `site/data/articles.json` / `feed.json` / `categories.json` を更新するスクリプト。
- `collector/sources.json` — 収集対象の一覧。2種類の収集元タイプに対応している。
  - `"type": "feed"` — 官公庁等の固定RSS/AtomフィードURLを直接取得する。`{ "type", "name", "url", "category", "default_source_label" }` を指定する。
  - `"type": "search"` — 検索キーワードを指定し、Googleニュース検索RSS（`news.google.com/rss/search`）経由で関連記事を取得する。専用RSSを持たない企業発表や個別トピックも拾える。`{ "type", "name", "query", "category" }` を指定する。`query` にはGoogleニュースの検索構文（`OR`、`when:1d` などの期間指定）が使える。配信元名は記事タイトル末尾の「 - 配信元」表記から自動抽出する。
- 記事本文・タイトルは収集後に `collector/collect.py` 内の `KEYWORDS`（脱炭素・水素・再エネ関連語）に一致するかどうかで絞り込み、`CATEGORY_RULES` でカテゴリを自動判定する。キーワードやカテゴリ判定ルールを増やしたい場合はこの2つを編集する。

## 自動実行

- `.github/workflows/collect-decarbon-news.yml` — GitHub Actions上で **3時間ごと**（`cron: '20 */3 * * *'`）に `collect.py` を実行し、更新があれば自動でコミット・プッシュする。手動実行も `workflow_dispatch` から可能。
- `.github/workflows/deploy-pages.yml` — `site/` への変更がpushされると、GitHub Pagesへ自動デプロイする。手動実行も `workflow_dispatch` から可能。

※ GitHubのスケジュール実行・Pages公開はいずれもデフォルトブランチ上のワークフロー定義を参照するため、デフォルトブランチに反映されるまでは自動実行されない。リポジトリの Settings → Pages → Build and deployment の Source を `GitHub Actions` に設定する必要がある。

## ローカルでの実行

```bash
python3 collector/collect.py
```

取得に失敗したフィードはスキップされ、既存データは保持される。
