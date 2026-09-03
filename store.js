// ============================================================
//  Logique métier : utilisateurs, sessions, tâches, crédits,
//  parrainage, retraits. Stockage JSON atomique.
// ============================================================
'use strict';
const crypto = require('crypto');
const db = require('./db');
const config = require('./config');

function hashPassword(pw, salt) {
  return crypto.createHash('sha256').update(salt + '::' + pw).digest('hex');
}

function uid(len = 16) {
  return crypto.randomBytes(Math.ceil(len / 2)).toString('hex').slice(0, len);
}

function newToken() {
  return uid(32);
}

function dateStr(d) {
  return (d || new Date()).toISOString();
}

// ------------- Utilisateurs -------------
function allUsers() {
  return db.read('users');
}
function saveUsers(u) {
  db.write('users');
  return u;
}
function findUserByEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  return allUsers().find(u => u.email === e);
}
function findUserById(id) {
  return allUsers().find(u => u.id === id);
}

function createUser(email, password, name, lang) {
  const users = allUsers();
  const id = uid(10);
  const salt = uid(8);
  const now = new Date();
  const user = {
    id,
    email: email.trim().toLowerCase(),
    salt,
    pass: hashPassword(password, salt),
    name: (name || 'Membre').trim().slice(0, 40),
    lang: config.langs.includes(lang) ? lang : config.defaultLang,
    balance: 0,             // crédits disponibles
    totalEarned: 0,
    refBy: null,            // id du parrain
    refCode: uid(6),        // code de parrainage public
    clicksToday: 0,
    clicksDate: dateStr(now).slice(0, 10),
    videosToday: 0,
    videosDate: dateStr(now).slice(0, 10),
    active: true,
    isAdmin: false,
    createdAt: dateStr(now),
    lastSeen: dateStr(now)
  };
  users.push(user);
  saveUsers(users);
  return user;
}

// ------------- Sessions -------------
function allSessions() {
  return db.read('sessions');
}
function createSession(userId) {
  const token = newToken();
  const s = { token, userId, createdAt: dateStr(), expiresAt: dateStr(new Date(Date.now() + config.sessionDays * 864e5)) };
  const sessions = allSessions();
  sessions.push(s);
  db.write('sessions');
  return token;
}
function findSession(token) {
  if (!token) return null;
  return allSessions().find(s => s.token === token && new Date(s.expiresAt) > new Date());
}
function deleteSession(token) {
  const sessions = allSessions();
  const i = sessions.findIndex(s => s.token === token);
  if (i >= 0) sessions.splice(i, 1);
  db.write('sessions');
}

