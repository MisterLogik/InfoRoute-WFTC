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

// Boutons temporels (Sidebar)
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
    for (const [code, info] of Object.entries(DEPARTEMENTS_CONFIG)) {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = `${code} - ${info.name}`;
        filterDept.appendChild(option);
    }
}

function setupEventListeners() {
    btnSyncAll.addEventListener('click', synchronizeAll);
    btnResetFilters.addEventListener('click', resetAllFilters);
    btnToggleSort.addEventListener('click', toggleSortOrder);
    
    // Listeners Temporels
    btnQuickToday.addEventListener('click', setFilterToday);
    btnQuickWeek.addEventListener('click', setFilterWeek);
    btnQuickNextWeek.addEventListener('click', setFilterNextWeek);
    btnQuickMonth.addEventListener('click', setFilterMonth);
    btnQuickNextMonth.addEventListener('click', setFilterNextMonth); 

    btnViewGrid.addEventListener('click', () => { switchView('grid'); });
    btnViewTable.addEventListener('click', () => { switchView('table'); });

    searchBar.addEventListener('input', renderAlerts);
    filterDept.addEventListener('change', renderAlerts);
    filterType.addEventListener('change', renderAlerts);
    filterSeverity.addEventListener('change', renderAlerts);
    filterShowBlacklist.addEventListener('change', renderAlerts); 
    
    filterCurrentOnly.addEventListener('change', renderAlerts);
    filterDateStart.addEventListener('change', renderAlerts);
    filterDateStartLogic.addEventListener('change', renderAlerts);
    filterDateEnd.addEventListener('change', renderAlerts);
    filterDateEndLogic.addEventListener('change', renderAlerts);
}

function switchView(viewType) {
    currentView = viewType;
    if (viewType === 'grid') {
        btnViewGrid.classList.add('active');
        btnViewTable.classList.remove('active');
    } else {
        btnViewGrid.classList.remove('active');
        btnViewTable.classList.add('active');
    }
    renderAlerts();
}

function toggleSortOrder() {
    sortAscending = !sortAscending;
    btnToggleSort.innerHTML = sortAscending ? '⬇️ Tri : Date de début (Croissant)' : '⬇️ Tri : Date de début (Décroissant)';
    renderAlerts();
}

function resetAllFilters() {
    searchBar.value = '';
    filterDept.value = 'all';
    filterType.value = 'all';
    filterSeverity.value = 'all';
    filterShowBlacklist.checked = false; 
    filterCurrentOnly.checked = false;
    filterDateStart.value = '';
    filterDateStartLogic.value = 'after_or_on';
    filterDateEnd.value = '';
    filterDateEndLogic.value = 'before_or_on';
    renderAlerts();
}

// --- UTILITAIRE FORMATAGE DATES ---
function getYYYYMMDD(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// --- FILTRES RAPIDES TEMPORELS ---
function setFilterToday() {
    resetAllFilters();
    filterCurrentOnly.checked = true;
    renderAlerts();
}

function setFilterWeek() {
    resetAllFilters();
    const start = new Date();
    const end = new Date();
    end.setDate(start.getDate() + 7); 

    filterDateStartLogic.value = 'after_or_on';
    filterDateStart.value = getYYYYMMDD(start);
    
    filterDateEndLogic.value = 'before_or_on';
    filterDateEnd.value = getYYYYMMDD(end);
    
    renderAlerts();
}

function setFilterNextWeek() {
    resetAllFilters();
    const start = new Date();
    start.setDate(start.getDate() + 7); 
    
    const end = new Date();
    end.setDate(start.getDate() + 7); 

    filterDateStartLogic.value = 'after_or_on';
    filterDateStart.value = getYYYYMMDD(start);
    
    filterDateEndLogic.value = 'before_or_on';
    filterDateEnd.value = getYYYYMMDD(end);
    
    renderAlerts();
}

function setFilterMonth() {
    resetAllFilters();
    const start = new Date();
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0); 

    filterDateStartLogic.value = 'after_or_on';
    filterDateStart.value = getYYYYMMDD(start);
    
    filterDateEndLogic.value = 'before_or_on';
    filterDateEnd.value = getYYYYMMDD(end);
    
    renderAlerts();
}

