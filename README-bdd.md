# README-BDD — Architecture et travail frontend

---

## 📖 Partie 1 — Vue d'ensemble

### Objectif de la BDD

Le dashboard principal (branche `main`) lit un fichier JSON généré chaque jour par `fetch_data.py` et publié sur jsDelivr. Ce JSON ne contient que **l'année en cours en détail** et **N-1 au niveau total** (sans ventilation par cause).

Le problème : Eurocontrol réinitialise ses fichiers annuels le 1er janvier. Chaque nouvelle année, les données détaillées de l'année précédente sont perdues.

**La BDD Nhost répond à ce problème** : elle archive silencieusement les données détaillées jour après jour, pour constituer un historique permanent.

### Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Eurocontrol (Excel)                       │
│              ACCs.xlsx  +  ACC_ATFM_Delay.xlsx               │
└──────────────────────────┬───────────────────────────────────┘
                           │
            ┌──────────────┴───────────────┐
            ▼                              ▼
  ┌──────────────────┐          ┌──────────────────────┐
  │ fetch_data.py    │          │ fetch_data_bdd.py    │
  │ (main)           │          │ (bdd)                │
  └────────┬─────────┘          └──────────┬───────────┘
           │                               │
           ▼                               ▼
  ┌──────────────────┐          ┌──────────────────────┐
  │ JSON             │          │ Nhost PostgreSQL     │
  │ → jsDelivr       │          │ daily_acc_data       │
  │ → Dashboard      │          │ (archive historique) │
  └──────────────────┘          └──────────────────────┘
       Production                  Alimentation
       (temps réel)                silencieuse
```

---

## 🔀 Partie 2 — Les deux branches

### Branche `main` (production)

- **Contient** : le code React, le workflow JSON, le script `fetch_data.py`
- **Alimente** : le dashboard en production via jsDelivr
- **Cron** : 9h30 (heure de Paris) via cron-job.org
- **Ne pas toucher** sauf pour corriger un bug critique.

### Branche `bdd` (développement)

- **Contient** : le script `fetch_data_bdd.py`, le workflow BDD
- **Alimente** : la base Nhost, silencieusement
- **Cron** : 10h00 (heure de Paris) via cron-job.org
- **Zone de développement** : c'est ici que se fera la bascule frontend.

---

## ⚠️ Partie 3 — Le Scénario A (à comprendre absolument)

### La décision

Les colonnes `flights_prev_year` et `delay_total_prev_year` ont été **supprimées** de la table `daily_acc_data`.

### Pourquoi

- Ces colonnes dupliquaient une information destinée à être dans une autre ligne (même date, année N-1).
- Dans une BDD d'archive, cette redondance n'a pas de sens.

### Conséquence critique

| Donnée | Disponible dans la BDD ? |
|:---|:---|
| N (année en cours) — vols | ✅ Oui |
| N (année en cours) — délais par cause | ✅ Oui |
| N-1 (année précédente) — tout | ❌ **Non** |

**La BDD ne peut pas, aujourd'hui, fournir de comparaison N-1.**

### Jusqu'à quand

- La BDD se remplit depuis octobre 2026.
- Elle contiendra 2026 complet au 1er janvier 2027.
- **À partir de 2027**, elle contiendra 2026 + 2027, et la comparaison N-1 sera possible par JOIN.
- **Le dashboard ne pourra pas basculer complètement sur la BDD avant 2027.**

### En attendant

Deux stratégies possibles pour le frontend de la branche `bdd` :

- **Stratégie 1** : lire N depuis la BDD, N-1 depuis le JSON actuel (mix temporaire).
- **Stratégie 2** : désactiver la comparaison N-1 dans les vues de la branche `bdd` jusqu'en 2027.

---

## 🛠️ Partie 4 — Procédures opérationnelles

### Vérifier que les crons tournent

Une fois par semaine :

1. Aller sur https://github.com/ahzpokes/fmp-dashboard/actions
2. Vérifier que les deux workflows ont une coche verte récente :
   - **Update Data** (branche main) → JSON
   - **Update Data (BDD)** (branche bdd) → Nhost
3. Si un workflow est en rouge, ouvrir le run et consulter les logs.

### Diagnostiquer un échec

| Symptôme | Cause probable | Action |
|:---|:---|:---|
| `Connection reset by peer` | Eurocontrol temporairement indisponible | Attendre 24h, relancer |
| `No such file or directory` | Fichier manquant sur la branche | Vérifier le push |
| `Bad credentials` | Token GitHub expiré | Régénérer le token |
| `column does not exist` | Schéma BDD modifié | Vérifier la table |
| `permission denied` | Secret `NHOST_DB_URL` invalide | Régénérer dans Nhost |

### Relancer un workflow manuellement

**Via GitHub UI** :
1. Actions → choisir le workflow → **Run workflow** → branche concernée.

**Via curl** :
```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/ahzpokes/fmp-dashboard/actions/workflows/update-data-bdd.yml/dispatches \
  -d '{"ref":"bdd"}'
