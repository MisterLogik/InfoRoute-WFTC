import { DEPARTEMENTS_CONFIG, SAVOIE_CATEGORIES } from './config-api.js';

export async function fetchDeptData(deptCode) {
    const config = DEPARTEMENTS_CONFIG[deptCode];
    if (!config) return [];

    try {
        if (config.format === 'turbolead-geojson') {
            return await fetchTurboleadData(deptCode, config.sources);
        } else if (config.format === 'savoie-api') {
            return await fetchSavoieApiData(deptCode, config.apiUrlBase);
        }
    } catch (error) {
        console.error(`Erreur globale de récupération pour le département ${deptCode}:`, error);
    }
    return [];
}

// --- MOTEUR 1 : Isère (38) & Haute-Savoie (74) ---
async function fetchTurboleadData(deptCode, sources) {
    const promises = sources.map(async (source) => {
        try {
            // !!! LA CORRECTION EST ICI !!!
            // Au lieu de fetch(source.url), on passe l'URL originale en paramètre à votre Worker
            const urlViaWorker = `https://hub-inforoutefrance.xtremxlogik.workers.dev/?url=${encodeURIComponent(source.url)}`;
            
            const response = await fetch(urlViaWorker);
            
            if (!response.ok) {
                throw new Error(`Erreur serveur proxy: ${response.status}`);
            }

            // Votre worker renvoie directement le vrai fichier JSON sans l'envelopper
            const geojson = await response.json();
            
            if (!geojson || !geojson.features || !Array.isArray(geojson.features)) return [];

            return geojson.features.map((feat, index) => {
                const props = feat.properties || {};
                const geometry = feat.geometry || {};
                const coords = geometry.coordinates || [null, null];

                let type = source.name;
                if (props.nature) type = props.nature;
                if (props.type_evenement) type = props.type_evenement;

                return {
                    id: `${deptCode}-${source.name}-${index}`,
                    type: type,
                    title: props.axe || props.route || props.titre || source.name,
                    cross: cleanText(props.commentaire || props.description || props.texte || "Aucun détail."),
                    updated: props.date_deb || props.date_maj || "Date non spécifiée",
                    severity: props.bloquant === true || props.bloquant === "O" ? "danger" : "warning",
                    lat: coords[1],
                    lon: coords[0]
                };
            });
        } catch (e) {
            console.warn(`Impossible de charger la source Turbolead: ${source.name}`, e);
            return [];
        }
    });

    const results = await Promise.all(promises);
    return results.flat();
}

// --- MOTEUR 2 : Savoie (73) ---
async function fetchSavoieApiData(deptCode, apiBaseUrl) {
    let alerts = [];
    const categoryIds = Object.keys(SAVOIE_CATEGORIES);

    for (const catId of categoryIds) {
        try {
            const list = await gmPostJson(apiBaseUrl, { id: parseInt(catId) });
            if (!list || !Array.isArray(list)) continue;

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

// --- UTILS : Nettoyage et requêtes POST ---
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
    // Si échec direct en raison du CORS, on passe par un déroutement via CorsProxy.io pour le GET simulé
    return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    }).catch(() => {
        const fallBackUrl = `https://corsproxy.io/?${encodeURIComponent(url + '?id=' + (body.id || body.idAll || ''))}`;
        return fetch(fallBackUrl);
    }).then(async (res) => {
        const rawData = await res.json();
        if (rawData.contents) {
            return JSON.parse(rawData.contents);
        }
        return rawData;
    });
}
