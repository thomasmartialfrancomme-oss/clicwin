// ============================================================
//  CLICWIN — Configuration centrale
//  Tu peux modifier ces valeurs librement.
// ============================================================
'use strict';
const path = require('path');

const config = {
  // Port du serveur web
  port: parseInt(process.env.PORT || '3000', 10),

  // Chemins
  dataDir: path.join(__dirname, '..', 'data'),
  publicDir: path.join(__dirname, '..', 'public'),

  // Nom de la plateforme (affiché partout)
  siteName: 'CliCWin',
  tagline: { fr: 'Gagnez en cliquant, en regardant et en jouant', en: 'Earn by clicking, watching & playing' },

  // Langue par défaut + langues proposées
  defaultLang: 'fr',
  langs: ['fr', 'en'],

  // Monnaie affichée (symbole). Tu peux passer à €, $, ...
  currency: { fr: '€', en: '$' },

  // Bonus de bienvenue à l'inscription (0 = aucun)
  welcomeBonus: 0,

  // Limite minimale de retrait (en crédits = centimes)
  minWithdraw: 1,           // 1 crédit = 0,01 € — paramétrable
  feePercent: 0,            // commission de retrait (0 = gratuite)
  paypalEmail: 'paiement@exemple.com',

  // Règles anti-triche
  clickCooldownSec: 10,     // délai minimal entre 2 clics récompensés
  videoCooldownSec: 5,      // délai avant de pouvoir relancer une vidéo
  ipDailyCap: 200,          // clics max / jour / IP (anti-bot)
  maxFakeWaitSec: 30,       // durée max de la « pub » de démo (sécurité)

  // Contenu AUTO renouvelé chaque jour (lib/scheduler.js)
  dailyClicks: 14,          // nb de pubs différentes à cliquer par jour
  dailyVideos: 10,          // nb de vidéos sponsorisées par jour
  clickCapPerTask: 10,      // clics max par membre sur UNE pub / jour
  videoCapPerTask: 5,       // visionnages max par membre sur UNE vidéo / jour
  maxVideosPerDay: 60,      // plafond global de vidéos vues / jour / membre
  rewardScale: 1,           // coefficient des récompenses (1 = normal)

  // Partenariats (offreurs). ON = le site intègre les walls quand tu as tes clés.
  offerwallMode: 'live',    // 'demo' | 'live' (voir README — LIVE + clés requises)

  // BitLabs — mur d'offres web (https://web.bitlabs.ai/?token=...&uid=...)
  bitlabsToken: '26fef21-41a6-4699-87c1-f177e0498d51',  // ← App/API Token BitLabs
  bitlabsSecret: '',         // ← App Secret (optionnel, pour vérifier les postbacks signés)
  bitlabsWallUrl: 'https://web.bitlabs.ai/',

  // AdGem — offerwall web
  adgemMode: 'on',           // 'on' | 'off' (on dès que la propriété est créée)
  adgemAppId: 'hafda01h7378ale019h6ejb7',   // ← App/Property ID AdGem (donné par leur dashboard)
  adgemPostbackKey: '',      // ← "Postback Key" (secret) : à me donner pour la vérif des notifications
  adgemAmountDivisor: 1,     // si AdGem envoie des "points" et pas des €, mettre le diviseur
  refPercent: 10,           // % reversé au parrain sur CHAQUE gain de ses filleuls
  refReward: 0.2,           // bonus (en €) offert au parrain à l'activation d'un filleul
  refActiveClicks: 5,       // nb de clics du filleul pour devenir « actif »

  // Secrets (à changer impérativement en production !)
  secret: 'clicwin-secret-change-me',
  postbackSecret: 'clicwin-postback-changez-moi',

  sessionDays: 30,

  // Versions offerwalls supportées (informations d'intégration dans le README)
  offerwalls: ['OfferToro', 'AdGate Media', 'Adscend Media', 'AdGem', 'Lootably', 'BitLabs']
};

module.exports = config;
