/* dashboard.html — hand-rolled SVG charts (no chart library), driven by data/dashboard.json. */
(function () {
  // 47都道府県タイルグリッドの[row, col]配置。実際の地理的な位置関係を簡略化した
  // カートグラム(方眼)で近似し、沖縄県は本土から離れた位置に独立配置する。
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

  function tileGridChart(items) {
    const positions = Object.values(PREF_GRID_POS);
    const rows = Math.max(...positions.map((p) => p[0])) + 1;
    const cols = Math.max(...positions.map((p) => p[1])) + 1;

    const tiles = items.map((it) => {
      const pos = PREF_GRID_POS[it.prefecture];
      if (!pos) return '';
      const pct = Math.round(Math.min(1, it.declared / it.total) * 100);
      const fillPct = Math.max(10, pct);
      const textColor = pct >= 50 ? '#fff' : 'var(--ink-2)';
      return `<div class="tile" style="grid-row:${pos[0] + 1};grid-column:${pos[1] + 1};
          background:color-mix(in oklch,var(--brand) ${fillPct}%,var(--surface-2));color:${textColor}"
          title="${DN.esc(it.prefecture)}: ${it.declared}/${it.total}（${pct}%）が表明">
        <span>${DN.esc(prefShortLabel(it.prefecture))}</span>
      </div>`;
    }).join('');

    return `<div class="tilegrid" style="grid-template-columns:repeat(${cols},1fr);grid-template-rows:repeat(${rows},1fr)">
        ${tiles}
      </div>
      <div class="tile-legend"><span>表明割合</span><span class="tile-legend-bar"></span><span>0% ～50%～100%</span></div>`;
  }

  function barChart(items, valueKey, labelKey, color) {
    const width = 460, height = 190, pad = 26;
    const max = Math.max(...items.map((i) => i[valueKey])) * 1.18;
    const bw = (width - pad * 2) / items.length;
    const bars = items.map((it, i) => {
      const h = (it[valueKey] / max) * (height - pad * 2);
      const x = pad + i * bw + bw * 0.2;
      const w = bw * 0.6;
      const y = height - pad - h;
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}"
          rx="3" fill="${color}"></rect>
        <text x="${(x + w / 2).toFixed(1)}" y="${(y - 7).toFixed(1)}" text-anchor="middle" font-size="11"
          font-weight="700" fill="var(--ink-2)">${it[valueKey]}</text>
        <text x="${(x + w / 2).toFixed(1)}" y="${height - pad + 16}" text-anchor="middle" font-size="10.5"
          fill="var(--ink-3)">${DN.esc(it[labelKey])}</text>`;
    }).join('');
    return `<svg viewBox="0 0 ${width} ${height}">
      <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" stroke="var(--line)"></line>
      ${bars}
    </svg>`;
  }

  function lineChart(items, valueKey, labelKey, color) {
    const width = 460, height = 190, pad = 26;
    const values = items.map((i) => i[valueKey]);
    const max = Math.max(...values) * 1.12;
    const min = Math.min(...values) * 0.88;
    const stepX = (width - pad * 2) / (items.length - 1);
    const pts = items.map((it, i) => ({
      x: pad + i * stepX,
      y: height - pad - ((it[valueKey] - min) / (max - min)) * (height - pad * 2),
      it,
    }));
    const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
    const dots = pts.map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="${color}"></circle>
        <text x="${p.x.toFixed(1)}" y="${(p.y - 11).toFixed(1)}" text-anchor="middle" font-size="10.5"
          font-weight="700" fill="var(--ink-2)">${p.it[valueKey]}</text>
        <text x="${p.x.toFixed(1)}" y="${height - pad + 16}" text-anchor="middle" font-size="10.5"
          fill="var(--ink-3)">${DN.esc(p.it[labelKey])}</text>`).join('');
    return `<svg viewBox="0 0 ${width} ${height}">
      <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" stroke="var(--line)"></line>
      <path d="${path}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"></path>
      ${dots}
    </svg>`;
  }

  function hBarRatioList(items) {
    return `<div class="hbar-list">${items.map((it) => {
      const pct = Math.round((it.declared / it.total) * 100);
      return `<div class="hbar-row">
        <div class="hbar-lbl">${DN.esc(it.region)}</div>
        <div class="hbar-track"><div class="hbar-fill" style="width:${pct}%"></div></div>
        <div class="hbar-val">${it.declared}<small>/${it.total}（${pct}%）</small></div>
      </div>`;
    }).join('')}</div>`;
  }

  function hBarValueList(items, unit, color) {
    const max = Math.max(...items.map((i) => i.value));
    return `<div class="hbar-list">${items.map((it) => `
      <div class="hbar-row">
        <div class="hbar-lbl">${DN.esc(it.label)}</div>
        <div class="hbar-track"><div class="hbar-fill" style="width:${(it.value / max) * 100}%;background:${color}"></div></div>
        <div class="hbar-val">${it.value}<small>${unit}</small></div>
      </div>`).join('')}</div>`;
  }

  async function init() {
    const root = document.getElementById('dashKpis');
    if (!root) return;
    const d = await DN.fetchJSON('dashboard.json');

    document.getElementById('dashUpdated').textContent = d.updated;
    root.innerHTML = d.kpis.map(DN.kpiCardHtml).join('');

    document.getElementById('co2TrendChart').innerHTML = barChart(d.co2Trend, 'value', 'year', 'var(--accent)');
    document.getElementById('renewableTrendChart').innerHTML = lineChart(d.renewableTrend, 'value', 'year', 'var(--brand)');
    document.getElementById('carbonPriceChart').innerHTML = lineChart(d.carbonPriceTrend, 'value', 'week', 'var(--brand-deep)');
    document.getElementById('zeroCarbonChart').innerHTML = hBarRatioList(d.zeroCarbonByRegion);
    document.getElementById('zeroCarbonMapChart').innerHTML = tileGridChart(d.zeroCarbonByPrefecture);
    document.getElementById('sectorChart').innerHTML = hBarValueList(d.sectorEmissions, '%', 'var(--accent)');

    const charts = d.charts || {};
    document.getElementById('co2TrendSrc').innerHTML = DN.chartSrcHtml(charts.co2Trend);
    document.getElementById('renewableTrendSrc').innerHTML = DN.chartSrcHtml(charts.renewableTrend);
    document.getElementById('carbonPriceSrc').innerHTML = DN.chartSrcHtml(charts.carbonPriceTrend);
    document.getElementById('zeroCarbonSrc').innerHTML = DN.chartSrcHtml(charts.zeroCarbonByRegion);
    document.getElementById('sectorSrc').innerHTML = DN.chartSrcHtml(charts.sectorEmissions);
    document.getElementById('zeroCarbonMapSrc').innerHTML = DN.chartSrcHtml(charts.zeroCarbonByPrefecture);
  }

  document.addEventListener('dn:partials-loaded', init);
})();
