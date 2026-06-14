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

    const elementsToListen = [searchBar, filterDept, filterType, filterSeverity, filterShowBlacklist, 
                            filterCurrentOnly, filterDateStart, filterDateStartLogic, filterDateEnd, filterDateEndLogic];
    
    elementsToListen.forEach(el => {
        if (el) el.addEventListener('change', renderAlerts);
    });
    if (searchBar) searchBar.addEventListener('input', renderAlerts);
}

// ... (fonctions utilitaires switchView, toggleSortOrder, resetAllFilters, setFilter... identiques à votre code)
// [Note : Pour brièveté, je saute les fonctions helper de filtres ici, assurez-vous de garder les vôtres]

async function synchronizeAll() {
    if (loader) loader.classList.remove('hidden');
    if (btnSyncAll) btnSyncAll.disabled = true;
    window.ALL_ALERTS = []; 

    const fetchPromises = Object.keys(DEPARTEMENTS_CONFIG).map(async (code) => {
        const deptAlerts = await fetchDeptData(code);
        return deptAlerts.map(alert => ({ ...alert, deptCode: code, discoveredAt: alert.discoveredAt || new Date().toISOString() }));
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

// --- MOTEUR DE RENDU ET FILTRAGE ---
function renderAlerts() {
    const searchQuery = searchBar ? searchBar.value.toLowerCase().trim() : '';
    const selectedDept = filterDept ? filterDept.value : 'all';
    const selectedType = filterType ? filterType.value : 'all';
    const selectedSeverity = filterSeverity ? filterSeverity.value : 'all';
    const isShowBlacklistChecked = filterShowBlacklist ? filterShowBlacklist.checked : false;
    const currentOnly = filterCurrentOnly ? filterCurrentOnly.checked : false;

    const now = new Date();
    
    let filtered = window.ALL_ALERTS.filter(alert => {
        const titleLower = alert.title.toLowerCase();
        const detailLower = (alert.cross || "").toLowerCase();
        const combinedText = titleLower + " " + detailLower;
        const alertStartDate = parseAlertDate(alert.updated);

        // --- CALCUL SEVERITY AVEC PRIORITÉ FERMETURE ---
        const closureKeywords = ['coupé', 'coupee', 'coupée', 'coupés', 'coupées', 'barré', 'barrée', 'barrés', 'barrées', 'fermé', 'fermée', 'fermés', 'fermées', 'fermeture', 'interrompue'];
        const isClosure = closureKeywords.some(kw => combinedText.includes(kw));
        
        let severity = 'info';
        if (isClosure) {
            severity = combinedText.includes('alternat') ? 'warning' : 'danger';
        } else {
            const isBlacklisted = BLACKLIST_KEYWORDS.some(kw => titleLower.includes(kw.toLowerCase()) || detailLower.includes(kw.toLowerCase()));
            if (isBlacklisted) severity = 'blacklist';
        }
        alert.computedSeverity = severity;

        // --- FILTRES ---
        if (severity === 'blacklist' && !isShowBlacklistChecked && selectedSeverity !== 'blacklist') return false;
        
        const matchSearch = titleLower.includes(searchQuery) || detailLower.includes(searchQuery);
        const matchDept = selectedDept === 'all' || alert.deptCode === selectedDept;
        const matchSeverity = selectedSeverity === 'all' || severity === selectedSeverity;
        
        // ... (Ajoutez ici votre logique de filtrage par type et dates identique à l'original)

        return matchSearch && matchDept && matchSeverity;
    });

    // Rendu final
    alertsGrid.innerHTML = '';
    if (filtered.length === 0) {
        alertsGrid.innerHTML = `<div class="empty-state">Aucun événement ne correspond.</div>`;
    } else {
        currentView === 'grid' ? renderGridView(filtered) : renderTableView(filtered);
    }
    updateStats(filtered.length, filtered);
}

// ... (le reste de vos fonctions renderGridView, renderTableView, parseAlertDate etc. restent inchangées)
