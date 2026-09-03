// ============================================================
//  Partenaires recommandés (offerwalls + vidéos + murs d'offres)
//  → page /offers + génération des demandes (npm run requests)
//  Chaque réseau : compte "publisher" GRATUIT à demander.
//  La validation (identité / e-mail / approbation) est humaine.
//  Une fois la clé (pubId / apiKey) reçue, on la met dans
//  config.js → offerwallMode 'live' → l'iframe se branche.
// ============================================================
'use strict';

module.exports = {
  // Le postback (crédit automatique quand un membre finit une offre)
  postback: {
    url: '/api/postback',        // route déjà codée côté serveur
    method: 'POST',
    headers: { 'x-postback-secret': 'ta cle secrete (config.postbackSecret)' },
    params: 'user_id=<id membre> & amount=<montant> & offer=<nom> & trans_id=<ref unique>'
  },

  offerwalls: [
    { name: 'OfferToro (Torox)', type: 'offerwall', site: 'https://www.offertoro.com/',
      apply: 'https://www.offertoro.com/', note: 'Mondial, remplissage élevé, intégration sans code.',
      keyNeeded: 'pubId (compte publisher)', signup: true },
    { name: 'AdGate Media', type: 'offerwall', site: 'https://www.adgatemedia.com/',
      apply: 'https://www.adgatemedia.com/', note: '10 ans+, 85 pays, aucun minimum de trafic.',
      keyNeeded: 'Account ID + clé API', signup: true },
    { name: 'AdGem', type: 'offerwall', site: 'https://www.adgem.com/',
      apply: 'https://www.adgem.com/', note: 'Docs claires (API Offer + iframe).',
      keyNeeded: 'App/Property ID (approbation)', signup: true },
    { name: 'Adscend Media', type: 'offerwall', site: 'https://adscendmedia.com/',
      apply: 'https://adscendmedia.com/', note: 'Souvent n°1 pour les GPT, eCPM $15–80+.',
      keyNeeded: 'Offer ID (compte editeur)', signup: true },
    { name: 'BitLabs', type: 'offerwall', site: 'https://bitlabs.team/',
      apply: 'https://bitlabs.team/', note: 'Dashboard self-serve, offre forte en gaming.',
      keyNeeded: 'API key (dashboard)', signup: true },
    { name: 'Lootably', type: 'offerwall', site: 'https://lootably.com/',
      apply: 'https://lootably.com/', note: 'Agrège plusieurs réseaux, eCPM $5–35.',
      keyNeeded: 'API credentials', signup: true },
    { name: 'Wannads', type: 'offerwall', site: 'https://www.wannads.com/',
      apply: 'https://www.wannads.com/', note: 'Sondages + tâches, pas de minimum de trafic.',
      keyNeeded: 'Compte editeur', signup: true },
    { name: 'AdWork Media', type: 'offerwall', site: 'https://www.adworkmedia.com/',
      apply: 'https://www.adworkmedia.com/offer-wall.php', note: 'Murs d’offres + content locker.',
      keyNeeded: 'Compte editeur', signup: true }
  ],

  // Vidéos récompensées (le « regarde une pub » monétisé correctement)
  video: [
    { name: 'AppLixir', type: 'video', site: 'https://www.applixir.com/',
      apply: 'https://www.applixir.com/', note: 'Vidéos récompensées web-first, CPM $4–15, intégration rapide (3 lignes).',
      keyNeeded: 'Placement / JS SDK (conditions de trafic à confirmer)', signup: true },
    { name: 'AyeT Studios', type: 'video', site: 'https://ayetstudios.com/',
      apply: 'https://ayetstudios.com/', note: 'Offerwall + vidéo récompensée sur le web, auto-inscription.',
      keyNeeded: 'Compte editeur + ID', signup: true },
    { name: 'Google AdMob (rewarded)', type: 'video', site: 'https://admob.google.com/',
      apply: 'https://admob.google.com/', note: 'Standard mobile ($15–30 eCPM) — prévu si tu fais une app.',
      keyNeeded: 'Compte AdMob + ID d’app', signup: true }
  ],

  // Filets de sécurité (peuvent s’ajouter en +)
  display: [
    { name: 'Adsterra', type: 'display', site: 'https://adsterra.com/',
      apply: 'https://adsterra.com/', note: 'Affichage classique, paiement dès $5 — pour compléter, jamais pour « payer des clics ».',
      keyNeeded: 'Compte editeur', signup: true }
  ]
};
