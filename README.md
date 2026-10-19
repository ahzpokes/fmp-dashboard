# RADIS - Eurocontrol ACC Dashboard

Tableau de bord opérationnel pour le suivi des performances de trafic et des délais ATFM des centres de contrôle en-route européens. Destiné à la DSNA (Direction + Bureaux d'analyse).

## Fonctionnalités

- **5 vues** : Synthèse, Comparaison annuelle, Analyse des causes, Focus hebdomadaire, Vue réseau DSNA.
- **Sélecteur d'ACC** avec groupes (DSNA / Autres ACC européens).
- **Routage URL** : `?acc=REIMS+ACC` pour partage de liens directs.
- **Dark / Light mode** avec persistance (localStorage).
- **Toggles N/N-1** pour éviter la surcharge visuelle.
- **Vue 5 conditionnelle** : visible uniquement pour les ACC français.
- **Isolation d'un CRNA** au clic sur la légende (Vue 5).
- **PWA** : installation possible sur iOS et Android avec icône dynamique par ACC.

## Architecture des données

Le dashboard lit les données depuis une base de données Nhost PostgreSQL qui archive les données Eurocontrol jour après jour. Cette BDD permet de conserver un historique permanent, contrairement aux fichiers Excel d'Eurocontrol qui sont réinitialisés chaque année.

```
┌──────────────────────────────────────────────────────────────┐
│                    Eurocontrol (Excel)                       │
│              ACCs.xlsx  +  ACC_ATFM_Delay.xlsx               │
└──────────────────────────┬───────────────────────────────────┘
                           │
                    ┌──────┴──────┐
                    ▼             ▼
          ┌─────────────────┐   ┌──────────────────────┐
          │ fetch_data.py   │   │ fetch_data_bdd.py    │
          │ (JSON backup)   │   │ (BDD principale)     │
          └────────┬────────┘   └──────────┬───────────┘
                   │                        │
                   ▼                        ▼
          ┌─────────────────┐   ┌──────────────────────┐
          │ JSON            │   │ Nhost PostgreSQL     │
          │ → jsDelivr      │   │ daily_acc_data       │
          │ (fallback)      │   │ (archive historique) │
          └─────────────────┘   └──────────────────────┘
```

### Source de données

- **N (année en cours)** : Données détaillées depuis la BDD Nhost
- **N-1 (année précédente)** : Données depuis le JSON de secours (la BDD ne contiendra pas N-1 complet avant 2027)

## Technologies

- React 18 + Vite
- Tailwind CSS (darkMode: 'class')
- Recharts
- Nhost (PostgreSQL + GraphQL)
- Python 3 (ETL)

## Installation

```bash
npm install
npm run dev
```

### Configuration Nhost

Pour le développement local, définissez la variable d'environnement `VITE_NHOST_SUBDOMAIN` et `VITE_NHOST_REGION` dans un fichier `.env.local` :

```env
VITE_NHOST_SUBDOMAIN=votre-subdomain
VITE_NHOST_REGION=eu-central-1
```

## Procédures opérationnelles

### Vérifier que les crons tournent

Une fois par semaine :

1. Aller sur https://github.com/ahzpokes/fmp-dashboard/actions
2. Vérifier que le workflow **Update Data (BDD)** a une coche verte récente
3. Si le workflow est en rouge, ouvrir le run et consulter les logs

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
1. Actions → choisir le workflow → **Run workflow** → branche `main`.

## Structure du projet

```
dashboard_V2/
├── src/
│   ├── components/     # Composants React (Header, KPIGlobal, Views...)
│   ├── hooks/          # Hooks personnalisés (useDynamicManifest...)
│   ├── utils/          # Helpers (dataHelpers, theme...)
│   └── data/           # Données JSON de secours
├── scripts/            # Scripts Python ETL
│   ├── fetch_data.py           # Backup JSON
│   └── fetch_data_bdd.py       # Alimentation BDD
├── public/             # Assets statiques + manifests PWA
└── README.md
```

## À propos de la comparaison N-1

La BDD se remplit depuis octobre 2026. Elle contiendra 2026 complet au 1er janvier 2027. À partir de 2027, elle contiendra 2026 + 2027, et la comparaison N-1 sera possible directement depuis la BDD. En attendant, le dashboard utilise un fallback JSON pour les données N-1.