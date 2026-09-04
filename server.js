// ============================================================
//  CLICWIN — Serveur web (Express)
//  Lancement :  npm start    (par défaut port 3000)
//  Comptes démo (après npm run seed) : voir README.md
// ============================================================
'use strict';
const express = require('express');
const config = require('./lib/config.js');
const db = require('./lib/db.js');
const store = require('./lib/store.js');
const partners = require('./lib/partners.js');
const { t } = require('./lib/i18n');
const { esc, escAttr, money, readCookie, layout, balanceCard } = require('./lib/html.js');

const app = express();
// Derrière le proxy HTTPS de Render/Cloudflare : garder le vrai schéma (https)
// et la vraie IP du visiteur (anti-triche) malgré le proxy.
app.set('trust proxy', 1);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(config.publicDir));

// ---------- utilitaires session / langue ----------
function langOf(req) {
  const c = readCookie(req, 'cw_lang');
  return config.langs.includes(c) ? c : config.defaultLang;
}
function userOf(req) {
  const token = readCookie(req, 'cw_t');
  const s = token ? store.findSession(token) : null;
  return s ? store.findUserById(s.userId) : null;
}
function t_(lang, k, v) { return t(lang, k, v); }

function redirect(res, to, ok, err) {
  const q = [];
  if (ok) q.push('ok=' + encodeURIComponent(ok));
  if (err) q.push('err=' + encodeURIComponent(err));
  if (!q.length) return res.redirect(to);
  const sep = to.indexOf('?') >= 0 ? '&' : '?';
  res.redirect(to + sep + q.join('&'));
}

function flashBanner(lang, q) {
  if (!q.ok && !q.err) return '';
  if (q.ok) return `<div class="flash ok">${esc(t_(lang, 'msg_' + q.ok) || q.ok)}</div>`;
  if (q.err) return `<div class="flash bad">${esc(t_(lang, 'err_' + q.err) || t_(lang, q.err) || q.err)}</div>`;
  return '';
}

function currentLang(req) { return langOf(req); }

function render(req, res, opts) {
  const lang = opts.lang || currentLang(req);
  res.send(layout({
    lang,
    user: opts.user || null,
    active: opts.active || '',
    title: opts.title || config.siteName,
    extraHead: opts.extraHead || '',
    bodyScripts: opts.bodyScripts || '',
    content: (opts.flash || '') + (opts.content || '')
  }));
}

// ============================================================
//  PAGE — Accueil public / tableau de bord
// ============================================================
app.get('/', (req, res) => {
  const lang = currentLang(req);
  const user = userOf(req);
  if (user) return dashboard(req, res, lang, user);
  const s = store.globalStats();
  const t_ = (k, v) => t(lang, k, v);
  render(req, res, {
    lang, active: 'home', title: config.tagline[lang] || config.siteName,
    content: `
    <section class="hero">
      <div class="hero-text">
        <h1>${esc(t_('heroTitle'))}</h1>
        <p class="lead">${esc(t_('heroSub'))}</p>
        <div class="hero-cta">
          <a class="btn primary big" href="/signup">${esc(t_('ctaStart'))} →</a>
          <a class="btn big" href="#how">${esc(t_('ctaTour'))}</a>
        </div>
        <div class="stats">
          <div><b>${esc(String(s.members))}</b><span>${esc(t_('statsMembers'))}</span></div>
          <div><b>${esc(String(s.clicks))}</b><span>${esc(t_('statsClicks'))}</span></div>
          <div><b>${esc(money(s.paid, lang))}</b><span>${esc(t_('statsPaid'))}</span></div>
        </div>
      </div>
      <div class="hero-art">${artSvg()}</div>
    </section>

    <section class="cards3" id="how">
      <h2 class="sect">${esc(t_('howTitle'))}</h2>
      <div class="grid3">
        ${stepCard('1', t_('how1'), t_('how1d'))}
        ${stepCard('2', t_('how2'), t_('how2d'))}
        ${stepCard('3', t_('how3'), t_('how3d'))}
        ${stepCard('4', t_('how4'), t_('how4d'))}
        ${featurePill(t_('realPotential'))}
        ${featurePill(t_('zeroCost'))}
      </div>
    </section>

    <section class="why">
      <div class="grid3">
        ${whyCard('✅', t_('why1'), t_('why1d'))}
        ${whyCard('👥', t_('why2'), t_('why2d', { p: config.refPercent }))}
        ${whyCard('⚡', t_('why3'), t_('why3d'))}
      </div>
    </section>

    <section class="warn">
      <h3>⚠️ ${esc(t_('warningTitle'))}</h3>
      <ul>
        <li>${esc(t_('warning1'))}</li>
        <li>${esc(t_('warning2'))}</li>
        <li>${esc(t_('warning3'))}</li>
      </ul>
    </section>`
  });
});

function artSvg() {
  return `<svg viewBox="0 0 320 220" role="img" aria-hidden="true">
  <rect x="20" y="30" width="280" height="150" rx="18" fill="#0f172a"/>
  <rect x="40" y="50" width="120" height="16" rx="8" fill="#334155"/>
  <rect x="40" y="78" width="240" height="9" rx="4" fill="#1e293b"/>
  <rect x="40" y="96" width="200" height="9" rx="4" fill="#1e293b"/>
  <rect x="40" y="114" width="230" height="9" rx="4" fill="#1e293b"/>
  <g>
    <circle cx="60" cy="160" r="26" fill="none" stroke="#10b981" stroke-width="8" stroke-dasharray="163 300" transform="rotate(-90 60 160)"/>
    <text x="60" y="166" text-anchor="middle" font-size="15" fill="#10b981" font-weight="bold" font-family="Arial">₵</text>
  </g>
  <rect x="150" y="145" width="120" height="32" rx="16" fill="#10b981"/>
  <text x="210" y="166" text-anchor="middle" font-size="13" fill="#fff" font-weight="bold" font-family="Arial">CLICK → ₵</text>
</svg>`;
}
function stepCard(n, a, b) {
  return `<div class="card step"><div class="stepnum">${n}</div><h3>${esc(a)}</h3><p>${esc(b)}</p></div>`;
}
function featurePill(label) {
  return `<div class="card step pillcenter"><h3 style="color:var(--ok)">${esc(label)}</h3></div>`;
}
function whyCard(icon, a, b) {
  return `<div class="card why"><div class="whyic">${icon}</div><h3>${esc(a)}</h3><p>${esc(b)}</p></div>`;
}

