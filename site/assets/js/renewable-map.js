/* news.html — 都道府県別「再エネ導入比率」タイルグリッド地図。
   dashboard.jsの47都道府県タイルグリッド(ゼロカーボンシティ表明状況)と同じ
   カートグラム配置を使うが、表示対象ページが異なるため独立したファイルとして持つ。
   要素が存在するページ(news.html)でのみ動作し、他ページには影響しない。 */
(function () {
  const PREF_GRID_POS = {
    '北海道': [0, 9],
    '青森県': [1, 9], '岩手県': [2, 9], '宮城県': [3, 9], '秋田県': [2, 8], '山形県': [3, 8], '福島県': [4, 9],
    '茨城県': [5, 10], '栃木県': [5, 9], '群馬県': [5, 8], '埼玉県': [6, 9], '千葉県': [6, 10], '東京都': [7, 9], '神奈川県': [8, 9],
    '新潟県': [4, 8], '富山県': [5, 7], '石川県': [4, 6], '福井県': [5, 6], '山梨県': [7, 8], '長野県': [6, 8], '岐阜県': [6, 7],
    '静岡県': [8, 8], '愛知県': [7, 7], '三重県': [8, 7],
    '滋賀県': [6, 6], '京都府': [6, 5], '大阪府': [7, 5], '兵庫県': [7, 4], '奈良県': [7, 6], '和歌山県': [8, 5],
    '鳥取県': [6, 4], '島根県': [6, 3], '岡山県': [7, 3], '広島県': [7, 2], '山口県': [7, 1],
    '徳島県': [8, 4], '香川県': [8, 3], '愛媛県': [8, 2], '高知県': [9, 3],
    '福岡県': [9, 1], '佐賀県': [10, 0], '長崎県': [11, 0], '熊本県': [10, 1], '大分県': [9, 2], '宮崎県': [10, 2], '鹿児島県': [11, 1],
    '沖縄県': [13, 0],
  };

  function prefShortLabel(name) {
    return name === '北海道' ? name : name.replace(/[都道府県]$/, '');
  }

  function formatOku(kwh) {
    const oku = (kwh || 0) / 1e8;
    return oku >= 10 ? String(Math.round(oku)) : oku.toFixed(1);
  }

  function renewableTileGridChart(items) {
    const positions = Object.values(PREF_GRID_POS);
    const rows = Math.max(...positions.map((p) => p[0])) + 1;
    const cols = Math.max(...positions.map((p) => p[1])) + 1;
    // 都道府県間で発電量が桁違いに異なる(最大/最小で300倍以上)ため、線形スケールだと
    // ほとんどのタイルが最小値に張り付いてしまう。対数スケールで差を圧縮して表現する
    const kwhValues = items.map((it) => it.totalKwh || 0).filter((v) => v > 0);
    const logMax = Math.log(Math.max(...kwhValues));
    const logMin = Math.log(Math.min(...kwhValues));
    const logRange = logMax - logMin || 1;

    const tiles = items.map((it) => {
      const pos = PREF_GRID_POS[it.prefecture];
      if (!pos) return '';
      const pct = Math.round(Math.min(100, Math.max(0, it.ratio)));
      const fillPct = Math.max(10, pct);
      const textColor = pct >= 50 ? '#fff' : 'var(--ink-2)';
      const okuLabel = formatOku(it.totalKwh);
      const kwh = it.totalKwh || 0;
      const barPct = kwh > 0 ? Math.max(8, Math.round(((Math.log(kwh) - logMin) / logRange) * 100)) : 0;
      return `<div class="tile rn-tile" style="grid-row:${pos[0] + 1};grid-column:${pos[1] + 1};
          background:color-mix(in oklch,var(--brand) ${fillPct}%,var(--surface-2));color:${textColor}"
          title="${DN.esc(it.prefecture)}: 再エネ導入比率 ${pct}%／発電量 ${DN.esc(okuLabel)}億kWh">
        <span class="rn-info"><span class="rn-name">${DN.esc(prefShortLabel(it.prefecture))}</span><span class="rn-kwh">${DN.esc(okuLabel)}億kWh</span></span>
        <span class="rn-bar-wrap"><span class="rn-bar-fill" style="height:${barPct}%"></span></span>
      </div>`;
    }).join('');

    return `<div class="tilegrid rn-tilegrid" style="grid-template-columns:repeat(${cols},1fr);grid-template-rows:repeat(${rows},1fr)">
        ${tiles}
      </div>
      <div class="tile-legend"><span>再エネ導入比率</span><span class="tile-legend-bar"></span><span>0% ～100%</span></div>
      <div class="tile-legend"><span>発電量(右端バー)</span><span>少ない ～ 多い（対数目盛）</span></div>`;
  }

  async function renderRenewableMap() {
    const chartEl = document.getElementById('renewableMapChart');
    if (!chartEl) return;
    try {
      const data = await DN.fetchJSON('renewable-by-prefecture.json');
      chartEl.innerHTML = renewableTileGridChart(data.data);
      const srcEl = document.getElementById('renewableMapSrc');
      if (srcEl) srcEl.innerHTML = DN.chartSrcHtml(data);
    } catch (_) {
      chartEl.innerHTML = '<p style="padding:14px 16px;color:var(--ink-3)">データを読み込めませんでした。</p>';
    }
  }

  document.addEventListener('dn:partials-loaded', renderRenewableMap);
  if (document.readyState !== 'loading' && !document.querySelector('[data-include]')) renderRenewableMap();
})();
