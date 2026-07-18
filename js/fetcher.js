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

// --- MOTEUR UNIVERSEL : Flux GeoJSON standard & Turbolead (GET) ---
async function fetchGeojsonData(deptCode, urls) {
    let alerts = [];
    
    for (const url of urls) {
        try {
            const geojson = await gmGetJson(url);
            if (!geojson || !Array.isArray(geojson.features)) continue;

            geojson.features.forEach((feature, index) => {
                const props = feature.properties || {};
                let geom = feature.geometry || {};
                
                // --- GESTION ET DESCENTE DANS LES GEOMETRYCOLLECTION ---
                if (geom.type === 'GeometryCollection' && Array.isArray(geom.geometries)) {
                    const lineGeom = geom.geometries.find(g => g.type === 'MultiLineString' || g.type === 'LineString');
                    if (lineGeom) {
                        geom = lineGeom;
                    } else if (geom.geometries[0]) {
                        geom = geom.geometries[0];
                    }
                }

                // Extraction des coordonnées géographiques
                let lat = null, lon = null;
                let latEnd = null, lonEnd = null;

                if (geom.type === 'Point' && Array.isArray(geom.coordinates)) {
                    lon = parseFloat(geom.coordinates[0]);
                    lat = parseFloat(geom.coordinates[1]);
                } 
                else if (geom.type === 'LineString' && Array.isArray(geom.coordinates) && geom.coordinates.length > 0) {
                    const firstPt = geom.coordinates[0];
                    const lastPt = geom.coordinates[geom.coordinates.length - 1];
                    lon = parseFloat(firstPt[0]);
                    lat = parseFloat(firstPt[1]);
                    lonEnd = parseFloat(lastPt[0]);
                    latEnd = parseFloat(lastPt[1]);
                } 
                else if (geom.type === 'MultiLineString' && Array.isArray(geom.coordinates) && geom.coordinates[0]) {
                    const activeLine = geom.coordinates[0];
                    if (Array.isArray(activeLine) && activeLine.length > 0) {
                        const firstPt = activeLine[0];
                        const lastPt = activeLine[activeLine.length - 1];
                        lon = parseFloat(firstPt[0]);
                        lat = parseFloat(firstPt[1]);
                        lonEnd = parseFloat(lastPt[0]);
                        latEnd = parseFloat(lastPt[1]);
                    }
                } 
                else if (geom.type === 'MultiPoint' && Array.isArray(geom.coordinates) && geom.coordinates[0]) {
                    const firstPt = geom.coordinates[0];
                    lon = parseFloat(firstPt[0]);
                    lat = parseFloat(firstPt[1]);
                }

                // 2. Analyse intelligente du texte pour la Nature et l'Impact
                const descriptionBrute = props.description || props.texte || props.commentaire || props.Commentaire || '';
                const titreBrut = props.titre || '';
                const scanZone = `${titreBrut} ${descriptionBrute}`.toLowerCase();
                
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
                if (scanZone.includes('24h / 24') && (scanZone.includes('fermé') || scanZone.includes('coupé') || scanZone.includes('barré'))) {
                    impact = 'Route coupée 24h/24';
                } else if (scanZone.includes('route fermée') || scanZone.includes('route coupée') || scanZone.includes('route barrée') || scanZone.includes('barré')) {
                    impact = 'Route coupée';
                } else if (scanZone.includes('alternat')) {
                    impact = 'Alternat';
                }

                // 3. Extraction de l'axe et de la commune (Amélioré pour le Dép. 14)
                let axe = props.axe || props.route || props.Axe || props.route_libelle || '';
                let commune = props.commune || props.ville || props.Commune || '';
                
                if (titreBrut && (!axe || !commune)) {
                    // Fallback 1: Si format "Titre - Sous-titre"
                    if (titreBrut.includes(' - ')) {
                        const parts = titreBrut.split(/\s*-\s*/);
                        if (parts.length >= 2) {
                            if (!axe) axe = parts[0].trim();
                            if (!commune) commune = parts.slice(1).join(' - ').trim();
                        }
                    } 
                    // Fallback 2: Spécifique format Calvados 14 "RD X Commune de Y"
                    else if (titreBrut.toLowerCase().includes('commune de')) {
                        const match14 = titreBrut.match(/(.*?)\s*commune\s*de\s*(.*)/i);
                        if (match14) {
                            if (!axe) axe = match14[1].trim();
                            if (!commune) commune = match14[2].trim();
                        }
                    }
                }

                // Si malgré tout on a rien trouvé, on prend le titre brut complet pour l'axe
                if (!axe && titreBrut) axe = titreBrut;

                // Reconstruction du Titre au format standardisé "Nature — Axe — Commune"
                const titreUnifie = [natureType, axe, commune].filter(Boolean).join(' — ') || titreBrut || `Événement #${deptCode}-${index}`;

                // 4. Normalisation stricte des dates (Nettoyage des doubles espaces de Turbolead)
                const dateDebRaw = (props.date_evt_debut || props.date_deb || props.debut || props.Debut || '').replace(/\s+/g, ' ').trim();
                const dateFinRaw = (props.date_evt_fin || props.date_fin || props.fin || props.Fin || '').replace(/\s+/g, ' ').trim();

                const formatYear = (str) => {
                    if (!str) return '';
                    // Transforme "JJ/MM/AA HH:MM" en "JJ/MM/20AA HH:MM"
                    return str.replace(/(\d{2})\/(\d{2})\/(\d{2})(\s+|\b)/g, '$1/$2/20$3$4').trim();
                };

                const dateDebut = formatYear(dateDebRaw) || 'Non spécifiée';
                const dateFin = formatYear(dateFinRaw);

                // 5. Assemblage rigoureux du bloc textuel attendu par le parser Regex de app.js
                let chunks = [];
                chunks.push(`Type : ${natureType}`);
                chunks.push(`Impact : ${impact}`);
                chunks.push(`Emplacement : ${[axe, commune].filter(Boolean).join(' — ') || titreBrut}`);
                chunks.push(`Début : ${dateDebut}`);
                if (dateFin) chunks.push(`Fin : ${dateFin}`);
                
                let sourceFinale = props.source || "";
                if (!sourceFinale && url.toLowerCase().includes('inforoute')) {
                    sourceFinale = `Inforoute ${deptCode}`;
                }
                chunks.push(`Source : ${sourceFinale || 'Non spécifiée'}`);

                if (descriptionBrute) {
                    chunks.push(`\nDétails :\n${cleanText(descriptionBrute)}`);
                }

                alerts.push({
                    id: `${deptCode}-${props.id || props.uid || props.idtInfo || props.id_repere || index}`,
                    type: natureType,
                    title: titreUnifie,
                    cross: chunks.join('\n').trim(),
                    updated: dateDebut !== 'Non spécifiée' ? dateDebut : "Récemment",
                    severity: 'info', 
                    lat: isNaN(lat) ? null : lat,
                    lon: isNaN(lon) ? null : lon,
                    latEnd: isNaN(latEnd) ? null : latEnd,
                    lonEnd: isNaN(lonEnd) ? null : lonEnd,
                    source: sourceFinale || "Non spécifiée",
                    docs: props.docs || [],
                    icon_svg: props.url_icone || null // Sauvegarde du lien icône pour l'UI
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
                    chunks.push(`Source : Département 73`);
                    
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
                        lon: isNaN(lon) ? null : lon,
                        source: "Département 73"
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

// --- MOTEUR AMÉLIORÉ : Flux XML Datex II (BFO) ---
async function fetchDatex2Data(deptCode, urls) {
    let alerts = [];
    
    for (const url of urls) {
        try {
            const xmlText = await gmGetText(url);
            if (!xmlText) continue;

            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");
            const situations = xmlDoc.querySelectorAll("*|situation");

            situations.forEach((situation) => {
                const sitId = situation.getAttribute("id") || "unknown";
                const sitVersion = situation.getAttribute("version") || "1";
                const versionTimeRaw = situation.querySelector("*|situationVersionTime")?.textContent;
                const dateMiseAJour = versionTimeRaw ? new Date(versionTimeRaw).toLocaleString('fr-FR').replace(',', '') : 'Non spécifiée';
                const severity = situation.querySelector("*|overallSeverity")?.textContent || "Non spécifié";
                const records = situation.querySelectorAll("*|situationRecord");
                
                let startRaw = "";
                let endRaw = "";
                let detailsArray = [];
                let roadsArray = [];
                let townsArray = [];
                let lat = null, lon = null;
                let recordTypes = [];

                records.forEach((record) => {
                    if (!startRaw) startRaw = record.querySelector("*|overallStartTime")?.textContent || "";
                    if (!endRaw) endRaw = record.querySelector("*|overallEndTime")?.textContent || "";

                    const typeRaw = record.getAttribute("xsi:type") || "";
                    if (typeRaw) {
                        const cleanType = typeRaw.replace("ns2:", "");
                        if (!recordTypes.includes(cleanType)) recordTypes.push(cleanType);
                    }

                    const comments = record.querySelectorAll("*|generalPublicComment");
                    comments.forEach(comment => {
                        const val = comment.querySelector("*|value")?.textContent;
                        const cType = comment.querySelector("*|commentType")?.textContent;
                        if (val && !detailsArray.includes(val)) {
                            if (cType === "description") detailsArray.unshift(val); 
                            else detailsArray.push(val);
                        }
                    });

                    const periodName = record.querySelector("*|validPeriod *|value")?.textContent;
                    if (periodName && !detailsArray.includes(periodName)) {
                        detailsArray.push(`Période : ${periodName}`);
                    }

                    const itinerary = record.querySelector("*|reroutingItineraryDescription *|value")?.textContent;
                    if (itinerary) detailsArray.push(`Déviation : ${itinerary}`);

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

                    const roadNumber = record.querySelector("*|roadNumber")?.textContent;
                    if (roadNumber && !roadsArray.includes(roadNumber)) roadsArray.push(roadNumber);
                    
                    const locationNames = record.querySelectorAll("*|alertCLocationName *|value");
                    locationNames.forEach(loc => {
                        if (loc.textContent && !townsArray.includes(loc.textContent)) townsArray.push(loc.textContent);
                    });
                });

                const formatDate = (isoStr) => isoStr ? new Date(isoStr).toLocaleString('fr-FR').replace(',', '') : 'Non spécifiée';
                const dateDebut = formatDate(startRaw);
                const dateFin = formatDate(endRaw);

                const axeRoutier = roadsArray.join(', ') || "Axe inconnu";
                const communesConcat = townsArray.join(' / ') || "Lieu inconnu";
                const emplacementConcat = `${axeRoutier} — ${communesConcat}`;
                const detailsConcat = detailsArray.join('\n') || "Pas de détails disponibles";

                const prefixBFO = `BFO-${sitId}-${sitVersion}`;
                const titreUnifie = `${prefixBFO} — ${axeRoutier} — ${communesConcat}`;

                let crossChunks = [];
                crossChunks.push(`Type : Alerte (${recordTypes.join(', ')})`);
                crossChunks.push(`Impact : ${severity}`);
                crossChunks.push(`Emplacement : ${emplacementConcat}`);
                crossChunks.push(`Début : ${dateDebut}`);
                if (startRaw !== endRaw && endRaw) crossChunks.push(`Fin : ${dateFin}`);
                crossChunks.push(`Source : BFO`);
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
                    source: "BFO",
                    axe: axeRoutier,       
                    commune: communesConcat, 
                    docs: []
                });
            });
        } catch (err) {
            console.error(`Erreur parsing XML pour ${deptCode}:`, err);
        }
    }
    return alerts;
}

// --- UTILS ---
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
