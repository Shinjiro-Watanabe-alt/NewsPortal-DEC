/* index.html / mobile.html — topics, KPI strip, news feed, category nav.
   Shared by both pages: rendering only touches element IDs, so each page's
   own markup/CSS decides whether the category nav reads as a sidebar list
   or a horizontal chip strip. */
(function () {
  let categories = [];
  let topicsData = null;
  let articlesCache = null;

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

  async function getArticles() {
    if (!articlesCache) articlesCache = await DN.fetchJSON('articles.json');
    return articlesCache;
  }

  function leadHtml(lead) {
    const leadHref = DN.esc(lead.source_url || `article.html?id=${encodeURIComponent(lead.id)}`);
    return `
      <a class="thumb" href="${leadHref}" target="_blank" rel="noopener noreferrer">${DN.thumbInnerHtml(lead.image, lead.category, true)}</a>
      <div class="tl-body">
        <h3><a href="${leadHref}" target="_blank" rel="noopener noreferrer">${DN.esc(lead.title)}</a></h3>
        <p>${DN.esc(lead.summary)}</p>
        <div class="topic-meta"><span class="src">${DN.esc(lead.source)}</span><span>${DN.esc(lead.time)}</span>
          ${DN.icon('forum', 'font-size:14px')}<span>${lead.comments.toLocaleString('ja-JP')}</span></div>
      </div>`;
  }

  function headlinesHtml(headlines) {
    return headlines.map((h) =>
      `<li><a href="${DN.esc(h.source_url || `article.html?id=${encodeURIComponent(h.id)}`)}" target="_blank" rel="noopener noreferrer">
         <span class="rank">${h.rank}</span><span class="ttl">${DN.esc(h.title)}</span>
         ${h.tag ? `<span class="new">${DN.esc(h.tag)}</span>` : ''}
         <span class="pv">${h.pr ? 'PR' : ''}</span>
       </a></li>`).join('');
  }

  const HEADLINES_PAGE = 8;
  const HEADLINES_EXPANDED = 30;
  let currentTabLabel = null;

  async function renderTab(label, expanded) {
    currentTabLabel = label;
    const leadEl = document.getElementById('topicLead');
    const headlinesEl = document.getElementById('headlines');
    const limit = expanded ? HEADLINES_EXPANDED : HEADLINES_PAGE;

    if (label === topicsData.tabs[0]) {
      if (leadEl) leadEl.innerHTML = leadHtml(topicsData.lead);
      if (!expanded) {
        if (headlinesEl) headlinesEl.innerHTML = headlinesHtml(topicsData.headlines);
        return;
      }
      const all = await getArticles();
      const list = Object.values(all).filter((a) => a.id !== topicsData.lead.id);
      if (headlinesEl) headlinesEl.innerHTML = headlinesHtml(list.slice(0, limit).map((a, i) => ({ ...a, rank: i + 1 })));
      return;
    }

    const all = await getArticles();
    const list = Object.values(all).filter((a) => a.category.includes(label));
    if (!list.length) {
      if (leadEl) leadEl.innerHTML = '';
      if (headlinesEl) headlinesEl.innerHTML = '<li class="feed-empty">該当する記事がありません。</li>';
      return;
    }
    if (leadEl) leadEl.innerHTML = leadHtml(list[0]);
    if (headlinesEl) headlinesEl.innerHTML = headlinesHtml(list.slice(1, 1 + limit).map((a, i) => ({ ...a, rank: i + 1 })));
  }

  async function renderTopics() {
    topicsData = await DN.fetchJSON('topics.json');
    const tabsEl = document.getElementById('topicTabs');
    if (tabsEl) {
      tabsEl.innerHTML = topicsData.tabs.map((label, i) =>
        `<button type="button" class="${i === 0 ? 'on' : ''}" data-tab="${i}">${DN.esc(label)}</button>`).join('');
      tabsEl.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        tabsEl.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === btn));
        renderTab(topicsData.tabs[Number(btn.dataset.tab)]);
      });
    }

    const topicsAllLink = document.getElementById('topicsAllLink');
    if (topicsAllLink) {
      topicsAllLink.addEventListener('click', (e) => {
        e.preventDefault();
        renderTab(currentTabLabel, true);
      });
    }

    renderTab(topicsData.tabs[0]);
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

  const FEED_PAGE_SIZE = 8;
  let feedFullList = [];
  let feedShown = 0;

  function renderFeedPage() {
    const el = document.getElementById('feed');
    if (el) el.innerHTML = feedFullList.slice(0, feedShown).map(feedItemHtml).join('');
    const moreBtn = document.getElementById('feedMoreBtn');
    if (moreBtn && feedShown >= feedFullList.length) {
      moreBtn.innerHTML = 'これ以上の記事はありません';
      moreBtn.disabled = true;
    }
  }

  async function renderFeed(catSlug, query) {
    const el = document.getElementById('feed');
    if (!el) return;
    const items = await DN.fetchJSON('feed.json');
    const chip = document.getElementById('filterChip');
    const moreWrap = document.querySelector('.feed-more');

    if (query) {
      const q = query.toLowerCase();
      const filtered = items.filter((f) => f.title.toLowerCase().includes(q));
      if (chip) {
        chip.classList.add('show');
        chip.querySelector('.fc-label').textContent = `検索結果: 「${query}」`;
      }
      if (!filtered.length) {
        feedFullList = [];
        el.innerHTML = `<div class="feed-empty">「${DN.esc(query)}」に一致する記事は見つかりませんでした。</div>`;
        if (moreWrap) moreWrap.style.display = 'none';
        return;
      }
      feedFullList = filtered;
    } else {
      let filtered = items;
      if (catSlug) {
        const cat = categories.find((c) => c.slug === catSlug);
        if (cat) {
          filtered = items.filter((f) => f.category === cat.label);
          if (chip) {
            chip.classList.add('show');
            chip.querySelector('.fc-label').textContent = `絞り込み中: ${cat.label}`;
          }
        }
      } else if (chip) {
        chip.classList.remove('show');
      }
      feedFullList = filtered.length ? filtered : items;
    }

    if (moreWrap) moreWrap.style.display = '';
    const moreBtn = document.getElementById('feedMoreBtn');
    if (moreBtn) {
      moreBtn.innerHTML = `${DN.icon('expand_more', 'font-size:18px')}もっと読み込む`;
      moreBtn.disabled = false;
    }
    feedShown = Math.min(FEED_PAGE_SIZE, feedFullList.length);
    renderFeedPage();
  }

  async function init() {
    categories = await DN.fetchJSON('categories.json');
    const params = new URLSearchParams(location.search);
    const catSlug = params.get('cat');
    const query = params.get('q');

    renderNav(catSlug);
    renderTopics();
    renderKpis();
    renderFeed(catSlug, query);

    const chip = document.getElementById('filterChip');
    if (chip) {
      chip.querySelector('button').addEventListener('click', () => {
        location.href = currentPage();
      });
    }

    const moreBtn = document.getElementById('feedMoreBtn');
    if (moreBtn) {
      moreBtn.addEventListener('click', () => {
        feedShown = Math.min(feedShown + FEED_PAGE_SIZE, feedFullList.length);
        renderFeedPage();
      });
    }

    const feedAllLink = document.getElementById('feedAllLink');
    if (feedAllLink) {
      feedAllLink.addEventListener('click', (e) => {
        e.preventDefault();
        feedShown = feedFullList.length;
        renderFeedPage();
      });
    }
  }

  document.addEventListener('dn:partials-loaded', init);
})();
