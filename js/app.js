import { TAGS_KEYWORDS, BLACKLIST_KEYWORDS } from './config-api.js';
import { fetchSavoieData } from './fetcher.js';

// --- État global de l'application ---
window.ALL_ALERTS = []; 
let sortAscending = false; 
let currentView = 'grid'; 

// --- Éléments du DOM ---
const btnSyncAll = document.getElementById('btn-sync-all');
const btnResetFilters = document.getElementById('btn-reset-filters');
const btnToggleSort = document.getElementById('btn-toggle-sort');

const btnQuickToday = document.getElementById('btn-quick-today');
const btnViewGrid = document.getElementById('btn-view-grid');
const btnViewTable = document.getElementById('btn-view-table');

const syncStatus = document.getElementById('sync-status');
const filterType = document.getElementById('filter-type');
const filterSeverity = document.getElementById('filter-severity');
const filterShowBlacklist = document.getElementById('filter-show-blacklist'); 
const searchBar = document.getElementById('search-bar');
const alertsGrid = document.getElementById('alerts-grid');
const loader = document.getElementById('loader');
const statTotal = document.getElementById('stat-total');
const statsBySeverity = document.getElementById('stats-by-severity');

// --- Initialisation ---
document.addEventListener('DOMContentLoaded', () => {
    initFilters();
    loadFromLocalStorage();
    setupEventListeners();
});

function initFilters() {
    if (filterType) {
        filterType.innerHTML = '<option value=\"all\">Tous les types d\'alerte</option>';
        Object.keys(TAGS_KEYWORDS).forEach(type => {
            const opt = document.createElement('option');
            opt.value = type;
            opt.textContent = type;
            filterType.appendChild(opt);
        });
    }
}

function setupEventListeners() {
    if (btnSyncAll) btnSyncAll.addEventListener('click', syncData);
    if (btnResetFilters) btnResetFilters.addEventListener('click', resetFilters);
    if (btnToggleSort) btnToggleSort.addEventListener('click', toggleSort);
    
    if (btnQuickToday) btnQuickToday.addEventListener('click', filterTodayOnly);
    if (btnViewGrid) btnViewGrid.addEventListener('click', () => switchView('grid'));
    if (btnViewTable) btnViewTable.addEventListener('click', () => switchView('table'));

    [filterType, filterSeverity, filterShowBlacklist].forEach(el => {
        if (el) el.addEventListener('change', renderAlerts);
    });

    if (searchBar) searchBar.addEventListener('input', renderAlerts);
}

// --- Synchronisation ---
async function syncData() {
    setLoading(true);
    updateSyncStatus("Synchronisation Savoie en cours...");

    try {
        const data = await fetchSavoieData();
        
        // Post-traitement : Qualification automatique de la sévérité et de la liste noire
        window.ALL_ALERTS = data.map(alert => {
            const textToAnalyze = `${alert.title} ${alert.cross || alert.description || ''}`.toLowerCase();
            
            // 1. Détection Liste Noire
            const isBlacklisted = BLACKLIST_KEYWORDS.some(kw => textToAnalyze.includes(kw.toLowerCase()));
            
            // 2. Détection du type calculé par mot-clé si non défini
            let computedType = alert.type;
            if (alert.type === "Flash Info") {
                computedType = "Flash Info";
            } else {
                for (const [category, keywords] of Object.entries(TAGS_KEYWORDS)) {
                    if (keywords.some(kw => textToAnalyze.includes(kw.toLowerCase()))) {
                        computedType = category;
                        break;
                    }
                }
            }

            return {
                ...alert,
                computedType: computedType,
                computedSeverity: isBlacklisted ? 'blacklist' : (alert.severity || 'info')
            };
        });

        localStorage.setItem('cached_savoie_alerts', JSON.stringify(window.ALL_ALERTS));
        localStorage.setItem('cached_savoie_time', new Date().toISOString());

        renderAlerts();
        updateSyncStatus(`Mis à jour : ${new Date().toLocaleTimeString('fr-FR')}`);
    } catch (err) {
        console.error(err);
        updateSyncStatus("Erreur lors de la synchronisation.");
    } finally {
        setLoading(false);
    }
}

// --- Affichage et Filtres ---
function renderAlerts() {
    if (!alertsGrid) return;
    alertsGrid.innerHTML = '';

    const query = searchBar ? searchBar.value.toLowerCase().trim() : '';
    const selType = filterType ? filterType.value : 'all';
    const selSeverity = filterSeverity ? filterSeverity.value : 'all';
    const showBlacklist = filterShowBlacklist ? filterShowBlacklist.checked : false;

    // Filtrage
    let filtered = window.ALL_ALERTS.filter(a => {
        // Liste noire
        if (a.computedSeverity === 'blacklist' && !showBlacklist) return false;

        // Type
        if (selType !== 'all' && a.computedType !== selType) return false;

        // Sévérité
        if (selSeverity !== 'all' && a.computedSeverity !== selSeverity) return false;

        // Recherche textuelle
        if (query) {
            const content = `${a.title} ${a.cross || a.description || ''}`.toLowerCase();
            if (!content.includes(query)) return false;
        }

        return true;
    });

    // Tri par date
    filtered.sort((a, b) => {
        const dateA = new Date(a.startRaw || a.updated);
        const dateB = new Date(b.startRaw || b.updated);
        return sortAscending ? dateA - dateB : dateB - dateA;
    });

    updateStats(window.ALL_ALERTS.length, filtered);

    if (filtered.length === 0) {
        alertsGrid.innerHTML = '<div class=\"no-alerts\">Aucune alerte ne correspond à vos critères.</div>';
        return;
    }

    if (currentView === 'grid') {
        renderGridView(filtered);
    } else {
        renderTableView(filtered);
    }
}

