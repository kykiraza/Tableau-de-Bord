# Tableau de bord financier MADATRANS

Outil interne de pilotage financier pour une société de transport routier (12 camions).
Interface seule, sur données de test : la couche data est isolée derrière une interface, pour brancher les vraies écritures plus tard sans retoucher l'interface.

## Démarrer

```sh
bun install     # ou npm install
bun run dev     # ou npm run dev
bun test        # contrôles de calcul (moteur d'agrégation)
```

## Où brancher les vraies données

Tout passe par l'interface `DataSource` dans `src/data/types.ts` :

- données de référence : `listTrucks`, `listDrivers`, `listClients`, `listPosts`, `listSuppliers`
- écritures : `listTransactions(period)`, `listDocumentLines(documentRef?)`, `listAlerts()`, `resolveAlert(id)`
- réglages : `getSettings()`, `getAvailableMonths()`
- analyses : `query(q)`, `getDetails(q)`
- vues enregistrées : `listViews()`, `saveView(v)`, `deleteView(id)`, `getDefaultViewId()`, `setDefaultViewId(id)`

L'implémentation de démonstration est `src/data/MockDataSource.ts` (générateur déterministe dans `src/mocks/rawData.ts`, 24 mois de lignes d'écritures).
Pour brancher une base réelle : écrire une classe qui implémente `DataSource`, et la remplacer dans `src/data/DataProvider.tsx`. Aucun composant d'interface n'est à modifier.

## Structure

- `src/data/` — contrat (`types.ts`), moteur d'agrégation (`engine.ts`), filtres URL (`filters.ts`), `DataProvider`, `MockDataSource`
- `src/mocks/` — données de test générées
- `src/components/` — interface, dont `widgets/` (grille personnalisable) et `rentabilite/` (tableau de rentabilité)
- `src/routes/` — écrans : tableau de bord, rentabilité par camion, explorer, transactions, encaissements, documents, à vérifier, assistant, paramètres, référentiels, connexion
- `src/utils/` — formats (euro/français), CSV, périodes

## Règles de fonctionnement

- Les montants affichés sont tous des agrégations calculées par `src/data/engine.ts` à partir des lignes d'écritures : jamais de chiffre écrit en dur dans un composant.
- Frais communs (Bureau, Divers) : répartis **à parts égales** entre les camions actifs du mois (un camion est actif s'il a du chiffre ce mois-là). La clé de répartition est un paramètre (`Settings.allocationKey`) : `parts_egales` par défaut, `prorata_ca` et `prorata_jours` disponibles.
- Filtres globaux portés par l'URL : les vues sont partageables par lien.
- Ne pas modifier `supabase/`, `src/hooks/`, `src/lib/` (appartient à une autre partie de l'équipe).
- Aides de format dans `src/utils/format.ts`, pas dans `src/lib/`.

## Style

Sobre, quasi monochrome (esprit application bancaire) : bordures 1 px, radius 12 px, pas d'ombre ni de dégradé.
La couleur porte le sens uniquement : vert = positif, rouge = négatif, ambre = mois sélectionné. Bleu marine `#1F3A5F` réservé au logo.
Typographie Inter, chiffres en `tabular-nums`. Montants : euros et centimes en plus petit, signes `+` / `−` (U+2212).

## Licence

À définir par le propriétaire du projet.
