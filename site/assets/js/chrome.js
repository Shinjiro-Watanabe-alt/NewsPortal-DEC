/* 脱炭素ニュースポータル — shared chrome: date display, shortcuts grid, footer
   category list, right rail, masthead search. Runs once partials.html has been injected.
   Every render here is guarded with an existence check so pages that don't
   include a given partial (e.g. mobile.html may skip the right rail) simply
   skip that piece. */
(function () {
  const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

  async function fetchUpdatedAt() {
    try {
      const meta = await DN.fetchJSON('meta.json');
      if (meta?.updated_at) return new Date(meta.updated_at);
    } catch {
      // meta.json未生成時は現在時刻を表示
    }
    return new Date();
  }

  async function renderUpdatedAt() {
    const node = document.getElementById('today');
    if (!node) return;
    const dt = await fetchUpdatedAt();
    const hh = String(dt.getHours()).padStart(2, '0');
    const mm = String(dt.getMinutes()).padStart(2, '0');
    node.textContent = `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日（${WEEKDAYS[dt.getDay()]}） ${hh}:${mm}更新`;
  }

  async function renderShortcuts() {
    const grid = document.getElementById('scGrid');
    if (!grid) return;
    const items = await DN.fetchJSON('shortcuts.json');
    const activeTag = new URLSearchParams(location.search).get('tag');
    grid.innerHTML = items.map((s) => {
      const tagKey = s.tags.join(',');
      const state = activeTag ? (activeTag === tagKey ? ' on' : ' muted') : '';
      return `<a class="sc${state}" href="index.html?tag=${encodeURIComponent(tagKey)}">
         <span class="ic">${DN.icon(s.icon)}</span>
         <span class="lb">${DN.esc(s.label)}</span>
       </a>`;
    }).join('');
  }

  async function renderFooterCategories() {
    const node = document.getElementById('footCat');
    if (!node) return;
    const cats = await DN.fetchJSON('categories.json');
    node.innerHTML = '<b>カテゴリ</b>' + cats.map((c) =>
      `<a href="index.html?cat=${encodeURIComponent(c.slug)}">${DN.esc(c.label)}</a>`).join('');
  }

  async function renderRail() {
    const railUpd = document.getElementById('railUpdated');
    const ranksUpd = document.getElementById('ranksUpdated');
    if (railUpd || ranksUpd) {
      const dt = await fetchUpdatedAt();
      const hhmm = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}更新`;
      if (railUpd) railUpd.textContent = hhmm;
      if (ranksUpd) ranksUpd.textContent = hhmm;
    }

    const railData = document.getElementById('railData');
    if (railData) {
      const rows = await DN.fetchJSON('rail-data.json');
      railData.innerHTML = rows.map((r) =>
        `<div class="rd${r.live ? '' : ' is-static'}"><div class="rl"><b>${DN.esc(r.label)}</b>${DN.esc(r.sub)}${r.live ? '' : DN.staticTagHtml()}</div>
          <div class="rv">${DN.esc(r.value)}<small>${DN.esc(r.unit || r.note)}</small></div></div>`).join('');
    }

    const events = document.getElementById('events');
    if (events) {
      const items = await DN.fetchJSON('events.json');
      events.innerHTML = items.length
        ? items.map((e) =>
            `<li><a href="${DN.esc(e.source_url || '#')}" target="_blank" rel="noopener noreferrer"><div class="ev-d"><b>${DN.esc(e.day)}</b><span>${DN.esc(e.month)}月</span></div>
              <div class="ev-t">${DN.esc(e.title)}<span>${DN.esc(e.place || e.source)}</span></div></a></li>`).join('')
        : '<li class="ev-empty">現在開催予定のイベント・セミナー情報はありません。</li>';
    }

    const ranks = document.getElementById('ranks');
    if (ranks) {
      const items = await DN.fetchJSON('ranks.json');
      ranks.innerHTML = items.map((r) =>
        `<li><a href="index.html?q=${encodeURIComponent(r.keyword)}"><span class="rk-n"></span><span class="rk-t">${DN.esc(r.keyword)}</span>${
          r.trend ? `<span class="rk-up">${DN.esc(r.trend)}</span>` : ''}</a></li>`).join('');
    }

    const glossary = document.getElementById('glossaryList');
    if (glossary) {
      const terms = await DN.fetchJSON('glossary.json');
      glossary.innerHTML = terms.map((t) =>
        `<div class="gl-item">
           <button type="button" class="gl-term">${DN.esc(t.term)}</button>
           <p class="gl-def">${DN.esc(t.definition)}</p>
         </div>`).join('');
      glossary.addEventListener('click', (e) => {
        const btn = e.target.closest('.gl-term');
        if (!btn) return;
        btn.nextElementSibling.classList.toggle('show');
        btn.classList.toggle('on');
      });
    }
  }

  function highlightNav() {
    const here = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('[data-nav]').forEach((a) => {
      if (a.getAttribute('data-nav') === here) a.classList.add('on');
    });
  }

  function initSearch() {
    const box = document.querySelector('.searchbox');
    if (!box) return;

    const field = box.querySelector('.search-field');
    const input = field?.querySelector('input');
    if (!field || !input) return;

    const q = new URLSearchParams(location.search).get('q');
    if (q) input.value = q;

    const submit = () => {
      const value = input.value.trim();
      if (!value) return;
      location.href = `index.html?q=${encodeURIComponent(value)}`;
    };
    field.querySelector('button')?.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
    });
  }

  document.addEventListener('dn:partials-loaded', () => {
    renderUpdatedAt();
    renderShortcuts();
    renderFooterCategories();
    renderRail();
    highlightNav();
    initSearch();
  });
})();
