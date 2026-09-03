// ============================================================
//  Helpers de rendu HTML partagés (mise en page, composants).
// ============================================================
'use strict';
const { t } = require('./i18n');
const config = require('./config');

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
const escAttr = esc;

function money(n, lang) {
  const cur = (config.currency && config.currency[lang]) || config.currency.en;
  return (Math.round(n * 100) / 100).toFixed(2) + ' ' + cur;
}
function badge(ok) { return ok ? 'ok' : 'no'; }

// Flux de cookies simples (lecture)
function readCookie(req, name) {
  const c = req.headers.cookie || '';
  for (const part of c.split(';')) {
    const p = part.trim();
    if (p.indexOf(name + '=') === 0) return decodeURIComponent(p.slice(name.length + 1));
  }
  return null;
}

function bootData(lang, user, extra) {
  const cur = money(0, lang).replace(/^0\.00/, '').trim();
  const obj = Object.assign({ lang, siteName: config.siteName, cur }, extra || {});
  if (user) obj.user = { id: user.id, name: user.name, email: user.email, balance: user.balance, refCode: user.refCode, isAdmin: !!user.isAdmin };
  return '<script id="boot" type="application/json">' + JSON.stringify(obj).replace(/</g, '\\u003c') + '</script>';
}

function layout({ lang, user, active, title, content, extraHead, bodyScripts }) {
  const t_ = (k, v) => t(lang, k, v);
  const pages = [
    { id: 'home', href: '/', label: user ? t_('dashboard') : t_('home') },
    { id: 'clicks', href: '/clicks', label: t_('earn'), need: true },
    { id: 'offers', href: '/offers', label: t_('offers'), need: true },
    { id: 'withdraw', href: '/withdraw', label: t_('withdraw'), need: true },
    { id: 'referrals', href: '/referrals', label: t_('referrals'), need: true },
    { id: 'help', href: '/help', label: t_('help') }
  ];
  const navItems = pages
    .filter(p => !p.need || user)
    .map(p => {
      const a = active === p.id ? ' class="on"' : '';
      return `<a href="${p.href}"${a}>${p.label}</a>`;
    })
    .join('');

  const balanceHtml = user
    ? `<div class="navbal" title="${esc(t_('earnBal'))}"><b>${esc(money(user.balance, lang))}</b></div>`
    : '';

  const right = user
    ? `<div class="navright">
        <a href="/dashboard" class="chip-user">👤 ${esc(user.name)}</a>
        ${user.isAdmin ? '<a href="/admin" class="chip-admin">⚙️ Admin</a>' : ''}
        ${balanceHtml}
        <form action="/api/auth/logout" method="post" class="inline"><button class="btn ghost sm">${esc(t_('logout'))}</button></form>
       </div>`
    : `<div class="navright">
        <a href="/login" class="btn ghost sm">${esc(t_('login'))}</a>
        <a href="/signup" class="btn primary sm">${esc(t_('signup'))}</a>
       </div>`;

  const langSwitch = `<div class="langswitch"><a href="/switch-lang?to=${lang === 'fr' ? 'en' : 'fr'}">${esc(t_('changeLang'))} 🌐</a></div>`;

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)} — ${esc(config.siteName)}</title>
<meta name="description" content="${esc(config.tagline[lang] || config.tagline.en)}">
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#10b981"/><text x="50" y="68" font-size="52" text-anchor="middle" fill="white" font-family="Arial" font-weight="bold">₵</text></svg>')}">
<link rel="stylesheet" href="/css/style.css">
${extraHead || ''}
</head>
<body>
<header class="top">
  <div class="wrap topin">
    <a class="brand" href="/"><span class="logo">₵</span> ${esc(config.siteName)}</a>
    <nav class="mainnav">${navItems}</nav>
    ${balanceHtml}
    ${right}
  </div>
  <div class="mnav">
    <div class="wrap">
      <a href="/">${esc(user ? t_('dashboard') : t_('home'))}</a>
      ${user ? `<a href="/clicks">${esc(t_('earn'))}</a><a href="/offers">${esc(t_('offers'))}</a><a href="/withdraw">${esc(t_('withdraw'))}</a><a href="/referrals">${esc(t_('referrals'))}</a>` : ''}
      <a href="/help">${esc(t_('help'))}</a>
    </div>
  </div>
</header>
<main class="wrap page">
${content}
</main>
<footer class="foot">
  <div class="wrap">
    <div>
      <div class="fbrand"><span class="logo">₵</span> ${esc(config.siteName)}</div>
      <p class="muted small">${esc(t_('footerAbout'))}</p>
      <div class="footlegal">${esc(t_('footerLegal'))} · © ${new Date().getFullYear()} ${esc(config.siteName)}</div>
      ${langSwitch}
    </div>
    <div class="fcols">
      <div class="fcol"><b>${esc(t_('footerLinks'))}</b>
        <a href="/help">${esc(t_('help'))}</a>
        <a href="/login">${esc(t_('login'))}</a>
        <a href="/signup">${esc(t_('signup'))}</a>
      </div>
      <div class="fcol"><b>${esc(t_('earn'))}</b>
        <a href="/clicks">${esc(t_('clicks'))}</a>
        <a href="/videos">${esc(t_('videos'))}</a>
        <a href="/offers">${esc(t_('offers'))}</a>
      </div>
    </div>
  </div>
</footer>
${bootData(lang, user, { active })}
<script src="/js/app.js"></script>
${bodyScripts || ''}
<div id="toasts"></div>
</body>
</html>`;
}

function balanceCard(lang, user) {
  const t_ = (k, v) => t(lang, k, v);
  return `<section class="card hero-bal">
    <div>
      <div class="kicker">${esc(t_('earnBal'))}</div>
      <div class="bigbalance">${esc(money(user.balance, lang))}</div>
      <div class="muted small">${esc(t_('clicksToday'))}: <b>${user.clicksToday}</b></div>
    </div>
    <div class="hero-actions">
      <a class="btn primary" href="/clicks">${esc(t_('goClicks'))}</a>
      <a class="btn" href="/offers">${esc(t_('goOffers'))}</a>
    </div>
  </section>`;
}

module.exports = { esc, escAttr, money, readCookie, bootData, layout, balanceCard, badge };
