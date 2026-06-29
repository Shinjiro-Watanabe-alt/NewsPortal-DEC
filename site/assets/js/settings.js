/* 脱炭素ニュースポータル — Display Settings (表示設定)
   A real, user-facing settings feature (not a design-time tool): lets visitors
   pick a theme (light/dark), article thumbnail style (photo/icon), and text
   size. Choices persist to localStorage and apply on every page via CSS
   custom properties / data attributes. */
(function () {
  const STORAGE_KEY = 'dn-settings';

  const DEFAULTS = {
    dark: false,
    thumb: 'photo',
    size: 'm',
    color: 'teal',
  };

  // fsD: 本文・UIテキスト全般に乗せる加算分。fsDl: 見出し等の大きい文字に乗せる加算分
  // (拡大してもレイアウトが崩れにくいよう、本文より変化量を小さくしている)。
  const SIZE = {
    s: { label: '小',   fsD: '0px', fsDl: '0px', gap: '10px', pad: '11px' },
    m: { label: '標準', fsD: '1px', fsDl: '0px', gap: '14px', pad: '14px' },
    l: { label: '大',   fsD: '2px', fsDl: '1px', gap: '16px', pad: '16px' },
  };

  const COLORS = [
    { value: 'teal',   label: 'ティール',   hue: 198 },
    { value: 'green',  label: 'グリーン',   hue: 152 },
    { value: 'blue',   label: 'ブルー',     hue: 235 },
    { value: 'purple', label: 'パープル',   hue: 300 },
    { value: 'amber',  label: 'アンバー',   hue: 70 },
    { value: 'rose',   label: 'ローズ',     hue: 12 },
  ];

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
    const s = SIZE[t.size] || SIZE.m;
    r.setProperty('--fs-d', s.fsD);
    r.setProperty('--fs-dl', s.fsDl);
    r.setProperty('--gap', s.gap);
    r.setProperty('--pad', s.pad);
    document.documentElement.setAttribute('data-dark', t.dark ? 'true' : 'false');
    document.documentElement.setAttribute('data-thumbstyle', t.thumb === 'icon' ? 'icon' : 'photo');
    document.documentElement.setAttribute('data-color', t.color || DEFAULTS.color);
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

  function swatches(options, current, onPick) {
    const buttons = options.map((o) =>
      `<button type="button" class="sp-swatch${o.value === current ? ' on' : ''}" data-v="${DN.esc(o.value)}"
         style="background:oklch(0.52 0.12 ${o.hue})" title="${DN.esc(o.label)}" aria-label="${DN.esc(o.label)}">${
         o.value === current ? DN.icon('check') : ''}</button>`
    ).join('');
    const wrap = DN.el('div', 'sp-swatches');
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

    // カラー
    const colorRow = DN.el('div', 'sp-row');
    colorRow.innerHTML = `<div class="sp-lbl"><span>カラー</span></div>`;
    colorRow.appendChild(swatches(COLORS, state.color, (v) => set({ color: v })));
    bodyEl.appendChild(colorRow);

    // テーマ
    const themeRow = DN.el('div', 'sp-row');
    themeRow.innerHTML = `<div class="sp-lbl"><span>テーマ</span></div>`;
    themeRow.appendChild(seg('dark', [
      { value: 'light', label: 'ライト' },
      { value: 'dark', label: 'ダーク' },
    ], state.dark ? 'dark' : 'light', (v) => set({ dark: v === 'dark' })));
    bodyEl.appendChild(themeRow);

    // 記事画像
    const thumbRow = DN.el('div', 'sp-row');
    thumbRow.innerHTML = `<div class="sp-lbl"><span>記事画像</span></div>`;
    thumbRow.appendChild(seg('thumb', [
      { value: 'photo', label: '写真風' },
      { value: 'icon', label: 'アイコン' },
    ], state.thumb, (v) => set({ thumb: v })));
    bodyEl.appendChild(thumbRow);

    // 文字サイズ
    const sizeRow = DN.el('div', 'sp-row');
    sizeRow.innerHTML = `<div class="sp-lbl"><span>文字サイズ</span></div>`;
    sizeRow.appendChild(seg('size', Object.keys(SIZE).map((k) => ({ value: k, label: SIZE[k].label })),
      state.size, (v) => set({ size: v })));
    bodyEl.appendChild(sizeRow);

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
  }

  document.addEventListener('dn:partials-loaded', mount);
  // Page has no partial chrome at all (shouldn't happen, but don't hang).
  if (document.readyState !== 'loading' && !document.querySelector('[data-include]')) mount();
})();
