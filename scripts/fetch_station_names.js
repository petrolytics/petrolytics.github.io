import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = path.join(__dirname, '../public/stations_metadata.json');

async function updateStationMetadata() {
    console.log('--- Démarrage de l\'extraction des noms depuis OpenStreetMap ---');
    
    const overpassQuery = `
[out:json][timeout:300];
nwr["amenity"="fuel"]["ref:FR:prix-carburants"];
out tags;
    `.trim();

    const endpoints = [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter'
    ];

    let success = false;
    let attempts = 0;
    const maxAttempts = 5;

    while (!success && attempts < maxAttempts) {
        attempts++;
        const endpoint = endpoints[attempts % endpoints.length];
        console.log(`Tentative ${attempts}/${maxAttempts} sur ${endpoint}...`);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 240000); // 4 min timeout

            const response = await fetch(endpoint, {
                method: 'POST',
                body: overpassQuery,
                headers: { 'Content-Type': 'text/plain' },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`Erreur Overpass: ${response.status} ${response.statusText}`);

            const data = await response.json();
            if (!data || !data.elements) throw new Error('Format de réponse invalide');

            const mapping = {};
            data.elements.forEach(el => {
                const tags = el.tags;
                const govtId = tags['ref:FR:prix-carburants'];
                const name = tags.brand || tags.name || tags.operator;
                if (govtId && name) {
                    mapping[govtId] = name;
                }
            });

            fs.writeFileSync(OUTPUT_FILE, JSON.stringify(mapping));
            console.log(`Succès ! Total stations mappées : ${Object.keys(mapping).length}`);
            success = true;

        } catch (error) {
            console.error(`Échec tentative ${attempts}: ${error.message}`);
            if (attempts < maxAttempts) {
                console.log('Attente avant nouvelle tentative (10s)...');
                await new Promise(resolve => setTimeout(resolve, 10000));
            } else {
                console.error('Toutes les tentatives ont échoué.');
                process.exit(1);
            }
        }
    }
}

updateStationMetadata();
