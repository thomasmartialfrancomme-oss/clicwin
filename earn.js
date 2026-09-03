/* =========================================================
   CliCWin — logique de gain (clics + vidéos)
   ========================================================= */
(function () {
  'use strict';
  var BOOT = window.boot || { lang: 'fr', cur: '€' };
  var fmt = window.fmt;
  var toast = window.toast;
  var refreshBalance = window.refreshBalance;

  function post(url, body) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body || {})
    }).then(function (r) { return r.json(); });
  }

  /* =====================================================
     PARTIE 1 — Clics publicitaires (modale « pub »)
     ===================================================== */
  var modal = document.getElementById('clickModal');
  if (modal) {
    var brandEl = document.getElementById('adBrand');
    var txtEl = document.getElementById('adTxt');
    var barEl = document.getElementById('adBar');
    var countEl = document.getElementById('adCount');
    var statusEl = document.getElementById('adStatus');
    var adbox = document.getElementById('adBox');
    var lockUntil = 0;          // cooldown global (anti-triche côté client)
    var activeTask = null;
    var timer = null;

    var closeBtn = modal.querySelectorAll('[data-close]');
    closeBtn.forEach(function (b) {
      b.addEventListener('click', function () { hideModal(true); });
    });

    function hideModal(early) {
      if (timer) clearInterval(timer); timer = null;
      if (early && activeTask) {
        // fermeture avant la fin : pas de crédit
        post('/api/click/cancel', { taskId: activeTask }).catch(function () {});
        if (statusEl) statusEl.textContent = '';
      }
      activeTask = null;
      modal.classList.add('hidden');
    }

    function cardBtns() { return document.querySelectorAll('.task[data-kind="click"] [data-start]'); }

    // verrouillage du cooldown global
    function lock(ms) {
      lockUntil = Date.now() + ms;
      cardBtns().forEach(function (b) { b.disabled = true; });
      var iv = setInterval(function () {
        var left = Math.ceil((lockUntil - Date.now()) / 1000);
        if (left <= 0) {
          clearInterval(iv);
          cardBtns().forEach(function (b) { if (!b.dataset.poison) b.disabled = false; });
        }
      }, 500);
    }

    document.querySelectorAll('.task[data-kind="click"] [data-start]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var card = btn.closest('.task');
        var id = card.dataset.id;
        if (Date.now() < lockUntil) { toast('⏳…', 'ok'); return; }
        btn.disabled = true;
        post('/api/click/start', { taskId: id }).then(function (r) {
          if (!r.ok) {
            btn.disabled = false;
            if (r.code === 'cooldown' && r.wait) { lock((r.wait) * 1000 + 50); toast('⏳ ' + r.wait + 's'); return; }
            if (r.code === 'dailylimit') { toast('🚫 ' + r.code); btn.dataset.poison = '1'; btn.disabled = true; return; }
            if (r.code === 'auth') { window.location = '/login'; return; }
            toast('🚫 ' + (r.code || 'err'), 'bad'); return;
          }
          openAd(card, btn, r);
        }).catch(function () { btn.disabled = false; toast('Erreur réseau', 'bad'); });
      });
    });

    function openAd(card, btn, resp) {
      var need = resp.need || 6;
      activeTask = card.dataset.id;
      var label = resp.task && resp.task.title && (resp.task.title[BOOT.lang] || resp.task.title.fr || 'Ad');
      var reward = resp.task ? resp.task.reward : parseFloat(card.querySelector('.treward b').textContent);
      if (brandEl) brandEl.textContent = (label || 'SPONSOR').toUpperCase().slice(0, 26);
      if (txtEl) txtEl.textContent = BOOT.lang === 'en' ? 'Sponsorised ad — demo. Watch fully…' : 'Publicité sponsorisée — démo. Regardez jusqu’au bout…';
      if (statusEl) statusEl.textContent = BOOT.lang === 'en' ? 'Reward: ' + fmt(reward) : 'Récompense : ' + fmt(reward);
      modal.classList.remove('hidden');

      var left = need;
      if (countEl) countEl.textContent = left;
      if (barEl) barEl.style.width = '0%';
      if (timer) clearInterval(timer);
      timer = setInterval(function () {
        left -= 1;
        var done = left <= 0;
        if (done) {
          clearInterval(timer); timer = null;
          finishClick(card, btn);
          return;
        }
        if (countEl) countEl.textContent = left;
        if (barEl) barEl.style.width = ((need - left) / need * 100) + '%';
      }, 1000);
    }

    function finishClick(card, btn) {
      var id = card.dataset.id;
      post('/api/click/finish', { taskId: id }).then(function (r) {
        if (r.ok) {
          if (statusEl) statusEl.textContent = '✅ ' + (BOOT.lang === 'en' ? 'Earned +' : 'Gagné +') + fmt(r.amount);
          if (barEl) barEl.style.width = '100%';
          refreshBalance().then(function () {
            setTimeout(function () { hideModal(false); lock(9500); }, 1200);
          });
        } else {
          if (statusEl) statusEl.textContent = '🚫';
          setTimeout(function () { hideModal(false); }, 900);
        }
      }).catch(function () {
        if (statusEl) statusEl.textContent = '🚫';
        setTimeout(function () { hideModal(false); }, 900);
      });
    }
  }

  /* =====================================================
     PARTIE 2 — Vidéos récompensées
     ===================================================== */
  document.querySelectorAll('.vcard[data-kind="video"]').forEach(function (card) {
    var watchBtn = card.querySelector('[data-watch]');
    if (!watchBtn || watchBtn.disabled) return;
    var originalLabel = watchBtn.textContent.trim();
    var video = card.querySelector('video');
    var prog = card.querySelector('.vprogress');
    var progBar = prog ? prog.querySelector('i') : null;
    var msgEl = card.querySelector('.vmsg');
    var doneLock = false;
    var completed = false;

    watchBtn.addEventListener('click', function () {
      if (doneLock) return;
      completed = false;
      post('/api/video/start', { taskId: card.dataset.id }).then(function (r) {
        if (!r.ok) {
          if (r.code === 'auth') return window.location.assign('/login');
          toast('🚫', 'bad');
          return;
        }
        doneLock = true;
        watchBtn.disabled = true;
        msgEl.classList.add('hidden');
        if (prog) prog.classList.remove('hidden');
        video.src = card.dataset.src;
        video.muted = false;
        var p = video.play();
        if (p && p.catch) p.catch(function () { video.muted = true; video.play(); });

        video.addEventListener('timeupdate', function onT() {
          var d = video.duration || card.dataset.hold || 10;
          if (progBar) progBar.style.width = (video.currentTime / d * 100) + '%';
          if (video.currentTime + .3 >= d) {
            video.removeEventListener('timeupdate', onT);
            complete();
          }
        });
        video.addEventListener('ended', function onE() { video.removeEventListener('ended', onE); complete(); });

        function complete() {
          if (completed) return;          // déjà traité
          completed = true;
          if (!doneLock) return;
          post('/api/video/done', { taskId: card.dataset.id }).then(function (rr) {
            doneLock = false;
            if (prog) prog.classList.add('hidden');
            if (rr.ok) {
              msgEl.textContent = '✅ ' + fmt(rr.amount);
              msgEl.classList.remove('bad');
              refreshBalance();
            } else {
              msgEl.textContent = '🚫';
              msgEl.classList.add('bad');
            }
            msgEl.classList.remove('hidden');
            // petit temps mort avant de pouvoir relancer
            var cd = 4;
            watchBtn.disabled = true;
            var iv = setInterval(function () {
              cd -= 1;
              watchBtn.textContent = cd > 0 ? '…' + cd : originalLabel;
              if (cd <= 0) { clearInterval(iv); watchBtn.disabled = false; }
            }, 1000);
          });
        }
      });
    });
  });
})();
