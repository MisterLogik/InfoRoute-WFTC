import { DEPARTEMENTS_CONFIG, BLACKLIST_KEYWORDS } from './config-api.js';
import { fetchDeptData } from './fetcher.js';

// --- État de l'application ---
window.ALL_ALERTS = []; 
let sortAscending = false; 
let currentView = 'grid'; 

// --- Éléments du DOM ---
const btnSyncAll = document.getElementById('btn-sync-all');
const btnResetFilters = document.getElementById('btn-reset-filters');
const btnToggleSort = document.getElementById('btn-toggle-sort');

const btnQuickToday = document.getElementById('btn-quick-today');
const btnQuickWeek = document.getElementById('btn-quick-week');
const btnQuickNextWeek = document.getElementById('btn-quick-next-week');
const btnQuickMonth = document.getElementById('btn-quick-month');
const btnQuickNextMonth = document.getElementById('btn-quick-next-month'); 

const btnViewGrid = document.getElementById('btn-view-grid');
const btnViewTable = document.getElementById('btn-view-table');

const syncStatus = document.getElementById('sync-status');
const filterDept = document.getElementById('filter-dept');
const filterType = document.getElementById('filter-type');
const filterSeverity = document.getElementById('filter-severity');
const filterShowBlacklist = document.getElementById('filter-show-blacklist'); 

const filterCurrentOnly = document.getElementById('filter-current-only');
const filterDateStart = document.getElementById('filter-date-start');
const filterDateStartLogic = document.getElementById('filter-date-start-logic');
const filterDateEnd = document.getElementById('filter-date-end');
const filterDateEndLogic = document.getElementById('filter-date-end-logic');

const searchBar = document.getElementById('search-bar');
const alertsGrid = document.getElementById('alerts-grid');
const loader = document.getElementById('loader');
const statTotal = document.getElementById('stat-total');
const statsBySeverity = document.getElementById('stats-by-severity'); 
const statsByDept = document.getElementById('stats-by-dept');

// --- Initialisation ---
document.addEventListener('DOMContentLoaded', () => {
    initFilters();
    loadFromLocalStorage();
    setupEventListeners();
});

function initFilters() {
    if (filterDept) {
        filterDept.innerHTML = '';
        
        // Ajout de l'option universelle manquante pour tout afficher d'un coup
        const optionAll = document.createElement('option');
        optionAll.value = 'all';
        optionAll.textContent = "📍 Tous les départements";
        filterDept.appendChild(optionAll);

        // Tri des codes de départements pour un affichage propre dans l'ordre (01, 04, 09, etc.)
        const sortedCodes = Object.keys(DEPARTEMENTS_CONFIG).sort();
        for (const code of sortedCodes) {
            const info = DEPARTEMENTS_CONFIG[code];
            const option = document.createElement('option');
            option.value = code;
            option.textContent = `${code} - ${info.name}`;
            filterDept.appendChild(option);
        }
    }
}

function setupEventListeners() {
    if (btnSyncAll) btnSyncAll.addEventListener('click', synchronizeAll);
    if (btnResetFilters) btnResetFilters.addEventListener('click', resetAllFilters);
    if (btnToggleSort) btnToggleSort.addEventListener('click', toggleSortOrder);
    
    if (btnQuickToday) btnQuickToday.addEventListener('click', setFilterToday);
    if (btnQuickWeek) btnQuickWeek.addEventListener('click', setFilterWeek);
    if (btnQuickNextWeek) btnQuickNextWeek.addEventListener('click', setFilterNextWeek);
    if (btnQuickMonth) btnQuickMonth.addEventListener('click', setFilterMonth);
    if (btnQuickNextMonth) btnQuickNextMonth.addEventListener('click', setFilterNextMonth); 

    if (btnViewGrid) btnViewGrid.addEventListener('click', () => { switchView('grid'); });
    if (btnViewTable) btnViewTable.addEventListener('click', () => { switchView('table'); });

    if (searchBar) searchBar.addEventListener('input', renderAlerts);
    if (filterDept) filterDept.addEventListener('change', renderAlerts);
    if (filterType) filterType.addEventListener('change', renderAlerts);
    if (filterSeverity) filterSeverity.addEventListener('change', renderAlerts);
    if (filterShowBlacklist) filterShowBlacklist.addEventListener('change', renderAlerts); 
    
    if (filterCurrentOnly) filterCurrentOnly.addEventListener('change', renderAlerts);
    if (filterDateStart) filterDateStart.addEventListener('change', renderAlerts);
    if (filterDateStartLogic) filterDateStartLogic.addEventListener('change', renderAlerts);
    if (filterDateEnd) filterDateEnd.addEventListener('change', renderAlerts);
    if (filterDateEndLogic) filterDateEndLogic.addEventListener('change', renderAlerts);
}

