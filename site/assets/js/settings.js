/* 脱炭素ナビ — Display Settings (表示設定)
   A real, user-facing settings feature (not a design-time tool): lets visitors
   pick an accent color, dark mode, information density, heading font, corner
   radius, and header layout. Choices persist to localStorage and apply on
   every page via CSS custom properties. */
(function () {
  const STORAGE_KEY = 'dn-settings';

  const DEFAULTS = {
    accent: 'green',
    dark: false,
    density: 'regular',
    headFont: 'Zen Kaku Gothic New',
    radius: 9,
    headerLayout: 'with-gauge',
  };

  const ACCENTS = {
    green:  { label: '緑',   swatch: '#2f8f5b', brand: 'oklch(0.52 0.12 156)', deep: 'oklch(0.42 0.10 158)', tint: 'oklch(0.95 0.03 156)', accent: 'oklch(0.52 0.11 242)', atint: 'oklch(0.95 0.025 242)' },
    teal:   { label: '青緑', swatch: '#2a8f8a', brand: 'oklch(0.54 0.10 195)', deep: 'oklch(0.44 0.09 197)', tint: 'oklch(0.95 0.028 195)', accent: 'oklch(0.54 0.10 150)', atint: 'oklch(0.95 0.025 150)' },
    blue:   { label: '青',   swatch: '#3568c9', brand: 'oklch(0.52 0.12 242)', deep: 'oklch(0.43 0.11 244)', tint: 'oklch(0.95 0.03 242)', accent: 'oklch(0.55 0.11 156)', atint: 'oklch(0.95 0.025 156)' },
    forest: { label: '深緑', swatch: '#3c6b3f', brand: 'oklch(0.46 0.10 150)', deep: 'oklch(0.37 0.09 152)', tint: 'oklch(0.94 0.03 150)', accent: 'oklch(0.50 0.09 210)', atint: 'oklch(0.95 0.022 210)' },
  };

  const DENSITY = {
    compact: { label: 'コンパクト', fs: '13px', gap: '10px', pad: '11px' },
    regular: { label: '標準',       fs: '14px', gap: '14px', pad: '14px' },
    comfy:   { label: 'ゆったり',   fs: '15px', gap: '18px', pad: '17px' },
  };

  const HEAD_FONTS = ['Zen Kaku Gothic New', 'Noto Sans JP', 'Shippori Mincho'];

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return Object.assign({}, DEFAULTS, raw);
    } catch {
      return Object.assign({}, DEFAULTS);
    }
  }

  function save(t) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
  }

  function applyTheme(t) {
    const r = document.documentElement.style;
    const a = ACCENTS[t.accent] || ACCENTS.green;
    r.setProperty('--brand', a.brand);
    r.setProperty('--brand-deep', a.deep);
    r.setProperty('--brand-tint', a.tint);
    r.setProperty('--accent', a.accent);
    r.setProperty('--accent-tint', a.atint);
    const d = DENSITY[t.density] || DENSITY.regular;
    r.setProperty('--fs', d.fs);
    r.setProperty('--gap', d.gap);
    r.setProperty('--pad', d.pad);
    r.setProperty('--radius', t.radius + 'px');
    r.setProperty('--head', `"${t.headFont}", "Noto Sans JP", sans-serif`);
    document.documentElement.setAttribute('data-dark', t.dark ? 'true' : 'false');
    const gauge = document.querySelector('.mini-gauge');
    if (gauge) gauge.style.display = t.headerLayout === 'with-gauge' ? '' : 'none';
  }

  let state = load();
  applyTheme(state); // apply immediately so there's no flash of default theme

  function set(edits) {
    state = Object.assign({}, state, edits);
    save(state);
    applyTheme(state);
    renderPanelBody(); // keep controls in sync with the new state
  }

  // ---- UI ------------------------------------------------------------------
  let popEl, bodyEl, btnEl;

  function seg(name, options, current, onPick) {
    const buttons = options.map((o) =>
      `<button type="button" data-v="${DN.esc(o.value)}" class="${o.value === current ? 'on' : ''}">${DN.esc(o.label)}</button>`
    ).join('');
    const wrap = DN.el('div', 'sp-seg');
    wrap.innerHTML = buttons;
    wrap.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-v]');
      if (btn) onPick(btn.getAttribute('data-v'));
    });
    return wrap;
  }

  function renderPanelBody() {
    if (!bodyEl) return;
    bodyEl.innerHTML = '';

    // accent
    const accentRow = DN.el('div', 'sp-row');
    accentRow.innerHTML = `<div class="sp-lbl"><span>アクセントカラー</span></div>`;
    const swatches = DN.el('div', 'sp-swatches');
    Object.keys(ACCENTS).forEach((key) => {
      const a = ACCENTS[key];
      const btn = DN.el('button', 'sp-swatch' + (state.accent === key ? ' on' : ''));
      btn.type = 'button';
      btn.style.background = a.swatch;
      btn.title = a.label;
      btn.setAttribute('aria-label', a.label);
      if (state.accent === key) btn.innerHTML = DN.icon('check');
      btn.addEventListener('click', () => set({ accent: key }));
      swatches.appendChild(btn);
    });
    accentRow.appendChild(swatches);
    bodyEl.appendChild(accentRow);

    // dark mode
    const darkRow = DN.el('div', 'sp-row');
    const toggleWrap = DN.el('div', 'sp-toggle-row');
    toggleWrap.innerHTML = `<span class="sp-lbl" style="margin:0"><span>ダークモード</span></span>`;
    const toggleBtn = DN.el('button', 'sp-toggle');
    toggleBtn.type = 'button';
    toggleBtn.setAttribute('role', 'switch');
    toggleBtn.setAttribute('aria-checked', state.dark ? 'true' : 'false');
    toggleBtn.dataset.on = state.dark ? '1' : '0';
    toggleBtn.innerHTML = '<i></i>';
    toggleBtn.addEventListener('click', () => set({ dark: !state.dark }));
    toggleWrap.appendChild(toggleBtn);
    darkRow.appendChild(toggleWrap);
    bodyEl.appendChild(darkRow);

    // density
    const densityRow = DN.el('div', 'sp-row');
    densityRow.innerHTML = `<div class="sp-lbl"><span>情報密度</span></div>`;
    densityRow.appendChild(seg('density',
      Object.keys(DENSITY).map((k) => ({ value: k, label: DENSITY[k].label })),
      state.density, (v) => set({ density: v })));
    bodyEl.appendChild(densityRow);

    // heading font
    const fontRow = DN.el('div', 'sp-row');
    fontRow.innerHTML = `<div class="sp-lbl"><span>見出しフォント</span></div>`;
    const select = DN.el('select', 'sp-select');
    select.innerHTML = HEAD_FONTS.map((f) =>
      `<option value="${DN.esc(f)}" ${f === state.headFont ? 'selected' : ''}>${DN.esc(f)}</option>`).join('');
    select.addEventListener('change', (e) => set({ headFont: e.target.value }));
    fontRow.appendChild(select);
    bodyEl.appendChild(fontRow);

    // radius
    const radiusRow = DN.el('div', 'sp-row');
    radiusRow.innerHTML = `<div class="sp-lbl"><span>角丸</span><span class="val">${state.radius}px</span></div>`;
    const slider = DN.el('input', 'sp-slider');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '18';
    slider.value = String(state.radius);
    slider.addEventListener('input', (e) => set({ radius: Number(e.target.value) }));
    radiusRow.appendChild(slider);
    bodyEl.appendChild(radiusRow);

    // header layout
    const headerRow = DN.el('div', 'sp-row');
    headerRow.innerHTML = `<div class="sp-lbl"><span>ヘッダー右側</span></div>`;
    headerRow.appendChild(seg('headerLayout', [
      { value: 'with-gauge', label: '電源ゲージ表示' },
      { value: 'minimal', label: 'ミニマル' },
    ], state.headerLayout, (v) => set({ headerLayout: v })));
    bodyEl.appendChild(headerRow);

    // reset
    const resetBtn = DN.el('button', 'sp-reset', '初期設定に戻す');
    resetBtn.type = 'button';
    resetBtn.addEventListener('click', () => set(Object.assign({}, DEFAULTS)));
    bodyEl.appendChild(resetBtn);
  }

  function closePanel() {
    popEl.classList.remove('open');
    btnEl.setAttribute('aria-expanded', 'false');
  }

  function togglePanel() {
    const open = popEl.classList.toggle('open');
    btnEl.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function mount() {
    const mountEl = document.getElementById('settingsMount');
    if (!mountEl || btnEl) return; // already mounted, or no slot on this page

    btnEl = DN.el('button', 'util-btn', `${DN.icon('tune')}表示設定`);
    btnEl.type = 'button';
    btnEl.setAttribute('aria-haspopup', 'true');
    btnEl.setAttribute('aria-expanded', 'false');

    popEl = DN.el('div', 'set-pop');
    popEl.innerHTML = `<div class="sp-h"><b>表示設定</b><button type="button" aria-label="閉じる">✕</button></div>
                        <div class="sp-body"></div>`;
    bodyEl = popEl.querySelector('.sp-body');
    popEl.querySelector('.sp-h button').addEventListener('click', closePanel);

    mountEl.appendChild(btnEl);
    mountEl.appendChild(popEl);

    btnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePanel();
    });
    document.addEventListener('click', (e) => {
      // Use composedPath (fixed at dispatch time), not e.target/contains: clicks inside
      // the panel rebuild bodyEl synchronously, which would otherwise detach the
      // clicked control from mountEl before this bubbles up and look like an outside click.
      if (popEl.classList.contains('open') && !e.composedPath().includes(mountEl)) closePanel();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closePanel();
    });

    renderPanelBody();
    applyTheme(state); // re-apply now that masthead/mini-gauge markup exists
  }

  document.addEventListener('dn:partials-loaded', mount);
  // Page has no partial chrome at all (shouldn't happen, but don't hang).
  if (document.readyState !== 'loading' && !document.querySelector('[data-include]')) mount();
})();
