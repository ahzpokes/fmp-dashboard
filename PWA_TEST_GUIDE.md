# Guide de test — Installation des 5 PWA

## Contexte de déploiement

L'app est déployée sur **deploybase.eu** à la racine d'un sous-domaine :
```
https://<ton-projet>.sites.deploybase.eu/
```
(ou ton domaine personnalisé si tu en as configuré un)

Le fichier `public/_redirects` (`/* /index.html 200`) gère le SPA routing côté serveur :
chaque route `/brest`, `/reims`, etc. retourne bien `index.html` sans 404.

> ⚠️ Les PWA ne fonctionnent **pas** en mode `npm run dev` (le Service Worker
> n'est pas enregistré en dev). Pour tester **localement** avant de déployer :
> ```bash
> npm run build
> npm run preview   # http://localhost:4173
> ```

---

## Chrome Desktop (Windows / macOS / Linux)

1. Ouvre `https://<ton-projet>.sites.deploybase.eu/brest` dans Chrome.
2. Dans la barre d'adresse, clique sur l'icône **"Installer"** (📥)  
   ou menu ⋮ → *Installer DSNA Delay Dashboard - Brest*.
3. Confirme → une icône **"Brest"** apparaît sur le bureau.
4. Répète pour les 4 autres ACC :

| URL | Nom attendu sous l'icône |
|---|---|
| `.../brest` | **Brest** |
| `.../reims` | **Reims** |
| `.../bordeaux` | **Bordeaux** |
| `.../marseille` | **Marseille** |
| `.../paris` | **Paris** |

**Vérification :** `chrome://apps` — tu dois voir 5 entrées distinctes, chacune avec son `start_url` et son `id` différents.

---

## Chrome Android

1. Ouvre `https://<ton-projet>.sites.deploybase.eu/brest` dans Chrome Mobile.
2. Menu ⋮ → *Ajouter à l'écran d'accueil* → le nom proposé doit être **"Brest"**.
3. Confirme et répète pour les 4 autres ACC.

**Vérification :** Chaque icône ouvre directement son ACC sans passer par Reims.

---

## Safari iOS (iPhone / iPad)

> Safari ignore le `manifest.json` pour le nom de l'icône.  
> Il utilise `<meta name="apple-mobile-web-app-title">`,  
> mis à jour dynamiquement par le hook `useDynamicManifest`.

1. Ouvre `https://<ton-projet>.sites.deploybase.eu/brest` dans Safari.
2. Bouton **Partager** (□↑) → *Sur l'écran d'accueil*.
3. Le nom proposé doit être **"Brest"** — modifie-le si nécessaire, puis *Ajouter*.
4. Répète pour les 4 autres ACC.

**Vérification :** L'app s'ouvre en mode plein écran (sans barre Safari) directement sur Brest.

---

## Vérifier le bon manifest via DevTools (Chrome)

**Application → Manifest** dans les DevTools :

| URL ouverte | Manifest chargé | `start_url` | `id` |
|---|---|---|---|
| `/brest` | `manifest-brest.json` | `/brest` | `/brest` |
| `/reims` | `manifest-reims.json` | `/reims` | `/reims` |
| `/bordeaux` | `manifest-bordeaux.json` | `/bordeaux` | `/bordeaux` |
| `/marseille` | `manifest-marseille.json` | `/marseille` | `/marseille` |
| `/paris` | `manifest-paris.json` | `/paris` | `/paris` |

---

## Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| Bouton "Installer" absent | SW non enregistré ou HTTP | Vérifie que le déploiement est bien en HTTPS (deploybase.eu le gère automatiquement) |
| Le nom reste "Reims" après réinstallation | Ancienne PWA en cache | Désinstalle la PWA + `chrome://serviceworker-internals` → Unregister → réinstalle |
| iOS affiche le mauvais titre | `useDynamicManifest` non appelé | Vérifie que le hook est bien le 1er appel dans `App.tsx` |
| `/brest` retourne une 404 | `_redirects` manquant | Le fichier `public/_redirects` (`/* /index.html 200`) doit être présent dans le build |
| PWA s'ouvre toujours sur `/reims` | Ancienne PWA installée depuis l'ancien manifest | Désinstalle et réinstalle depuis la bonne URL |