// ============================================================
//  PAGE — Dashboard (connecté)
// ============================================================
function dashboard(req, res, lang, user) {
  const t_ = (k, v) => t(lang, k, v);
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay()); startOfWeek.setHours(0,0,0,0);
  const txs = store.userTx(user.id, 100);
  let today = 0, week = 0, totalIn = 0;
  for (const x of txs) {
    const at = new Date(x.at);
    if (x.amount > 0) {
      if (at >= startOfWeek) week += x.amount;
      if (at >= startOfDay) today += x.amount;
    }
    if (x.amount > 0) totalIn += x.amount;
  }
  const refs = store.allUsers().filter(u => u.refBy === user.id);
  const activeRefs = refs.filter(u => (u.clicksDate === (new Date()).toISOString().slice(0,10) && u.clicksToday > 0) || u.refBonusGiven);
  const recent = txs.slice(0, 8);

  render(req, res, {
    lang, user, active: 'home', title: t_('dashTitle'),
    content: `
      <h1>${esc(t_('dashWelcome', { name: user.name }))}</h1>
      ${balanceCard(lang, user)}
      <section class="grid4">
        ${statChip(t_('dashToday'), money(today, lang), '📅')}
        ${statChip(t_('dashWeek'), money(week, lang), '🗓️')}
        ${statChip(t_('dashTotal'), money(user.totalEarned, lang), '💰')}
        ${statChip(t_('dashRefs'), String(refs.length), '👥')}
      </section>
      <section class="two-col">
        <div>
          <h2 class="sect">${esc(t_('dashActions'))}</h2>
          <div class="quickgrid">
            <a class="card qlink" href="/clicks"><b>🖱️</b>${esc(t_('goClicks'))}</a>
            <a class="card qlink" href="/videos"><b>▶️</b>${esc(t_('goVideos'))}</a>
            <a class="card qlink" href="/offers"><b>🎯</b>${esc(t_('goOffers'))}</a>
            <a class="card qlink" href="/referrals"><b>👥</b>${esc(t_('refTitle'))}</a>
          </div>
        </div>
        <div>
          <h2 class="sect">${esc(t_('dashRecent'))}</h2>
          ${recent.length ? txTable(lang, recent, t_) : `<p class="muted">${esc(t_('dashNone'))}</p>`}
        </div>
      </section>`
  });
}

function statChip(label, value, ic) {
  return `<div class="card stat"><div class="st-ic">${ic}</div><div><b>${esc(value)}</b><span>${esc(label)}</span></div></div>`;
}
function txTable(lang, txs, t_) {
  const rows = txs.map(x => {
    const pos = x.amount >= 0;
    const label = t_('tx_' + x.type) || x.type;
    const cls = x.type === 'withdraw' ? 'withd' : pos ? 'pos' : 'neg';
    return `<tr><td><span class="dot ${cls}"></span>${esc(label)}</td>
      <td class="r"><b class="${cls === 'withd' ? 'red' : 'green'}">${pos ? '+' : '−'}${esc(money(Math.abs(x.amount), lang))}</b></td>
      <td class="muted small r">${esc(shortDate(x.at, lang))}</td></tr>`;
  }).join('');
  return `<table class="mini"><tbody>${rows}</tbody></table>`;
}
function shortDate(iso, lang) {
  const d = new Date(iso);
  return d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: '2-digit', month: 'short' });
}

// ============================================================
//  PAGE — Earn hub : clics / vidéos / offres
// ============================================================
function earnTabs(lang, active) {
  const t_ = (k, v) => t(lang, k, v);
  const items = [
    ['clicks', '/clicks', t_('clicks')],
    ['videos', '/videos', t_('videos')],
    ['offers', '/offers', t_('offers')]
  ];
  return `<div class="tabs">${items.map(([id, href, label]) => `<a href="${href}" class="${active === id ? 'on' : ''}">${esc(label)}</a>`).join('')}</div>`;
}

// --- Clics ---
app.get('/clicks', (req, res) => {
  const lang = currentLang(req); const user = userOf(req);
  if (!user) return redirect(res, '/login');
  const t_ = (k, v) => t(lang, k, v);
  const view = store.userClicksView(user, lang);
  const cards = view.length ? view.map(ct => clickCard(lang, ct, t_)).join('') : `<p class="muted">${esc(t_('noTasks'))}</p>`;
  const maxToday = Math.max(0, ...view.map(v => v.status === 'active' ? 30 : 0));
  render(req, res, {
    lang, user, active: 'clicks', title: t_('clicks'),
    bodyScripts: '<script src="/js/earn.js"></script>',
    content: `
      <h1>${esc(t_('earnTitle'))}</h1>
      ${earnTabs(lang, 'clicks')}
      ${balanceCard(lang, user)}
      <p class="muted">${esc(t_('adDemoSub'))}</p>
      <section class="taskgrid">${cards}</section>
      <div class="modal hidden" id="clickModal" role="dialog" aria-modal="true">
        <div class="modal-back" data-close></div>
        <div class="modal-card">
          <div class="modal-head"><h3>${esc(t_('adDemo'))}</h3><button class="x" data-close aria-label="close">×</button></div>
          <div class="adbox" id="adBox">
            <div class="adbrand" id="adBrand">SPONSOR</div>
            <div class="adtxt" id="adTxt">—</div>
            <div class="adbar"><i id="adBar"></i></div>
            <div class="adcount" id="adCount">${esc(t_('waitSec', { s: '…' }))}</div>
          </div>
          <p class="muted small" id="adStatus"></p>
        </div>
      </div>`
  });
});

function clickCard(lang, ct, t_) {
  const soon = ct.status === 'soon';
  const full = !soon && ct.usedToday >= ct.cap;
  return `<article class="card task ${soon ? 'soon' : ''}" data-kind="click" data-id="${ct.id}" data-cd="${ct.cd}" data-used="${ct.usedToday}" data-cap="${ct.cap}">
    <div class="ticon" style="background:${ct.color}">🖱️</div>
    <div class="tbody">
      <div class="trow"><b>${esc(ct.title)}</b>${soon ? `<span class="chip soon">${esc(t_('coming'))}</span>` : `<span class="chip green">${esc(t_('active'))}</span>`}</div>
      <div class="muted small">${esc(t_('taskTypeClick'))} · <b class="usedcount">${ct.usedToday}/${ct.cap}</b> ${esc(t_('clicksToday'))}</div>
    </div>
    <div class="treward"><b>+${esc(money(ct.reward, lang))}</b><span>${esc(t_('rewardPer'))}</span>
      ${soon ? '' : full ? `<button class="btn primary small" disabled>✓ ${esc(t_('maxClicks'))}</button>` : `<button class="btn primary small" data-start>${esc(t_('actionClick'))}</button>`}
    </div>
  </article>`;
}