function setFilterNextMonth() {
    resetAllFilters();
    const now = new Date();
    const firstDayNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const lastDayNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);

    filterDateStartLogic.value = 'after_or_on';
    filterDateStart.value = getYYYYMMDD(firstDayNextMonth);
    
    filterDateEndLogic.value = 'before_or_on';
    filterDateEnd.value = getYYYYMMDD(lastDayNextMonth);
    
    renderAlerts();
}

// --- GESTION DES FLUX SÉCURISÉE (ANTI-DOMINO) ---
async function synchronizeAll() {
    loader.classList.remove('hidden');
    btnSyncAll.disabled = true;
    
    const validAlerts = [];

    const fetchPromises = Object.keys(DEPARTEMENTS_CONFIG).map(async (code) => {
        try {
            const deptAlerts = await fetchDeptData(code);
            
            if (deptAlerts && Array.isArray(deptAlerts)) {
                const detectionTime = new Date().toISOString();
                
                const processed = deptAlerts.map(alert => ({ 
                    ...alert, 
                    deptCode: code,
                    discoveredAt: alert.discoveredAt || detectionTime 
                }));
                
                validAlerts.push(...processed);
            } else {
                console.warn(`[App] Le département ${code} a renvoyé un format invalide.`);
            }
        } catch (error) {
            console.error(`[App] Échec isolé sur le département ${code} (Serveur distant défaillant) :`, error);
        }
    });

    await Promise.all(fetchPromises);

    window.ALL_ALERTS = validAlerts; 

    localStorage.setItem('waze_tc_alerts', JSON.stringify(window.ALL_ALERTS));
    const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    localStorage.setItem('waze_tc_last_sync', now);

    loader.classList.add('hidden');
    btnSyncAll.disabled = false;
    
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
    syncStatus.textContent = `Dernière synchro : ${time}`;
}