function switchView(viewType) {
    currentView = viewType;
    if (viewType === 'grid') {
        if (btnViewGrid) btnViewGrid.classList.add('active');
        if (btnViewTable) btnViewTable.classList.remove('active');
    } else {
        if (btnViewGrid) btnViewGrid.classList.remove('active');
        if (btnViewTable) btnViewTable.classList.add('active');
    }
    renderAlerts();
}

function toggleSortOrder() {
    sortAscending = !sortAscending;
    if (btnToggleSort) {
        btnToggleSort.innerHTML = sortAscending ? '⬇️ Tri : Date de début (Croissant)' : '⬇️ Tri : Date de début (Décroissant)';
    }
    renderAlerts();
}

function resetAllFilters() {
    if (searchBar) searchBar.value = '';
    if (filterDept) filterDept.value = 'all';
    if (filterType) filterType.value = 'all';
    if (filterSeverity) filterSeverity.value = 'all';
    if (filterShowBlacklist) filterShowBlacklist.checked = false; 
    if (filterCurrentOnly) filterCurrentOnly.checked = false;
    if (filterDateStart) filterDateStart.value = '';
    if (filterDateStartLogic) filterDateStartLogic.value = 'after_or_on';
    if (filterDateEnd) filterDateEnd.value = '';
    if (filterDateEndLogic) filterDateEndLogic.value = 'before_or_on';
    renderAlerts();
}

function getYYYYMMDD(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function setFilterToday() {
    resetAllFilters();
    if (filterCurrentOnly) filterCurrentOnly.checked = true;
    renderAlerts();
}

function setFilterWeek() {
    resetAllFilters();
    const start = new Date();
    const end = new Date();
    end.setDate(start.getDate() + 7); 

    if (filterDateStartLogic) filterDateStartLogic.value = 'after_or_on';
    if (filterDateStart) filterDateStart.value = getYYYYMMDD(start);
    
    if (filterDateEndLogic) filterDateEndLogic.value = 'before_or_on';
    if (filterDateEnd) filterDateEnd.value = getYYYYMMDD(end);
    
    renderAlerts();
}

function setFilterNextWeek() {
    resetAllFilters();
    const start = new Date();
    start.setDate(start.getDate() + 7); 
    const end = new Date();
    end.setDate(start.getDate() + 7); 

    if (filterDateStartLogic) filterDateStartLogic.value = 'after_or_on';
    if (filterDateStart) filterDateStart.value = getYYYYMMDD(start);
    
    if (filterDateEndLogic) filterDateEndLogic.value = 'before_or_on';
    if (filterDateEnd) filterDateEnd.value = getYYYYMMDD(end);
    
    renderAlerts();
}

function setFilterMonth() {
    resetAllFilters();
    const start = new Date();
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0); 

    if (filterDateStartLogic) filterDateStartLogic.value = 'after_or_on';
    if (filterDateStart) filterDateStart.value = getYYYYMMDD(start);
    
    if (filterDateEndLogic) filterDateEndLogic.value = 'before_or_on';
    if (filterDateEnd) filterDateEnd.value = getYYYYMMDD(end);
    
    renderAlerts();
}

