/* Hermes WebUI Extension: Benchmarks in der Modellauswahl.
 * Daten: static/bench.json (BenchLM.ai, CC BY-NC 4.0) – per scripts/build_bench.py aktualisiert.
 * Hängt sich per MutationObserver an #composerModelDropdown, ohne WebUI-Kerncode zu ändern. */
(function () {
  'use strict';
  let BENCH = null, loading = null;
  const ALIAS = { // Namens-Abweichungen WebUI-ID -> BenchLM-Slug
    'kimi-k2-6': 'kimi-2-6',
    'deepseek-v4-flash': 'deepseek-v4-flash-0731',
    'deepseek-v4-pro': 'deepseek-v4-pro-0813',
  };
  const CATS = [['co', 'Coding'], ['ag', 'Agent'], ['o', 'Gesamt']];

  const norm = id => String(id || '').replace(/^@[^:]+:/, '').replace(/^.*\//, '')
    .toLowerCase().replace(/[._\s]/g, '-');

  function find(id) {
    if (!BENCH) return null;
    let k = norm(id); k = ALIAS[k] || k;
    if (BENCH[k]) return BENCH[k];
    const c = Object.keys(BENCH).filter(s => s.startsWith(k + '-') && /\d{4}$/.test(s))
      .sort((a, b) => (BENCH[a].r || 999) - (BENCH[b].r || 999));
    return c.length ? BENCH[c[0]] : null;
  }

  const col = v => v >= 70 ? '#3fb950' : v >= 55 ? '#d29922' : v >= 40 ? '#db8b3a' : '#f85149';

  function price(b) {
    if (!(b.pi > 0) || !(b.po > 0)) return '';
    const f = x => x >= 10 ? x.toFixed(0) : x.toFixed(2).replace(/\.?0+$/, '');
    return `$${f(b.pi)}/${f(b.po)}`;
  }

  // Kurzempfehlung aus den Zahlen (Coding vs. Agent vs. Preis vs. Tempo)
  function hint(b) {
    const t = [];
    if (b.co >= 75) t.push('Top-Coding');
    else if (b.co >= 55) t.push('solides Coding');
    if (b.ag >= 70) t.push('starker Agent');
    if (b.t >= 150) t.push('sehr schnell');
    if (b.po > 0 && b.po <= 1.5 && b.o >= 55) t.push('günstig');
    if (b.po >= 15) t.push('teuer');
    if (!t.length && b.o < 50) t.push('eher Nebenjobs');
    return t.slice(0, 3).join(' · ');
  }

  function decorate(row) {
    if (row.dataset.bench) return;
    const idEl = row.querySelector('.model-opt-id');
    if (!idEl) return;
    row.dataset.bench = '1';
    const b = find(idEl.textContent);
    const box = document.createElement('div');
    box.className = 'bench-line';
    if (!b) { box.innerHTML = '<span class="bench-none">keine Benchmarks</span>'; row.appendChild(box); return; }
    const cells = CATS.filter(([k]) => b[k] != null).map(([k, l]) =>
      `<span class="bench-cell" title="${l}-Score (0–100)"><i>${l}</i>` +
      `<b style="color:${col(b[k])}">${Math.round(b[k])}</b>` +
      `<u><s style="width:${Math.max(4, Math.min(100, b[k]))}%;background:${col(b[k])}"></s></u></span>`).join('');
    const meta = [b.t ? `${Math.round(b.t)} t/s` : '', price(b) ? price(b) + ' /1M' : '',
      b.r ? `Rang ${b.r}` : ''].filter(Boolean).join(' · ');
    const h = hint(b);
    box.innerHTML = `<div class="bench-cells">${cells}</div>` +
      (meta || h ? `<div class="bench-meta">${meta}${meta && h ? ' — ' : ''}<em>${h}</em></div>` : '');
    row.appendChild(box);
  }

  function scan(dd) {
    dd.querySelectorAll('.model-opt').forEach(decorate);
    if (!dd.querySelector('.bench-foot')) {
      const f = document.createElement('div');
      f.className = 'bench-foot';
      f.innerHTML = 'Scores 0–100 · Quelle: <a href="https://benchlm.ai" target="_blank" rel="noopener">BenchLM.ai</a>' +
        (window.__benchUpdated ? ` · Stand ${window.__benchUpdated}` : '');
      dd.appendChild(f);
    }
  }

  function load() {
    if (!loading) loading = fetch('/extensions/bench.json', { credentials: 'same-origin' })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => { BENCH = d.models; window.__benchUpdated = d.updated; })
      .catch(e => console.warn('[bench-picker] bench.json nicht ladbar', e));
    return loading;
  }

  function init() {
    const dd = document.getElementById('composerModelDropdown');
    if (!dd) return setTimeout(init, 500);
    load().then(() => {
      let busy = false;
      const run = () => { if (busy) return; busy = true; try { scan(dd); } finally { busy = false; } };
      new MutationObserver(run).observe(dd, { childList: true, subtree: true });
      run();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
