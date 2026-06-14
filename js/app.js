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

// Boutons temporels
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
        filterDept.innerHTML = '<option value="all">Tous les départements</option>';
        for (const [code, info] of Object.entries(DEPARTEMENTS_CONFIG)) {
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

function parseAlertDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;

    // Gestion format français alternatif (ex: "14/06/2026 15:30")
    const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
    if (match) {
        return new Date(match[3], match[2] - 1, match[1], match[4], match[5]);
    }
    return null;
}

function extractEndDate(text) {
    if (!text) return null;
    // Tente de trouver des motifs du type "jusqu'au 15/06" ou "fin le 15/06/2026"
    const match = text.match(/(?:jusqu'au|fin le|au)\s+(\d{2})\/(\d{2})\/(\d{4})/i);
    if (match) {
        return new Date(match[3], match[2] - 1, match[1], 23, 59, 59);
    }
    return null;
}

function formatAlertDate(dateStr) {
    const parsed = parseAlertDate(dateStr);
    if (!parsed) return dateStr;
    return parsed.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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
            const deptName = DEPARTEMENTS_CONFIG[dept]?.name || dept;
            const badge = document.createElement('div');
            badge.className = 'dept-stat-badge';
            badge.innerHTML = `📬 <strong>${dept}</strong> (${deptName}) : <span>${count}</span>`;
            statsByDept.appendChild(badge);
        }
    }
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

        let severity = 'warning';
        if (alertStartDate && alertStartDate < oneYearAgo) {
            severity = 'blacklist';
        } else if (BLACKLIST_KEYWORDS.some(kw => titleLower.includes(kw.toLowerCase()) || crossLower.includes(kw.toLowerCase()))) {
            severity = 'blacklist';
        } else {
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

    if (sortAscending) {
        filtered.sort((a, b) => (parseAlertDate(a.updated) || 0) - (parseAlertDate(b.updated) || 0));
    } else {
        filtered.sort((a, b) => (parseAlertDate(b.updated) || 0) - (parseAlertDate(a.updated) || 0));
    }

    updateStats(window.ALL_ALERTS.length, filtered);

    if (!alertsGrid) return;
    alertsGrid.innerHTML = '';

    if (filtered.length === 0) {
        alertsGrid.innerHTML = '<div class="no-alerts">Aucune alerte ne correspond à vos filtres.</div>';
        return;
    }

    if (currentView === 'grid') {
        alertsGrid.className = 'alerts-grid-layout';
        filtered.forEach(alert => {
            const card = document.createElement('div');
            card.className = `alert-card severity-${alert.computedSeverity}`;
            
            let severityIcon = '🔘';
            if (alert.computedSeverity === 'danger') severityIcon = '🔴';
            if (alert.computedSeverity === 'warning') severityIcon = '🟠';
            if (alert.computedSeverity === 'blacklist') severityIcon = '⚪';

            card.innerHTML = `
                <div class="alert-header">
                    <span class="alert-badge-dept">${alert.deptCode}</span>
                    <span class="alert-badge-type">${alert.computedCategory}</span>
                    <span class="alert-severity-icon">${severityIcon}</span>
                </div>
                <div class="alert-body">
                    <h3 class="alert-title">${alert.title}</h3>
                    <p class="alert-cross">${alert.cross ? alert.cross.replace(/\n/g, '<br>') : ''}</p>
                </div>
                <div class="alert-footer">
                    <span>📅 Début : ${formatAlertDate(alert.updated)}</span>
                </div>
            `;
            alertsGrid.appendChild(card);
        });
    } else {
        alertsGrid.className = 'alerts-table-layout';
        const table = document.createElement('table');
        table.className = 'alerts-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Dept</th>
                    <th>Nature</th>
                    <th>Événement</th>
                    <th>Description & Restrictions</th>
                    <th>Date de début</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');
        filtered.forEach(alert => {
            const row = document.createElement('tr');
            row.className = `row-severity-${alert.computedSeverity}`;
            row.innerHTML = `
                <td><strong>${alert.deptCode}</strong></td>
                <td><span class="table-badge-type">${alert.computedCategory}</span></td>
                <td><strong>${alert.title}</strong></td>
                <td><div class="table-cell-scroll">${alert.cross ? alert.cross.replace(/\n/g, '<br>') : ''}</div></td>
                <td>${formatAlertDate(alert.updated)}</td>
            `;
            tbody.appendChild(row);
        });
        alertsGrid.appendChild(table);
    }
}
