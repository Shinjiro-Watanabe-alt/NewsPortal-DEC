/* 脱炭素ニュースポータル — fetch-based HTML partial loader.
   <div data-include="partials/utility.html"></div> gets its innerHTML replaced
   with the fetched partial. Fires 'dn:partials-loaded' on document once every
   data-include on the page has resolved, so page scripts can safely query the
   injected DOM (nav highlighting, settings mount, footer category list, etc). */
(function () {
  async function loadOne(node) {
    const src = node.getAttribute('data-include');
    try {
      const res = await fetch(src);
      node.innerHTML = await res.text();
    } catch (err) {
      console.error('[include] failed to load', src, err);
    }
  }

  async function run() {
    const nodes = Array.from(document.querySelectorAll('[data-include]'));
    await Promise.all(nodes.map(loadOne));
    document.dispatchEvent(new CustomEvent('dn:partials-loaded'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