function setFilterNextMonth() {
    resetAllFilters();
    const now = new Date();
    const firstDayNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const lastDayNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);

    if (filterDateStartLogic) filterDateStartLogic.value = 'after_or_on';
    if (filterDateStart) filterDateStart.value = getYYYYMMDD(firstDayNextMonth);
    
    if (filterDateEndLogic) filterDateEndLogic.value = 'before_or_on';
    if (filterDateEnd) filterDateEnd.value = getYYYYMMDD(lastDayNextMonth);
    
    renderAlerts();
}

async function synchronizeAll() {
    if (loader) loader.classList.remove('hidden');
    if (btnSyncAll) btnSyncAll.disabled = true;
    window.ALL_ALERTS = []; 

    const fetchPromises = Object.keys(DEPARTEMENTS_CONFIG).map(async (code) => {
        const deptAlerts = await fetchDeptData(code);
        return deptAlerts.map(alert => {
            const detectionTime = new Date().toISOString();
            return { 
                ...alert, 
                deptCode: code,
                discoveredAt: alert.discoveredAt || detectionTime 
            };
        });
    });

    const results = await Promise.all(fetchPromises);
    window.ALL_ALERTS = results.flat(); 

    localStorage.setItem('waze_tc_alerts', JSON.stringify(window.ALL_ALERTS));
    const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    localStorage.setItem('waze_tc_last_sync', now);

    if (loader) loader.classList.add('hidden');
    if (btnSyncAll) btnSyncAll.disabled = false;
    
    updateSyncStatus(now);
    renderAlerts();
}

function loadFromLocalStorage() {
    const localData = localStorage.getItem('waze_tc_alerts');
    const localTime = localStorage.getItem('waze_tc_last_sync');
    
    if (localData) {
        window.ALL_ALERTS = JSON.parse(localData);
        updateSyncStatus(localTime);
        renderAlerts();
    }
}

function updateSyncStatus(time) {
    if (syncStatus) syncStatus.textContent = `Dernière synchro : ${time}`;
}

