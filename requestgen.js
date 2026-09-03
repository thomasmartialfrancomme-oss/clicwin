// ============================================================
//  Génère le dossier « PARTENAIRES-APPLICATIONS.md »
//  (demandes pré-remplies à envoyer à chaque réseau)
//  Lancement :  npm run requests
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');
const partners = require('./partners.js');
const config = require('./config');

// --- À remplir UNE fois par l'opérateur (toi) ---
const OWNER = {
  name: 'Thomas Francomme',               // ← ton nom d'éditeur
  email: 'thomasmartialfrancomme@gmail.com', // ← e-mail de contact
  siteName: config.siteName,
  siteUrl: 'https://clicwin.fr',          // ← ⚠️ remplace par le domaine que TU achètes (voir guide Phase 2)
  country: 'Réunion / Maurice / France (FR-EN)',
  payoutAccount: 'PayPal — thomasmartialfrancomme@gmail.com' // PayPal/Payoneer/bancaire (à confirmer)
};

const FR_INTRO = `# 🤝 ${config.siteName} — Dossier de demandes partenaires

> Généré le ${new Date().toLocaleDateString('fr-FR')} par \`npm run requests\`.
> Remplis **OWNER** dans \`lib/requestgen.js\`, relance la commande, puis ouvre
> chaque lien ci-dessous et colle le **texte pré-rempli** dans leur formulaire
> « Publisher / Advertiser sign up ». La validation de chaque compte est faite
> par un humain chez eux (24h à ~1 semaine). Aucun paiement n'est demandé.

## Tes infos à connaître (copier-coller en haut des formulaires)

- Nom complet : **${OWNER.name}**
- E-mail : **${OWNER.email}**
- Nom du site : **${OWNER.siteName}** — plateforme de micro-récompenses (GPT)
- Site : **${OWNER.siteUrl}** *(à mettre en ligne d'abord si le réseau l'exige)*
- Pays/zone : ${OWNER.country}
- Compte de paiement : ${OWNER.payoutAccount}

## Texte FR (à adapter) — pour les réseaux en français
> « Bonjour, je lance ${OWNER.siteName}, une plateforme de récompenses en ligne
> (clics, vidéos, offres). Je souhaite intégrer votre offreur pour récompenser mes
> membres. Nous démarrons : peu de trafic pour l'instant, croissance visée via le
> parrainage et les réseaux sociaux. J'accepte vos conditions, j'implémenterai le
> postback serveur-à-serveur et je suis majeur. Merci d'activer mon compte
> éditeur. Cordialement, ${OWNER.name} — ${OWNER.email} »

## English template (works with all networks)
> "Hello, I'm launching ${OWNER.siteName}, a rewards (GPT) platform where users
> complete offers, surveys, video tasks and ads. I'd like to integrate your
> offerwall / rewarded network to reward my members. We are at launch stage:
> modest traffic now, growing through referrals and social media. I accept your
> terms, will implement server-to-server postbacks, and am 18+. Please activate
> my publisher account. Regards, ${OWNER.name} — ${OWNER.email}"

---

# 🌐 A) Offerwalls (les plus importants — à demander en premier)
`;

const FR_FOOT = `
---

# ▶️ B) Vidéos récompensées (regarder des pubs = format "rewarded")

${partners.video.map(p => `
### ${p.name} — ${p.site}
- **Demande** : ${p.apply}
- **Ce que tu obtiendras** : ${p.keyNeeded}
- **À noter** : ${p.note}
`).join('')}
---

# 🖼️ C) Complément display (facultatif)

${partners.display.map(p => `
### ${p.name} — ${p.site}
- **Demande** : ${p.apply}
- **Ce que tu obtiendras** : ${p.keyNeeded}
- **À noter** : ${p.note}
`).join('')}
---

# 🔁 Quand tu as reçu une clé (pubId / apiKey / placement)

1. Ouvre \`clicwin/lib/config.js\` → passe \`offerwallMode: 'live'\`.
2. Colle ta clé à l'endroit indiqué (ex. \`offertoroPubId: 'TON_ID'\`).
3. Dans le panneau du réseau, mets le postback : **${OWNER.siteUrl}${partners.postback.url}**
   avec entête \`x-postback-secret: ${config.postbackSecret}\` et les paramètres
   \`user_id\`, \`amount\`, \`offer\`, \`trans_id\`.
4. Relance le serveur → le mur d'offres apparaît sur /offers.

> ⚠️ **Ne pas inventer de trafic** : si un réseau voit des comptes/machines en rafale,
> il bloquera ton compte. Mieux vaut démarrer petit et propre.
`;

// ------------------- rendu -------------------
function render() {
  let md = FR_INTRO;
  md += partners.offerwalls.map(p => `
### ${p.name} — ${p.site}
- **Demande (lien) :** ${p.apply}
- **Ce que tu obtiendras :** ${p.keyNeeded}
- **À noter :** ${p.note}
- [ ] Compte créé
- [ ] Clé reçue (pubId / apiKey)
- [ ] Postback configuré (voir bas de page)
`).join('');
  md += FR_FOOT;
  return md;
}

if (require.main === module) {
  const out = path.join(__dirname, '..', '..', 'PARTENAIRES-APPLICATIONS.md');
  fs.writeFileSync(out, render(), 'utf8');
  console.log('[requests] Dossier écrit : ' + out);
  console.log('[requests] ' + (partners.offerwalls.length + partners.video.length + partners.display.length) + ' partenaires listés. Bonne demande !');
}
