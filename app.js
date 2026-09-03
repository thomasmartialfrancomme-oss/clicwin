/* =========================================================
   CliCWin — script global
   ========================================================= */
(function () {
  'use strict';
  let boot = null;
  try { boot = JSON.parse(document.getElementById('boot').textContent); } catch (e) { boot = null; }
  window.boot = boot || { lang: 'fr', cur: '€' };

  // Format argent côté client (identique au serveur)
  window.fmt = function (n) {
    return (Math.round(n * 100) / 100).toFixed(2) + ' ' + window.boot.cur;
  };

  // Toasts
  window.toast = function (msg, type) {
    var box = document.getElementById('toasts');
    if (!box) return;
    var d = document.createElement('div');
    d.className = 'toast ' + (type || '');
    d.textContent = msg;
    box.appendChild(d);
    setTimeout(function () { d.style.opacity = '0'; d.style.transition = '.3s'; }, 2600);
    setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 3000);
  };

  // Rafraîchir les soldes affichés sans recharger
  window.refreshBalance = function () {
    return fetch('/api/me', { method: 'GET', headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j.ok || !j.user) return;
        document.querySelectorAll('.bigbalance').forEach(function (el) { el.textContent = window.fmt(j.user.balance); });
        var nav = document.querySelector('.navbal b');
        if (nav) nav.textContent = window.fmt(j.user.balance);
        return j.user;
      })
      .catch(function () { return null; });
  };

  // Copier le lien de parrainage
  var copyBtn = document.getElementById('copyRef');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var inp = document.getElementById('refLink');
      if (!inp) return;
      inp.select();
      var done = false;
      try { done = document.execCommand('copy'); } catch (e) {}
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(inp.value).then(function () { done = true; });
      }
      if (done) { copyBtn.textContent = '✓'; setTimeout(function () { copyBtn.textContent = boot && boot.lang === 'en' ? 'Copy link' : 'Copier le lien'; }, 1600); }
      else { inp.style.outline = '2px solid #10b981'; }
    });
  }

  // Petite animation des compteurs statistiques
  var anim = document.querySelectorAll('.stats b');
  if (anim.length && 'IntersectionObserver' in window) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        var target = parseFloat(el.textContent.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
        var cur = 0, step = Math.max(1, Math.ceil(target / 40));
        var iv = setInterval(function () {
          cur = Math.min(target, cur + step);
          el.textContent = (Math.round(cur * 100) / 100).toFixed(0);
          if (cur >= target) clearInterval(iv);
        }, 18);
        obs.unobserve(el);
      });
    }, { threshold: .4 });
    anim.forEach(function (el) { obs.observe(el); });
  }
})();
