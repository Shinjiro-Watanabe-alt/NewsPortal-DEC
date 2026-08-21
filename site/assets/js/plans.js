/* plans.html — 脱炭素・再エネ・省エネに関する国の計画一覧（政策テーマ別グルーピング）。
   データは data/plans.json（完全手動管理、collect.py の対象外）。 */
(function () {
  function planCardHtml(p) {
    return `<article class="plan-card" id="plan-${DN.esc(p.id)}">
      <h3 class="plan-name">${DN.esc(p.name)}</h3>
      <dl class="plan-meta">
        <div><dt>策定年月</dt><dd>${DN.esc(p.decidedYm)}</dd></div>
        <div><dt>計画期間</dt><dd>${DN.esc(p.period)}</dd></div>
        <div><dt>所管部署</dt><dd>${DN.esc(p.department)}</dd></div>
      </dl>
      <p class="plan-summary">${DN.esc(p.summary)}</p>
      <div class="plan-links">
        <a class="plan-pdf-link" href="${DN.esc(p.pdfUrl)}" target="_blank" rel="noopener noreferrer">${DN.icon('picture_as_pdf')}計画を見る</a>
        ${p.sourceUrl ? `<a class="plan-src-link" href="${DN.esc(p.sourceUrl)}" target="_blank" rel="noopener noreferrer">${DN.icon('open_in_new')}掲載ページ</a>` : ''}
      </div>
    </article>`;
  }

  function categoryGroupHtml(group) {
    if (!group.plans.length) return '';
    return `<section class="plan-cat-group">
      <h2 class="plan-cat-h">${DN.icon(group.icon)}${DN.esc(group.categoryLabel)}<span class="plan-cat-count">${group.plans.length}件</span></h2>
      <div class="plan-grid">${group.plans.map(planCardHtml).join('')}</div>
    </section>`;
  }

  async function init() {
    const root = document.getElementById('plansRoot');
    if (!root) return;
    const groups = await DN.fetchJSON('plans.json');
    root.innerHTML = groups.map(categoryGroupHtml).join('')
      || '<p class="dg-empty">現在掲載している計画情報はありません。</p>';
  }

  document.addEventListener('dn:partials-loaded', init);
})();