function renderAlerts() {
    const searchQuery = searchBar ? searchBar.value.toLowerCase().trim() : '';
    const selectedDept = filterDept ? filterDept.value : 'all';
    const selectedType = filterType ? filterType.value : 'all';
    const selectedSeverity = filterSeverity ? filterSeverity.value : 'all';
    const isShowBlacklistChecked = filterShowBlacklist ? filterShowBlacklist.checked : false;

    const currentOnly = filterCurrentOnly ? filterCurrentOnly.checked : false;
    const startTargetStr = filterDateStart ? filterDateStart.value : '';
    const startLogic = filterDateStartLogic ? filterDateStartLogic.value : 'after_or_on';
    const endTargetStr = filterDateEnd ? filterDateEnd.value : '';
    const endLogic = filterDateEndLogic ? filterDateEndLogic.value : 'before_or_on';

    const now = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(now.getFullYear() - 1); 

    let filtered = window.ALL_ALERTS.filter(alert => {
        const titleLower = alert.title.toLowerCase();
        const crossLower = alert.cross ? alert.cross.toLowerCase() : '';
        const alertStartDate = parseAlertDate(alert.updated);

        const isAnyDateFilterActive = currentOnly || startTargetStr || endTargetStr;
        if (isAnyDateFilterActive && !alertStartDate) {
            return false;
        }

        let calculatedType = alert.type;
        if (alert.type.toLowerCase().includes('travaux') || alert.type.toLowerCase().includes('chantier')) {
            const hasAlternatKeywords = crossLower.includes('alternat') || crossLower.includes('restriction') || crossLower.includes('voie impactée') || crossLower.includes('circulation alternée');
            calculatedType = hasAlternatKeywords ? 'Alternat' : 'Fermeture';
        } else if (titleLower.includes('ferm') || crossLower.includes('route fermée') || crossLower.includes('fermeture')) {
            calculatedType = 'Fermeture';
        }
        alert.computedCategory = calculatedType;

        const closureKeywords = ['coupé', 'coupee', 'coupée', 'coupés', 'coupées', 'barré', 'barrée', 'barrés', 'barrées', 'fermé', 'fermée', 'fermés', 'fermées', 'fermeture', 'interrompue'];

        const detailLower = (alert.cross || "").toLowerCase();
        const combinedText = titleLower + " " + detailLower;
        
        // 1. DÉTECTION PRIORITAIRE : Si c'est une fermeture, on ignore la blacklist
        const isClosure = closureKeywords.some(kw => combinedText.includes(kw));
        
        let severity = 'info';
        
        if (isClosure) {
            // --- NOUVELLE LOGIQUE DE PRIORITÉ ---
            // On vérifie si l'impact indique une fermeture absolue ou si le texte contient un mot de coupure forte
            // Si la route est coupée/interrompue, le ROUGE (danger) est PRIORITAIRE, même s'il y a un alternat en journée.
            const hasAbsoluteClosure = combinedText.includes('interrompue') || combinedText.includes('coupé') || combinedText.includes('coupée') || combinedText.includes('fermé') || combinedText.includes('fermée');
            
            if (hasAbsoluteClosure) {
                severity = 'danger'; // Priorité maximale : Rouge d'office
            } else if (combinedText.includes('alternat')) {
                severity = 'warning'; // Orange si c'est une fermeture partielle / alternat uniquement
            } else {
                severity = 'danger'; // Par défaut pour les autres types de fermeture
            }
            
        } else {
            // 2. SINON : On vérifie la blacklist (seulement si ce n'est pas une fermeture)
            const isBlacklisted = BLACKLIST_KEYWORDS.some(kw => 
                titleLower.includes(kw.toLowerCase()) || detailLower.includes(kw.toLowerCase())
            );
            
            if (isBlacklisted || (alertStartDate && alertStartDate < oneYearAgo)) {
                severity = 'blacklist';
            }
        }
        
        alert.computedSeverity = severity;

        if (alert.computedSeverity === 'blacklist' && !isShowBlacklistChecked && selectedSeverity !== 'blacklist') {
            return false; 
        }

        const matchSearch = titleLower.includes(searchQuery) || crossLower.includes(searchQuery);
        const matchDept = selectedDept === 'all' || alert.deptCode === selectedDept;
        
        let matchType = false;
        if (selectedType === 'all') {
            matchType = true;
        } else if (selectedType === 'Alternat') {
            matchType = alert.computedCategory === 'Alternat';
        } else if (selectedType === 'Fermeture') {
            matchType = alert.computedCategory === 'Fermeture' || alert.type.toLowerCase().includes('ferm');
        } else {
            matchType = alert.type.toLowerCase().includes(selectedType.toLowerCase());
        }

        const matchSeverity = selectedSeverity === 'all' || alert.computedSeverity === selectedSeverity;

        if (!matchSearch || !matchDept || !matchType || !matchSeverity) return false;

        if (currentOnly && alertStartDate) {
            if (alertStartDate > now) return false;
            const actualEndDate = extractEndDate(alert.cross);
            if (actualEndDate && actualEndDate < now) return false;
        }

        if (startTargetStr && alertStartDate) {
            const target = new Date(startTargetStr);
            target.setHours(0, 0, 0, 0);
            const compDate = new Date(alertStartDate);
            compDate.setHours(0, 0, 0, 0);

            if (startLogic === 'before_or_on' && compDate > target) return false;
            if (startLogic === 'after_or_on' && compDate < target) return false;
        }

        if (endTargetStr && alertStartDate) {
            const actualEndDate = extractEndDate(alert.cross) || alertStartDate; 

            const target = new Date(endTargetStr);
            target.setHours(23, 59, 59, 999);
            const compDate = new Date(actualEndDate);
            compDate.setHours(0, 0, 0, 0);

            if (endLogic === 'before_or_on' && compDate > target) return false;
            if (endLogic === 'after_or_on' && compDate < target) return false;
        }

        return true;
    });

    filtered.sort((a, b) => {
        const dateA = parseAlertDate(a.updated) || (a.discoveredAt ? new Date(a.discoveredAt) : new Date(0));
        const dateB = parseAlertDate(b.updated) || (b.discoveredAt ? new Date(b.discoveredAt) : new Date(0));
        return sortAscending ? dateA - dateB : dateB - dateA;
    });

    if (!alertsGrid) return;
    alertsGrid.innerHTML = '';

    if (filtered.length === 0) {
        alertsGrid.innerHTML = `<div class="empty-state">Aucun événement ne correspond aux critères sélectionnés.</div>`;
        updateStats(0, filtered);
        return;
    }

    if (currentView === 'grid') {
        renderGridView(filtered);
    } else {
        renderTableView(filtered);
    }

    updateStats(filtered.length, filtered);
}

