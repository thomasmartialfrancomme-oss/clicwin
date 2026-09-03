# ₵ CliCWin — Plateforme de gains (clics, vidéos, offres)

> Version : 2.0 — **contenu renouvelé automatiquement chaque jour** + dossier de demandes
> partenaires. Démo complète et fonctionnelle, bilingue **FR / EN**, prête à installer.
> Sans base de données externe (fichiers JSON) — zéro config serveur.

**⚠️ À lire avant tout :** ce site est un outil. **Il ne crée pas d'argent magiquement.**
L'argent versé aux membres doit être financé par des **partenaires publicitaires réels**
(offerwalls, réseaux de vidéos récompensées) ou par ton propre budget. Voir
`CLICWIN-PLAN-AFFAIRES.md` (à la racine du projet) pour le modèle économique réaliste
et la liste des partenaires sérieux.

---

## 1) Fonctionnalités incluses

| Fonction | Détail |
|---|---|
| 🔁 **Contenu auto quotidien** | Chaque jour à minuit, le site génère **14 pubs différentes à cliquer + 10 vidéos sponsorisées** (titre FR/EN, récompense, quota par tâche) — rien à faire. Plafonds : 10 clics/pub/jour, 5 vidéos/pub/jour, 60 vidéos/jour/membre. |
| 🖱️ **Clics récompensés** | Vraie pub de démo plein écran avec compte à rebours → crédit automatique. Anti-triche serveur (cooldown, quotas par tâche, limites par IP). |
| ▶️ **Vidéos récompensées** | 7 clips MP4 inclus (CC0), lecture jusqu'au bout → gain. Fonctionne même en arrière-plan (la barre reste verte). |
| 🎯 **Offres & sondages** | Page prête + bloc « Opérateur » (admin) avec **liens de demande directe** vers 12 réseaux + route **postback S2S** déjà codée. |
| 🤝 **Dossier de demandes** | `npm run requests` génère `PARTENAIRES-APPLICATIONS.md` : textes pré-remplis FR/EN à coller dans chaque formulaire d'inscription. |
| 👥 **Parrainage** | Lien de parrainage, **% reversé sur chaque gain du filleul** + bonus d'activation. |
| 💸 **Retraits** | Demande de paiement dès le seuil atteint (PayPal/e-mail), historique, **validation par l'admin**. |
| ⚙️ **Admin** | `/admin` : approuver/refuser les retraits, créditer/pénaliser un membre, bloquer un compte, modifier récompenses et statuts des tâches. |
| 🌍 **FR / EN** | Bascule instantanée de langue (cookie). Toute la base de données est bilingue. |

Comptes & mots de passe (démo) :
| Rôle | E-mail | Mot de passe |
|---|---|---|
| Admin | `admin@clicwin.com` | `Admin@1234` |
| Membre (solde non vide) | `demo@clicwin.com` | `demo1234` |
| Membre (filleul) | `demo2@clicwin.com` | `demo1234` |

> ⚠️ **Change ces mots de passe avant toute mise en ligne !** Ils sont créés par `npm run seed`.

---

## 2) Installation locale (2 minutes)

```bash
cd clicwin
npm install       # installe Express (seule dépendance)
npm run seed      # crée les données de démo (1 seule fois) + contenu du jour
npm start         # → http://localhost:3000
```

Sur **Node.js 16+**. Aucune autre installation requise.

Commandes utiles :
| Commande | Effet |
|---|---|
| `npm start` | Lance le serveur (génère/renouvelle le contenu du jour au démarrage, puis toutes les heures) |
| `npm run seed` | Crée les comptes de démo (admin + 2 membres) |
| `npm run tasks` | Force la régénération du contenu du jour (sans relancer le serveur) |
| `npm run requests` | Génère `PARTENAIRES-APPLICATIONS.md` (demandes pré-remplies aux réseaux) |

---

## 3) Mise en production (hébergement)

