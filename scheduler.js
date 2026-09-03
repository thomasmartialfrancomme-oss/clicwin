// ============================================================
//  Générateur AUTOMATIQUE de tâches quotidiennes
//  Objectif : un site toujours plein de pubs à cliquer / vidéos
//  à regarder, renouvelé tout seul chaque jour.
//  - Ne touche pas aux tâches « manual » ajoutées par l'admin.
//  - Se relance à chaque boot + toutes les heures (changement de jour).
//  Lancement manuel :  npm run tasks
// ============================================================
'use strict';
const db = require('./db');
const config = require('./config');

const CLICK_CAMPAIGNS = [
  ['Promo Supermarché', 'Grocery promo'], ['Offre Télécom', 'Telecom offer'],
  ['App Fitness — Essai', 'Fitness app — Trial'], ['Boutique Mode — −30 %', 'Fashion shop — −30%'],
  ['Jeu Mobile — Nouveauté', 'Mobile game — New'], ['Comparateur Assurance', 'Insurance comparator'],
  ['Livraison Repas — Offre', 'Meal delivery — Offer'], ['Banque en Ligne — Bonus', 'Online bank — Bonus'],
  ['Service Streaming', 'Streaming service'], ['Formation en Ligne', 'Online course'],
  ['Cosmétique — Promo', 'Cosmetics — Promo'], ['Électroménager — Soldes', 'Appliances — Sale'],
  ['Voyage — Réduction', 'Travel — Discount'], ['Énergie Verte — Souscription', 'Green energy — Signup']
];
const CLICK_REWARDS = [0.02, 0.03, 0.025, 0.04, 0.03, 0.05, 0.035, 0.04, 0.06, 0.045, 0.05, 0.07, 0.08, 0.10];
const CLICK_COLORS = ['#2563eb', '#0891b2', '#7c3aed', '#db2777', '#059669', '#d97706', '#0d9488', '#4f46e5',
  '#dc2626', '#9333ea', '#0284c7', '#ea580c', '#16a34a', '#e11d48'];

const VIDEO_POOL = [
  { src: '/media/demo1.mp4', dur: 10 }, { src: '/media/demo2.mp4', dur: 10 },
  { src: '/media/v3.mp4', dur: 8 }, { src: '/media/v4.mp4', dur: 8 },
  { src: '/media/v5.mp4', dur: 5 }, { src: '/media/v6.mp4', dur: 10 }, { src: '/media/v7.mp4', dur: 12 }
];
const VIDEO_REWARDS = [0.25, 0.40, 0.30, 0.50, 0.35, 0.60, 0.45, 0.55, 0.70, 0.40, 0.65, 0.50];

function today() { return new Date().toISOString().slice(0, 10); }
function dayIndex() {
  const now = new Date();
  return Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 864e5);
}

function generate(kind, n, offset, todayStr, richness) {
  const tasks = [];
  const idx = dayIndex() + offset;
  for (let i = 0; i < n; i++) {
    const j = (idx + i) % CLICK_CAMPAIGNS.length;
    if (kind === 'click') {
      tasks.push({
        id: 'g' + todayStr.replace(/-/g, '') + 'c' + i,
        kind: 'click', status: 'active', genDate: todayStr,
        title: { fr: CLICK_CAMPAIGNS[j][0], en: CLICK_CAMPAIGNS[j][1] },
        titleDefault: CLICK_CAMPAIGNS[j][1],
        reward: Math.round(CLICK_REWARDS[j] * richness * 100) / 100,
        dailyCap: config.clickCapPerTask, color: CLICK_COLORS[j]
      });
    } else {
      const v = VIDEO_POOL[(idx + i) % VIDEO_POOL.length];
      tasks.push({
        id: 'g' + todayStr.replace(/-/g, '') + 'v' + i,
        kind: 'video', status: 'active', genDate: todayStr,
        title: { fr: 'Vidéo sponsorisée n°' + (i + 1), en: 'Sponsored video #' + (i + 1) },
        titleDefault: 'Sponsored video #' + (i + 1),
        reward: Math.round(VIDEO_REWARDS[i % VIDEO_REWARDS.length] * richness * 100) / 100,
        src: v.src, duration: v.dur, dailyCap: config.videoCapPerTask, color: '#dc2626'
      });
    }
  }
  return tasks;
}

function ensureOfferDemoTasks(list) {
  if (list.some(t => t.kind === 'offer')) return;
  const offers = [
    { id: 'of1', kind: 'offer', status: 'soon', reward: 1.5, color: '#16a34a', title: { fr: 'Sondage rémunéré (5–10 min)', en: 'Paid survey (5–10 min)' }, titleDefault: 'Paid survey' },
    { id: 'of2', kind: 'offer', status: 'soon', reward: 2.5, color: '#0891b2', title: { fr: 'Télécharger une app', en: 'Download an app' }, titleDefault: 'App download' },
    { id: 'of3', kind: 'offer', status: 'soon', reward: 5, color: '#7c3aed', title: { fr: 'Essai gratuit partenaire', en: 'Free partner trial' }, titleDefault: 'Free trial' },
    { id: 'of4', kind: 'offer', status: 'soon', reward: 10, color: '#db2777', title: { fr: 'Offre « haut de gamme »', en: 'High-value offer' }, titleDefault: 'High-value offer' }
  ];
  for (const o of offers) { o.genDate = 'static'; list.push(o); }
}

// -------- point d'entrée ----------
function ensure() {
  const t = today();
  const list = db.read('tasks');   // tableau en cache — on le mute pour que db.write fonctionne
  if (!Array.isArray(list)) return 0;

  // Nettoyage : on garde les tâches manuelles, les offres info, et le contenu d'aujourd'hui.
  // Les anciennes générations (et l'ancienne démo datée d'un autre jour) partent tout seules.
  const kept = list.filter(x =>
    x.manual === true ||        // ajoutées par l'admin → jamais touchées
    x.kind === 'offer' ||       // page offres (statut 'soon' tant qu'aucun wall)
    x.genDate === t             // généré aujourd'hui
  );
  const genClicks = kept.filter(x => x.kind === 'click').length;
  const genVideos = kept.filter(x => x.kind === 'video').length;
  const needClick = Math.max(0, config.dailyClicks - genClicks);
  const needVideo = Math.max(0, config.dailyVideos - genVideos);

  if (needClick > 0 || needVideo > 0) {
    const add = [];
    if (needClick > 0) add.push(...generate('click', needClick, 0, t, config.rewardScale || 1));
    if (needVideo > 0) add.push(...generate('video', needVideo, 7, t, config.rewardScale || 1));
    ensureOfferDemoTasks(add);
    // mutation en place du tableau en cache (db.write écrit ce tableau)
    list.splice(0, list.length, ...kept, ...add);
    db.write('tasks');
    return needClick + needVideo;
  }
  return 0;
}

if (require.main === module) {
  const n = ensure();
  const tasks = db.read('tasks');
  const active = tasks.filter(x => x.status === 'active');
  console.log('[scheduler] généré : ' + n + ' tâche(s) → ' +
    active.filter(x => x.kind === 'click').length + ' clics actifs, ' +
    active.filter(x => x.kind === 'video').length + ' vidéos actives, ' +
    tasks.filter(x => x.kind === 'offer').length + ' offres info.');
}

module.exports = { ensure, today };
