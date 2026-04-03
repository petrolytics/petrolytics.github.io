// PetroLytics - DATA ORCHESTRATOR (CLEAN ARCHITECTURE / STRATEGY PATTERN)
import { FuelDataRepository } from './application/repositories/FuelDataRepository.js';
import { getSupportedFuels } from '../data/FuelRegistry.js';

const startYear = 2000;
const endYear = 2026;
const monthsDict = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

async function generateDataSet() {
    const dataSet = [];

    // 1. Précharger les marchés financiers (Repositories)
    const markets = await FuelDataRepository.fetchMarkets();
    const fuelRegistry = getSupportedFuels(); // Le registre pilote la boucle !

    for (let year = startYear; year <= endYear; year++) {
        for (let m = 0; m < 12; m++) {
            if (year === 2026 && m > 3) break; // Avril 2026

            const dataPoint = { date: `${monthsDict[m]} ${year}` };

            // 2. La boucle parcourt désormais les carburants déclarés SEULEMENT dans le registre.
            // Zéro dépendance en dur à 'Gazole' ou 'SP95' ici.
            for (const f of fuelRegistry) {
                const type = f.id;
                const enrichedPoint = await FuelDataRepository.getPoint(year, m, type, markets);
                if (enrichedPoint) {
                    enrichedPoint.label = `${monthsDict[m]} ${year}`;
                    dataPoint[type] = enrichedPoint;
                }
            }

            dataSet.push(dataPoint);
        }
    }
    return dataSet;
}

export const data = await generateDataSet();
