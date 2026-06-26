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
  }

  document.addEventListener('dn:partials-loaded', init);
  if (document.readyState !== 'loading' && !document.querySelector('[data-include]')) init();
})();
