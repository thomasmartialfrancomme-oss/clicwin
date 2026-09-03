// ============================================================
//  Données de démonstration : utilisateurs, historique.
//  Les TÂCHES (clics + vidéos) sont générées automatiquement
//  par lib/scheduler.js au démarrage du serveur.
//  Lancer :  npm run seed   (ne recrée rien si présent)
// ============================================================
'use strict';
const fs = require('fs');
const db = require('./db');
const store = require('./store');

function touch(name) {
  db.ensureFile(name);
}
function isEmpty(name) {
  const p = db.path(name);
  if (!fs.existsSync(p)) return true;
  return JSON.parse(fs.readFileSync(p, 'utf8')).length === 0;
}

// --- Utilisateurs de démo ----------------------------------------------
function seedUsers() {
  const users = store.allUsers();
  if (users.length) return;

  const admin = store.createUser('admin@clicwin.com', 'Admin@1234', 'Admin', 'fr');
  admin.isAdmin = true;
  store.saveUsers(users);

  const alice = store.createUser('demo@clicwin.com', 'demo1234', 'Alicia', 'fr');
  const bob = store.createUser('demo2@clicwin.com', 'demo1234', 'Bob', 'en');
  bob.refBy = alice.id;

  // Historique d'activité pour la démo
  const ts = new Date();
  const daysAgo = (n) => new Date(ts.getTime() - n * 864e5).toISOString();
  const raw = db.read('tx');
  raw.splice(0, raw.length);
  const push = (userId, type, amount, note, at) => raw.push({ id: store.uid(12), userId, type, amount, note, at });
  push(alice.id, 'signup', 0.5, 'signup', daysAgo(12));
  push(alice.id, 'click', 0.03, 'click', daysAgo(12));
  push(alice.id, 'video', 0.25, 'video', daysAgo(11));
  push(alice.id, 'click', 0.02, 'click', daysAgo(10));
  push(bob.id, 'signup', 0.5, 'signup', daysAgo(8));
  push(alice.id, 'refbonus', 0.2, 'refbonus:bob', daysAgo(8));
  push(alice.id, 'click', 0.04, 'click', daysAgo(9));
  push(alice.id, 'video', 0.4, 'video', daysAgo(9));
  push(alice.id, 'offer', 0.5, 'offer partner', daysAgo(7));
  push(alice.id, 'withdraw', -0.5, 'withdraw', daysAgo(2));
  push(alice.id, 'click', 0.05, 'click', daysAgo(1));
  push(alice.id, 'video', 0.25, 'video', daysAgo(1));
  push(bob.id, 'click', 0.03, 'click', daysAgo(1));
  db.write('tx');

  // Solde = somme des transactions
  let sum = 0;
  for (const t of raw) if (t.userId === alice.id) sum += t.amount;
  alice.balance = Math.round(sum * 100) / 100;
  alice.totalEarned = 0;
  for (const t of raw) if (t.userId === alice.id && t.amount > 0) alice.totalEarned += t.amount;
  alice.totalEarned = Math.round(alice.totalEarned * 100) / 100;

  let sum2 = 0, earn2 = 0;
  for (const t of raw) if (t.userId === bob.id) { sum2 += t.amount; if (t.amount > 0) earn2 += t.amount; }
  bob.balance = Math.round(sum2 * 100) / 100;
  bob.totalEarned = Math.round(earn2 * 100) / 100;
  store.saveUsers(users);

  // Un retrait payé pour l'historique d'Alice
  const wds = db.read('withdrawals');
  wds.push({ id: 'wd-demo1', userId: alice.id, amount: 0.5, fee: 0, payEmail: 'demo@paypal.fr', status: 'paid', at: daysAgo(2) });
  db.write('withdrawals');
}

module.exports = { seedUsers };

// ---------- Exécution directe ----------
if (require.main === module) {
  for (const f of ['users', 'sessions', 'tx', 'tasks', 'withdrawals', 'ipclicks']) touch(f);
  let created = [];
  if (isEmpty('users')) { seedUsers(); created.push('utilisateurs de démo'); }
  const sched = require('./scheduler');
  const n = sched.ensure();
  if (n) created.push('tâches générées (' + n + ')');
  console.log('[seed] Créé : ' + (created.length ? created.join(', ') : 'rien (déjà présent)'));
  console.log('[seed] Compte admin : admin@clicwin.com  (mot de passe affiché à la 1re création uniquement)');
  console.log('[seed] Comptes démo : demo@clicwin.com / demo2@clicwin.com  →  mot de passe : demo1234');
}
