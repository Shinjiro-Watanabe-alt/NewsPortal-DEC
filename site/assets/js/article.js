/* article.html — single article view, driven by data/articles.json keyed by ?id=. */
(function () {
  function relatedCardHtml(id, a) {
    const href = DN.esc(a.source_url || `article.html?id=${encodeURIComponent(id)}`);
    return `<a class="fitem" href="${href}" target="_blank" rel="noopener noreferrer">
      <div class="thumb">${DN.thumbInnerHtml(a.image)}</div>
      <div>
        <h4>${DN.esc(a.title)}</h4>
        <div class="fm"><span class="cat">${DN.esc(a.category)}</span>
          <span>${DN.esc(a.source)}</span><span>${DN.esc(a.time)}</span></div>
      </div>
    </a>`;
  }

  function notFound(root) {
    root.innerHTML = `<div class="card art-card">
      <p>指定された記事が見つかりませんでした。</p>
      <p><a href="index.html">トップページへ戻る ›</a></p>
    </div>`;
    document.getElementById('crumbTitle').textContent = '記事が見つかりません';
  }

  async function init() {
    const root = document.getElementById('articleRoot');
    if (!root) return;

    const id = new URLSearchParams(location.search).get('id');
    const [all, categories] = await Promise.all([
      DN.fetchJSON('articles.json'),
      DN.fetchJSON('categories.json'),
    ]);
    const art = id && all[id];
    if (!art) {
      notFound(root);
      return;
    }

    document.title = `${art.title} — 脱炭素ナビ`;

    const cat = categories.find((c) => c.label === art.category);
    const crumbCat = document.getElementById('crumbCat');
    const crumbCatLink = document.getElementById('crumbCatLink');
    if (crumbCat) crumbCat.textContent = art.category;
    if (crumbCatLink) crumbCatLink.href = cat ? `index.html?cat=${encodeURIComponent(cat.slug)}` : 'index.html';
    document.getElementById('crumbTitle').textContent = art.title;

    root.innerHTML = `
      <div class="card art-card">
        <span class="art-cat">${DN.esc(art.category)}</span>
        <h1 class="art-title">${DN.esc(art.title)}</h1>
        <div class="art-meta">
          <span class="src">${DN.esc(art.source)}</span>
          <span>${DN.esc(art.time)}</span>
          <span class="cm">${DN.icon('forum', 'font-size:14px')}${art.comments.toLocaleString('ja-JP')}</span>
          <div class="art-share">
            <button type="button" aria-label="共有">${DN.icon('share')}</button>
            <button type="button" aria-label="印刷">${DN.icon('print')}</button>
            <button type="button" aria-label="ブックマーク">${DN.icon('bookmark_border')}</button>
          </div>
        </div>
        <div class="thumb art-hero">${DN.thumbInnerHtml(art.image, '主要写真')}</div>
        <p class="art-summary">${DN.esc(art.summary)}</p>
        <div class="art-body">${art.body.map((p) => `<p>${DN.esc(p)}</p>`).join('')}</div>
        <div class="art-tags">${art.tags.map((t) => `<a href="#">#${DN.esc(t)}</a>`).join('')}</div>
      </div>

      <div class="card">
        <div class="card-h"><h2><span class="bar"></span>関連記事</h2></div>
        <div class="related-grid">${(art.related || [])
          .filter((rid) => all[rid])
          .map((rid) => relatedCardHtml(rid, all[rid])).join('')}</div>
      </div>
    `;
  }

  document.addEventListener('dn:partials-loaded', init);
})();
