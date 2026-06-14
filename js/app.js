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
const btnQuickWeek = document.getElementById('btn-quick-week');
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
    // Remplissage dynamique du sélecteur de nature basé sur nos tags globaux
    filterType.innerHTML = '<option value="all">Tous les types d\'alerte</option>';
    filterType.innerHTML += '<option value="Flash Info">⭐ Alertes FLASH</option>';
    for (const tag of Object.keys(TAGS_KEYWORDS)) {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = tag;
        filterType.appendChild(option);
    }
}

function setupEventListeners() {
    btnSyncAll.addEventListener('click', synchronizeData);
    btnResetFilters.addEventListener('click', resetAllFilters);
    btnToggleSort.addEventListener('click', () => {
        sortAscending = !sortAscending;
        btnToggleSort.innerHTML = sortAscending ? '⬇️ Tri : Date (Anciens d\'abord)' : '⬇️ Tri : Date (Récents d\'abord)';
        renderAlerts();
    });
    
    btnQuickToday.addEventListener('click', () => { resetAllFilters(); renderAlerts(); });
    btnViewGrid.addEventListener('click', () => { currentView = 'grid'; renderAlerts(); });
    btnViewTable.addEventListener('click', () => { currentView = 'table'; renderAlerts(); });

    searchBar.addEventListener('input', renderAlerts);
    filterType.addEventListener('change', renderAlerts);
    filterSeverity.addEventListener('change', renderAlerts);
    filterShowBlacklist.addEventListener('change', renderAlerts); 
}

function resetAllFilters() {
    searchBar.value = '';
    filterType.value = 'all';
    filterSeverity.value = 'all';
    filterShowBlacklist.checked = false; 
    renderAlerts();
}

// --- Synchronisation ---
async function synchronizeData() {
    loader.classList.remove('hidden');
    btnSyncAll.disabled = true;

    const rawAlerts = await fetchSavoieData();
    
    // Enrichissement analytique (Multi-tags & Niveaux de sévérité)
    window.ALL_ALERTS = rawAlerts.map(alert => {
        const textTarget = `${alert.title} ${alert.description}`.toLowerCase();
        
        // 1. Système d'analyse Multi-Tags
        let detectedTags = [];
        for (const [tag, keywords] of Object.entries(TAGS_KEYWORDS)) {
            if (keywords.some(kw => textTarget.includes(kw))) {
                detectedTags.push(tag);
            }
        }
        // Fallback sur la catégorie d'origine de l'API si aucun mot-clé spécifique n'a matché
        if (detectedTags.length === 0 && alert.originalCategory) {
            detectedTags.push(alert.originalCategory);
        }

        // 2. Évaluation de la sévérité
        let severity = 'info';
        if (BLACKLIST_KEYWORDS.some(kw => textTarget.includes(kw.toLowerCase()))) {
            severity = 'blacklist';
        } else if (alert.isFlash) {
            severity = 'danger'; // Priorité absolue aux flux Flash Info
        } else if (detectedTags.includes('Fermeture') || detectedTags.includes('Accident')) {
            severity = 'danger';
        } else if (detectedTags.includes('Travaux') || detectedTags.includes('Bouchon') || detectedTags.includes('Obstacle')) {
            severity = 'warning';
        }

        return {
            ...alert,
            computedTags: detectedTags,
            computedSeverity: severity
        };
    });

    localStorage.setItem('savoie_alerts_data', JSON.stringify(window.ALL_ALERTS));
    const nowTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    localStorage.setItem('savoie_last_sync_time', nowTime);

    loader.classList.add('hidden');
    btnSyncAll.disabled = false;
    
    updateSyncStatus(nowTime);
    renderAlerts();
}

function loadFromLocalStorage() {
    const localData = localStorage.getItem('savoie_alerts_data');
    const localTime = localStorage.getItem('savoie_last_sync_time');
    if (localData) {
        window.ALL_ALERTS = JSON.parse(localData);
        updateSyncStatus(localTime);
        renderAlerts();
    }
}

function updateSyncStatus(time) {
    syncStatus.textContent = `Dernière synchro : ${time}`;
}