// --- Vidéos ---
app.get('/videos', (req, res) => {
  const lang = currentLang(req); const user = userOf(req);
  if (!user) return redirect(res, '/login');
  const t_ = (k, v) => t(lang, k, v);
  const vids = store.listVideoTasks().map(v => {
    v.usedToday = store.usedTaskToday(user.id, 'video', v.id);
    v.cap = v.dailyCap || config.videoCapPerTask;
    return v;
  }).map(v => videoCard(lang, v, t_)).join('') || `<p class="muted">${esc(t_('noVideo'))}</p>`;
  render(req, res, {
    lang, user, active: 'clicks', title: t_('videos'),
    bodyScripts: '<script src="/js/earn.js"></script>',
    content: `
      <h1>${esc(t_('videoTitle'))}</h1>
      ${earnTabs(lang, 'videos')}
      ${balanceCard(lang, user)}
      <p class="muted">${esc(t_('videoSub'))}</p>
      <section class="taskgrid vidgrid">${vids}</section>`
  });
});
function videoCard(lang, v, t_) {
  const soon = v.status === 'soon';
  const full = !soon && v.usedToday >= v.cap;
  const mins = Math.floor((v.duration || 10) / 60), secs = (v.duration || 10) % 60;
  return `<article class="card task vcard ${soon ? 'soon' : ''}" data-kind="video" data-id="${v.id}" data-hold="${v.duration || 10}" data-src="${escAttr(v.src)}">
    <video class="vplayer" preload="metadata" playsinline muted ${v.status === 'soon' ? 'disabled' : ''}></video>
    <div class="tbody">
      <div class="trow"><b>${esc(v.title[lang] || v.titleDefault)}</b>${soon ? `<span class="chip soon">${esc(t_('coming'))}</span>` : ''}</div>
      <div class="muted small">${esc(t_('videoMeta'))} · ⏱ ${mins ? mins + ' min ' : ''}${secs} ${esc(t_('seconds'))} · <b class="usedcount">${v.usedToday}/${v.cap}</b> ${esc(t_('todayShort'))}</div>
    </div>
    <div class="treward"><b>+${esc(money(v.reward, lang))}</b><span>${esc(t_('videoEarn'))}</span>
      <button class="btn primary small" data-watch ${soon || full ? 'disabled' : ''}>${soon ? esc(t_('coming')) : full ? '✓ ' + esc(t_('maxClicks')) : '▶ ' + esc(t_('actionWatch'))}</button>
    </div>
    <div class="vprogress hidden"><i></i></div>
    <div class="vmsg hidden"></div>
  </article>`;
}

// --- Offres ---
app.get('/offers', (req, res) => {
  const lang = currentLang(req); const user = userOf(req);
  if (!user) return redirect(res, '/login');
  const t_ = (k, v) => t(lang, k, v);

  // -------- Mode LIVE : mur d'offres BitLabs réel (si token présent) --------
  const wallLive = config.offerwallMode === 'live' && !!config.bitlabsToken;
  if (wallLive) {
    const wallSrc = config.bitlabsWallUrl + '?token=' + encodeURIComponent(config.bitlabsToken) +
      '&uid=' + encodeURIComponent(user.id);
    render(req, res, {
      lang, user, active: 'clicks', title: t_('offers'),
      content: `
      <h1>${esc(t_('offersTitle'))}</h1>
      ${earnTabs(lang, 'offers')}
      ${balanceCard(lang, user)}
      <div class="card pad">
        <h2 class="sect">${esc(t_('offersLiveTitle'))}</h2>
        <p>${esc(t_('offersPick'))}</p>
        <p class="muted small">${esc(t_('offersLiveSub'))}</p>
        <div class="wallframe">
          <iframe src="${escAttr(wallSrc)}" title="${escAttr(t_('offersLiveTitle'))}"
            style="width:100%;height:680px;border:0;border-radius:12px;background:#fff"
            loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
        </div>
      </div>`
    });
    return;
  }

  const cards = store.listOfferTasks().map(o => {
    return `<article class="card task soon" data-kind="offer">
      <div class="ticon" style="background:${o.color}">🎯</div>
      <div class="tbody">
        <div class="trow"><b>${esc(o.title[lang] || o.titleDefault)}</b><span class="chip soon">${esc(t_('coming'))}</span></div>
        <div class="muted small">${esc(t_('taskTypeOffer'))}</div>
      </div>
      <div class="treward"><b>+${esc(money(o.reward, lang))}</b><span>${esc(t_('reward'))}</span></div>
    </article>`;
  }).join('');
  // Bloc « activation » visible uniquement par l'admin (l'opérateur du site)
  const adminBlock = user.isAdmin ? `
    <details class="card partner-admin" open>
      <summary><b>⚙️ ${esc(t_('offersOpTitle'))}</b></summary>
      <ol class="howlist small">
        <li>${esc(t_('offersOp1'))}</li>
        <li>${esc(t_('offersOp2'))}</li>
        <li>${esc(t_('offersOp3'))}</li>
      </ol>
      <div class="wlogos aplinks">
        ${partners.offerwalls.map(p => `<a target="_blank" rel="noopener" href="${escAttr(p.apply)}" title="${escAttr(p.note)}">🎯 ${esc(p.name)} ↗</a>`).join('')}
        ${partners.video.map(p => `<a target="_blank" rel="noopener" href="${escAttr(p.apply)}" title="${escAttr(p.note)}">▶️ ${esc(p.name)} ↗</a>`).join('')}
      </div>
      <p class="muted small">${esc(t_('offersOpPb'))}</p>
    </details>` : '';
  render(req, res, {
    lang, user, active: 'clicks', title: t_('offers'),
    content: `
      <h1>${esc(t_('offersTitle'))}</h1>
      ${earnTabs(lang, 'offers')}
      ${balanceCard(lang, user)}
      ${adminBlock}
      <div class="info">
        <h3>📌 ${esc(t_('offersSoon'))}</h3>
        <p>${esc(t_('offersSoonSub'))}</p>
        <div class="wlogos">${config.offerwalls.map(w => `<span>${esc(w)}</span>`).join('')}</div>
        <p class="muted small">${esc(t_('offersWarning'))}</p>
      </div>
      <h2 class="sect">${esc(t_('offersHow'))}</h2>
      <ol class="howlist">
        <li>${esc(t_('offersHow1'))}</li>
        <li>${esc(t_('offersHow2'))}</li>
        <li>${esc(t_('offersHow3'))}</li>
      </ol>
      <section class="taskgrid">${cards}</section>`
  });
});

