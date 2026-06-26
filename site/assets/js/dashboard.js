/* dashboard.html — hand-rolled SVG charts (no chart library), driven by data/dashboard.json. */
(function () {
  const POWER_COLORS = {
    solar: '#f4b400', wind: '#4fb6a8', hydro: '#3b82c4', geo: '#e0654a',
    bio: '#6fae52', lng: '#8a93a8', coal: '#5b5247', nuclear: '#9b6bce',
  };
  const RENEWABLE_KEYS = ['solar', 'wind', 'hydro', 'geo', 'bio'];

  function donutChart(items) {
    const size = 200, thickness = 32, r = (size - thickness) / 2, cx = size / 2, cy = size / 2;
    const c = 2 * Math.PI * r;
    const total = items.reduce((s, i) => s + i.value, 0);
    const renewablePct = (items.filter((i) => RENEWABLE_KEYS.includes(i.key))
      .reduce((s, i) => s + i.value, 0) / total * 100).toFixed(1);

    let offset = 0;
    const segs = items.map((it) => {
      const len = (it.value / total) * c;
      const seg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${POWER_COLORS[it.key]}"
        stroke-width="${thickness}" stroke-dasharray="${len.toFixed(2)} ${(c - len).toFixed(2)}"
        stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"></circle>`;
      offset += len;
      return seg;
    }).join('');

    const svg = `<svg viewBox="0 0 ${size} ${size}" role="img" aria-label="本日の電源構成">
      ${segs}
      <text x="${cx}" y="${cy - 5}" text-anchor="middle" font-family="var(--head)" font-weight="900"
        font-size="25" fill="var(--brand-deep)">${renewablePct}%</text>
      <text x="${cx}" y="${cy + 16}" text-anchor="middle" font-family="var(--body)" font-size="11"
        fill="var(--ink-3)">再エネ比率</text>
    </svg>`;

    const legend = items.map((it) => `<div class="dl-row">
        <span class="dl-sw" style="background:${POWER_COLORS[it.key]}"></span>
        <span>${DN.esc(it.label)}</span><b>${it.value}%</b>
      </div>`).join('');

    return `${svg}<div class="donut-legend">${legend}</div>`;
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

    document.getElementById('powerMixChart').innerHTML = donutChart(d.powerMixToday);
    document.getElementById('co2TrendChart').innerHTML = barChart(d.co2Trend, 'value', 'year', 'var(--accent)');
    document.getElementById('renewableTrendChart').innerHTML = lineChart(d.renewableTrend, 'value', 'year', 'var(--brand)');
    document.getElementById('carbonPriceChart').innerHTML = lineChart(d.carbonPriceTrend, 'value', 'week', 'var(--brand-deep)');
    document.getElementById('zeroCarbonChart').innerHTML = hBarRatioList(d.zeroCarbonByRegion);
    document.getElementById('sectorChart').innerHTML = hBarValueList(d.sectorEmissions, '%', 'var(--accent)');
  }

  document.addEventListener('dn:partials-loaded', init);
})();
