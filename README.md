# Eurocontrol ACC Performance Dashboard

Tableau de bord opérationnel pour le suivi des performances de trafic et des délais ATFM des centres de contrôle en-route européens. Destiné à la DSNA (Direction + Bureaux d'analyse).

## Fonctionnalités

- **5 vues** : Synthèse, Comparaison annuelle, Analyse des causes, Focus hebdomadaire, Vue réseau DSNA.
- **Sélecteur d'ACC** avec groupes (DSNA / Autres ACC européens).
- **Routage URL** : `?acc=REIMS+ACC` pour partage de liens directs.
- **Dark / Light mode** avec persistance (localStorage).
- **Toggles N/N-1** pour éviter la surcharge visuelle.
- **Vue 5 conditionnelle** : visible uniquement pour les ACC français.
- **Isolation d'un CRNA** au clic sur la légende (Vue 5).

## Technologies

- React 18 + Vite
- Tailwind CSS (darkMode: 'class')
- Recharts
- Python 3 (ETL)

## Installation

```bash
npm install
npm run dev