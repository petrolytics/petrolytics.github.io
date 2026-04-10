.PHONY: dev fetch-market fetch-prices fetch-data build deploy

-include .env
export

dev:
	docker-compose down
	docker-compose up --build app

# Génère public/market_snapshot.json (Brent + Forex depuis FRED)
fetch-market:
	docker-compose run --rm fetch-data node scripts/fetch-market-data.mjs

# Télécharge les prix officiels DGEC, génère un snapshot daté et met à jour le pointeur
# Rollback : git checkout data/InseeFuelHistory.js
fetch-prices:
	docker-compose run --rm fetch-data node scripts/fetch-dgec-prices.mjs

# Récupère les noms des stations depuis OSM (Mirroirs) - Isolé car instable
fetch-names:
	docker-compose run --rm fetch-names

# Fetch toutes les sources (FRED + DGEC)
fetch-data: fetch-market fetch-prices

# Build complet pour GitHub Pages
build: fetch-data
	docker-compose run --rm build npm run build

# Déploie sur GitHub Pages
deploy: build
	npx gh-pages -d dist -b gh-pages
