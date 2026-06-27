/* mobile.html — collapsible inline search row (mobile-only chrome behavior). */
(function () {
  function init() {
    const btn = document.getElementById('mSearchBtn');
    const row = document.getElementById('mSearchRow');
    if (!btn || !row) return;
    btn.addEventListener('click', () => {
      const open = row.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) row.querySelector('input')?.focus();
    });

    const input = row.querySelector('input');
    const submitBtn = row.querySelector('button');
    if (!input || !submitBtn) return;

    const q = new URLSearchParams(location.search).get('q');
    if (q) input.value = q;

    const submit = () => {
      const value = input.value.trim();
      if (!value) return;
      location.href = `mobile.html?q=${encodeURIComponent(value)}`;
    };
    submitBtn.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
    });
  }

  document.addEventListener('dn:partials-loaded', init);
  if (document.readyState !== 'loading' && !document.querySelector('[data-include]')) init();
})();