// --- RENDU GRILLE STRUCTURÉE ---
// --- RENDU GRILLE STRUCTURÉE ---
function renderGridView(alerts) {
    alertsGrid.className = "alerts-grid";
    alerts.forEach(alert => {
        const card = document.createElement('div');
        card.className = `card ${alert.computedSeverity}`;
        
        const isBl = alert.computedSeverity === 'blacklist';
        const displayType = isBl ? '🏳️ HORS DÉLAI / BLACKLIST' : (alert.computedCategory === 'Alternat' ? '🚧 TRAVAUX (Alternat)' : `⛔ ${alert.type.toUpperCase()}`);

        let typeInfo = alert.type;
        let impactInfo = "Non spécifié";
        let dateDebut = formatDisplayDate(alert.updated) || "Non spécifiée";
        let dateFin = "";
        let detailInfo = "Aucun détail complémentaire.";

        if (alert.cross) {
            const matchType = alert.cross.match(/Type\s*:\s*([^\n]+)/i);
            if (matchType) typeInfo = matchType[1].trim();

            const matchImpact = alert.cross.match(/Impact\s*:\s*([^\n]+)/i);
            if (matchImpact) impactInfo = matchImpact[1].trim();

            const matchDeb = alert.cross.match(/Début\s*:\s*([^\n]+)/i);
            if (matchDeb) dateDebut = matchDeb[1].trim();

            const matchFin = alert.cross.match(/Fin\s*:\s*([^\n]+)/i);
            if (matchFin) dateFin = matchFin[1].trim();

            const matchDet = alert.cross.split(/Détails\s*:\s*/i);
            if (matchDet[1]) {
                detailInfo = matchDet[1].trim();
            } else {
                detailInfo = alert.cross.split('\n').filter(line => {
                    const l = line.toLowerCase().trim();
                    return !l.startsWith('type :') && !l.startsWith('impact :') && !l.startsWith('début :') && !l.startsWith('fin :');
                }).join('\n').trim();
            }
        }

        let emplacementInfo = alert.title;
        if (alert.title.includes(' — ')) {
            const parts = alert.title.split(' — ');
            emplacementInfo = parts.slice(1).join(' — ');
        } else if (alert.title.includes(' - ')) {
            const parts = alert.title.split(' - ');
            emplacementInfo = parts.slice(1).join(' - ');
        }

        let wmeActionHtml = '';
        let coordsBlockHtml = ''; 
        let docsBlockHtml = ''; 
        
        if (alert.docs && alert.docs.length > 0) {
            docsBlockHtml = `
                <div class="card-docs" style="margin-top: 10px; display: flex; flex-direction: column; gap: 5px;">
                    ${alert.docs.map(doc => `
                        <a href="${doc.href}" target="_blank" class="btn-doc" style="background-color: #222; color: #fff; padding: 6px 10px; border-radius: 6px; font-size: 0.8rem; text-decoration: none; display: flex; align-items: center; gap: 8px; border: 1px solid #444;">
                            📎 <span>${doc.name || 'Document joint'}</span>
                        </a>
                    `).join('')}
                </div>
            `;
        }
        
        if (alert.lat && alert.lon) {
            const wmeProd = `https://waze.com/fr/editor?env=row&lat=${alert.lat}&lon=${alert.lon}&zoomLevel=19`;
            const wmeBeta = `https://beta.waze.com/fr/editor?env=row&lat=${alert.lat}&lon=${alert.lon}&zoomLevel=19`;
            wmeActionHtml = `
                <div class="wme-actions" style="margin-top: 15px; display: flex; gap: 10px;">
                    <a href="${wmeProd}" target="_blank" class="btn-wme wme-prod">WME Production</a>
                    <a href="${wmeBeta}" target="_blank" class="btn-wme wme-beta">WME Beta</a>
                </div>
            `;
            
            coordsBlockHtml = `
                <div class="date-coords" style="margin-bottom: 4px; color: #aaa;">
                    <strong>Coordonnées :</strong> ${Number(alert.lat).toFixed(5)}, ${Number(alert.lon).toFixed(5)}
                </div>
            `;
        }

        const detectedTags = [];
        const textToScan = `${alert.title} ${alert.cross || ''}`.toLowerCase();
        
        if (textToScan.includes('accident')) detectedTags.push('Accident');
        if (textToScan.includes('ferm')) detectedTags.push('Fermeture');
        if (textToScan.includes('cloture') || textToScan.includes('clôture')) detectedTags.push('Clôture');
        if (textToScan.includes('travaux') || textToScan.includes('chantier')) detectedTags.push('Travaux');
        if (textToScan.includes('alternat')) detectedTags.push('Alternat');
        
        // BADGE INCENDIE
        if (textToScan.includes('incendie') || textToScan.includes('feu de') || textToScan.includes('feux de') || textToScan.includes('fumée')) {
            detectedTags.push('🔥 Incendie');
        }
        
        // BADGE MÉTÉO UNIQUE (Regroupe tous les critères climatiques)
        if (
            textToScan.includes('neige') || textToScan.includes('verglas') || textToScan.includes('tempête') || 
            textToScan.includes('vent') || textToScan.includes('inondation') || textToScan.includes('crue') ||
            textToScan.includes('météo') || textToScan.includes('viabilité')
        ) {
            detectedTags.push('❄️ Météo / Viabilité');
        }

        let tagsHtml = '';
        if (detectedTags.length > 0) {
            tagsHtml = `
                <div class="card-tags" style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 15px;">
                    ${detectedTags.map(tag => `
                        <span class="tag-badge" style="background-color: rgba(255, 255, 255, 0.15); padding: 3px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; color: #fff; border: 1px solid rgba(255, 255, 255, 0.2);">
                            🏷️ ${tag}
                        </span>
                    `).join('')}
                </div>
            `;
        }

        card.innerHTML = `
            <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; text-align: left;">
                <span class="card-type" style="font-weight: bold; font-size: 0.8rem; opacity: 0.8;">${displayType}</span>
                <span class="card-dept" style="font-weight: bold; font-size: 0.8rem; opacity: 0.8; background: rgba(0,0,0,0.2); padding: 2px 6px; border-radius:4px;">Dép. ${alert.deptCode}</span>
            </div>
            
            <div class="card-title" style="font-weight: bold; font-size: 0.95rem; margin-bottom: 10px; text-align: left; line-height: 1.3;">
                ${alert.title}
            </div>

            ${tagsHtml}
            
            <div class="card-meta-block" style="font-size: 0.8rem; line-height: 1.4; margin-bottom: 12px; text-align: left;">
                <div><strong>Type:</strong> ${typeInfo}</div>
                <div><strong>Impact:</strong> ${impactInfo}</div>
                <div><strong>Emplacement:</strong> ${emplacementInfo}</div>
                <div><strong>Date Début:</strong> ${dateDebut}</div>
                ${dateFin ? `<div><strong>Date Fin:</strong> ${dateFin}</div>` : ''}
            </div>
            
            <div class="card-body" style="font-size: 0.8rem; line-height: 1.35; margin-bottom: 12px; text-align: left; padding: 0; width: 100%;">
                <strong>Détail:</strong> <span style="white-space: pre-wrap;">${detailInfo}</span>
            </div>
            
            <div class="card-footer-structure" style="font-size: 0.75rem; color: #bbb; text-align: left; margin-top: auto; padding-top: 8px;">
                <div class="date-maj" style="margin-bottom: 4px;">
                    <strong>Mise à jour alerte:</strong> ${formatDisplayDate(alert.updated) || 'Non spécifiée'}
                </div>
                ${coordsBlockHtml}
                ${wmeActionHtml}
            </div>
        `;
        alertsGrid.appendChild(card);
    });
}

