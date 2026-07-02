import { DEPARTEMENTS_CONFIG, SAVOIE_CATEGORIES, PROXY_URL } from './config-api.js';

export async function fetchDeptData(deptCode) {
    const config = DEPARTEMENTS_CONFIG[deptCode];
    if (!config) return [];

    try {
        if (config.format === 'savoie-api') {
            return await fetchSavoieApiData(deptCode, config.apiUrlBase);
        } else if (config.format === 'geojson-get') {
            return await fetchGeojsonData(deptCode, config.urls);
        }
    } catch (error) {
        console.error(`Erreur globale de récupération pour le département ${deptCode}:`, error);
    }
    return [];
}

// --- NOUVEAU MOTEUR UNIVERSEL : Flux GeoJSON standard & Turbolead (GET) ---
async function fetchGeojsonData(deptCode, urls) {
    let alerts = [];
    
    for (const url of urls) {
        try {
            const geojson = await gmGetJson(url);
            if (!geojson || !Array.isArray(geojson.features)) continue;

            geojson.features.forEach((feature, index) => {
                const props = feature.properties || {};
                const geom = feature.geometry || {};
                
                // Extraction intelligente des coordonnées géographiques (Points, Lignes ou Multi-Lignes)
                let lat = null, lon = null;
                if (geom.type === 'Point' && Array.isArray(geom.coordinates)) {
                    lon = parseFloat(geom.coordinates[0]);
                    lat = parseFloat(geom.coordinates[1]);
                } else if ((geom.type === 'LineString' || geom.type === 'MultiPoint') && Array.isArray(geom.coordinates) && geom.coordinates[0]) {
                    const firstPt = Array.isArray(geom.coordinates[0][0]) ? geom.coordinates[0][0] : geom.coordinates[0];
                    lon = parseFloat(firstPt[0]);
                    lat = parseFloat(firstPt[1]);
                }

                // Normalisation des champs textuels Turbolead / Standard
                const axe = props.axe || props.route || props.Axe || props.route_libelle || '';
                const commune = props.commune || props.ville || props.Commune || '';
                const natureType = props.type || props.nature || props.gtype || props.libelleType || 'Alerte';
                const description = props.description || props.texte || props.commentaire || props.Commentaire || '';
                
                const titre = [natureType, axe, commune].filter(Boolean).join(' — ') || `Événement #${deptCode}-${index}`;

                // Construction d'un bloc de description unifié
                let chunks = [];
                chunks.push(`Type : ${natureType}`);
                if (props.location || props.lieu) chunks.push(`Lieu : ${props.location || props.lieu}`);
                if (props.date_deb || props.debut || props.Debut) chunks.push(`Début : ${props.date_deb || props.debut || props.Debut}`);
                if (props.date_fin || props.fin || props.Fin) chunks.push(`Fin : ${props.date_fin || props.fin || props.Fin}`);
                if (description) chunks.push(`\nDétails :\n${cleanText(description)}`);

                alerts.push({
                    id: `${deptCode}-${props.id || props.uid || props.idtInfo || index}`,
                    type: natureType,
                    title: titre,
                    cross: chunks.join('\n').trim(),
                    updated: props.date_deb || props.pubDate || props.date_maj || "Récemment",
                    severity: 'info', // La sévérité (Rouge/Orange/Gris) sera calculée à la volée par la logique d'app.js
                    lat: isNaN(lat) ? null : lat,
                    lon: isNaN(lon) ? null : lon
                });
            });
        } catch (err) {
            console.warn(`Impossible de lire le flux GeoJSON ${url} du département ${deptCode}`, err);
        }
    }
    return alerts;
}

// --- MOTEUR HISTORIQUE : API Savoie (73) ---
async function fetchSavoieApiData(deptCode, apiBaseUrl) {
    let alerts = [];
    const categoryIds = Object.keys(SAVOIE_CATEGORIES);

    for (const catId of categoryIds) {
        try {
            const list = await gmPostJson(apiBaseUrl, { id: parseInt(catId) });
            if (!Array.isArray(list)) continue;

            for (const item of list) {
                try {
                    const detail = await gmPostJson(`${apiBaseUrl}/allData`, { idAll: item.idtInfo });
                    
                    let d = detail;
                    if (detail && detail.Detail_allData && Array.isArray(detail.Detail_allData)) d = detail.Detail_allData[0];
                    else if (Array.isArray(detail)) d = detail[0];

                    if (!d) continue;

                    const lat = parseFloat(d.Latitude || item.latitude || d.latitude);
                    const lon = parseFloat(d.Longitude || item.longitude || d.longitude);

                    const axe = d.Axe || item.axe || '';
                    const commune = d.Commune || item.commune || '';
                    const frType = d.FRType || item.libelleType || '';
                    const titre = [frType, axe, commune].filter(Boolean).join(' — ') || `Alerte #${item.idtInfo}`;

                    let chunks = [];
                    const typeSoustype = [d.FRType, d.FRsousType].map(s => s ? s.trim() : '').filter(Boolean).join(' - ');
                    if (typeSoustype) chunks.push(`Type : ${typeSoustype}`);
                    if (d.FRTrafficConstrictionType && d.FRTrafficConstrictionType !== "null") chunks.push(`Impact : ${d.FRTrafficConstrictionType.trim()}`);
                    if (d.Debut) chunks.push(`Début : ${new Date(d.Debut).toLocaleString('fr-FR')}`);
                    if (d.Fin) chunks.push(`Fin : ${new Date(d.Fin).toLocaleString('fr-FR')}`);
                    
                    const commBrut = d.Commentaire || item.commentaire;
                    if (commBrut && commBrut !== "null") chunks.push(`\nDétails :\n${cleanText(commBrut)}`);

                    const catConfig = SAVOIE_CATEGORIES[catId];

                    alerts.push({
                        id: `73-${item.idtInfo}`,
                        type: catConfig.name,
                        title: titre,
                        cross: chunks.join('\n').trim(),
                        updated: d.Debut || "Récemment",
                        severity: catConfig.severity,
                        lat: isNaN(lat) ? null : lat,
                        lon: isNaN(lon) ? null : lon
                    });
                } catch (err) {
                    console.warn(`Erreur détails alerte Savoie #${item.idtInfo}`, err);
                }
            }
        } catch (err) {
            console.warn(`Erreur liste Savoie Catégorie ${catId}`, err);
        }
    }
    return alerts;
}

// --- UTILS : Nettoyage et requêtes ---
function cleanText(str) {
    if (!str) return '';
    return String(str)
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/?p>/gi, '\n')
        .replace(/<li>/gi, '• ')
        .replace(/<\/li>/gi, '\n')
        .replace(/<[^>]+>/g, '') 
        .replace(/&nbsp;/g, ' ')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/ {2,}/g, ' ')
        .replace(/\n\s*\n/g, '\n')
        .trim();
}

function gmPostJson(url, body) {
    const proxiedUrl = `${PROXY_URL}?url=${encodeURIComponent(url)}`;
    return fetch(proxiedUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    }).then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    });
}

// Nouvelle fonction utilitaire pour envoyer des requêtes GET via le proxy
function gmGetJson(url) {
    const proxiedUrl = `${PROXY_URL}?url=${encodeURIComponent(url)}`;
    return fetch(proxiedUrl, {
        method: 'GET'
    }).then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    });
}