// --- Moteur de rendu filtré ---
function renderAlerts() {
    const searchQuery = searchBar.value.toLowerCase().trim();
    const selectedType = filterType.value;
    const selectedSeverity = filterSeverity.value;
    const showBlacklist = filterShowBlacklist.checked;

    let filtered = window.ALL_ALERTS.filter(alert => {
        // Sécurité Liste Noire
        if (alert.computedSeverity === 'blacklist' && !showBlacklist && selectedSeverity !== 'blacklist') {
            return false;
        }

        // Match Recherche textuelle
        const matchSearch = alert.title.toLowerCase().includes(searchQuery) || alert.description.toLowerCase().includes(searchQuery);
        
        // Match Multi-Tags
        let matchType = false;
        if (selectedType === 'all') {
            matchType = true;
        } else if (selectedType === 'Flash Info') {
            matchType = alert.isFlash;
        } else {
            matchType = alert.computedTags.includes(selectedType);
        }

        // Match Gravité
        const matchSeverity = selectedSeverity === 'all' || alert.computedSeverity === selectedSeverity;

        return matchSearch && matchType && matchSeverity;
    });

    // Tri temporel
    filtered.sort((a, b) => {
        const dateA = a.startRaw ? new Date(a.startRaw) : new Date(0);
        const dateB = b.startRaw ? new Date(b.startRaw) : new Date(0);
        return sortAscending ? dateA - dateB : dateB - dateA;
    });

    alertsGrid.innerHTML = '';

    if (filtered.length === 0) {
        alertsGrid.innerHTML = `<div class="empty-state">Aucun événement ne correspond à vos critères en Savoie.</div>`;
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

// --- Vue en Grille ---
function renderGridView(alerts) {
    alertsGrid.className = "alerts-grid";
    alerts.forEach(alert => {
        const card = document.createElement('div');
        card.className = `card ${alert.computedSeverity} ${alert.isFlash ? 'flash-card' : ''}`;
        
        const tagsHtml = alert.computedTags.map(t => `<span class="badge-tag">${t}</span>`).join(' ');
        
        let wmeActionHtml = '';
        if (alert.lat && alert.lon) {
            wmeActionHtml = `
                <div class="wme-actions">
                    <a href="https://waze.com/fr/editor?env=row&lat=${alert.lat}&lon=${alert.lon}&zoomLevel=19" target="_blank" class="btn-wme wme-prod">WME Production</a>
                    <a href="https://beta.waze.com/fr/editor?env=row&lat=${alert.lat}&lon=${alert.lon}&zoomLevel=19" target="_blank" class="btn-wme wme-beta">WME Beta</a>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="card-header">
                <div class="tags-container">${tagsHtml}</div>
                ${alert.isFlash ? '<span class="flash-badge">⚡ URGENT</span>' : ''}
            </div>
            <div class="card-title">${alert.title}</div>
            <div class="card-body" style="white-space: pre-wrap;">${alert.description || "Aucun détail complémentaire."}</div>
            <div class="card-footer">
                <div class="date-badge">📅 ${alert.updated}</div>
                ${wmeActionHtml}
            </div>
        `;
        alertsGrid.appendChild(card);
    });
}

// --- Vue en Tableau ---
function renderTableView(alerts) {
    alertsGrid.className = "";
    const container = document.createElement('div');
    container.className = "tc-table-container";

    let rowsHtml = '';
    alerts.forEach(alert => {
        let actionsHtml = '<i>Pas de géoloc</i>';
        if (alert.lat && alert.lon) {
            actionsHtml = `
                <div class="table-actions">
                    <a href="https://waze.com/fr/editor?env=row&lat=${alert.lat}&lon=${alert.lon}&zoomLevel=19" target="_blank" class="btn-wme-xs wme-prod">PRO</a>
                    <a href="https://beta.waze.com/fr/editor?env=row&lat=${alert.lat}&lon=${alert.lon}&zoomLevel=19" target="_blank" class="btn-wme-xs wme-beta">BETA</a>
                </div>
            `;
        }

        const tagsString = alert.computedTags.join(', ');

        rowsHtml += `
            <tr class="row-${alert.computedSeverity}">
                <td><strong>${alert.isFlash ? '⭐ FLASH' : tagsString}</strong></td>
                <td>
                    <div style="font-weight:600;">${alert.title}</div>
                    <div style="font-size:0.75rem; color:#aaa; max-width:500px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                        ${alert.description || ''}
                    </div>
                </td>
                <td style="font-size:0.75rem; white-space:nowrap;">${alert.updated}</td>
                <td>${actionsHtml}</td>
            </tr>
        `;
    });

    container.innerHTML = `
        <table class="tc-table">
            <thead>
                <tr>
                    <th style="width:160px;">Nature(s)</th>
                    <th>Événement & Description</th>
                    <th style="width:140px;">Publication / Début</th>
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

function updateStats(totalCount, filteredAlerts) {
    statTotal.textContent = totalCount;
    let counts = { danger: 0, warning: 0, info: 0, blacklist: 0 };

    filteredAlerts.forEach(a => {
        if (counts[a.computedSeverity] !== undefined) counts[a.computedSeverity]++;
    });

    statsBySeverity.innerHTML = `
        <div class="severity-stat-badge" title="Bloquant / Urgent">🔴 <strong>${counts.danger}</strong></div>
        <div class="severity-stat-badge" title="Perturbation">🟠 <strong>${counts.warning}</strong></div>
        <div class="severity-stat-badge" title="Information">🔘 <strong>${counts.info}</strong></div>
        <div class="severity-stat-badge" title="Masqué (Test)">⚪ <strong>${counts.blacklist}</strong></div>
    `;
}
