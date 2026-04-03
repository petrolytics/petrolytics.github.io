# PetroLytics

Tableau de bord analytique de la décomposition du prix des carburants en France (2000–2026).

## Fonctionnalités

- Décomposition du prix TTC en 6 composantes : Pétrole brut, TICPE, CEE, TVA, Marge raffinage, Distribution
- Historique complet 2000–2026 avec zoom interactif
- Comparaison Gazole / SP95 / SP98 / GPL
- Profils de distributeurs (National / Grande Surface / Premium)
- Mode valeur absolue (€/L) et mode pourcentage
- Marqueurs des événements fiscaux et législatifs majeurs

## Architecture

```
data/
  InseeFuelHistory.js          ← Pointeur vers la version active (1 ligne)
  sources/
    InseeFuelHistory.YYYY-MM-DD.js   ← Snapshots versionnés (DGEC officiel)
    dgec-prices.YYYY-MM-DD.csv       ← CSV sources bruts (traçabilité)
  FiscalRules.js               ← Barèmes TICPE, CEE, TVA
  FuelRegistry.js              ← Registre des carburants et règles métier
  RefiningBenchmarks.js        ← Marges de raffinage industrielles
  BrentFallbackHistory.js      ← Fallback marchés (si FRED et ECB indisponibles)
  HistoricalEvents.js          ← Événements fiscaux/législatifs
  RetailerProfiles.js          ← Profils distributeurs

src/
  application/
    enricher/                  ← Pipeline d'enrichissement (Chain of Responsibility)
    repositories/              ← Interfaces vers les providers et sources
  infrastructure/
    providers/                 ← Logique d'accès aux données (INSEE, FRED, Fiscal, Raffinage)

scripts/
  fetch-market-data.mjs        ← Fetch FRED → public/market_snapshot.json
  fetch-dgec-prices.mjs        ← Fetch DGEC → data/sources/InseeFuelHistory.YYYY-MM-DD.js
  parse-dgec-csv.mjs           ← Conversion d'un CSV DGEC local (usage manuel)
```

### Enrichment Pipeline (Chain of Responsibility)

Pour chaque point de donnée mensuel, la chaîne suivante est appliquée séquentiellement :

1. **InseeLocalProvider** — Prix TTC brut depuis `InseeFuelHistory.js` (interpolation si mois manquant)
2. **FiscalProvider** — TICPE, CEE, TVA lus depuis `FiscalRules.js` selon l'année et le groupe de carburant
3. **MarketDataEnricher** — Cours Brent (USD/bbl) converti en €/L : `brentUSD / exRate / 158.987`
4. **RefiningProvider** — Marge de raffinage industrielle lue depuis `RefiningBenchmarks.js`
5. **AnalyticalPipeline** — Marge de distribution calculée par soustraction : `priceHT - TICPE - CEE - brut - marge_raffinage`

---

## Sources de données

| Donnée | Source | Automatisation | Statut |
|---|---|---|---|
| Prix à la pompe (TTC) | [INSEE / BDM](https://bdm.insee.fr) + [Flux quotidien](https://data.economie.gouv.fr) | `make fetch-prices` | ✅ Officiel (Avr 2026) — GPL estimé |
| Cours du Brent (USD/bbl) | [API FRED — DCOILBRENTEU](https://fred.stlouisfed.org/series/DCOILBRENTEU) | `make fetch-market` | ✅ Snapshoté (Avr 2026) |
| Taux USD/EUR | [API FRED — DEXUSEU](https://fred.stlouisfed.org/series/DEXUSEU) | `make fetch-market` | ✅ Snapshoté (Avr 2026) |
| TICPE (barèmes annuels) | [DGFIP / PLF annuels](https://www.impots.gouv.fr) | Manuel (`data/FiscalRules.js`) | ✅ Sourcés manuellement |
| Marges de raffinage | [CPDP — Rapports annuels](https://www.cpdp.org/) | Manuel (`data/RefiningBenchmarks.js`) | ⚠️ Estimées |

> **Disclaimer** : La baseline `InseeFuelHistory.2000-01-01.js` contient des estimations interpolées. Utilisez `make fetch-prices` pour la remplacer par les données officielles DGEC.

---

## Gestion des versions de sources

Les prix à la pompe sont versionnés dans `data/sources/` avec la date de génération :

```
data/sources/
  InseeFuelHistory.2000-01-01.js   ← Baseline estimée initiale
  InseeFuelHistory.2026-04-03.js   ← Snapshot officiel du 03/04/2026 (INSEE + Flux)
```

`data/InseeFuelHistory.js` est un simple pointeur vers la version active :

```js
// Versions disponibles dans data/sources/ :
//   InseeFuelHistory.2000-01-01.js
//   InseeFuelHistory.2026-04-03.js

export { FUEL_PRICE_HISTORY } from './sources/InseeFuelHistory.2026-04-03.js';
```

**Pour utiliser une version précédente** (rollback) :
```bash
# Modifier data/InseeFuelHistory.js pour pointer vers l'ancienne version
# puis committer — aucun autre fichier à toucher
git checkout data/InseeFuelHistory.js   # ou éditer manuellement
```

---

## Développement local

```bash
cp .env.example .env   # Renseigner FRED_API_KEY et APP_PORT
make dev               # Démarre le serveur via Docker
```

Variables d'environnement (`.env`) :

| Variable | Description | Défaut |
|---|---|---|
| `FRED_API_KEY` | Clé API FRED (St. Louis Fed) | — |
| `APP_PORT` | Port exposé en local | `3010` |

---

## Génération des données

### Données marché (Brent + Forex)

```bash
make fetch-market
# → Génère public/market_snapshot.json (embarqué dans le build)
```

### Prix à la pompe (DGEC officiel)

```bash
make fetch-prices
# Passe 1 : INSEE/BDM SDMX → prix officiels 2000 → mois N-1
# Passe 2 : Flux quotidien data.economie.gouv.fr → moyenne nationale
#           pour chaque mois récent (6 derniers mois) non encore
#           publié par l'INSEE (décalage habituel d'1 mois)
# → Génère data/sources/InseeFuelHistory.YYYY-MM-DD.js
# → Met à jour automatiquement le pointeur data/InseeFuelHistory.js
```

**Vérification avant commit** :
```bash
# Voir la différence avec la version précédente
git diff data/InseeFuelHistory.js
git diff data/sources/
```

### Depuis un CSV local

```bash
# Si vous avez téléchargé le CSV manuellement
node scripts/parse-dgec-csv.mjs data/sources/mon-fichier.csv
# → Génère data/InseeFuelHistory.generated.js (ne touche pas au pointeur)
```

### Toutes les sources en une commande

```bash
make fetch-data   # fetch-market + fetch-prices
```

---

## Build & Déploiement GitHub Pages

```bash
make build    # fetch-market + vite build → dist/
make deploy   # build + push sur branche gh-pages
```

Le déploiement est automatisé via `.github/workflows/deploy.yml` sur chaque push sur `main`.

**Configuration requise dans les Secrets GitHub** :

| Secret | Description |
|---|---|
| `FRED_API_KEY` | Clé API FRED pour le fetch marché en CI |