// ------------- Transactions -------------
function allTx() {
  return db.read('tx');
}
function addTx(userId, type, amount, note) {
  const txs = allTx();
  txs.push({ id: uid(12), userId, type, amount, note: note || '', at: dateStr() });
  db.write('tx');
}
function userTx(userId, limit = 200) {
  return allTx().filter(t => t.userId === userId).sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

// Nombre de fois où l'utilisateur a complété UNE tâche aujourd'hui
// (les transactions stockent note = '<type>:<taskId>')
function usedTaskToday(userId, type, taskId) {
  const day = dateStr().slice(0, 10);
  const prefix = type + ':' + taskId;
  let n = 0;
  for (const x of allTx()) {
    if (x.userId === userId && x.type === type && x.at.slice(0, 10) === day && x.note === prefix) n++;
  }
  return n;
}

function credit(user, amount, type, note) {
  user.balance = Math.round((user.balance + amount) * 100) / 100;
  if (amount > 0) user.totalEarned = Math.round((user.totalEarned + amount) * 100) / 100;
  addTx(user.id, type, amount, note);
  saveUsers(allUsers());
}

// ------------- Anti-triche (cache mémoire des horodatages) -------------
const lastAction = new Map(); // key => ts

function inCooldown(key, seconds) {
  const now = Date.now();
  const prev = lastAction.get(key) || 0;
  if (now - prev < seconds * 1000) {
    return Math.ceil((prev + seconds * 1000 - now) / 1000);
  }
  return 0;
}
function markAction(key) {
  lastAction.set(key, Date.now());
}

// Limite par IP (journal quotidien léger)
function ipClicksToday(ip) {
  return db.read('ipclicks').filter(r => r.ip === ip && r.day === dateStr().slice(0, 10)).length;
}
function countIpClick(ip) {
  const rows = db.read('ipclicks');
  rows.push({ ip, day: dateStr().slice(0, 10), at: dateStr() });
  if (rows.length > 20000) rows.splice(0, rows.length - 20000);
  db.write('ipclicks');
}

// ------------- Tâches -------------
function allTasks() {
  return db.read('tasks');
}

// Le « statut » peut être: active | soon
function listClicksTasks() {
  return allTasks().filter(t => t.kind === 'click');
}
function listVideoTasks() {
  return allTasks().filter(t => t.kind === 'video');
}
function listOfferTasks() {
  return allTasks().filter(t => t.kind === 'offer');
}

function getTask(id) {
  return allTasks().find(t => t.id === id);
}

// Génère les clics d'un utilisateur (filtre les "soon", sert l'état de cooldown)
function userClicksView(user, lang) {
  return listClicksTasks()
    .filter(t => t.status !== 'soon')
    .map(t => ({
      id: t.id,
      kind: t.kind,
      title: (t.title && t.title[lang]) || t.titleDefault,
      reward: t.reward,
      status: t.status,
      color: t.color || '#2563eb',
      usedToday: usedTaskToday(user.id, 'click', t.id),
      cap: t.dailyCap || config.clickCapPerTask,
      cd: inCooldown('click_' + user.id + '_' + t.id, config.clickCooldownSec),
      cdGlobal: inCooldown('click_' + user.id, config.clickCooldownSec)
    }));
}

// Clic récompensé côté serveur : validations anti-triche puis crédit.
function redeemClick(userId, taskId, ip) {
  const user = findUserById(userId);
  const task = getTask(taskId);
  if (!user || !task || task.kind !== 'click' || task.status === 'soon') return { ok: false, code: 'invalid' };
  if (!user.active) return { ok: false, code: 'blocked' };

  // cooldown global + par tâche
  const c1 = inCooldown('click_' + user.id, config.clickCooldownSec);
  const c2 = inCooldown('click_' + user.id + '_' + task.id, config.clickCooldownSec);
  if (c1 || c2) return { ok: false, code: 'cooldown', wait: Math.max(c1, c2) };

  // limite quotidienne par tâche (chaque pub a son propre quota par jour)
  const used = usedTaskToday(user.id, 'click', task.id);
  if (used >= (task.dailyCap || config.clickCapPerTask)) return { ok: false, code: 'dailylimit' };

  // limite par IP
  if (ip && config.ipDailyCap > 0 && ipClicksToday(ip) >= config.ipDailyCap) {
    return { ok: false, code: 'iplimit' };
  }

  // compteur global quotidien (affiché à l'utilisateur + activation parrain)
  const today = dateStr().slice(0, 10);
  if (user.clicksDate !== today) { user.clicksToday = 0; user.clicksDate = today; }

  // crédit
  markAction('click_' + user.id);
  markAction('click_' + user.id + '_' + task.id);
  if (ip) countIpClick(ip);
  user.clicksToday += 1;
  credit(user, task.reward, 'click', 'click:' + task.id);
  afterReferralActivity(user, task.reward);
  return { ok: true, amount: task.reward, balance: user.balance, clicksToday: user.clicksToday };
}

// Vidéo terminée (délai vérifié côté client + serveur minimal)
function redeemVideo(userId, taskId) {
  const user = findUserById(userId);
  const task = getTask(taskId);
  if (!user || !task || task.kind !== 'video') return { ok: false, code: 'invalid' };
  if (!user.active) return { ok: false, code: 'blocked' };
  if (task.status === 'soon') return { ok: false, code: 'invalid' };

  // plafond global quotidien de vidéos
  const today = dateStr().slice(0, 10);
  if (user.videosDate !== today) { user.videosToday = 0; user.videosDate = today; }
  if (user.videosToday >= (config.maxVideosPerDay || 60)) return { ok: false, code: 'dailylimit' };

  // plafond quotidien par vidéo
  const used = usedTaskToday(user.id, 'video', task.id);
  if (used >= (task.dailyCap || config.videoCapPerTask)) return { ok: false, code: 'dailylimit' };

  user.videosToday += 1;
  credit(user, task.reward, 'video', 'video:' + task.id);
  afterReferralActivity(user, task.reward);
  return { ok: true, amount: task.reward, balance: user.balance };
}

// Commissions de parrainage reversées au parrain à chaque gain du filleul
// + bonus d'activation unique quand le filleul devient actif.
function afterReferralActivity(user, amount) {
  if (!user.refBy) return;
  const sponsor = findUserById(user.refBy);
  if (!sponsor || !sponsor.active) return;
  // commission % sur le gain du filleul
  const comm = Math.round(amount * config.refPercent / 100 * 100) / 100;
  if (comm > 0) credit(sponsor, comm, 'ref', 'comm:' + (user.email || user.id));
  // bonus d'activation (une seule fois)
  if (!user.refBonusGiven && user.clicksToday >= config.refActiveClicks) {
    user.refBonusGiven = true;
    credit(sponsor, config.refReward, 'refbonus', 'ref:' + (user.email || user.id));
  }
}

// ------------- Retraits -------------
function allWithdrawals() {
  return db.read('withdrawals');
}
function userWithdrawals(userId) {
  return allWithdrawals().filter(w => w.userId === userId).sort((a, b) => b.at.localeCompare(a.at));
}
function requestWithdrawal(user, payEmail) {
  const user2 = findUserById(user.id);
  if (!user2.active) return { ok: false, code: 'blocked' };
  if (user2.balance < config.minWithdraw) return { ok: false, code: 'amount' };
  const email = String(payEmail || '').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, code: 'email' };
  const fee = config.feePercent > 0 ? Math.round(user2.balance * config.feePercent / 100 * 100) / 100 : 0;
  const net = Math.round((user2.balance - fee) * 100) / 100;
  const w = {
    id: uid(10),
    userId: user2.id,
    amount: net,
    fee,
    payEmail: email,
    status: 'pending',      // pending | paid | rejected
    at: dateStr()
  };
  const wds = allWithdrawals();
  wds.push(w);
  db.write('withdrawals');
  // débite le solde
  credit(user2, -user2.balance, 'withdraw', 'wd:' + w.id);
  return { ok: true, wd: w };
}

// ------------- Stats globales -------------
function globalStats() {
  const users = allUsers();
  const txs = allTx();
  let paid = 0;
  for (const t of txs) {
    if (t.type === 'withdraw' && t.amount < 0) paid += -t.amount;
  }
  let clicks = 0;
  for (const t of txs) if (t.type === 'click') clicks += 1;
  return {
    members: users.length,
    clicks,
    paid: Math.round(paid * 100) / 100
  };
}

function fmt(n, lang) {
  return (Math.round(n * 100) / 100).toFixed(2);
}

module.exports = {
  // users
  allUsers, findUserById, findUserByEmail, createUser,
  saveUsers,
  hashPassword,
  // sessions
  createSession, findSession, deleteSession, newToken,
  // tx & credit
  allTx, addTx, userTx, credit,
  // cooldown / anti-cheat
  inCooldown, markAction, ipClicksToday, countIpClick,
  usedTaskToday,
  // tasks
  allTasks, getTask, userClicksView, listVideoTasks, listOfferTasks, listClicksTasks,
  redeemClick, redeemVideo,
  // referrals
  afterReferralActivity,
  // withdrawals
  allWithdrawals, userWithdrawals, requestWithdrawal,
  // misc
  globalStats, fmt, dateStr, uid
};
