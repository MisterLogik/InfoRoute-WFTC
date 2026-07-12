import { DEPARTEMENTS_CONFIG, SAVOIE_CATEGORIES, PROXY_URL } from './config-api.js';

export async function fetchDeptData(deptCode) {
    const config = DEPARTEMENTS_CONFIG[deptCode];
    if (!config) return [];

    try {
        if (config.format === 'savoie-api') {
            return await fetchSavoieApiData(deptCode, config.apiUrlBase);
        } else if (config.format === 'geojson-get') {
            return await fetchGeojsonData(deptCode, config.urls);
        } else if (config.format === 'xml-datex2') { 
            return await fetchDatex2Data(deptCode, config.urls);
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
                
                // 1. Extraction des coordonnées géographiques
                let lat = null, lon = null;
                if (geom.type === 'Point' && Array.isArray(geom.coordinates)) {
                    lon = geom.coordinates[0];
                    lat = geom.coordinates[1];
                } else if ((geom.type === 'LineString' || geom.type === 'MultiLineString') && Array.isArray(geom.coordinates)) {
                    const firstCoord = geom.type === 'LineString' ? geom.coordinates[0] : geom.coordinates[0][0];
                    if (Array.isArray(firstCoord)) {
                        lon = firstCoord[0];
                        lat = firstCoord[1];
                    }
                }

                if (lat === null || lon === null || isNaN(lat) || isNaN(lon)) return;

                // 2. Normalisation des données pour s'adapter à Inforoute25 et aux autres
                const rawTitle = props.title || props.titre || props.nom || 'Alerte Routière';
                const description = props.description || props.texte || props.commune || 'Aucune description fournie.';
                const rawSource = props.source || props.origine || 'Non spécifiée';

                // Gestion des dates
                let dateDebutStr = props.date_evt_debut || props.date_debut || props.dateDebut || '';
                let dateFinStr = props.date_evt_fin || props.date_fin || props.dateFin || '';
                if (!dateDebutStr && props.date) dateDebutStr = props.date; 

                // Gestion de la localisation (Axe / Ville)
                // Inforoute25 met souvent tout dans "titre" (ex: "RD 663 VOUJEAUCOURT"), on va l'isoler si possible
                let axe = props.axe || props.route || '';
                let commune = props.commune || props.zone || '';

                if (!axe && rawTitle) {
                    // Si pas d'axe défini, on extrait le premier mot du titre (ex: "RD 663")
                    const matchAxe = rawTitle.match(/^(RM|RD|RN|A|Axe)\s*\d+[A-Z]?/i);
                    axe = matchAxe ? matchAxe[0] : rawTitle;
                }
                if (!commune && rawTitle && axe && rawTitle !== axe) {
                    commune = rawTitle.replace(axe, '').trim();
                }

                let natureAlert = props.code || 'Alerte';
                if (natureAlert.includes(' ')) {
                    // Supprime le code de panneau/pictogramme (ex: "AK5 ", "AK14 ") pour ne garder que le texte propre
                    natureAlert = natureAlert.replace(/^[A-Z0-9]+\s+/i, '');
                }
                
                // 2. Détermination de la base textuelle descriptive
                const chantier = (props.code_chantier || '').trim();
                const rawTitle = (props.titre || props.title || '').trim();
                
                let detailPlacement = '';
                if (chantier) {
                    detailPlacement = chantier;
                } else if (rawTitle) {
                    detailPlacement = rawTitle;
                } else {
                    detailPlacement = props.zone || 'Lieu inconnu';
                }
                
                // 3. Normalisation finale du titre au format attendu par app.js : "Nature — Détails"
                // Ex 1 : "Travaux — RD 201 - Rénovation Mairie (VILLEDUBERT)"
                // Ex 2 : "Travaux — RD 413 (PR1+0000 à 1+0850)"
                const finalTitle = `${natureAlert} — ${detailPlacement}`;

                // 3. Détermination de la sévérité
                let severity = 'warning'; 
                const textForSeverity = (rawTitle + ' ' + description).toLowerCase();
                if (textForSeverity.includes('barrée') || textForSeverity.includes('fermé') || textForSeverity.includes('bloqué') || props.code === 'KC1_RBARREE') {
                    severity = 'danger';
                } else if (textForSeverity.includes('ralentissement') || textForSeverity.includes('travaux')) {
                    severity = 'warning';
                }

                // 4. Construction de la description globale 'cross'
                let crossChunks = [];
                crossChunks.push(`Type : ${natureAlert}`);
                crossChunks.push(`Impact : ${severity === 'danger' ? 'Bloquant' : 'Modéré'}`);
                crossChunks.push(`Emplacement : ${axe} ${commune ? `(${commune})` : ''}`);
                if (dateDebutStr) crossChunks.push(`Période : ${dateDebutStr} ${dateFinStr ? `au ${dateFinStr}` : ''}`);
                crossChunks.push(`Source : ${rawSource}`);
                crossChunks.push(`\nDétails :\n${description}`);

                alerts.push({
                    id: props.id_repere ? `${deptCode}-${props.id_repere}` : `${deptCode}-geojson-${index}`,
                    type: 'Alerte',
                    title: finalTitle,
                    cross: crossChunks.join('\n').trim(),
                    updated: props.date_maj || new Date().toLocaleDateString('fr-FR'),
                    severity: severity,
                    lat: parseFloat(lat),
                    lon: parseFloat(lon),
                    axe: axe,
                    commune: commune,
                    source: rawSource, // Sauvegarde de la source pour app.js
                    docs: []
                });
            });
        } catch (err) {
            console.error(`Erreur parsing GeoJSON sur l'URL ${url} :`, err);
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

// --- MOTEUR AMÉLIORÉ : Flux XML Datex II (Bison Futé National) ---
async function fetchDatex2Data(deptCode, urls) {
    let alerts = [];
    
    for (const url of urls) {
        try {
            const xmlText = await gmGetText(url);
            if (!xmlText) continue;

            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");
            
            // On cible d'abord les situations globales
            const situations = xmlDoc.querySelectorAll("*|situation");

            situations.forEach((situation) => {
                const sitId = situation.getAttribute("id") || "unknown";
                const sitVersion = situation.getAttribute("version") || "1";
                
                // Date de mise à jour globale de la situation
                const versionTimeRaw = situation.querySelector("*|situationVersionTime")?.textContent;
                const dateMiseAJour = versionTimeRaw ? new Date(versionTimeRaw).toLocaleString('fr-FR').replace(',', '') : 'Non spécifiée';

                // Recherche de la sévérité globale (Impact)
                const severity = situation.querySelector("*|overallSeverity")?.textContent || "Non spécifié";

                // Exploration des sous-records de la situation
                const records = situation.querySelectorAll("*|situationRecord");
                
                let startRaw = "";
                let endRaw = "";
                let detailsArray = [];
                let roadsArray = [];
                let townsArray = [];
                let lat = null, lon = null;
                let recordTypes = [];

                records.forEach((record) => {
                    // 1. Extraction des dates
                    if (!startRaw) startRaw = record.querySelector("*|overallStartTime")?.textContent || "";
                    if (!endRaw) endRaw = record.querySelector("*|overallEndTime")?.textContent || "";

                    // 2. Extraction du type de record
                    const typeRaw = record.getAttribute("xsi:type") || "";
                    if (typeRaw) {
                        const cleanType = typeRaw.replace("ns2:", "");
                        if (!recordTypes.includes(cleanType)) recordTypes.push(cleanType);
                    }

                    // 3. Accumulation des commentaires (Détails)
                    const comments = record.querySelectorAll("*|generalPublicComment");
                    comments.forEach(comment => {
                        const val = comment.querySelector("*|value")?.textContent;
                        const cType = comment.querySelector("*|commentType")?.textContent;
                        if (val && !detailsArray.includes(val)) {
                            if (cType === "description") {
                                detailsArray.unshift(val); 
                            } else {
                                detailsArray.push(val);
                            }
                        }
                    });

                    // 4. Extraction des périodes spécifiques (ex: "Uniquement de nuit")
                    const periodName = record.querySelector("*|validPeriod *|value")?.textContent;
                    if (periodName && !detailsArray.includes(periodName)) {
                        detailsArray.push(`Période : ${periodName}`);
                    }

                    // 5. Extraction des descriptions d'itinéraire de déviation
                    const itinerary = record.querySelector("*|reroutingItineraryDescription *|value")?.textContent;
                    if (itinerary) {
                        detailsArray.push(`Déviation : ${itinerary}`);
                    }

                    // 6. Extraction des coordonnées géographiques
                    if (lat === null || lon === null) {
                        const fromPoint = record.querySelector("*|from *|pointCoordinates");
                        if (fromPoint) {
                            lat = parseFloat(fromPoint.querySelector("*|latitude")?.textContent);
                            lon = parseFloat(fromPoint.querySelector("*|longitude")?.textContent);
                        } else {
                            const genericLat = record.querySelector("*|latitude")?.textContent;
                            const genericLon = record.querySelector("*|longitude")?.textContent;
                            if (genericLat && genericLon) {
                                lat = parseFloat(genericLat);
                                lon = parseFloat(genericLon);
                            }
                        }
                    }

                    // 7. Extraction distincte de la route (Axe) et de la ville (Commune)
                    const roadNumber = record.querySelector("*|roadNumber")?.textContent;
                    if (roadNumber && !roadsArray.includes(roadNumber)) {
                        roadsArray.push(roadNumber);
                    }
                    
                    const locationNames = record.querySelectorAll("*|alertCLocationName *|value");
                    locationNames.forEach(loc => {
                        if (loc.textContent && !townsArray.includes(loc.textContent)) {
                            townsArray.push(loc.textContent);
                        }
                    });
                });

                // Formatage des dates
                const formatDate = (isoStr) => isoStr ? new Date(isoStr).toLocaleString('fr-FR').replace(',', '') : 'Non spécifiée';
                const dateDebut = formatDate(startRaw);
                const dateFin = formatDate(endRaw);

                // Construction des chaînes de localisation
                const axeRoutier = roadsArray.join(', ') || "Axe inconnu";
                const communesConcat = townsArray.join(' / ') || "Lieu inconnu";
                const emplacementConcat = `${axeRoutier} — ${communesConcat}`;
                
                const detailsConcat = detailsArray.join('\n') || "Pas de détails disponibles";

                // Format strict pour s'adapter au split(' — ') de app.js : "Nature — Axe — Commune"
                // On met l'identifiant BFO unique au début comme type/nature pour l'UI
                const prefixBFO = `BFO-${sitId}-${sitVersion}`;
                const titreUnifie = `${prefixBFO} — ${axeRoutier} — ${communesConcat}`;

                // Reconstitution du bloc textuel interne
                let crossChunks = [];
                crossChunks.push(`Type : Alerte (${recordTypes.join(', ')})`);
                crossChunks.push(`Impact : ${severity}`);
                crossChunks.push(`Emplacement : ${emplacementConcat}`);
                crossChunks.push(`Début : ${dateDebut}`);
                if (startRaw !== endRaw && endRaw) crossChunks.push(`Fin : ${dateFin}`);
                crossChunks.push(`\nDétails :\n${detailsConcat}`);

                alerts.push({
                    id: `${deptCode}-${sitId}_${sitVersion}`,
                    type: 'Alerte',
                    title: titreUnifie,
                    cross: crossChunks.join('\n').trim(), 
                    updated: dateMiseAJour, 
                    severity: severity === 'high' ? 'danger' : 'warning',
                    lat: isNaN(lat) ? null : lat,
                    lon: isNaN(lon) ? null : lon,
                    axe: axeRoutier,       // Ajout explicite pour app.js
                    commune: communesConcat, // Ajout explicite pour app.js
                    docs: []
                });
            });
        } catch (err) {
            console.error(`Erreur parsing XML pour ${deptCode}:`, err);
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

function gmGetText(url) {
    const proxiedUrl = `${PROXY_URL}?url=${encodeURIComponent(url)}`;
    return fetch(proxiedUrl, {
        method: 'GET'
    }).then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
    });
}
