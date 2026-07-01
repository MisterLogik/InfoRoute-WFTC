import { DEPARTEMENTS_CONFIG, SAVOIE_CATEGORIES, PROXY_URL } from './config-api.js';

export async function fetchDeptData(deptCode) {
    const config = DEPARTEMENTS_CONFIG[deptCode];
    if (!config) return [];

    try {
        if (config.format === 'savoie-api') {
            return await fetchSavoieApiData(deptCode, config.apiUrlBase);
        } else if (config.format === 'geojson-standard') {
            return await fetchGeoJsonStandardData(deptCode, config.apiUrlBase);
        }
    } catch (error) {
        console.error(`Erreur globale de récupération pour le département ${deptCode}:`, error);
    }
    return [];
}

// --- TRADUCTEUR UNIVERSEL : GeoJSON Standard (Aude, Côte d'Or, etc.) ---
async function fetchGeoJsonStandardData(deptCode, apiUrl) {
    const alerts = [];
    // Utilisation du proxy Cloudflare avec une requête GET classique
    const targetUrl = `${PROXY_URL}${apiUrl}`;
    
    try {
        const response = await fetch(targetUrl);
        const text = await response.text();
        
        // Sécurité : Si Cloudflare bloque l'accès, on intercepte avant le crash du JSON.parse
        if (text.includes("Just a moment...") || text.includes("challenge-platform")) {
            console.warn(`[Dept ${deptCode}] Requête bloquée par le challenge Cloudflare du site source.`);
            return [];
        }

        const geojson = JSON.parse(text);
        if (!geojson || !Array.isArray(geojson.features)) return [];

        for (const feature of geojson.features) {
            const props = feature.properties || {};
            const geom = feature.geometry || {};

            // Récupération des coordonnées (GeoJSON utilise [lon, lat])
            let lon = null;
            let lat = null;
            if (geom.type === 'Point' && Array.isArray(geom.coordinates)) {
                lon = parseFloat(geom.coordinates[0]);
                lat = parseFloat(geom.coordinates[1]);
            }

            // Reconstruction de la chaîne "cross" pour émuler le format interne existant de l'appli
            const lines = [];
            if (props.code) lines.push(`Type : ${cleanText(props.code)}`);
            if (props.source) lines.push(`Impact : ${cleanText(props.source)}`);
            if (props.date_evt_debut) lines.push(`Début : ${props.date_evt_debut}`);
            if (props.date_evt_fin) lines.push(`Fin : ${props.date_evt_fin}`);
            
            const desc = cleanText(props.description);
            if (desc) {
                lines.push(`Détails : ${desc}`);
            }

            // Détermination automatique de la sévérité selon le type d'icône/code
            let severity = "info";
            const lowerCode = (props.code || "").toLowerCase();
            if (lowerCode.includes("travaux") || lowerCode.includes("ak5")) {
                severity = "warning";
            } else if (lowerCode.includes("danger") || lowerCode.includes("ak14") || lowerCode.includes("barré")) {
                severity = "danger";
            }

            alerts.push({
                idtInfo: props.id_repere || feature.id || Math.random().toString(36).substr(2, 9),
                deptCode: deptCode,
                computedCategory: severity === "warning" ? "Alternat" : "Alerte",
                computedSeverity: severity,
                title: cleanText(props.titre || "Alerte InfoRoute"),
                type: cleanText(props.code || "Événement"),
                cross: lines.join('\n'),
                updated: props.date_evt_debut || "Récemment",
                lat: isNaN(lat) ? null : lat,
                lon: isNaN(lon) ? null : lon
            });
        }
    } catch (err) {
        console.error(`Erreur de traitement GeoJSON pour le département ${deptCode}:`, err);
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

                    const catConfig = SAVOIE_CATEGORIES[catId];
                    const chunks = [];
                    if (d.Type) chunks.push(`Type : ${cleanText(d.Type)}`);
                    if (d.Impact) chunks.push(`Impact : ${cleanText(d.Impact)}`);
                    if (d.Debut) chunks.push(`Début : ${d.Debut}`);
                    if (d.Fin) chunks.push(`Fin : ${d.Fin}`);
                    if (d.Detail) chunks.push(`Détails : ${cleanText(d.Detail)}`);

                    const lat = parseFloat(d.Latitude);
                    const lon = parseFloat(d.Longitude);

                    alerts.push({
                        idtInfo: item.idtInfo,
                        deptCode: deptCode,
                        computedCategory: catConfig.name,
                        computedSeverity: catConfig.severity,
                        title: cleanText(d.Axe || item.libelle || "Alerte Savoie"),
                        type: catConfig.name,
                        cross: chunks.join('\n').trim(),
                        updated: d.Debut || "Récemment",
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
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: "POST",
            url: `${PROXY_URL}${url}`,
            headers: { "Content-Type": "application/json" },
            data: JSON.stringify(body),
            onload: function(res) {
                try {
                    resolve(JSON.parse(res.responseText));
                } catch(e) {
                    reject(e);
                }
            },
            onerror: reject
        });
    });
}