function renderGridView(alerts) {
    alerts.forEach(alert => {
        const card = document.createElement('div');
        card.className = `alert-card severity-${alert.computedSeverity}`;
        
        let badgeColor = alert.computedSeverity === 'danger' ? '🔴' : alert.computedSeverity === 'warning' ? '🟠' : '🔘';
        if (alert.computedSeverity === 'blacklist') badgeColor = '⚪';

        card.innerHTML = `
            <div class=\"card-header\">
                <span class=\"card-badge\">${badgeColor} ${alert.computedType}</span>
                <span class=\"card-date\">${alert.updated}</span>
            </div>
            <h3 class=\"card-title\">${alert.title}</h3>
            <div class=\"card-content\">${(alert.cross || alert.description || '').replace(/\n/g, '<br>')}</div>
            <div class=\"card-actions\">
                ${alert.lat && alert.lon ? `<button class=\"btn-geo\" onclick=\"window.open('https://www.google.com/maps/search/?api=1&query=${alert.lat},${alert.lon}', '_blank')\">📍 Voir sur la carte</button>` : '<span class=\"no-geo\">Aucune coordonnée</span>'}
            </div>
        `;
        alertsGrid.appendChild(card);
    });
}

function renderTableView(alerts) {
    const container = document.createElement('div');
    container.className = 'table-container';

    let rowsHtml = '';
    alerts.forEach(alert => {
        let badgeColor = alert.computedSeverity === 'danger' ? '🔴' : alert.computedSeverity === 'warning' ? '🟠' : '🔘';
        if (alert.computedSeverity === 'blacklist') badgeColor = '⚪';

        const actionsHtml = alert.lat && alert.lon 
            ? `<button class=\"btn-geo-sm\" onclick=\"window.open('https://www.google.com/maps/search/?api=1&query=${alert.lat},${alert.lon}', '_blank')\">📍 Map</button>` 
            : '<span class=\"no-geo-sm\">-</span>';

        rowsHtml += `
            <tr class=\"row-severity-${alert.computedSeverity}\">
                <td><strong>${badgeColor} ${alert.computedType}</strong></td>
                <td>
                    <div class=\"table-title\">${alert.title}</div>
                    <div class=\"table-desc\">${(alert.cross || alert.description || '').replace(/\n/g, ' ')}</div>
                </td>
                <td style=\"white-space: nowrap;\">${alert.updated}</td>
                <td>${actionsHtml}</td>
            </tr>
        `;
    });

    container.innerHTML = `
        <table class=\"tc-table\">
            <thead>
                <tr>
                    <th style=\"width:160px;\">Nature</th>
                    <th>Événement & Description</th>
                    <th style=\"width:140px;\">Date / Publication</th>
                    <th style=\"width:90px;\">Action</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHtml}
            </tbody>
        </table>
    `;
    alertsGrid.appendChild(container);
}

// --- Statistiques ---
function updateStats(totalCount, filteredAlerts) {
    if (statTotal) statTotal.textContent = totalCount;
    let counts = { danger: 0, warning: 0, info: 0, blacklist: 0 };

    filteredAlerts.forEach(a => {
        if (counts[a.computedSeverity] !== undefined) counts[a.computedSeverity]++;
    });

    if (statsBySeverity) {
        statsBySeverity.innerHTML = `
            <div class=\"severity-stat-badge\" title=\"Bloquant / Urgent\">🔴 <strong>${counts.danger}</strong></div>\n            <div class=\"severity-stat-badge\" title=\"Perturbation\">🟠 <strong>${counts.warning}</strong></div>\n            <div class=\"severity-stat-badge\" title=\"Information\">🔘 <strong>${counts.info}</strong></div>\n            <div class=\"severity-stat-badge\" title=\"Masqué\">⚪ <strong>${counts.blacklist}</strong></div>\n        `;
    }
}

// --- Actions Utilitaires ---
function resetFilters() {
    if (filterType) filterType.value = 'all';
    if (filterSeverity) filterSeverity.value = 'all';
    if (filterShowBlacklist) filterShowBlacklist.checked = false;
    if (searchBar) searchBar.value = '';
    renderAlerts();
}

function toggleSort() {
    sortAscending = !sortAscending;
    if (btnToggleSort) btnToggleSort.textContent = sortAscending ? '📅 Tri : Plus anciens' : '📅 Tri : Plus récents';
    renderAlerts();
}

function filterTodayOnly() {
    if (searchBar) searchBar.value = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    renderAlerts();
}

function switchView(view) {
    currentView = view;
    if (btnViewGrid) btnViewGrid.classList.toggle('active', view === 'grid');
    if (btnViewTable) btnViewTable.classList.toggle('active', view === 'table');
    renderAlerts();
}

function loadFromLocalStorage() {
    const cached = localStorage.getItem('cached_salie_alerts') || localStorage.getItem('cached_savoie_alerts');
    const cachedTime = localStorage.getItem('cached_savoie_time');
    
    if (cached) {
        window.ALL_ALERTS = JSON.parse(cached);
        renderAlerts();
        if (cachedTime) {
            updateSyncStatus(`Cache (${new Date(cachedTime).toLocaleTimeString('fr-FR')})`);
        }
    } else {
        updateSyncStatus("Aucune donnée en cache. Lancez la synchro.");
    }
}

function setLoading(isLoading) {
    if (loader) loader.style.display = isLoading ? 'block' : 'none';
    if (btnSyncAll) btnSyncAll.disabled = isLoading;
}

function updateSyncStatus(text) {
    if (syncStatus) syncStatus.textContent = text;
}