```

### Tester en local

```bash
# Activer le venv
source .venv/Scripts/activate

# Définir la chaîne de connexion (jamais commitée)
export NHOST_DB_URL="postgres://..."

# Lancer le script BDD
python scripts/fetch_data_bdd.py
```

---

## 🎨 Partie 5 — Travail frontend à faire (LE CHANTIER PRINCIPAL)

### Contexte

Aujourd'hui, la branche `bdd` exécute le même frontend que `main`, mais alimente une BDD en parallèle. **Le frontend de la branche `bdd` doit maintenant être modifié** pour lire les données depuis la BDD au lieu du JSON.

Ce chantier prépare la bascule finale, sans urgence immédiate.

### Objectifs

1. **Remplacer la source de données** : lire depuis Nhost (via API) au lieu de jsDelivr (JSON).
2. **Conserver toutes les fonctionnalités visuelles** : mêmes vues, mêmes graphiques, mêmes interactions.
3. **Gérer la contrainte N-1 manquant** (Scénario A) : afficher un message clair au lieu de planter.

### Architecture frontend cible

```
        Frontend React (branche bdd)
                    │
                    ▼
        ┌───────────────────────┐
        │  Couche d'accès data  │
        │  (abstraction)        │
        └───────────┬───────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
   ┌─────────┐             ┌─────────┐
   │ Nhost   │             │ JSON    │
   │ (N)     │             │ (N-1)   │
   └─────────┘             └─────────┘
