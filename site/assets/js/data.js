/* 脱炭素ニュースポータル — tiny data-fetch helper.
   Every render module pulls content through DN.fetchJSON() instead of inline
   arrays, so swapping in a real API/RSS source later is a one-line change. */
window.DN = window.DN || {};

DN.DATA_BASE = 'data/';

DN.fetchJSON = async function fetchJSON(name) {
  const res = await fetch(DN.DATA_BASE + name);
  if (!res.ok) throw new Error('Failed to load ' + name + ' (' + res.status + ')');
  return res.json();
};

DN.el = function el(tag, className, html) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (html != null) e.innerHTML = html;
  return e;
};

DN.icon = function icon(name, extraStyle) {
  return `<span class="material-symbols-outlined"${extraStyle ? ` style="${extraStyle}"` : ''}>${name}</span>`;
};

DN.esc = function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
};

DN.staticTagHtml = function staticTagHtml(title) {
  return `<span class="static-tag" title="${DN.esc(title || '現在は実データ未連携のため、参考値の静的データです')}">静的データ</span>`;
};

DN.kpiCardHtml = function kpiCardHtml(k) {
  return `<div class="kpi${k.live ? '' : ' is-static'}">
    <div class="k-l">${DN.icon(k.icon)}${DN.esc(k.label)}${k.live ? '' : DN.staticTagHtml()}</div>
    <div class="k-v">${DN.esc(k.value)}<small>${DN.esc(k.unit)}</small></div>
    <div class="k-d ${k.dir}">${DN.icon(k.dir === 'up' ? 'arrow_upward' : 'arrow_downward')}${DN.esc(k.delta)}
      <span style="color:var(--ink-3);font-weight:400;margin-left:2px">${DN.esc(k.period)}</span></div>
    <div class="k-src">参照元: ${DN.esc(k.source)}<br>基準日: ${DN.esc(k.asOf)}</div>
  </div>`;
};

// カテゴリ別のアイコン・色・ストック写真(assets/cat/*.jpg)。記事に実画像が無い場合の
// フォールバック表示に使う。表記ゆれ(フルラベル/略称)の両方にマッチするようキーワードで判定。
DN.CATEGORY_META = {
  renewable: { keywords: ['再生可能エネルギー', '再エネ'], icon: 'solar_power', color: 'oklch(0.60 0.13 150)', photo: 'saiene' },
  tech: { keywords: ['技術・イノベ', '技術'], icon: 'science', color: 'oklch(0.55 0.13 258)', photo: 'gijutsu' },
  municipal: { keywords: ['自治体・地域', '自治体'], icon: 'location_city', color: 'oklch(0.64 0.11 195)', photo: 'jichitai' },
  policy: { keywords: ['政策・制度', '国'], icon: 'account_balance', color: 'oklch(0.55 0.13 295)', photo: 'seisaku' },
  business: { keywords: ['企業・産業', '企業'], icon: 'apartment', color: 'oklch(0.66 0.12 80)', photo: 'kigyo' },
  life: { keywords: ['暮らし・住宅', '暮らし'], icon: 'cottage', color: 'oklch(0.60 0.15 30)', photo: 'kurashi' },
  intl: { keywords: ['国際動向', '国際'], icon: 'public', color: 'oklch(0.58 0.13 340)', photo: 'kokusai' },
};

DN.DEFAULT_CATEGORY_META = { icon: 'eco', color: 'oklch(0.60 0.10 152)', photo: 'saiene' };

DN.categoryMeta = function categoryMeta(category) {
  if (category) {
    for (const key in DN.CATEGORY_META) {
      const m = DN.CATEGORY_META[key];
      if (m.keywords.some((kw) => category.includes(kw) || kw.includes(category))) return m;
    }
  }
  return DN.DEFAULT_CATEGORY_META;
};

// 記事サムネイル: 画像URLがあれば<img>、なければカテゴリ別のフォールバック(写真風/アイコン風、
// :root[data-thumbstyle]で表示切替)を表示する。画像の読み込みに失敗した場合は
// onThumbImgError がフォールバックに差し替える。
DN.thumbFallbackHtml = function thumbFallbackHtml(category, withLabel) {
  const m = DN.categoryMeta(category);
  return `<div class="thumb-fallback" style="--ct:${m.color}">
    <img class="tf-photo" src="assets/cat/${m.photo}.jpg" alt="${DN.esc(category || '')}" loading="lazy">
    <span class="material-symbols-outlined ti">${m.icon}</span>
    ${withLabel && category ? `<span class="clabel">${DN.icon(m.icon)}${DN.esc(category)}</span>` : ''}
  </div>`;
};

// トピックスのサムネ上ラベル(.clabel)と同じ「色付き背景+カテゴリ名」のピル型バッジ。
// 新着ニュース一覧/注目記事/見出しリストの1行目アイコンに使う。
DN.catBadgeHtml = function catBadgeHtml(category) {
  const m = DN.categoryMeta(category);
  return `<span class="cat-badge" style="--ct:${m.color}">${DN.icon(m.icon)}${DN.esc(category || '')}</span>`;
};

DN.thumbInnerHtml = function thumbInnerHtml(imageUrl, category, withLabel) {
  if (!imageUrl) return DN.thumbFallbackHtml(category, withLabel);
  return `<img src="${DN.esc(imageUrl)}" alt="" loading="lazy" data-fb-cat="${DN.esc(category || '')}" data-fb-label="${withLabel ? '1' : ''}" onerror="DN.onThumbImgError(this)">`;
};

DN.onThumbImgError = function onThumbImgError(img) {
  img.outerHTML = DN.thumbFallbackHtml(img.dataset.fbCat, img.dataset.fbLabel === '1');
};