function renderTableView(alerts) {
    if (!alertsGrid) return;
    alertsGrid.className = "";
    const container = document.createElement('div');
    container.className = "tc-table-container";

    let rowsHtml = '';
    alerts.forEach(alert => {
        let severityClass = 'row-warning';
        if (alert.computedSeverity === 'danger') severityClass = 'row-danger';
        else if (alert.computedSeverity === 'info') severityClass = 'row-info';
        else if (alert.computedSeverity === 'blacklist') severityClass = 'row-blacklist';
        
        let actionsHtml = '<i>Pas de géoloc</i>';
        if (alert.lat && alert.lon) {
            const wmeProd = `https://waze.com/fr/editor?env=row&lat=${alert.lat}&lon=${alert.lon}&zoomLevel=19`;
            const wmeBeta = `https://beta.waze.com/fr/editor?env=row&lat=${alert.lat}&lon=${alert.lon}&zoomLevel=19`;
            actionsHtml = `
                <div class="table-actions">
                    <a href="${wmeProd}" target="_blank" class="btn-wme-xs wme-prod" title="Ouvrir Production">PRO</a>
                    <a href="${wmeBeta}" target="_blank" class="btn-wme-xs wme-beta" title="Ouvrir Beta">BETA</a>
                </div>
            `;
        }

        const isBl = alert.computedSeverity === 'blacklist';
        const displayCross = isBl ? '<span style="color:var(--text-muted); font-style:italic;">Masqué / Archivage de sécurité</span>' : alert.cross;

        rowsHtml += `
            <tr class="${severityClass}">
                <td style="font-weight:bold; text-align:center;">73</td>
                <td><strong>${isBl ? 'Obsolète/BL' : alert.computedCategory}</strong></td>
                <td>
                    <div style="font-weight:600; color:${isBl ? 'var(--text-muted)' : '#fff'};">${alert.title}</div>
                    <div style="font-size:0.75rem; color:#aaa; max-width:40px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                        ${displayCross}
                    </div>
                </td>
                <td style="font-size:0.75rem; white-space:nowrap;">${formatDisplayDate(alert.updated)}</td>
                <td>${actionsHtml}</td>
            </tr>
        `;
    });

    container.innerHTML = `
        <table class="tc-table">
            <thead>
                <tr>
                    <th style="width:50px; text-align:center;">Dép</th>
                    <th style="width:100px;">Nature</th>
                    <th>Événement & Description</th>
                    <th style="width:130px;">Début / Màj</th>
                    <th style="width:110px;">Éditeur WME</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHtml}
            </tbody>
        </table>
    `;
    alertsGrid.appendChild(container);
}

