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

  async function renderFooterTech() {
    const node = document.getElementById('footTech');
    if (!node) return;
    const items = await DN.fetchJSON('shortcuts.json');
    node.innerHTML = '<b>技術キーワード</b>' + items.map((s) =>
      `<a href="index.html?tag=${encodeURIComponent(s.tags.join(','))}">${DN.esc(s.label)}</a>`).join('');
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

    const digestToday = document.getElementById('digestToday');
    if (digestToday) {
      const arts = await DN.fetchJSON('articles.json');
      const GOV = new Set(['環境省', '経済産業省', '資源エネルギー庁']);
      const artsArr = Object.values(arts);
      const now = new Date();
      const todayPrefix = `${now.getMonth() + 1}/${now.getDate()}(`;
      const todayCount = artsArr.filter((a) => GOV.has(a.source) && a.time && a.time.startsWith(todayPrefix)).length;
      digestToday.innerHTML =
        `<div class="digest-today"><a href="news.html?cat=${encodeURIComponent('国')}">` +
        `本日の新着（官公庁）<b>${todayCount}</b>件</a></div>`;
    }

    const digestSchedule = document.getElementById('digestSchedule');
    if (digestSchedule) {
      try {
        const items = await DN.fetchJSON('schedule.json');
        const todayStr = new Date().toISOString().slice(0, 10);
        const upcoming = items.filter((s) => s.date >= todayStr).slice(0, 4);
        if (upcoming.length) {
          const rows = upcoming.map((s) => {
            const yr = s.date.slice(0, 4);
            const mo = s.date.slice(5, 7).replace(/^0/, '');
            return `<div class="dg-sched">` +
              `<span class="dg-type">${DN.esc(s.type)}</span>` +
              `<a href="${DN.esc(s.url || '#')}" target="_blank" rel="noopener noreferrer">${DN.esc(s.title)}</a>` +
              `<span class="dg-date">${DN.esc(yr)}年${DN.esc(mo)}月</span></div>`;
          }).join('');
          digestSchedule.innerHTML = `<div class="dg-h">政策スケジュール</div>${rows}`;
        }
      } catch (_) { /* schedule.json未生成時は表示しない */ }
    }

    const digestSubsidy = document.getElementById('digestSubsidy');
    if (digestSubsidy) {
      try {
        const items = await DN.fetchJSON('subsidies.json');
        if (items.length) {
          const listItems = items.slice(0, 8).map((s) =>
            `<li><a href="${DN.esc(s.url)}" target="_blank" rel="noopener noreferrer">` +
            `<span class="dg-src">${DN.esc(s.source)}</span>${DN.esc(s.title)}</a></li>`
          ).join('');
          digestSubsidy.innerHTML = `<div class="dg-h">公募情報</div><ul class="dg-sub-list">${listItems}</ul>`;
        } else {
          digestSubsidy.innerHTML = '<div class="dg-h">公募情報</div><p class="dg-empty">収集中…</p>';
        }
      } catch (_) {
        digestSubsidy.innerHTML = '<div class="dg-h">公募情報</div><p class="dg-empty">収集中…</p>';
      }
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

  async function renderSearchSugg() {
    const node = document.getElementById('searchSugg');
    if (!node) return;
    const items = await DN.fetchJSON('ranks.json');
    node.innerHTML = '<span>注目:</span>' + items.slice(0, 5).map((r) =>
      `<a href="index.html?q=${encodeURIComponent(r.keyword)}">${DN.esc(r.keyword)}</a>`).join('');
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
    renderFooterTech();
    renderRail();
    renderSearchSugg();
    highlightNav();
    initSearch();
  });
})();
