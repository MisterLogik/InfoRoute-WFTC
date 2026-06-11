import { DEPARTEMENTS_CONFIG, BLACKLIST_KEYWORDS } from './config-api.js';
import { fetchDeptData } from './fetcher.js';

// --- État de l'application ---
window.ALL_ALERTS = []; 
let sortAscending = true; // Par défaut : du plus ancien au plus récent (Ordre Chronologique)

// --- Éléments du DOM ---
const btnSyncAll = document.getElementById('btn-sync-all');
const btnResetFilters = document.getElementById('btn-reset-filters');
const btnToggleSort = document.getElementById('btn-toggle-sort');
const btnQuickToday = document.getElementById('btn-quick-today');
const btnQuickTomorrow = document.getElementById('btn-quick-tomorrow');

const syncStatus = document.getElementById('sync-status');
const filterDept = document.getElementById('filter-dept');
const filterType = document.getElementById('filter-type');
const filterSeverity = document.getElementById('filter-severity');

const filterCurrentOnly = document.getElementById('filter-current-only');
const filterDateStart = document.getElementById('filter-date-start');
const filterDateStartLogic = document.getElementById('filter-date-start-logic');
const filterDateEnd = document.getElementById('filter-date-end');
const filterDateEndLogic = document.getElementById('filter-date-end-logic');

const searchBar = document.getElementById('search-bar');
const alertsGrid = document.getElementById('alerts-grid');
const loader = document.getElementById('loader');
const statTotal = document.getElementById('stat-total');
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
    
    btnQuickToday.addEventListener('click', setFilterToday);
    btnQuickTomorrow.addEventListener('click', setFilterTomorrow);

    // Filtrage dynamique à chaque interaction
    searchBar.addEventListener('input', renderAlerts);
    filterDept.addEventListener('change', renderAlerts);
    filterType.addEventListener('change', renderAlerts);
    filterSeverity.addEventListener('change', renderAlerts);
    
    filterCurrentOnly.addEventListener('change', renderAlerts);
    filterDateStart.addEventListener('change', renderAlerts);
    filterDateStartLogic.addEventListener('change', renderAlerts);
    filterDateEnd.addEventListener('change', renderAlerts);
    filterDateEndLogic.addEventListener('change', renderAlerts);
}

function toggleSortOrder() {
    sortAscending = !sortAscending;
    btnToggleSort.innerHTML = sortAscending ? '⬇️ Tri : Date de début (Croissant)' : '⬆️ Tri : Date de début (Décroissant)';
    renderAlerts();
}

function resetAllFilters() {
    searchBar.value = '';
    filterDept.value = 'all';
    filterType.value = 'all';
    filterSeverity.value = 'all';
    filterCurrentOnly.checked = false;
    filterDateStart.value = '';
    filterDateStartLogic.value = 'before_or_on';
    filterDateEnd.value = '';
    filterDateEndLogic.value = 'before_or_on';
    renderAlerts();
}

function setFilterToday() {
    resetAllFilters();
    filterCurrentOnly.checked = true;
    renderAlerts();
}

function setFilterTomorrow() {
    resetAllFilters();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    const tomorrowStr = `${yyyy}-${mm}-${dd}`;

    filterDateStartLogic.value = 'before_or_on';
    filterDateStart.value = tomorrowStr;
    
    filterDateEndLogic.value = 'after_or_on';
    filterDateEnd.value = tomorrowStr;
    
    renderAlerts();
}

