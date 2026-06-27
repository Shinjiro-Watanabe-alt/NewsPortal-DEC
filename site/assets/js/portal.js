/* index.html / mobile.html — topics, KPI strip, news feed, category nav.
   Shared by both pages: rendering only touches element IDs, so each page's
   own markup/CSS decides whether the category nav reads as a sidebar list
   or a horizontal chip strip. */
(function () {
  let categories = [];

  function currentPage() {
    return location.pathname.split('/').pop() || 'index.html';
  }

  function renderNav(activeSlug) {
    const nav = document.getElementById('navList');
    if (!nav) return;
    const page = currentPage();
    nav.innerHTML = categories.map((c) =>
      `<a href="${page}?cat=${encodeURIComponent(c.slug)}" class="${c.slug === activeSlug ? 'on' : ''}">
         ${DN.icon(c.icon)}<span>${DN.esc(c.label)}</span><span class="ct">${c.count}</span>
       </a>`).join('');
  }

  async function renderTopics() {
    const t = await DN.fetchJSON('topics.json');
    const tabsEl = document.getElementById('topicTabs');
    if (tabsEl) {
      tabsEl.innerHTML = t.tabs.map((label, i) =>
        `<button type="button" class="${i === 0 ? 'on' : ''}">${DN.esc(label)}</button>`).join('');
      tabsEl.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        tabsEl.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === btn));
      });
    }

    const lead = t.lead;
    const leadEl = document.getElementById('topicLead');
    if (leadEl) {
      const leadHref = DN.esc(lead.source_url || `article.html?id=${encodeURIComponent(lead.id)}`);
      leadEl.innerHTML = `
        <a class="thumb" href="${leadHref}" target="_blank" rel="noopener noreferrer">${DN.thumbInnerHtml(lead.image, lead.category, true)}</a>
        <div class="tl-body">
          <h3><a href="${leadHref}" target="_blank" rel="noopener noreferrer">${DN.esc(lead.title)}</a></h3>
          <p>${DN.esc(lead.summary)}</p>
          <div class="topic-meta"><span class="src">${DN.esc(lead.source)}</span><span>${DN.esc(lead.time)}</span>
            ${DN.icon('forum', 'font-size:14px')}<span>${lead.comments.toLocaleString('ja-JP')}</span></div>
        </div>`;
    }

    const headlinesEl = document.getElementById('headlines');
    if (headlinesEl) {
      headlinesEl.innerHTML = t.headlines.map((h) =>
        `<li><a href="${DN.esc(h.source_url || `article.html?id=${encodeURIComponent(h.id)}`)}" target="_blank" rel="noopener noreferrer">
           <span class="rank">${h.rank}</span><span class="ttl">${DN.esc(h.title)}</span>
           ${h.tag ? `<span class="new">${DN.esc(h.tag)}</span>` : ''}
           <span class="pv">${h.pr ? 'PR' : ''}</span>
         </a></li>`).join('');
    }
  }

  async function renderKpis() {
    const el = document.getElementById('kpiStrip');
    if (!el) return;
    const kpis = await DN.fetchJSON('kpis.json');
    el.innerHTML = kpis.map(DN.kpiCardHtml).join('');
  }

  function feedItemHtml(f) {
    const href = DN.esc(f.source_url || `article.html?id=${encodeURIComponent(f.id)}`);
    return `<a class="fitem" href="${href}" target="_blank" rel="noopener noreferrer">
      <div class="thumb">${DN.thumbInnerHtml(f.image, f.category)}</div>
      <div>
        <h4>${DN.esc(f.title)}</h4>
        <div class="fm"><span class="cat" style="--ct:${DN.categoryMeta(f.category).color}">${DN.esc(f.category)}</span>
          <span>${DN.esc(f.source)}</span><span>${DN.esc(f.time)}</span></div>
      </div>
    </a>`;
  }

  async function renderFeed(catSlug) {
    const el = document.getElementById('feed');
    if (!el) return;
    const items = await DN.fetchJSON('feed.json');
    const chip = document.getElementById('filterChip');
    let filtered = items;

    if (catSlug) {
      const cat = categories.find((c) => c.slug === catSlug);
      if (cat) {
        const label = cat.label.split('・')[0]; // "再生可能エネルギー" -> matches feed's "再エネ" via includes check below
        filtered = items.filter((f) => cat.label.includes(f.category) || f.category === label || cat.label.startsWith(f.category));
        if (chip) {
          chip.classList.add('show');
          chip.querySelector('.fc-label').textContent = `絞り込み中: ${cat.label}`;
        }
      }
    } else if (chip) {
      chip.classList.remove('show');
    }

    el.innerHTML = (filtered.length ? filtered : items).map(feedItemHtml).join('');

    const moreBtn = document.getElementById('feedMoreBtn');
    if (moreBtn) {
      moreBtn.addEventListener('click', () => {
        moreBtn.innerHTML = 'これ以上の記事はありません';
        moreBtn.disabled = true;
      }, { once: true });
    }
  }

  async function init() {
    categories = await DN.fetchJSON('categories.json');
    const params = new URLSearchParams(location.search);
    const catSlug = params.get('cat');

    renderNav(catSlug);
    renderTopics();
    renderKpis();
    renderFeed(catSlug);

    const chip = document.getElementById('filterChip');
    if (chip) {
      chip.querySelector('button').addEventListener('click', () => {
        location.href = currentPage();
      });
    }
  }

  document.addEventListener('dn:partials-loaded', init);
})();