function renderAlerts() {
    const searchQuery = searchBar.value.toLowerCase().trim();
    const selectedDept = filterDept.value;
    const selectedType = filterType.value;
    const selectedSeverity = filterSeverity.value;
    const isShowBlacklistChecked = filterShowBlacklist.checked;

    const currentOnly = filterCurrentOnly.checked;
    const startTargetStr = filterDateStart.value;
    const startLogic = filterDateStartLogic.value;
    const endTargetStr = filterDateEnd.value;
    const endLogic = filterDateEndLogic.value;

    const now = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(now.getFullYear() - 1); 

    let filtered = window.ALL_ALERTS.filter(alert => {
        const titleLower = alert.title.toLowerCase();
        const crossLower = alert.cross.toLowerCase();
        const alertStartDate = parseAlertDate(alert.updated);

        // --- EXCLUSION DES ALERTES SANS DATE SI FILTRE ACTIF ---
        const isAnyDateFilterActive = currentOnly || startTargetStr || endTargetStr;
        if (isAnyDateFilterActive && !alertStartDate) {
            return false;
        }

        // 1. Détermination de la nature de la perturbation
        let calculatedType = alert.type;
        if (alert.type.toLowerCase().includes('travaux') || alert.type.toLowerCase().includes('chantier')) {
            const hasAlternatKeywords = crossLower.includes('alternat') || crossLower.includes('restriction') || crossLower.includes('voie impactée') || crossLower.includes('circulation alternée');
            calculatedType = hasAlternatKeywords ? 'Alternat' : 'Fermeture';
        } else if (titleLower.includes('ferm') || crossLower.includes('route fermée') || crossLower.includes('fermeture')) {
            calculatedType = 'Fermeture';
        }
        alert.computedCategory = calculatedType;

        // 2. MOTEUR ANALYTIQUE DE QUALIFICATION DES GRAVITÉS
        let severity = 'warning'; 

        // 🛑 SÉCURITÉ ARCHIVAGE : Plus de 1 an -> Catégorie Blanche d'office
        if (alertStartDate && alertStartDate < oneYearAgo) {
            severity = 'blacklist'; 
        } 
        // Liste Noire par mot-clé
        else if (BLACKLIST_KEYWORDS.some(kw => titleLower.includes(kw.toLowerCase()) || crossLower.includes(kw.toLowerCase()))) {
            severity = 'blacklist'; 
        } 
        // Traitement Savoie (73)
        else if (alert.deptCode === '73') {
            const impactStr = alert.impact ? alert.impact.toLowerCase() : '';
            const hasCoupeeInImpact = impactStr.includes('coupé') || impactStr.includes('coupee') || impactStr.includes('coupée') || impactStr.includes('coupés') || impactStr.includes('coupées');
            const closureKeywords = ['coupé', 'coupee', 'coupée', 'coupées', 'coupés', 'fermeture', 'barré', 'barrée', 'barrés', 'barrées', 'fermé', 'fermée', 'fermés', 'fermées'];
            const hasClosureInDetails = closureKeywords.some(kw => crossLower.includes(kw) || titleLower.includes(kw));

            if (hasCoupeeInImpact) {
                severity = 'danger';
            } else {
                severity = hasClosureInDetails ? 'warning' : 'info';
            }
        } 
        // Traitement Isère (38)
        else if (alert.deptCode === '38') {
            const hasRouteBarreeInTitle = titleLower.includes('route barrée') || titleLower.includes('route barree');
            const hasRouteBarreeInCross = crossLower.includes('route barrée') || crossLower.includes('route barree');
            const defaultNoDesc = !alert.cross || alert.cross === "Aucun détail." || alert.cross.trim() === "";

            if (hasRouteBarreeInCross && !defaultNoDesc) {
                severity = 'danger';
            } else if (hasRouteBarreeInTitle || (hasRouteBarreeInCross && defaultNoDesc)) {
                severity = 'warning';
            } else {
                severity = alert.originalSeverity || 'warning';
            }
        } 
        // Autres départements
        else {
            const closureKeywords = ['coupé', 'coupee', 'coupée', 'fermeture', 'barré', 'barrée', 'fermé', 'fermée'];
            severity = closureKeywords.some(kw => crossLower.includes(kw) || titleLower.includes(kw)) ? 'danger' : (alert.originalSeverity || 'warning');
        }

        alert.computedSeverity = severity;

        // 3. LOGIQUE DE FILTRAGE DES UI CLASSIQUES
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

        // --- LOGIQUE DES FILTRES DE DATES STRONGS ---
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

    // Tri (Utilisation subsidiaire de discoveredAt uniquement pour structurer l'affichage)
    filtered.sort((a, b) => {
        const dateA = parseAlertDate(a.updated) || (a.discoveredAt ? new Date(a.discoveredAt) : new Date(0));
        const dateB = parseAlertDate(b.updated) || (b.discoveredAt ? new Date(b.discoveredAt) : new Date(0));
        return sortAscending ? dateA - dateB : dateB - dateA;
    });

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

function renderGridView(alerts) {
    alertsGrid.className = "alerts-grid";
    alerts.forEach(alert => {
        const card = document.createElement('div');
        card.className = `card ${alert.computedSeverity}`;
        
        const isBl = alert.computedSeverity === 'blacklist';
        const displayType = isBl ? '🏳️ HORS DÉLAI / BLACKLIST' : (alert.computedCategory === 'Alternat' ? '🚧 TRAVAUX (Alternat)' : `⛔ ${alert.type.toUpperCase()}`);
        const hasDate = parseAlertDate(alert.updated) !== null;
        const creationInfo = alert.discoveredAt ? `Flux : ${new Date(alert.discoveredAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : 'Flux : Inconnu';

        let wmeActionHtml = '';
        if (alert.lat && alert.lon) {
            const wmeProd = `https://waze.com/fr/editor?env=row&lat=${alert.lat}&lon=${alert.lon}&zoomLevel=19`;
            const wmeBeta = `https://beta.waze.com/fr/editor?env=row&lat=${alert.lat}&lon=${alert.lon}&zoomLevel=19`;
            wmeActionHtml = `
                <div class="wme-actions">
                    <a href="${wmeProd}" target="_blank" class="btn-wme wme-prod">WME Production</a>
                    <a href="${wmeBeta}" target="_blank" class="btn-wme wme-beta">WME Beta</a>
                </div>
            `;
        }

        if (isBl) {
            card.innerHTML = `
                <div class="card-header">
                    <span class="card-type">${displayType}</span>
                    <span class="card-dept">Dép. ${alert.deptCode}</span>
                </div>
                <div class="card-title" style="color: var(--text-muted); font-size: 0.95rem; font-style: italic;">[Masqué ou >1an] ${alert.title}</div>
                <div class="card-footer" style="margin-top:auto;">
                    <div class="creation-badge">⏱️ ${creationInfo}</div>
                    ${wmeActionHtml}
                </div>
            `;
        } else {
            card.innerHTML = `
                <div class="card-header">
                    <span class="card-type">${displayType}</span>
                    <span class="card-dept">Dép. ${alert.deptCode}</span>
                </div>
                <div class="card-title">${alert.title}</div>
                <div class="card-body" style="white-space: pre-wrap;">${alert.cross}</div>
                <div class="card-footer">
                    <div>${hasDate ? `Début / Maj : ${formatDisplayDate(alert.updated)}` : '⚠️ Début / Maj : Non spécifié'}</div>
                    <div class="creation-badge">⏱️ ${creationInfo}</div>
                    ${wmeActionHtml}
                </div>
            `;
        }
        alertsGrid.appendChild(card);
    });
}

function renderTableView(alerts) {
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
                <td style="font-weight:bold; text-align:center;">${alert.deptCode}</td>
                <td><strong>${isBl ? 'Obsolète/BL' : alert.computedCategory}</strong></td>
                <td>
                    <div style="font-weight:600; color:${isBl ? 'var(--text-muted)' : '#fff'};">${alert.title}</div>
                    <div style="font-size:0.75rem; color:#aaa; max-height:40px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
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
    if (!dateStr || dateStr.includes("non spécifiée")) return null;
    const isoTimestamp = Date.parse(dateStr);
    if (!isNaN(isoTimestamp)) return new Date(isoTimestamp);

    const frMatch = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (frMatch) {
        const day = parseInt(frMatch[1], 10);
        const month = parseInt(frMatch[2], 10) - 1;
        const year = parseInt(frMatch[3], 10);
        const timeMatch = dateStr.match(/(\d{2}):(\d{2})/);
        const hours = timeMatch ? parseInt(timeMatch[1], 10) : 0;
        const minutes = timeMatch ? parseInt(timeMatch[2], 10) : 0;
        return new Date(year, month, day, hours, minutes);
    }
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
    const parsed = parseAlertDate(dateStr);
    if (!parsed) return dateStr;
    return parsed.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function updateStats(totalCount, filteredAlerts) {
    statTotal.textContent = totalCount;
    let countsSeverity = { danger: 0, warning: 0, info: 0, blacklist: 0 };
    const countsDept = {};

    filteredAlerts.forEach(a => {
        if (countsSeverity[a.computedSeverity] !== undefined) countsSeverity[a.computedSeverity]++;
        countsDept[a.deptCode] = (countsDept[a.deptCode] || 0) + 1;
    });

    statsBySeverity.innerHTML = `
        <div class="severity-stat-badge" title="Bloquant Impératif">🔴 <strong>${countsSeverity.danger}</strong></div>
        <div class="severity-stat-badge" title="À vérifier / Partiel">🟠 <strong>${countsSeverity.warning}</strong></div>
        <div class="severity-stat-badge" title="Informatif / Mineur">🔘 <strong>${countsSeverity.info}</strong></div>
        <div class="severity-stat-badge" title="Liste Noire / Obsolète">⚪ <strong>${countsSeverity.blacklist}</strong></div>
    `;

    statsByDept.innerHTML = '';
    const sortedDepts = Object.entries(countsDept).sort((a, b) => b[1] - a[1]);
    for (const [dept, count] of sortedDepts) {
        const tag = document.createElement('span');
        tag.className = 'dept-tag-stat';
        tag.innerHTML = `📍 <strong>${dept}</strong> : ${count}`;
        statsByDept.appendChild(tag);
    }
}