1. Héberge sur n'importe quel serveur Node (VPS, Railway, Render, Fly.io, etc.).
   - ⚠️ **Requiert HTTPS** (certificat gratuit Let's Encrypt / plateforme) — les cookies de session
     et surtout les paiements l'exigent.
2. **Change les secrets** dans `lib/config.js` : `secret`, `postbackSecret`,
   et le mot de passe admin dans `lib/seed.js` (ou via `data/users.json`).
3. Mets à jour `config.paypalEmail`, `config.currency`, `siteName` si besoin.
4. Chiffre les mots de passe avec **bcrypt/argon2** avant un vrai lancement
   (le code de démo utilise sha256+salt, suffisant pour un petit site, pas pour un gros).

### Structure des fichiers
```
clicwin/
├─ server.js            # serveur Express (pages + API)
├─ lib/
│  ├─ config.js         # réglages globaux (seuils, %, devises, secrets…)
│  ├─ i18n.js           # traductions FR/EN
│  ├─ store.js          # logique métier + anti-triche + quotas
│  ├─ db.js             # mini-base JSON
│  ├─ html.js           # mise en page / composants
│  ├─ partners.js       # registre des réseaux (offerwalls, vidéos, display)
│  ├─ scheduler.js      # générateur AUTO du contenu quotidien
│  ├─ requestgen.js     # génère le dossier de demandes partenaires
│  └─ seed.js           # données de démo
├─ data/                # *.json = ta « base de données »
├─ public/media/        # vidéos MP4 (7 clips CC0 fournis en démo)
└─ README.md
```

---

## 4) Brancher de VRAIS partenaires (l'essentiel)

### a) Clics publicitaires — ce qu'il faut savoir
Le « paid-to-click » pur rapporte **0,001 à 0,02 $ par clic** et **Google AdSense interdit**
les sites qui paient pour cliquer. Ne compte pas dessus pour financer le site.
Pour la démo, les clics créditent après affichage d'une pub simulée :
**remplace la zone « adbox » du `/clicks` par une iframe d'un vrai réseau CPM
(p. ex. AppLixir, ou AdMob pour une app)** puis garde l'appel à
`POST /api/click/finish` à la fin du visionnage.

### b) Vidéos récompensées (le vrai filon « vidéo »)
Récompenser une vidéo vue en entier = format « rewarded video », très bien payé
**($15–40 eCPM tier-1, $4–15 sur le web)** car l'utilisateur choisit de la regarder.
Réseaux : **AppLixir** (web-first, $4–15 CPM), **AdMob/Unity/ironSource** (apps).
→ Mets tes MP4 sponsors dans `public/media/` (7 clips CC0 déjà inclus pour la démo)
ou, mieux, une vraie vidéo du réseau ; le crédit est déclenché par la fin de lecture.

### c) Offres / sondages (offerwalls) — LA vraie source de revenus
Ce sont des **réseaux d'annonceurs qui te paient** quand ton membre réalise une tâche
(sondage, inscription, téléchargement d'app). Ils paient de **$3 à $80+ eCPM** et jusqu'à
plusieurs dizaines de dollars par action. Chaque offreur te donne un **identifiant + un lien
d'offre**, puis t'envoie un **postback S2S** quand la tâche est validée.

1. Demande un compte « publisher » chez 2 à 4 réseaux (aucun trafic minimal requis chez la plupart) :
   **OfferToro / Torox**, **AdGate Media**, **AdGem**, **Adscend Media**, **BitLabs**, **Lootably**.
2. Leurs docs donnent une URL du type `https://www.offertoro.com/ifr/show/{pubId}?...`
   → à afficher dans une iframe sur la page `/offers` (le cadre « Mur d'offres » est prêt).
3. Configure leur postback vers ta route déjà existante :
   ```
   POST /api/postback   (header: x-postback-secret: <config.postbackSecret>)
   paramètres: user_id=<id du membre> & amount=<montant> & offer=<nom> & trans_id=<ref>
   ```
   → le solde du membre est crédité automatiquement et ton % de parrainage est appliqué.

### d) Parrainage
Chaque parrain gagne `refPercent` % (défaut 10 %) de **chaque** gain de ses filleuls,
+ un bonus `refReward` quand le filleul devient actif. Régler dans `lib/config.js`.

---

## 5) Réglages rapides (`lib/config.js`)

| Paramètre | Rôle |
|---|---|
| `siteName`, `tagline` | Nom et slogan du site |
| `currency` | Symbole affiché par langue (`€` / `$`) |
| `minWithdraw` | Seuil minimal de retrait (en €) |
| `feePercent` | Frais de retrait (0 = gratuit) |
| `welcomeBonus` | Bonus de bienvenue à l'inscription (0 = aucun) |
| `refPercent` / `refReward` / `refActiveClicks` | Parrainage |
| `clickCooldownSec`, `ipDailyCap`, `maxFakeWaitSec` | Anti-triche |
| `dailyClicks` / `dailyVideos` | Combien de pubs / vidéos générées par jour |
| `clickCapPerTask` / `videoCapPerTask` / `maxVideosPerDay` | Quotas par membre et par tâche |
| `rewardScale` | Coefficient global des récompenses (0.5 = moitié, 2 = double) |
| `paypalEmail` | E-mail de paiement affiché aux membres |

Les **tâches** (titre FR/EN, récompense, statut, plafond quotidien) sont modifiables
depuis `/admin` (onglet Tâches) ou directement dans `data/tasks.json`.

---

## 6) Payer les membres (quand ton solde le permet)

Le panneau `/admin` permet d'**approuver / refuser** les demandes de retrait.
Processus conseillé :
1. Reçois la demande → vérifie qu'il ne s'agit pas d'un tricheur (multi-comptes, VPN).
2. Marque « Payé » **après** avoir réellement envoyé l'argent
   (PayPal « Send », Payoneer, virement… selon ta zone — Réunion/Maurice/Europe : PayPal ou virement SEPA).
3. Les membres voient leur statut passer à « Payé » dans l'historique.

**Rappel légal (à adapter à ton pays) :** gains = revenus imposables, âge minimum 18 ans,
politique de confidentialité (RGPD) obligatoire si tu touches l'UE, et jamais de promesse de gains garantis.

---

## 7) Sécurité & règles

- Le serveur vérifie tout : délai minimum entre clics, plafond quotidien par membre et par IP,
  durée minimale de visionnage pour les vidéos.
- Jamais de gains pour une action « instantanée » : toute pub doit rester affichée.
- Les bots/VPN/multi-comptes doivent être bloqués par l'admin (bouton « Bloquer » dans `/admin`).
- **Ne jamais** : demander un paiement à l'inscription, promettre un revenu « garanti »,
  payer « pour débloquer » un gain — ce sont les marqueurs des arnaques qui ruinent la réputation du secteur.

---

## 8) English quick start

```bash
cd clicwin && npm install && npm run seed && npm start   # http://localhost:3000
```
Demo accounts: `admin@clicwin.com / Admin@1234` — members `demo@clicwin.com` & `demo2@clicwin.com` / `demo1234`.
Switch language with the 🌐 button. Admin area: `/admin`.
Real monetization comes from **offerwalls + rewarded video networks + referrals**, not from raw PTC clicks.
See `CLICWIN-PLAN-AFFAIRES.md` for partners & the honest money model.