function parseAlertDate(dateStr) {
    if (!dateStr || dateStr.includes("non spécifiée") || dateStr.includes("Récemment")) return null;
    
    const cleanStr = dateStr.replace(/\s+/g, ' ').trim();
    
    const frMatch = cleanStr.match(/(\d{2})\/(\d{2})\/(\d{2,4})/);
    if (frMatch) {
        const day = parseInt(frMatch[1], 10);
        const month = parseInt(frMatch[2], 10) - 1;
        let year = parseInt(frMatch[3], 10);
        if (year < 100) year += 2000; // Sécurité si l'année est passée sur 2 chiffres
        
        const timeMatch = cleanStr.match(/(\d{2}):(\d{2})/);
        const hours = timeMatch ? parseInt(timeMatch[1], 10) : 0;
        const minutes = timeMatch ? parseInt(timeMatch[2], 10) : 0;
        return new Date(year, month, day, hours, minutes);
    }

    // Si ce n'est pas un format FR, on tente le parse natif (pour les dates ISO de Savoie par exemple)
    const isoTimestamp = Date.parse(cleanStr);
    if (!isNaN(isoTimestamp)) return new Date(isoTimestamp);

    return null;
}

function extractEndDate(text) {
    if (!text) return null;
    const savoieMatch = text.match(/Fin\s*:\s*(\d{2})\/(\d{2})\/(\d{4})\s*(\d{2}):(\d{2})/);
    if (savoieMatch) {
        return new Date(parseInt(savoieMatch[3]), parseInt(savoieMatch[2]) - 1, parseInt(savoieMatch[1]), parseInt(savoieMatch[4]), parseInt(savoieMatch[5]));
    }
    const genericMatch = text.match(/(?:jusqu'au|fin|prévue le|au)\s*[:\s]*(\d{2})\/(\d{2})\/(\d{4})/i);
    if (genericMatch) {
        return new Date(parseInt(genericMatch[3]), parseInt(genericMatch[2]) - 1, parseInt(genericMatch[1]), 23, 59); 
    }
    return null;
}

function formatDisplayDate(dateStr) {
    if (!dateStr || dateStr === "Récemment") return dateStr;
    
    const parsed = parseAlertDate(dateStr);
    if (!parsed) return dateStr;

    return parsed.toLocaleString('fr-FR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });
}

function updateStats(totalCount, filteredAlerts) {
    if (statTotal) statTotal.textContent = totalCount;
    let countsSeverity = { danger: 0, warning: 0, info: 0, blacklist: 0 };
    const countsDept = {};

    filteredAlerts.forEach(a => {
        if (countsSeverity[a.computedSeverity] !== undefined) countsSeverity[a.computedSeverity]++;
        countsDept[a.deptCode] = (countsDept[a.deptCode] || 0) + 1;
    });

    if (statsBySeverity) {
        statsBySeverity.innerHTML = `
            <div class="severity-stat-badge" title="Bloquant Impératif">🔴 <strong>${countsSeverity.danger}</strong></div>
            <div class="severity-stat-badge" title="À vérifier / Partiel">🟠 <strong>${countsSeverity.warning}</strong></div>
            <div class="severity-stat-badge" title="Informatif / Mineur">🔘 <strong>${countsSeverity.info}</strong></div>
            <div class="severity-stat-badge" title="Liste Noire / Obsolète">⚪ <strong>${countsSeverity.blacklist}</strong></div>
        `;
    }

    if (statsByDept) {
        statsByDept.innerHTML = '';
        const sortedDepts = Object.entries(countsDept).sort((a, b) => b[1] - a[1]);
        for (const [dept, count] of sortedDepts) {
            const tag = document.createElement('span');
            tag.className = 'dept-tag-stat';
            tag.innerHTML = `📍 <strong>${dept}</strong> : ${count}`;
            statsByDept.appendChild(tag);
        }
    }
}