// ============================================================
//  PAGE — Retraits
// ============================================================
app.get('/withdraw', (req, res) => {
  const lang = currentLang(req); const user = userOf(req);
  if (!user) return redirect(res, '/login');
  const t_ = (k, v) => t(lang, k, v);
  const min = config.minWithdraw;
  const okBal = user.balance >= min;
  const pct = Math.min(100, Math.round(user.balance / min * 100));
  const hist = store.userWithdrawals(user.id);
  const cur = config.currency[lang] || config.currency.en;
  const rows = hist.length ? hist.map(w => {
    const st = t_('wd' + w.status.charAt(0).toUpperCase() + w.status.slice(1));
    return `<tr>
      <td>${esc(w.id.slice(0, 8))}</td>
      <td class="r"><b>${esc(money(w.amount, lang))}</b></td>
      <td class="muted small">${esc(w.payEmail)}</td>
      <td>${w.status === 'pending' ? '<span class="chip warn">' + esc(st) + '</span>' : w.status === 'paid' ? '<span class="chip green">' + esc(st) + '</span>' : '<span class="chip soon">' + esc(st) + '</span>'}</td>
      <td class="muted small">${esc(shortDate(w.at, lang))}</td>
    </tr>`;
  }).join('') : `<tr><td colspan="5" class="muted">${esc(t_('wdNone'))}</td></tr>`;

  render(req, res, {
    lang, user, active: 'withdraw', title: t_('wdTitle'),
    content: `
      <h1>${esc(t_('wdTitle'))}</h1>
      ${flashBanner(lang, req.query)}
      <section class="two-col wd">
        <div class="card wdbox">
          <div class="wdbalance"><b>${esc(money(user.balance, lang))}</b><span>${esc(t_('wdBalance'))}</span></div>
          <div class="progress"><i style="width:${pct}%"></i></div>
          <p class="muted small">${esc(t_('wdMin'))} : <b>${esc(money(min, lang))}</b> ${okBal ? '' : `· ${esc(t_('wdMinNotReached'))} <b>${esc(money(min - user.balance, lang))}</b>`}</p>
          ${okBal ? `
          <form method="post" action="/api/withdraw" class="stack">
            <label>${esc(t_('wdMethod'))}<br><span class="muted small">${esc(t_('wdMethodSub'))}</span></label>
            <input type="email" name="payEmail" required placeholder="${esc(t_('wdPlaceholder'))}" value="">
            ${config.feePercent ? `<p class="muted small">${esc(t_('wdFee'))} : ${config.feePercent} %</p>` : ''}
            <button class="btn primary big" type="submit">💸 ${esc(t_('wdRequest'))} (${esc(money(user.balance, lang))})</button>
            <p class="muted small">Paiement via ${esc(config.paypalEmail)} · devise ${esc(cur)}</p>
          </form>` : `<div class="no-money">🔒 ${esc(t_('wdNoMoney'))}</div>`}
        </div>
        <div class="card">
          <h2 class="sect">${esc(t_('wdHistory'))}</h2>
          <table class="mini full"><thead><tr><th>ID</th><th class="r">${esc(t_('reward'))}</th><th>E-mail</th><th>${esc(t_('status'))}</th><th></th></tr></thead><tbody>${rows}</tbody></table>
        </div>
      </section>`
  });
});

// ============================================================
//  PAGE — Parrainage
// ============================================================
app.get('/referrals', (req, res) => {
  const lang = currentLang(req); const user = userOf(req);
  if (!user) return redirect(res, '/login');
  const t_ = (k, v) => t(lang, k, v);
  const link = `${req.protocol}://${req.get('host')}/?ref=${user.refCode}`;
  const refs = store.allUsers().filter(u => u.refBy === user.id);
  const tx = store.userTx(user.id, 5000);
  let refEarned = 0;
  for (const x of tx) if ((x.type === 'ref' || x.type === 'refbonus') && x.amount > 0) refEarned += x.amount;
  const rows = refs.length ? refs.map(r => {
    const isActive = r.refBonusGiven || (r.clicksDate === new Date().toISOString().slice(0, 10) && r.clicksToday > 0);
    return `<tr>
      <td>${esc(r.name)}</td>
      <td class="muted small">${esc(r.email)}</td>
      <td class="muted small">${esc(shortDate(r.createdAt, lang))}</td>
      <td>${isActive ? '<span class="chip green">' + esc(t_('refStatusActive')) + '</span>' : '<span class="chip">' + esc(t_('refStatusNew')) + '</span>'}</td>
      <td class="r muted small">${r.clicksToday}</td>
    </tr>`;
  }).join('') : `<tr><td colspan="5" class="muted">${esc(t_('refNone'))}</td></tr>`;

  render(req, res, {
    lang, user, active: 'referrals', title: t_('refTitle'),
    content: `
      <h1>${esc(t_('refTitle'))}</h1>
      <p>${esc(t_('refSub', { p: config.refPercent }))}</p>
      <section class="two-col">
        <div class="card">
          <label class="sect">${esc(t_('refLink'))}</label>
          <div class="refbox"><input id="refLink" readonly value="${escAttr(link)}"><button class="btn primary" id="copyRef">${esc(t_('refCopy'))}</button></div>
          <p class="muted small">💰 ${esc(t_('refBonus'))} : ${esc(t_('refBonusD', { b: money(config.refReward, lang), n: config.refActiveClicks }))}</p>
        </div>
        <div class="card">
          <h2 class="sect">${esc(t_('refStats'))}</h2>
          <div class="grid3 sm">
            ${statChip(t_('refCount'), String(refs.length), '📈')}
            ${statChip(t_('refActive'), String(refs.filter(r => r.refBonusGiven).length), '⭐')}
            ${statChip(t_('refEarned'), money(refEarned, lang), '💰')}
          </div>
        </div>
      </section>
      <section class="card">
        <h2 class="sect">${esc(t_('refListTitle'))}</h2>
        <table class="mini full"><thead><tr><th>${esc(t_('member'))}</th><th>E-mail</th><th>${esc(t_('refDate'))}</th><th>${esc(t_('status'))}</th><th class="r">#</th></tr></thead><tbody>${rows}</tbody></table>
      </section>`
  });
});

