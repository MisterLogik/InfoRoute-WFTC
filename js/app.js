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
    // Remplissage dynamique du sélecteur de nature basé sur nos tags globaux
    if (filterType) {
        filterType.innerHTML = '<option value="all">Tous les types d\'alerte</option>';
        filterType.innerHTML += '<option value="Flash Info">⭐ Alertes FLASH</option>';
        for (const tag of Object.keys(TAGS_KEYWORDS)) {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = tag;
            filterType.appendChild(option);
        }
    }
}

function setupEventListeners() {
    if (btnSyncAll) btnSyncAll.addEventListener('click', synchronizeData);
    if (btnResetFilters) btnResetFilters.addEventListener('click', resetAllFilters);
    
    if (btnToggleSort) {
        btnToggleSort.addEventListener('click', () => {
            sortAscending = !sortAscending;
            btnToggleSort.innerHTML = sortAscending ? '⬇️ Tri : Date (Anciens d\'abord)' : '⬇️ Tri : Date (Récents d\'abord)';
            renderAlerts();
        });
    }
    
    if (btnQuickToday) {
        btnQuickToday.addEventListener('click', () => { 
            resetAllFilters(); 
            renderAlerts(); 
        });
    }
    
    if (btnViewGrid) btnViewGrid.addEventListener('click', () => { currentView = 'grid'; renderAlerts(); });
    if (btnViewTable) btnViewTable.addEventListener('click', () => { currentView = 'table'; renderAlerts(); });

    if (searchBar) searchBar.addEventListener('input', renderAlerts);
    if (filterType) filterType.addEventListener('change', renderAlerts);
    if (filterSeverity) filterSeverity.addEventListener('change', renderAlerts);
    if (filterShowBlacklist) filterShowBlacklist.addEventListener('change', renderAlerts); 
}

function resetAllFilters() {
    if (searchBar) searchBar.value = '';
    if (filterType) filterType.value = 'all';
    if (filterSeverity) filterSeverity.value = 'all';
    if (filterShowBlacklist) filterShowBlacklist.checked = false; 
    renderAlerts();
}