```

**Idée clé** : ne pas modifier les vues. Créer une couche d'abstraction qui transforme les données Nhost au format attendu par les vues actuelles.

### Étapes concrètes

#### Étape 1 — Créer un client Nhost

- Ajouter les dépendances : `@nhost/nhost-js` ou `@nhost/react`.
- Créer un fichier `src/nhost.ts` avec la configuration (URL de l'API GraphQL, sous-domaine, région).
- Exposer un client unique, initialisé une fois.

#### Étape 2 — Créer une couche d'accès aux données

Créer `src/data/dataSource.ts` avec une interface unifiée :

- `loadAccData(accCode: string): Promise<AccData>` — retourne les données au format attendu par les vues actuelles (`AnnualData`, `WeeklyData`, etc.).
- Cette fonction fait une requête GraphQL vers Nhost et transforme la réponse pour qu'elle corresponde exactement à la structure actuelle du JSON.

**C'est le point le plus important** : la sortie doit être **identique** à celle de `getAnnualSeries`, `getWeekData`, etc., pour ne rien casser dans les vues.

#### Étape 3 — Adapter `App.tsx`

- Remplacer le `fetch(DATA_URL)` par un appel à `loadAccData(selectedAcc)`.
- En dev, garder le chargement local (fallback).
- En prod, utiliser le client Nhost.

#### Étape 4 — Gérer la contrainte N-1

Trois options, à décider :

**Option A — Message clair**
Afficher "Comparaison N-1 non disponible avant 2027" dans les vues concernées (Vues 2, 3, 4, 5).

**Option B — Fallback JSON**
Continuer à charger N-1 depuis le JSON actuel (qui contient le total 2025) et fusionner avec N venant de Nhost.

**Option C — Désactiver les toggles N-1**
Dans les vues qui proposent des comparaisons N vs N-1, masquer l'option N-1 jusqu'en 2027.

**Recommandation** : Option B (fallback JSON pour N-1) est la plus transparente pour l'utilisateur. La BDD apporte N en détail, le JSON apporte N-1 en total.

#### Étape 5 — Requêtes GraphQL à écrire

Pour Nhost, il faut une requête qui récupère les données journalières par ACC sur une année :

```
query GetAccData($accCode: String!, $year: Int!) {
  daily_acc_data(
    where: { acc_code: { _eq: $accCode }, year: { _eq: $year } }
    order_by: { date: asc }
  ) {
    date
    week
    day_of_week
    flights
    delay_capacity_staffing
    delay_weather
    delay_other
    delay_disruption
    delay_total
  }
}
```

#### Étape 6 — Transformation des données

Le format de sortie de Nhost est **plat** (une ligne par jour). Il faut le **reconstruire** au format hiérarchique actuel :

- Regrouper les lignes par semaine.
- Construire `annual.flights[]`, `annual.delays.capacityStaffing[]`, etc.
- Construire `weekly[weekNumber].flights[]`, `.delays.capacityStaffing[]`, etc.

**C'est ici que réside 80% du travail.** La logique de reconstruction doit être testée unitairement (Vitest) pour éviter les régressions.

#### Étape 7 — Tester sur preview deploybase

- Deploybase crée automatiquement une URL de preview pour la branche `bdd`.
- Vérifier que toutes les vues s'affichent correctement.
- Comparer visuellement avec la production (`main`).
- Corriger les écarts un par un.

### Planning indicatif

| Phase | Travail | Effort estimé |
|:---|:---|:---|
| 1 | Client Nhost + config | 1-2 h |
| 2 | Couche d'accès + transform | 3-4 h |
| 3 | Adaptation `App.tsx` | 1 h |
| 4 | Gestion N-1 manquant | 2-3 h |
| 5 | Requêtes GraphQL | 1 h |
| 6 | Tests unitaires | 2 h |
| 7 | Tests sur preview | 2-3 h |
| **Total** | | **12 à 16 h** |

### Points d'attention

- **Ne pas casser les 5 vues existantes.** La couche d'abstraction doit produire des données strictement identiques à celles du JSON.
- **Tester les cas limites** : semaines partielles, jours sans données, ACC sans données.
- **Ne pas modifier `main`.** Tout le travail se fait sur `bdd`.
- **Documenter chaque transformation** dans le code (commentaires) pour faciliter la reprise.

### Critères de succès

Le chantier est terminé quand :

1. La branche `bdd` déployée en preview affiche les mêmes données que `main` en production.
2. Aucune régression visuelle détectée.
3. La source des données est bien Nhost (vérifiable via l'onglet Network du navigateur).
4. Un test avec un ACC sans données ne casse rien.
5. La documentation est à jour.

---

## 🚀 Partie 6 — Bascule en 2027

Quand 2027 arrivera :

1. La BDD contiendra 2026 **en détail complet**.
2. Le workflow `main` générera le JSON pour 2027.
3. Le workflow `bdd` continuera à alimenter la BDD (2027 en cours).

**La bascule finale** consistera à :

- Fusionner `bdd` dans `main`.
- Modifier le frontend pour lire **N et N-1 depuis la BDD** (fin du fallback JSON).
- Désactiver le workflow JSON (ou le garder en secours).

À ce moment-là, le dashboard pourra comparer 2027 vs 2026 avec les **vraies causes**, pas des estimations.

---

## 📋 Partie 7 — Checklist rapide

### Une fois par semaine

- [ ] Vérifier les deux workflows dans l'onglet Actions de GitHub.
- [ ] Vérifier que les données récentes sont bien dans Nhost.

### Une fois par mois

- [ ] Vérifier que la BDD contient bien tous les jours du mois en cours.
- [ ] Vérifier qu'aucun jour ancien n'a de `flights = 0` anormal (sauf ACCs fusionnés).

### Une fois par an

- [ ] Le 1er janvier, vérifier que le script bascule bien sur la nouvelle année (basé sur `Day.max().year`).
- [ ] Archiver le JSON de l'année écoulée sur un stockage institutionnel.

---

## 📞 Contacts et ressources

- **Repo GitHub** : https://github.com/ahzpokes/fmp-dashboard
- **Nhost** : https://app.nhost.io
- **cron-job.org** : https://cron-job.org
- **Deploybase** : https://deploybase.eu
- **Eurocontrol** : https://www.eurocontrol.int/Economics/DailyDelay-ACCs.html

---

*Document à jour au 10 octobre 2026. À réviser après la bascule de 2027.*

---