// --- Synchronisation Réseau et Sauvegarde Locale ---
async function synchronizeAll() {
    loader.classList.remove('hidden');
    btnSyncAll.disabled = true;
    window.ALL_ALERTS = []; 

    const fetchPromises = Object.keys(DEPARTEMENTS_CONFIG).map(async (code) => {
        const deptAlerts = await fetchDeptData(code);
        return deptAlerts.map(alert => {
            // Traçabilité WME TeamClosure : Injection du timestamp de découverte sur le flux original
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

// --- Moteur de Filtrage, Qualification Métier et Tri ---
function renderAlerts() {
    const searchQuery = searchBar.value.toLowerCase().trim();
    const selectedDept = filterDept.value;
    const selectedType = filterType.value;
    const selectedSeverity = filterSeverity.value;
    
    const currentOnly = filterCurrentOnly.checked;
    const startTargetStr = filterDateStart.value;
    const startLogic = filterDateStartLogic.value;
    const endTargetStr = filterDateEnd.value;
    const endLogic = filterDateEndLogic.value;

    const now = new Date();

    let filtered = window.ALL_ALERTS.filter(alert => {
        const titleLower = alert.title.toLowerCase();
        const crossLower = alert.cross.toLowerCase();

        // 1. Filtrage Liste Noire
        const isBlacklisted = BLACKLIST_KEYWORDS.some(kw => 
            titleLower.includes(kw.toLowerCase()) || crossLower.includes(kw.toLowerCase())
        );
        if (isBlacklisted) return false;

        // 2. Traitement Spécifique Métier : Séparation Alternat VS Fermeture Totale
        let calculatedType = alert.type;
        if (alert.type.toLowerCase().includes('travaux') || alert.type.toLowerCase().includes('chantier')) {
            const hasAlternatKeywords = crossLower.includes('alternat') || crossLower.includes('restriction') || crossLower.includes('voie impactée') || crossLower.includes('circulation alternée');
            calculatedType = hasAlternatKeywords ? 'Alternat' : 'Fermeture';
        } else if (titleLower.includes('ferm') || crossLower.includes('route fermée') || crossLower.includes('fermeture')) {
            calculatedType = 'Fermeture';
        }

        // 3. Application des filtres de sélection de catégorie
        const matchSearch = titleLower.includes(searchQuery) || crossLower.includes(searchQuery);
        const matchDept = selectedDept === 'all' || alert.deptCode === selectedDept;
        
        let matchType = false;
        if (selectedType === 'all') {
            matchType = true;
        } else if (selectedType === 'Alternat') {
            matchType = calculatedType === 'Alternat';
        } else if (selectedType === 'Fermeture') {
            matchType = calculatedType === 'Fermeture' || alert.type.toLowerCase().includes('ferm');
        } else {
            matchType = alert.type.toLowerCase().includes(selectedType.toLowerCase());
        }

        const matchSeverity = selectedSeverity === 'all' || alert.severity === selectedSeverity;

        if (!matchSearch || !matchDept || !matchType || !matchSeverity) return false;

        // Extraction temporelle adaptative
        const alertStartDate = parseAlertDate(alert.updated);

        // 4. Filtrage dynamique "Actif en ce moment"
        if (currentOnly) {
            if (alertStartDate && alertStartDate > now) return false;
            const actualEndDate = extractEndDate(alert.cross);
            if (actualEndDate && actualEndDate < now) return false;
        }

        // 5. Borne de sélection : Date de Début
        if (startTargetStr && alertStartDate) {
            const target = new Date(startTargetStr);
            target.setHours(0, 0, 0, 0);
            const compDate = new Date(alertStartDate);
            compDate.setHours(0, 0, 0, 0);

            if (startLogic === 'before_or_on' && compDate > target) return false;
            if (startLogic === 'after_or_on' && compDate < target) return false;
        }

        // 6. Borne de sélection : Date de Fin
        if (endTargetStr) {
            const actualEndDate = extractEndDate(alert.cross);
            if (!actualEndDate) return false; 

            const target = new Date(endTargetStr);
            target.setHours(0, 0, 0, 0);
            const compDate = new Date(actualEndDate);
            compDate.setHours(0, 0, 0, 0);

            if (endLogic === 'before_or_on' && compDate > target) return false;
            if (endLogic === 'after_or_on' && compDate < target) return false;
        }

        // Injection du type recalculé pour affichage dynamique sur les cartes
        alert.computedCategory = calculatedType;
        return true;
    });

    // 7. Tri par défaut par Date de Début Croissant (avec Fallback sur date d'apparition du flux si non spécifiée)
    filtered.sort((a, b) => {
        const dateA = parseAlertDate(a.updated) || (a.discoveredAt ? new Date(a.discoveredAt) : new Date(0));
        const dateB = parseAlertDate(b.updated) || (b.discoveredAt ? new Date(b.discoveredAt) : new Date(0));
        
        return sortAscending ? dateA - dateB : dateB - dateA;
    });

    // Rendu dynamique de la grille
    alertsGrid.innerHTML = '';

    if (filtered.length === 0) {
        alertsGrid.innerHTML = `<div class="empty-state">Aucun événement ne correspond aux critères sélectionnés.</div>`;
        updateStats(0, filtered);
        return;
    }

    filtered.forEach(alert => {
        const card = document.createElement('div');
        card.className = `card ${alert.severity || 'warning'}`;
        
        // Détermination des labels visuels
        const displayType = alert.computedCategory === 'Alternat' ? '🚧 TRAVAUX (Alternat / Restr.)' : `⛔ ${alert.type.toUpperCase()}`;
        const hasDate = parseAlertDate(alert.updated) !== null;
        const creationInfo = alert.discoveredAt ? `Apparition flux : ${new Date(alert.discoveredAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : 'Apparition : Date inconnue';

        card.innerHTML = `
            <div class="card-header">
                <span class="card-type">${displayType}</span>
                <span class="card-dept">Dép. ${alert.deptCode}</span>
            </div>
            <div class="card-title">${alert.title}</div>
            <div class="card-body" style="white-space: pre-wrap;">${alert.cross}</div>
            <div class="card-footer">
                <div>${hasDate ? `Début / Maj : ${formatDisplayDate(alert.updated)}` : '⚠️ Début / Maj : Non spécifié sur l\'alerte'}</div>
                <div class="creation-badge">⏱️ ${creationInfo}</div>
            </div>
        `;
        alertsGrid.appendChild(card);
    });

    updateStats(filtered.length, filtered);
}

// Traitement textuel des dates provenant des APIs partenaires
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
        return new Date(parseInt(genericMatch[3]), parseInt(genericMatch[2]) - 1, parseInt(genericMatch[1]), 18, 0); 
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
    statsByDept.innerHTML = '';

    const counts = {};
    filteredAlerts.forEach(a => counts[a.deptCode] = (counts[a.deptCode] || 0) + 1);

    for (const [dept, count] of Object.entries(counts)) {
        const tag = document.createElement('span');
        tag.className = 'dept-tag-stat';
        tag.innerHTML = `📍 <strong>${dept}</strong> : ${count}`;
        statsByDept.appendChild(tag);
    }
}