// --- Synchronisation ---
async function synchronizeData() {
    if (loader) loader.classList.remove('hidden');
    if (btnSyncAll) btnSyncAll.disabled = true;

    const rawAlerts = await fetchSavoieData();
    
    // Enrichissement analytique (Multi-tags & Niveaux de sévérité)
    window.ALL_ALERTS = rawAlerts.map(alert => {
        const textTarget = `${alert.title} ${alert.description}`.toLowerCase();
        
        // 1. Système d'analyse Multi-Tags basé sur les mots-clés textuels
        let detectedTags = [];
        for (const [tag, keywords] of Object.entries(TAGS_KEYWORDS)) {
            if (keywords.some(kw => textTarget.includes(kw))) {
                detectedTags.push(tag);
            }
        }
        // Fallback sur la catégorie d'origine de l'API Savoie si aucun mot-clé spécifique n'a matché
        if (detectedTags.length === 0 && alert.originalCategory) {
            detectedTags.push(alert.originalCategory);
        }

        // 2. Évaluation de la sévérité visuelle
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

    if (loader) loader.classList.add('hidden');
    if (btnSyncAll) btnSyncAll.disabled = false;
    
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
    if (syncStatus) syncStatus.textContent = `Dernière synchro : ${time}`;
}

// --- Moteur de rendu filtré ---
function renderAlerts() {
    const searchQuery = searchBar ? searchBar.value.toLowerCase().trim() : '';
    const selectedType = filterType ? filterType.value : 'all';
    const selectedSeverity = filterSeverity ? filterSeverity.value : 'all';
    const showBlacklist = filterShowBlacklist ? filterShowBlacklist.checked : false;

    let filtered = window.ALL_ALERTS.filter(alert => {
        // Gestion de la Liste Noire
        if (alert.computedSeverity === 'blacklist' && !showBlacklist && selectedSeverity !== 'blacklist') {
            return false;
        }

        // Match de la recherche textuelle globale
        const matchSearch = alert.title.toLowerCase().includes(searchQuery) || alert.description.toLowerCase().includes(searchQuery);
        
        // Match du filtrage par Multi-Tags
        let matchType = false;
        if (selectedType === 'all') {
            matchType = true;
        } else if (selectedType === 'Flash Info') {
            matchType = alert.isFlash;
        } else {
            matchType = alert.computedTags.includes(selectedType);
        }

        // Match du filtrage par Gravité visuelle
        const matchSeverity = selectedSeverity === 'all' || alert.computedSeverity === selectedSeverity;

        return matchSearch && matchType && matchSeverity;
    });

    // Tri temporel dynamique
    filtered.sort((a, b) => {
        const dateA = a.startRaw ? new Date(a.startRaw) : new Date(0);
        const dateB = b.startRaw ? new Date(b.startRaw) : new Date(0);
        return sortAscending ? dateA - dateB : dateB - dateA;
    });

    if (!alertsGrid) return;
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

// --- Système intelligent d'extraction et formatage des dates ---
function extractAndFormatDates(alert) {
    let debut = alert.startRaw ? formatDateString(alert.startRaw) : null;
    let fin = alert.endRaw ? formatDateString(alert.endRaw) : null;

    // Analyse Regex de secours si la date de début est vide dans l'API
    if (!debut && alert.description) {
        const matchStart = alert.description.match(/(?:Début|Du)\s*[:\s]*(\d{2}\/\d{2}\/\d{4}(?:\s*\d{2}:\d{2})?)/i);
        if (matchStart) debut = matchStart[1];
    }

    // Analyse Regex de secours si la date de fin est vide dans l'API
    if (!fin && alert.description) {
        const matchEnd = alert.description.match(/(?:Fin|jusqu'au|au)\s*[:\s]*(\d{2}\/\d{2}\/\d{4}(?:\s*\d{2}:\d{2})?)/i);
        if (matchEnd) fin = matchEnd[1];
    }

    return { debut, fin };
}

function formatDateString(dateStr) {
    if (!dateStr || dateStr === "Récemment" || dateStr === "En cours") return null;
    const parsed = Date.parse(dateStr);
    if (!isNaN(parsed)) {
        return new Date(parsed).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    return dateStr;
}

// --- Rendu : Vue en Grille (Structure demandée) ---
function renderGridView(alerts) {
    alertsGrid.className = "alerts-grid";
    alerts.forEach(alert => {
        const card = document.createElement('div');
        card.className = `card ${alert.computedSeverity} ${alert.isFlash ? 'flash-card' : ''}`;
        
        // Tags du haut joints par un espace (alignés à gauche par CSS/HTML)
        const tagsHtml = alert.computedTags.map(t => `<span class="badge-tag">${t}</span>`).join(' ');
        
        // Extraction des métadonnées temporelles brutes ou textuelles
        const dates = extractAndFormatDates(alert);
        
        // Préparation des blocs conditionnels (si non disponibles, ils restent vides)
        const impactHtml = alert.impact ? `<div class="card-impact" style="font-size: 0.9rem; color: #ffca28; margin-top: 5px;"><strong>Impact :</strong> ${alert.impact}</div>` : '';
        const debutHtml = dates.debut ? `<div><strong>Début :</strong> ${dates.debut}</div>` : '';
        const finHtml = dates.fin ? `<div><strong>Fin :</strong> ${dates.fin}</div>` : '';
        
        let wmeActionHtml = '';
        if (alert.lat && alert.lon) {
            wmeActionHtml = `
                <div class="wme-actions" style="margin-top: 15px;">
                    <a href="https://waze.com/fr/editor?env=row&lat=${alert.lat}&lon=${alert.lon}&zoomLevel=19" target="_blank" class="btn-wme wme-prod">WME Production</a>
                    <a href="https://beta.waze.com/fr/editor?env=row&lat=${alert.lat}&lon=${alert.lon}&zoomLevel=19" target="_blank" class="btn-wme wme-beta">WME Beta</a>
                </div>
            `;
        }

        // Rendu final respectant rigoureusement l'ordre demandé
        card.innerHTML = `
            <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <div class="tags-container" style="text-align: left;">${tagsHtml}</div>
                <div class="dept-badge" style="text-align: right; font-weight: bold; font-size: 0.85rem; opacity: 0.8;">Dep. 73</div>
            </div>
            
            <div class="card-title" style="font-weight: bold; font-size: 1.1rem; margin-bottom: 4px;">${alert.title}</div>
            
            ${impactHtml}
            
            <div class="card-spacer" style="height: 12px;"></div>
            
            <div class="card-body" style="white-space: pre-wrap; font-size: 0.95rem; line-height: 1.4; margin-bottom: 15px;">${alert.description || "Aucun détail complémentaire."}</div>
            
            <div class="card-footer-dates" style="font-size: 0.85rem; color: #bbb; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px; margin-bottom: 5px;">
                ${debutHtml}
                ${finHtml}
            </div>
            
            ${wmeActionHtml}
        `;
        alertsGrid.appendChild(card);
    });
}

// --- Rendu : Vue en Tableau (Alternative épurée) ---
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

// --- Statistiques et compteurs globaux ---
function updateStats(totalCount, filteredAlerts) {
    if (statTotal) statTotal.textContent = totalCount;
    let counts = { danger: 0, warning: 0, info: 0, blacklist: 0 };

    filteredAlerts.forEach(a => {
        if (counts[a.computedSeverity] !== undefined) counts[a.computedSeverity]++;
    });

    if (statsBySeverity) {
        statsBySeverity.innerHTML = `
            <div class="severity-stat-badge" title="Bloquant / Urgent">🔴 <strong>${counts.danger}</strong></div>
            <div class="severity-stat-badge" title="Perturbation">🟠 <strong>${counts.warning}</strong></div>
            <div class="severity-stat-badge" title="Information">🔘 <strong>${counts.info}</strong></div>
            <div class="severity-stat-badge" title="Masqué (Test)">⚪ <strong>${counts.blacklist}</strong></div>
        `;
    }
}
