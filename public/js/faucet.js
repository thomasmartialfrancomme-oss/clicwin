// ============================================================
//  CliCWin — Robinet (faucet) : minuteur + réclamation + solde
// ============================================================
(function () {
  'use strict';
  const btn = document.getElementById('faucetBtn');
  if (!btn) return;
  const timerEl = document.getElementById('faucetTimer');
  const msgEl = document.getElementById('faucetMsg');
  const countEl = document.getElementById('faucetCount');

  const tReady = btn.getAttribute('data-ready') || 'Claim';
  const tClaiming = btn.getAttribute('data-claiming') || '…';
  const tEarned = btn.getAttribute('data-t-earned') || 'Earned {a}!';
  const capMsg = btn.getAttribute('data-msg-cap') || '';
  const errMsg = btn.getAttribute('data-msg-err') || '';
  const tNext = btn.getAttribute('data-t-next') || 'Next in';
  const interval = parseInt(btn.getAttribute('data-interval'), 10) || 120;

  let wait = 0;
  let claimed = 0;
  let cap = 0;
  let busy = false;

  function fmt(s) {
    s = Math.max(0, Math.floor(s));
    const m = Math.floor(s / 60);
    const x = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (x < 10 ? '0' : '') + x;
  }

  function refreshBalance() {
    fetch('/api/me').then(r => r.json()).then(d => {
      if (!d.ok || !d.user) return;
      const b = d.user.balance;
      const dec = Math.abs(b) < 0.01 ? 4 : 2;
      const s = b.toFixed(dec);
      const big = document.querySelector('.bigbalance');
      if (big) big.textContent = s;
      const nav = document.querySelector('.navbal b');
      if (nav) nav.textContent = s;
    }).catch(function () {});
  }

  function update() {
    if (claimed >= cap) {
      timerEl.textContent = '--:--';
      btn.disabled = true;
      btn.textContent = capMsg;
      if (!msgEl.textContent) msgEl.textContent = capMsg;
      return;
    }
    if (wait > 0) {
      btn.disabled = true;
      btn.textContent = tNext + ' ' + fmt(wait);
      timerEl.textContent = fmt(wait);
      wait -= 1;
      if (wait < 0) wait = 0;
    } else if (!busy) {
      btn.disabled = false;
      btn.textContent = tReady;
      timerEl.textContent = '00:00';
    }
  }

  btn.addEventListener('click', function () {
    if (busy || btn.disabled) return;
    busy = true;
    btn.disabled = true;
    btn.textContent = tClaiming;
    fetch('/api/faucet/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      .then(r => r.json())
      .then(d => {
        busy = false;
        if (d.ok) {
          claimed = d.claimed; cap = d.cap; wait = d.wait || 0;
          if (countEl) countEl.textContent = claimed + '/' + cap;
          msgEl.textContent = tEarned.replace('{a}', String(d.amount).replace('.', ',') + ' ');
          msgEl.style.color = 'var(--ok)';
          refreshBalance();
        } else if (d.code === 'wait') {
          wait = d.wait || 0; claimed = d.claimed || claimed; cap = d.cap || cap;
          if (countEl) countEl.textContent = claimed + '/' + cap;
          msgEl.textContent = errMsg;
          msgEl.style.color = '';
        } else if (d.code === 'cap') {
          claimed = d.claimed || claimed; cap = d.cap || cap;
          if (countEl) countEl.textContent = claimed + '/' + cap;
          msgEl.textContent = capMsg;
          msgEl.style.color = '';
        } else {
          msgEl.textContent = errMsg;
          msgEl.style.color = '';
        }
        update();
      })
      .catch(function () {
        busy = false;
        msgEl.textContent = errMsg;
        msgEl.style.color = '';
        update();
      });
  });

  // Chargement de l'état serveur, puis tick chaque seconde
  fetch('/api/faucet/state')
    .then(r => r.json())
    .then(d => {
      if (d.ok && d.state) {
        wait = d.state.wait || 0;
        claimed = d.state.claimed || 0;
        cap = d.state.cap || 0;
      }
      if (countEl) countEl.textContent = claimed + '/' + cap;
      if (claimed >= cap) {
        timerEl.textContent = '--:--';
        btn.disabled = true;
        btn.textContent = capMsg;
        msgEl.textContent = capMsg;
        return;
      }
      update();
      setInterval(update, 1000);
    })
    .catch(function () {
      btn.disabled = true;
      btn.textContent = '!';
    });
})();