// ============================================================
//  PAGE — Aide
// ============================================================
app.get('/help', (req, res) => {
  const lang = currentLang(req); const user = userOf(req);
  const t_ = (k, v) => t(lang, k, v);
  const faq = lang === 'fr' ? [
    ['Combien puis-je gagner ?', 'Les clics rapportent entre 0,01 et 0,10 (selon les campagnes), les vidéos un peu plus, et les offres/sondages peuvent rapporter de 1 à 30. Les gains les plus importants viennent du parrainage : jusqu’à ' + config.refPercent + ' % des gains de vos filleuls.'],
    ['Quand serai-je payé ?', 'Dès que votre solde atteint le seuil minimal (' + money(config.minWithdraw, 'fr') + '), demandez un retrait. Les paiements sont traités sous 24 à 72 h.'],
    ['Comment suis-je payé ?', 'Par PayPal ou virement selon votre pays, sur l’e-mail que vous indiquez au moment du retrait.'],
    ['Y a-t-il un investissement ?', 'Non. L’inscription et toutes les tâches sont gratuites. Ne payez jamais pour « débloquer » vos gains : c’est un signe d’arnaque.'],
    ['Pourquoi certains gains sont-ils « en attente » ?', 'Les offres partenaires sont validées par le réseau (jusqu’à 48 h) avant d’être créditées.'],
    ['Pourquoi mon compte est-il bloqué ?', 'La triche (bot, clics automatisés, VPN, multi-comptes) est détectée automatiquement et entraîne le blocage définitif.'],
    ['Comment augmenter mes gains ?', '1) Parrainez : votre lien est le meilleur levier. 2) Faites les offres chaque jour. 3) Revenez régulièrement pour les campagnes premium.']
  ] : [
    ['How much can I earn?', 'Clicks pay between 0.01 and 0.10 (depending on campaigns), videos a bit more, and offers/surveys can pay from 1 to 30. The biggest earnings come from referrals: up to ' + config.refPercent + '% of your referrals earnings.'],
    ['When will I get paid?', 'As soon as your balance reaches the minimum (' + money(config.minWithdraw, 'en') + '), request a withdrawal. Payments are processed within 24–72 h.'],
    ['How am I paid?', 'By PayPal or bank transfer depending on your country, to the email you provide at withdrawal.'],
    ['Is there any investment?', 'No. Registration and all tasks are free. Never pay to “unlock” your earnings: it is a scam sign.'],
    ['Why are some rewards “pending”?', 'Partner offers are validated by the network (up to 48 h) before being credited.'],
    ['Why was my account blocked?', 'Cheating (bots, automated clicks, VPN, multiple accounts) is detected automatically and leads to permanent blocking.'],
    ['How can I earn more?', '1) Refer: your link is the best lever. 2) Do the offers every day. 3) Come back regularly for premium campaigns.']
  ];
  const items = faq.map(([q, a], i) => `<details ${i === 0 ? 'open' : ''}><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('');
  render(req, res, {
    lang, user, active: 'help', title: t_('help'),
    content: `
      <h1>${esc(t_('helpTitle'))}</h1>
      <section class="card faq"><h2 class="sect">${esc(t_('helpFaq'))}</h2>${items}</section>
      <section class="card"><h2 class="sect">${esc(t_('helpEmail'))}</h2>
        <p><a href="mailto:${escAttr(config.paypalEmail)}">${esc(config.paypalEmail)}</a></p></section>`
  });
});

// ============================================================
//  PAGE — Connexion / inscription / langue
// ============================================================
app.get(['/login', '/signup'], (req, res) => {
  const lang = currentLang(req);
  const user = userOf(req);
  if (user) return redirect(res, '/dashboard');
  const isLogin = req.path === '/login';
  const t_ = (k, v) => t(lang, k, v);
  const title = isLogin ? t_('login') : t_('signup');
  const ref = req.query.ref || '';
  const content = isLogin ? `
    <section class="authwrap"><div class="card auth">
      <h1>${esc(title)}</h1>
      ${flashBanner(lang, req.query)}
      <form method="post" action="/api/auth/login" class="stack">
        <label>${esc(t_('email'))}<input type="email" name="email" required autocomplete="email"></label>
        <label>${esc(t_('password'))}<input type="password" name="password" required autocomplete="current-password"></label>
        <button class="btn primary big" type="submit">${esc(t_('login'))}</button>
      </form>
      <p class="muted small center">${esc(t_('noaccount'))} <a href="/signup">${esc(t_('signup'))}</a></p>
    </div></section>` : `
    <section class="authwrap"><div class="card auth">
      <h1>${esc(title)}</h1>
      ${flashBanner(lang, req.query)}
      <form method="post" action="/api/auth/signup" class="stack">
        <label>${esc(t_('name'))}<input type="text" name="name" required maxlength="40" autocomplete="nickname"></label>
        <label>${esc(t_('email'))}<input type="email" name="email" required autocomplete="email"></label>
        <label>${esc(t_('password'))}<input type="password" name="password" required minlength="6" autocomplete="new-password"></label>
        <label>${esc(t_('confirm'))}<input type="password" name="confirm" required autocomplete="new-password"></label>
        <input type="hidden" name="ref" value="${escAttr(ref)}">
        <button class="btn primary big" type="submit">${esc(t_('register'))}</button>
      </form>
      <p class="muted small center">${esc(t_('already'))} <a href="/login">${esc(t_('login'))}</a></p>
    </div></section>`;
  render(req, res, { lang, active: '', title, content });
});

app.get('/dashboard', (req, res) => {
  const lang = currentLang(req); const user = userOf(req);
  if (!user) return redirect(res, '/login');
  dashboard(req, res, lang, user);
});

app.get('/switch-lang', (req, res) => {
  const to = req.query.to === 'en' ? 'en' : 'fr';
  res.setHeader('Set-Cookie', `cw_lang=${to}; Path=/; Max-Age=${31536000}; SameSite=Lax`);
  res.redirect(req.get('referer') || '/');
});

// ============================================================
//  API — Auth
// ============================================================
app.post('/api/auth/signup', (req, res) => {
  const lang = currentLang(req);
  const email = String(req.body.email || '').trim();
  const pass = String(req.body.password || '');
  const confirm = String(req.body.confirm || '');
  const name = String(req.body.name || '').trim();
  const refCode = String(req.body.ref || '').trim();
  const ok = (to) => redirect(res, to, 'registered');
  const bad = (to, e) => redirect(res, to, null, e);

  if (!email || !pass || !name) return bad('/signup', 'required');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return bad('/signup', 'email');
  if (pass.length < 6) return bad('/signup', 'passshort');
  if (pass !== confirm) return bad('/signup', 'pass');
  if (store.findUserByEmail(email)) return bad('/login', 'exists');

  let sponsor = null;
  if (refCode) sponsor = store.allUsers().find(u => u.refCode === refCode);
  const user = store.createUser(email, pass, name, lang);
  if (sponsor) user.refBy = sponsor.id;
  store.credit(user, 0, 'signup', 'signup');
  // bonus de bienvenue (démo, désactivable en production)
  if (config.welcomeBonus) store.credit(user, config.welcomeBonus, 'signup', 'welcome');
  store.saveUsers(store.allUsers());

  const token = store.createSession(user.id);
  res.setHeader('Set-Cookie', `cw_t=${token}; Path=/; Max-Age=${config.sessionDays * 86400}; HttpOnly; SameSite=Lax`);
  return ok('/dashboard');
});

app.post('/api/auth/login', (req, res) => {
  const lang = currentLang(req);
  const email = String(req.body.email || '').trim().toLowerCase();
  const pass = String(req.body.password || '');
  const user = store.findUserByEmail(email);
  if (!user || store.hashPassword(pass, user.salt) !== user.pass) {
    return redirect(res, '/login', null, 'login');
  }
  if (!user.active) return redirect(res, '/login', null, 'blocked');
  const token = store.createSession(user.id);
  res.setHeader('Set-Cookie', `cw_t=${token}; Path=/; Max-Age=${config.sessionDays * 86400}; HttpOnly; SameSite=Lax`);
  redirect(res, '/dashboard', 'login', null);
});

app.post('/api/auth/logout', (req, res) => {
  const token = readCookie(req, 'cw_t');
  if (token) store.deleteSession(token);
  res.setHeader('Set-Cookie', 'cw_t=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax');
  res.redirect('/');
});

// ============================================================
//  API — État courant (raffraîchir solde sans recharger)
// ============================================================
app.get('/api/me', (req, res) => {
  const u = userOf(req);
  if (!u) return res.json({ ok: false });
  res.json({ ok: true, user: { balance: u.balance, clicksToday: u.clicksToday, totalEarned: u.totalEarned } });
});

// ============================================================
//  API — Gain (clics) avec anti-triche serveur
// ============================================================
const clickStarts = new Map(); // userId|taskId => timestamp (ms)

app.post('/api/click/start', (req, res) => {
  const u = userOf(req);
  if (!u) return res.json({ ok: false, code: 'auth' });
  const task = store.getTask(String(req.body.taskId || ''));
  if (!task || task.kind !== 'click' || task.status === 'soon') return res.json({ ok: false, code: 'invalid' });
  const c1 = store.inCooldown('click_' + u.id, config.clickCooldownSec);
  const c2 = store.inCooldown('click_' + u.id + '_' + task.id, config.clickCooldownSec);
  if (c1 || c2) return res.json({ ok: false, code: 'cooldown', wait: Math.max(c1, c2) });
  // limite du jour
  const today = new Date().toISOString().slice(0, 10);
  if (u.clicksDate !== today) { u.clicksDate = today; u.clicksToday = 0; store.saveUsers(store.allUsers()); }
  if (u.clicksToday >= task.dailyCap) return res.json({ ok: false, code: 'dailylimit' });
  clickStarts.set(u.id + '|' + task.id, Date.now());
  res.json({ ok: true, need: holdFor(task), task: { reward: task.reward, title: task.title } });
});
function holdFor(task) {
  return Math.min(config.maxFakeWaitSec, Math.max(4, Math.ceil(task.reward * 100) + 2));
}

app.post('/api/click/cancel', (req, res) => {
  const u = userOf(req);
  if (!u) return res.json({ ok: false, code: 'auth' });
  const key = u.id + '|' + String(req.body.taskId || '');
  clickStarts.delete(key);
  res.json({ ok: true });
});

app.post('/api/click/finish', (req, res) => {
  const u = userOf(req);
  if (!u) return res.json({ ok: false, code: 'auth' });
  const task = store.getTask(String(req.body.taskId || ''));
  if (!task || task.kind !== 'click') return res.json({ ok: false, code: 'invalid' });
  const key = u.id + '|' + task.id;
  const started = clickStarts.get(key) || 0;
  const need = holdFor(task) * 1000;
  if (!started || Date.now() - started < need * 0.6) return res.json({ ok: false, code: 'cooldown' });
  clickStarts.delete(key);
  const r = store.redeemClick(u.id, task.id, req.ip);
  if (!r.ok) return res.json({ ok: false, code: r.code, wait: r.wait || 0 });
  const user = store.findUserById(u.id);
  res.json({ ok: true, amount: r.amount, balance: user.balance, clicksToday: user.clicksToday });
});

// ============================================================
//  API — Vidéos
// ============================================================
const videoStarts = new Map();

app.post('/api/video/start', (req, res) => {
  const u = userOf(req);
  if (!u) return res.json({ ok: false, code: 'auth' });
  const task = store.getTask(String(req.body.taskId || ''));
  if (!task || task.kind !== 'video' || task.status === 'soon') return res.json({ ok: false, code: 'invalid' });
  videoStarts.set(u.id + '|' + task.id, Date.now());
  res.json({ ok: true, duration: task.duration || 10 });
});

app.post('/api/video/done', (req, res) => {
  const u = userOf(req);
  if (!u) return res.json({ ok: false, code: 'auth' });
  const task = store.getTask(String(req.body.taskId || ''));
  if (!task || task.kind !== 'video') return res.json({ ok: false, code: 'invalid' });
  const started = videoStarts.get(u.id + '|' + task.id) || 0;
  const dur = (task.duration || 10);
  const minElapsed = dur * 0.8 * 1000;
  if (!started || Date.now() - started < minElapsed) return res.json({ ok: false, code: 'cooldown' });
  videoStarts.delete(u.id + '|' + task.id);
  const r = store.redeemVideo(u.id, task.id);
  if (!r.ok) return res.json({ ok: false, code: r.code });
  const user = store.findUserById(u.id);
  res.json({ ok: true, amount: r.amount, balance: user.balance });
});

// ============================================================
//  API — Postback des murs d'offres / réseaux vidéo
//  Exemple (offre validée par le partenaire) :
//  POST /api/postback HTTP/1.1
//  x-postback-secret: <config.postbackSecret>
//  user_id=ID&amount=0.80&offer=nom_de_l_offre&trans_id=XXX
// ============================================================
app.post('/api/postback', (req, res) => {
  const auth = req.headers['x-postback-secret'] || req.body.secret;
  if (!config.postbackSecret || auth !== config.postbackSecret) {
    return res.status(401).json({ ok: false, code: 'auth' });
  }
  const uid = String(req.body.user_id || req.body.userId || '');
  const amount = parseFloat(req.body.amount);
  const user = store.findUserById(uid);
  if (!user || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ ok: false, code: 'invalid' });
  }
  if (!user.active) return res.json({ ok: false, code: 'blocked' });
  store.credit(user, amount, 'offer', 'offer:' + String(req.body.offer || req.body.trans_id || 'postback'));
  store.afterReferralActivity(user, amount);
  res.json({ ok: true, balance: user.balance });
});

// ============================================================
//  API — Postback BitLabs (crédit auto quand une offre est faite)
//  À configurer dans BitLabs → Apps → ton app → Integration :
//  URL : https://TON-DOMAINE/api/postback/bitlabs
//  ?uid=[%UID%]&val=[%VAL%]&tx=[%TX%]&type=[%TYPE%]
// ============================================================
app.get('/api/postback/bitlabs', (req, res) => {
  const uid = String(req.query.uid || req.query.UID || '');
  const rawVal = String(req.query.val || req.query.VAL || '');
  const tx = String(req.query.tx || req.query.TX || '');
  const type = String(req.query.type || req.query.TYPE || '').toUpperCase();
  const amount = parseFloat(rawVal);

  if (!config.bitlabsToken) return res.status(403).send('disabled');
  if (!uid || isNaN(amount) || amount <= 0) return res.status(400).send('bad request');

  // Vérif du hash signé si un App Secret est renseigné
  if (config.bitlabsSecret && req.query.hash) {
    const crypto = require('crypto');
    const host = req.protocol + '://' + req.get('host');
    const full = host + req.originalUrl.replace(/([?&])hash=[^&]*/, '$1'); // hash exclu du calcul
    const h = crypto.createHmac('sha1', config.bitlabsSecret).update(full).digest('hex');
    if (h !== String(req.query.hash).toLowerCase()) return res.status(403).send('bad hash');
  }

  // TYPE : on ne crédite que les conversions COMPLETE (pas les SCREENOUT sauf règle interne)
  if (type && type !== 'COMPLETE') return res.send('ok'); // screenout = pas de crédit

  const user = store.findUserById(uid);
  if (!user) return res.send('ok'); // utilisateur inconnu → 200 pour éviter les retries
  if (!user.active) return res.send('ok');

  // Anti-doublon : même transaction déjà créditée ?
  const txs = store.allTx();
  const dup = txs.some(x => x.note === 'bitlabs:' + tx);
  if (dup) return res.send('ok');

  store.credit(user, amount, 'offer', 'bitlabs:' + tx);
  store.afterReferralActivity(user, amount);
  res.send('ok');
});

// ============================================================
//  API — Postback AdGem (crédit auto quand une offre est faite)
//  AdGem envoie (GET ou POST) : player_id, amount, payout, ...,
//  request_id (uuid unique) + verifier (HMAC-SHA256 si clé activée)
//  Dans AdGem → Properties & Apps → Edit → Postback Options →
//  activer "Server Postback" (GET) avec cette URL :
//   https://TON-DOMAINE/api/postback/adgem
// ============================================================
const crypto = require('crypto');

function getParam(req, key) {
  const v = req.query[key] != null ? req.query[key]
        : (req.body && req.body[key] != null ? req.body[key] : null);
  return v == null ? '' : String(v);
}

function handleAdGemPostback(req, res) {
  const requestId = getParam(req, 'request_id');
  const verifier = getParam(req, 'verifier');
  const playerId = getParam(req, 'player_id') || getParam(req, 'playerid') || getParam(req, 'user_id');
  let amount = parseFloat(getParam(req, 'amount'));
  const payout = parseFloat(getParam(req, 'payout'));
  if (isNaN(amount) || amount < 0) {
    // si pas d'amount (install event), on utilise le payout converti
    amount = isNaN(payout) ? 0 : payout;
  }
  const divisor = config.adgemAmountDivisor || 1;

  // Vérification du hash si une Postback Key a été renseignée
  if (config.adgemPostbackKey && verifier) {
    const host = req.protocol + '://' + req.get('host');
    const full = host + req.originalUrl;
    // on retire le paramètre verifier pour recalculer comme AdGem
    const hashless = full.split('&verifier=')[0].split('?verifier=')[0];
    const h = crypto.createHmac('sha256', config.adgemPostbackKey).update(hashless).digest('hex');
    if (h.toLowerCase() !== String(verifier).toLowerCase()) {
      return res.status(422).send('invalid verifier');
    }
  }

  if (!playerId) return res.status(200).send('OK'); // pas de user → on ignore sans retry
  const user = store.findUserById(playerId);
  if (!user || !user.active) return res.status(200).send('OK');

  const realAmount = Math.round(amount / divisor * 100) / 100;
  if (realAmount <= 0) return res.status(200).send('OK');

  // Anti-doublon : un même request_id ne crédite qu'une fois
  const tag = 'adgem:' + (requestId || (playerId + ':' + amount + ':' + payout));
  if (store.allTx().some(x => x.note === tag)) return res.status(200).send('OK');

  store.credit(user, realAmount, 'offer', tag);
  store.afterReferralActivity(user, realAmount);
  res.status(200).send('OK');
}

app.get('/api/postback/adgem', handleAdGemPostback);
app.post('/api/postback/adgem', handleAdGemPostback);

// ============================================================
//  API — Retrait
// ============================================================
app.post('/api/withdraw', (req, res) => {
  const lang = currentLang(req); const u = userOf(req);
  if (!u) return redirect(res, '/login');
  const r = store.requestWithdrawal(u, req.body.payEmail);
  redirect(res, '/withdraw', r.ok ? 'withdrawn' : null, r.ok ? null : r.code);
});

// ============================================================
//  ADMIN — payouts / users / tasks
// ============================================================
function guardAdmin(user, res) {
  if (!user || !user.isAdmin) { res.status(403); return false; }
  return true;
}

app.get('/admin', (req, res) => {
  const lang = currentLang(req); const user = userOf(req);
  if (!guardAdmin(user, res)) return render(req, res, { lang, content: `<div class="flash bad">403</div>` });
  const t_ = (k, v) => t(lang, k, v);
  const tab = req.query.tab || 'payouts';
  const wds = store.allWithdrawals().sort((a, b) => b.at.localeCompare(a.at));
  const users = store.allUsers();
  const payRows = wds.map(w => {
    const u = users.find(x => x.id === w.userId);
    const st = t_('wd' + w.status.charAt(0).toUpperCase() + w.status.slice(1));
    return `<tr>
      <td class="muted small">${esc(w.id.slice(0, 8))}</td>
      <td>${esc(u ? u.email : '?')}</td>
      <td class="r"><b>${esc(money(w.amount, lang))}</b></td>
      <td class="muted small">${esc(w.payEmail)}</td>
      <td>${w.status === 'pending' ? '<span class="chip warn">' + esc(st) + '</span>' : w.status === 'paid' ? '<span class="chip green">' + esc(st) + '</span>' : '<span class="chip soon">' + esc(st) + '</span>'}</td>
      <td class="muted small">${esc(shortDate(w.at, lang))}</td>
      <td class="r">
        ${w.status === 'pending' ? `<form class="inline" method="post" action="/admin/payout/approve"><input type="hidden" name="id" value="${w.id}"><button class="btn small ok">✓ Payé</button></form>
        <form class="inline" method="post" action="/admin/payout/reject"><input type="hidden" name="id" value="${w.id}"><button class="btn small ghost">✕</button></form>` : '—'}
      </td></tr>`;
  }).join('') || `<tr><td colspan="7" class="muted">Aucun retrait.</td></tr>`;

  const userRows = users.map(u => `<tr>
      <td>${esc(u.name)}</td>
      <td class="muted small">${esc(u.email)} ${u.isAdmin ? '⭐' : ''}</td>
      <td class="r"><b>${esc(money(u.balance, lang))}</b></td>
      <td class="r muted">${esc(money(u.totalEarned, lang))}</td>
      <td class="r muted">${u.clicksToday}</td>
      <td>${u.active ? '<span class="chip green">actif</span>' : '<span class="chip soon">bloqué</span>'}</td>
      <td>
        <form class="inline" method="post" action="/admin/user/credit"><input type="hidden" name="userId" value="${u.id}"><input class="mini-in" name="amount" type="number" step="0.01" placeholder="+0.00"><input class="mini-in" name="note" placeholder="note"><button class="btn small">Créditer</button></form>
        <form class="inline" method="post" action="/admin/user/toggle"><input type="hidden" name="userId" value="${u.id}"><button class="btn small ghost">${u.active ? 'Bloquer' : 'Réactiver'}</button></form>
      </td></tr>`).join('');

  const taskRows = store.allTasks().map(ts => `<tr>
      <td>${esc(ts.id)}</td>
      <td>${esc(ts.titleDefault)} <span class="muted small">[${ts.kind}]</span></td>
      <td><form class="inline" method="post" action="/admin/task/save"><input type="hidden" name="id" value="${ts.id}">
        <input class="mini-in" name="reward" type="number" step="0.01" value="${ts.reward}"></td>
      <td><select class="mini-in" name="status">
        <option value="active" ${ts.status === 'active' ? 'selected' : ''}>active</option>
        <option value="soon" ${ts.status === 'soon' ? 'selected' : ''}>soon</option>
      </select></td>
      <td>${ts.kind === 'click' ? `<input class="mini-in" name="dailyCap" type="number" value="${ts.dailyCap}">` : '<span class="muted small">—</span>'}</td>
      <td><button class="btn small">Enregistrer</button></form></td></tr>`).join('');

  const tabs = [['payouts', 'Retraits'], ['users', 'Utilisateurs'], ['tasks', 'Tâches']];
  const tabNav = tabs.map(([id, l]) => `<a href="/admin?tab=${id}" class="${tab === id ? 'on' : ''}">${l}</a>`).join('');
  const panel = tab === 'users'
    ? `<table class="mini full"><thead><tr><th>Nom</th><th>E-mail</th><th class="r">Solde</th><th class="r">Total</th><th class="r">Clics/j</th><th>Statut</th><th>Actions</th></tr></thead><tbody>${userRows}</tbody></table>`
    : tab === 'tasks'
      ? `<table class="mini full"><thead><tr><th>ID</th><th>Titre</th><th>Récompense</th><th>Statut</th><th>Cap/jour</th><th></th></tr></thead><tbody>${taskRows}</tbody></table>`
      : `<table class="mini full"><thead><tr><th>ID</th><th>Utilisateur</th><th class="r">Montant</th><th>PayPal</th><th>Statut</th><th>Date</th><th class="r">Action</th></tr></thead><tbody>${payRows}</tbody></table>`;

  render(req, res, {
    lang, user, active: '', title: 'Admin',
    content: `<h1>⚙️ Administration</h1>
    ${flashBanner(lang, req.query)}
    <div class="tabs">${tabNav}</div>
    <section class="card pad">${panel}</section>
    <p class="muted small">💡 Pour ajouter / retirer des tâches, modifiez le fichier <code>data/tasks.json</code> puis redémarrez le serveur.</p>`
  });
});

app.post('/admin/payout/approve', (req, res) => {
  const user = userOf(req); if (!guardAdmin(user, res)) return res.status(403).end();
  const wds = store.allWithdrawals();
  const w = wds.find(x => x.id === req.body.id);
  if (w && w.status === 'pending') { w.status = 'paid'; w.paidAt = new Date().toISOString(); db.write('withdrawals'); }
  redirect(res, '/admin?tab=payouts', 'ok');
});
app.post('/admin/payout/reject', (req, res) => {
  const user = userOf(req); if (!guardAdmin(user, res)) return res.status(403).end();
  const wds = store.allWithdrawals();
  const w = wds.find(x => x.id === req.body.id);
  if (w && w.status === 'pending') {
    w.status = 'rejected';
    const u = store.findUserById(w.userId);
    if (u) store.credit(u, w.amount + w.fee, 'withdraw', 'refund wd:' + w.id);
  }
  redirect(res, '/admin?tab=payouts', 'ok');
});
app.post('/admin/user/credit', (req, res) => {
  const user = userOf(req); if (!guardAdmin(user, res)) return res.status(403).end();
  const u = store.findUserById(req.body.userId);
  const amt = parseFloat(req.body.amount);
  if (u && !isNaN(amt)) store.credit(u, amt, 'offer', String(req.body.note || 'credit admin'));
  redirect(res, '/admin?tab=users', 'ok');
});
app.post('/admin/user/toggle', (req, res) => {
  const user = userOf(req); if (!guardAdmin(user, res)) return res.status(403).end();
  const u = store.findUserById(req.body.userId);
  if (u) { u.active = !u.active; store.saveUsers(store.allUsers()); }
  redirect(res, '/admin?tab=users', 'ok');
});
app.post('/admin/task/save', (req, res) => {
  const user = userOf(req); if (!guardAdmin(user, res)) return res.status(403).end();
  const tasks = store.allTasks();
  const ts = tasks.find(x => x.id === req.body.id);
  if (ts) {
    const r = parseFloat(req.body.reward);
    if (!isNaN(r)) ts.reward = r;
    if (['active', 'soon'].includes(req.body.status)) ts.status = req.body.status;
    const c = parseInt(req.body.dailyCap, 10);
    if (req.body.dailyCap !== '' && !isNaN(c)) ts.dailyCap = c;
    db.write('tasks');
  }
  redirect(res, '/admin?tab=tasks', 'ok');
});

// ============================================================
//  404 & démarrage
// ============================================================
app.use((req, res) => {
  const lang = currentLang(req);
  render(req, res, { lang, title: '404', content: '<h1>404</h1><p>Page introuvable.</p><a class="btn" href="/">← Accueil</a>' });
});

// ============================================================
//  Démarrage
// ============================================================
const HOST = process.env.HOST || '0.0.0.0';
const scheduler = require('./lib/scheduler.js');

app.listen(config.port, HOST, () => {
  // génération / renouvellement du contenu quotidien (pubs + vidéos)
  const n = scheduler.ensure();

  // Premier démarrage sur un hébergement neuf : crée admin + démo automatiquement
  // (sinon personne ne pourrait se connecter sur le serveur en ligne)
  if (!store.allUsers().length) {
    const seedMod = require('./lib/seed.js');
    seedMod.seedUsers();
    console.log('[seed] Compte admin créé : admin@clicwin.com / Admin@1234  → CHANGEZ-LE vite !');
    console.log('[seed] Démo : demo@clicwin.com / demo2@clicwin.com / demo1234');
  }

  console.log(`[${config.siteName}] serveur prêt → http://${HOST}:${config.port}`);
  console.log(`[scheduler] contenu du jour généré : ${n} tâche(s).`);
});

// relance le contenu si le jour a changé (vérif toutes les heures)
setInterval(() => scheduler.ensure(), 3600 * 1000).unref();
