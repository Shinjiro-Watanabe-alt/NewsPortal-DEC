/* 脱炭素ニュースポータル — shared chrome: date/live ticker, shortcuts grid, footer
   category list, right rail. Runs once partials.html has been injected.
   Every render here is guarded with an existence check so pages that don't
   include a given partial (e.g. mobile.html may skip the right rail) simply
   skip that piece. */
(function () {
  const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

  function renderToday() {
    const node = document.getElementById('today');
    if (!node) return;
    const now = new Date();
    node.textContent = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日(${WEEKDAYS[now.getDay()]})`;
  }

  function startLiveGauge() {
    const node = document.getElementById('reShare');
    if (!node) return;
    const base = 32.1;
    setInterval(() => {
      const n = (base + (Math.random() * 0.6 - 0.3)).toFixed(1);
      node.textContent = n + '%';
    }, 3500);
  }

  async function renderShortcuts() {
    const grid = document.getElementById('scGrid');
    if (!grid) return;
    const items = await DN.fetchJSON('shortcuts.json');
    grid.innerHTML = items.map((s) =>
      `<a class="sc" href="${DN.esc(s.href || '#')}">
         <span class="ic">${DN.icon(s.icon)}</span>
         <span class="lb">${DN.esc(s.label)}</span>
       </a>`).join('');
  }

  async function renderFooterCategories() {
    const node = document.getElementById('footCat');
    if (!node) return;
    const cats = await DN.fetchJSON('categories.json');
    node.innerHTML = '<b>カテゴリ</b>' + cats.map((c) =>
      `<a href="index.html?cat=${encodeURIComponent(c.slug)}">${DN.esc(c.label)}</a>`).join('');
  }

  async function renderRail() {
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
      events.innerHTML = items.map((e) =>
        `<li><a href="#"><div class="ev-d"><b>${DN.esc(e.day)}</b><span>${DN.esc(e.month)}月</span></div>
          <div class="ev-t">${DN.esc(e.title)}<span>${DN.esc(e.place)}</span></div></a></li>`).join('');
    }

    const ranks = document.getElementById('ranks');
    if (ranks) {
      const items = await DN.fetchJSON('ranks.json');
      ranks.innerHTML = items.map((r) =>
        `<li><a href="#"><span class="rk-n"></span><span class="rk-t">${DN.esc(r.keyword)}</span>${
          r.trend ? `<span class="rk-up">${DN.esc(r.trend)}</span>` : ''}</a></li>`).join('');
    }

    const glossary = document.getElementById('glossaryList');
    if (glossary) {
      const terms = await DN.fetchJSON('glossary.json');
      glossary.innerHTML = terms.map((t) => `<a href="#">${DN.esc(t)}</a>`).join('');
    }
  }

  function highlightNav() {
    const here = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('[data-nav]').forEach((a) => {
      if (a.getAttribute('data-nav') === here) a.classList.add('on');
    });
  }

  document.addEventListener('dn:partials-loaded', () => {
    renderToday();
    startLiveGauge();
    renderShortcuts();
    renderFooterCategories();
    renderRail();
    highlightNav();
  });
})();
