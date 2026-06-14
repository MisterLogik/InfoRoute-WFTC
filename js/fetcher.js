import { SAVOIE_CONFIG, SAVOIE_CATEGORIES, PROXY_URL } from './config-api.js';

export async function fetchSavoieData() {
    let allAlerts = [];

    try {
        // Exécution simultanée des événements par catégorie et des Flash Infos
        const [eventAlerts, flashAlerts] = await Promise.all([
            fetchStandardEvents(),
            fetchFlashInfos()
        ]);

        allAlerts = [...eventAlerts, ...flashAlerts];
    } catch (error) {
        console.error("Erreur globale lors de la récupération des données Savoie:", error);
    }

    return allAlerts;
}

// --- Récupération des événements classiques (2 étapes : Liste -> Détails) ---
async function fetchStandardEvents() {
    let alerts = [];
    const categoryIds = Object.keys(SAVOIE_CATEGORIES);

    const promises = categoryIds.map(async (catId) => {
        try {
            const list = await gmPostJson(SAVOIE_CONFIG.apiUrlEvents, { id: parseInt(catId) });
            if (!Array.isArray(list)) return [];

            const detailPromises = list.map(async (item) => {
                try {
                    const detail = await gmPostJson(`${SAVOIE_CONFIG.apiUrlEvents}/allData`, { idAll: item.idtInfo });
                    let d = Array.isArray(detail) ? detail[0] : (detail?.Detail_allData?.[0] || detail);
                    
                    if (!d) return null;

                    const lat = parseFloat(d.Latitude || item.latitude || d.latitude);
                    const lon = parseFloat(d.Longitude || item.longitude || d.longitude);
                    const axe = d.Axe || item.axe || '';
                    const commune = d.Commune || item.commune || '';
                    const frType = d.FRType || item.libelleType || SAVOIE_CATEGORIES[catId];
                    
                    const titre = [frType, axe, commune].filter(Boolean).join(' — ') || `Alerte #${item.idtInfo}`;
                    const commentaireClean = cleanText(d.Commentaire || item.commentaire || '');

                    return {
                        id: `73-evt-${item.idtInfo}`,
                        isFlash: false,
                        originalCategory: SAVOIE_CATEGORIES[catId],
                        title: titre,
                        // On isole strictement la description textuelle brute ici
                        description: commentaireClean, 
                        // On extrait l'impact spécifique de la Savoie de façon isolée
                        impact: (d.FRTrafficConstrictionType && d.FRTrafficConstrictionType !== "null") ? d.FRTrafficConstrictionType.trim() : null,
                        startRaw: d.Debut || null,
                        endRaw: d.Fin || null,
                        lat: isNaN(lat) ? null : lat,
                        lon: isNaN(lon) ? null : lon
                    };
                } catch (err) {
                    return null;
                }
            });

            const resolvedDetails = await Promise.all(detailPromises);
            return resolvedDetails.filter(Boolean);
        } catch (err) {
            console.warn(`Erreur sur la catégorie Savoie ${catId}:`, err);
            return [];
        }
    });

    const results = await Promise.all(promises);
    return results.flat();
}

// --- Récupération des Flash Infos (Alertes Urgentes) ---
async function fetchFlashInfos() {
    try {
        const flashList = await gmPostJson(SAVOIE_CONFIG.apiUrlFlash, {});
        if (!Array.isArray(flashList)) return [];

        return flashList.map((flash, index) => {
            const lat = parseFloat(flash.latitude || flash.Latitude);
            const lon = parseFloat(flash.longitude || flash.Longitude);
            
            return {
                id: `73-flash-${flash.id || index}`,
                isFlash: true,
                originalCategory: "Flash Info",
                title: cleanText(flash.titre || flash.Titre || "⚠️ ALERTE FLASH SÉCURITÉ"),
                description: cleanText(flash.texte || flash.Texte || flash.commentaire || ""),
                updated: flash.date_deb || flash.Creation || "En cours",
                startRaw: flash.date_deb || null,
                endRaw: flash.date_fin || null,
                lat: isNaN(lat) ? null : lat,
                lon: isNaN(lon) ? null : lon
            };
        });
    } catch (err) {
        console.warn("Erreur lors de la récupération des Flash Infos Savoie:", err);
        return [];
    }
}

// --- Outils d'infrastructure (Requêtes et Nettoyage) ---
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

function cleanText(str) {
    if (!str || str === "null") return '';
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
