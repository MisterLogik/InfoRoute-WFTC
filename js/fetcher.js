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

            geojson.features.forEach((feature) => {
                const props = feature.properties || {};
                const geom = feature.geometry || {};
                
                // 1. Extraction des coordonnées
                let lat = null, lon = null;
                if (geom.type === 'Point' && Array.isArray(geom.coordinates)) {
                    [lon, lat] = geom.coordinates;
                } else if (geom.type === 'GeometryCollection' && geom.geometries?.length > 0) {
                    const point = geom.geometries.find(g => g.type === 'Point');
                    if (point) [lon, lat] = point.coordinates;
                }

                // 2. Détection alerte permanente
                const isPermanent = props.type === '_REPEREPERMANENT';

                // 3. Extraction du code chantier (si présent)
                const codeChantier = props.code_chantier || null;

                // 4. Construction de l'objet alerte
                const alert = {
                    id: feature.id || props.id_repere,
                    deptCode: deptCode,
                    titre: props.titre || 'Alerte',
                    description: cleanText(props.description || ''),
                    date: props.date || '',
                    lat: lat,
                    lon: lon,
                    type: props.type,
                    isPermanent: isPermanent, // Nouveau flag pour le filtrage
                    codeChantier: codeChantier, // Nouvelle donnée pour l'affichage
                    docs: props.docs || [],
                    raw: props // Conservation des données brutes au besoin
                };

                // 5. Normalisation des données pour le rendu (utilisé par votre logique actuelle)
                alert.cross = `${alert.titre} ${alert.description} ${alert.type} ${alert.codeChantier || ''}`;
                
                alerts.push(alert);
            });
        } catch (err) {
            console.warn(`Erreur lors de la récupération du flux GeoJSON pour ${deptCode}:`, err);
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
