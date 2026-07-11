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
                    lon = parseFloat(geom.coordinates[0]);
                    lat = parseFloat(geom.coordinates[1]);
                } else if ((geom.type === 'LineString' || geom.type === 'MultiPoint') && Array.isArray(geom.coordinates) && geom.coordinates[0]) {
                    const firstPt = Array.isArray(geom.coordinates[0][0]) ? geom.coordinates[0][0] : geom.coordinates[0];
                    lon = parseFloat(firstPt[0]);
                    lat = parseFloat(firstPt[1]);
                }

                // 2. Récupération ou découpage intelligent de l'axe et de la commune
                let axe = props.axe || props.route || props.Axe || props.route_libelle || '';
                let commune = props.commune || props.ville || props.Commune || '';
                
                // Si Turbolead fournit un titre composite (ex: "RD 251 - THUSY - Info travaux")
                if (props.titre && (!axe || !commune)) {
                    const parts = props.titre.split(/\s*-\s*/);
                    if (parts.length >= 2) {
                        if (!axe) axe = parts[0].trim();
                        if (!commune) commune = parts.slice(1).join(' - ').trim();
                    }
                }

                // 3. Déduction intelligente de la Nature et de l'Impact via analyse de texte
                const description = props.description || props.texte || props.commentaire || props.Commentaire || '';
                const scanZone = `${props.titre || ''} ${description}`.toLowerCase();
                
                let natureType = 'Alerte';
                if (scanZone.includes('travaux') || scanZone.includes('chantier') || scanZone.includes('ouvrage d’art')) {
                    natureType = 'Travaux';
                } else if (scanZone.includes('ferme') || scanZone.includes('coupé') || scanZone.includes('barré')) {
                    natureType = 'Fermeture';
                } else if (scanZone.includes('accident') || scanZone.includes('collision')) {
                    natureType = 'Accident';
                
                } else if (scanZone.includes('incendie') || scanZone.includes('feu de') || scanZone.includes('feux de') || scanZone.includes('fumée')) {
                    natureType = 'Incendie';
                
                } else if (
                    scanZone.includes('neige') || scanZone.includes('verglas') || scanZone.includes('chasseneige') || 
                    scanZone.includes('hivernal') || scanZone.includes('tempête') || scanZone.includes('vent ') || 
                    scanZone.includes('rafale') || scanZone.includes('inondation') || scanZone.includes('crue') || 
                    scanZone.includes('viabilité') || scanZone.includes('météo')
                ) {
                    natureType = 'Météo';
                    
                } else if (scanZone.includes('manifestation') || scanZone.includes('sportive')) {
                    natureType = 'Manifestation';
                } else if (scanZone.includes('bouchon') || scanZone.includes('ralentissement')) {
                    natureType = 'Bouchon';
                }

                let impact = 'Restriction';
                if (scanZone.includes('24h / 24') && (scanZone.includes('fermé') || scanZone.includes('coupé'))) {
                    impact = 'Route coupée 24h/24';
                } else if (scanZone.includes('route fermée') || scanZone.includes('route coupée')) {
                    impact = 'Route coupée';
                } else if (scanZone.includes('alternat')) {
                    impact = 'Alternat';
                }

                // 4. Reconstruction du Titre au format standardisé "Nature — Axe — Commune"
                const titreUnifie = [natureType, axe, commune].filter(Boolean).join(' — ') || props.titre || `Événement #${deptCode}-${index}`;

                // 5. Normalisation des dates (Gestion du format "JJ/MM/AA HH:MM" de Turbolead)
                const dateDebRaw = props.date_evt_debut || props.date_deb || props.debut || props.Debut || '';
                const dateFinRaw = props.date_evt_fin || props.date_fin || props.fin || props.Fin || '';

                const formatYear = (str) => {
                    if (!str) return '';
                    // Transforme "JJ/MM/AA" en "JJ/MM/20AA" si l'année n'a que 2 chiffres
                    return str.replace(/(\d{2})\/(\d{2})\/(\d{2})(\s+|\b)/g, '$1/$2/20$3$4').trim();
                };

                const dateDebut = formatYear(dateDebRaw) || 'Non spécifiée';
                const dateFin = formatYear(dateFinRaw);

                // 6. Assemblage du bloc textuel attendu par app.js
                let chunks = [];
                chunks.push(`Type : ${natureType}`);
                chunks.push(`Impact : ${impact}`);
                if (props.location || props.lieu) chunks.push(`Lieu : ${props.location || props.lieu}`);
                chunks.push(`Début : ${dateDebut}`);
                if (dateFin) chunks.push(`Fin : ${dateFin}`);
                if (description) chunks.push(`\nDétails :\n${cleanText(description)}`);

                alerts.push({
                    id: `${deptCode}-${props.id || props.uid || props.idtInfo || props.id_repere || index}`,
                    type: natureType,
                    title: titreUnifie,
                    cross: chunks.join('\n').trim(),
                    updated: dateDebut !== 'Non spécifiée' ? dateDebut : "Récemment",
                    severity: 'info', 
                    lat: isNaN(lat) ? null : lat,
                    lon: isNaN(lon) ? null : lon,
                    docs: props.docs || [] // FIX : Sauvegarde des documents joints
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
                let locationsArray = [];
                let lat = null, lon = null;
                let recordTypes = [];

                records.forEach((record) => {
                    // 1. Extraction des dates (on prend la première valide trouvée)
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
                                detailsArray.unshift(val); // Priorité à la description principale
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
                        // Cherche d'abord dans la géométrie du segment (fromPoint)
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

                    // 7. Extraction du lieu / axe routier
                    const roadNumber = record.querySelector("*|roadNumber")?.textContent;
                    if (roadNumber && !locationsArray.includes(roadNumber)) {
                        locationsArray.push(roadNumber);
                    }
                    const locationNames = record.querySelectorAll("*|alertCLocationName *|value");
                    locationNames.forEach(loc => {
                        if (loc.textContent && !locationsArray.includes(loc.textContent)) {
                            locationsArray.push(loc.textContent);
                        }
                    });
                });

                // Formatage des dates
                const formatDate = (isoStr) => isoStr ? new Date(isoStr).toLocaleString('fr-FR').replace(',', '') : 'Non spécifiée';
                const dateDebut = formatDate(startRaw);
                const dateFin = formatDate(endRaw);

                const emplacementConcat = locationsArray.join(' / ') || "Lieu non spécifié";
                const detailsConcat = detailsArray.join('\n') || "Pas de détails disponibles";

                // Titre unifié pour la liste et la carte
                const titreUnifie = `BFO-${sitId}-${sitVersion} — Alerte`;

                // Reconstitution des "chunks" propres de description, sans répéter les métadonnées globales
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
                    
                    // cross contiendra les infos formatées attendues par le bloc de texte de l'UI
                    cross: crossChunks.join('\n').trim(), 
                    
                    // Permet à app.js d'utiliser les vraies variables là où il en a besoin
                    updated: dateMiseAJour, 
                    severity: severity === 'high' ? 'danger' : 'warning',
                    lat: isNaN(lat) ? null : lat,
                    lon: isNaN(lon) ? null : lon,
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
