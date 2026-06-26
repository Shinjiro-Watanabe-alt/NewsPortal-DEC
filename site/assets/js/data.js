/* 脱炭素ナビ — tiny data-fetch helper.
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
  </div>`;
};

// 記事サムネイル: 画像URLがあれば<img>、なければプレースホルダーのラベルを表示する。
// 画像の読み込みに失敗した場合は onThumbImgError がプレースホルダーに差し替える。
DN.thumbInnerHtml = function thumbInnerHtml(imageUrl, fallbackLabel) {
  const label = fallbackLabel || '写真';
  if (!imageUrl) return `<span>${DN.esc(label)}</span>`;
  return `<img src="${DN.esc(imageUrl)}" alt="" loading="lazy" data-fallback="${DN.esc(label)}" onerror="DN.onThumbImgError(this)">`;
};

DN.onThumbImgError = function onThumbImgError(img) {
  img.outerHTML = `<span>${DN.esc(img.dataset.fallback || '写真')}</span>`;
};
