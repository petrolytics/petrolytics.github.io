import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = path.join(__dirname, '../public/stations_metadata.json');

async function updateStationMetadata() {
    console.log('--- Démarrage de l\'extraction des noms depuis OpenStreetMap ---');
    
    const overpassQuery = `
[out:json][timeout:120];
nwr["amenity"="fuel"]["ref:FR:prix-carburants"];
out tags;
    `.trim();

    try {
        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: overpassQuery,
            headers: { 'Content-Type': 'text/plain' }
        });

        if (!response.ok) throw new Error(`Erreur Overpass: ${response.statusText}`);

        const data = await response.json();
        const mapping = {};

        console.log(`Données reçues : ${data.elements.length} stations trouvées.`);

        data.elements.forEach(el => {
            const tags = el.tags;
            const govtId = tags['ref:FR:prix-carburants'];
            const name = tags.brand || tags.name || tags.operator;
            
            if (govtId && name) {
                mapping[govtId] = name;
            }
        });

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(mapping));
        console.log(`Succès ! Fichier généré (Format simplifié ID:NAME) : ${OUTPUT_FILE}`);
        console.log(`Total stations mappées : ${Object.keys(mapping).length}`);

    } catch (error) {
        console.error('Erreur lors de l\'extraction :', error);
        process.exit(1);
    }
}

updateStationMetadata();
