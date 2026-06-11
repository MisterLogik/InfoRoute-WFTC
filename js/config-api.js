// Les catégories officielles trouvées dans le script WME Savoie
export const SAVOIE_CATEGORIES = {
    38: { name: "Accident", icon: "⚠️", severity: "danger" },
    40: { name: "Bouchon", icon: "🚗", severity: "warning" },
    42: { name: "Travaux", icon: "🚧", severity: "warning" },
    43: { name: "Manifestation", icon: "🚲", severity: "warning" },
    55: { name: "Obstacle", icon: "🛑", severity: "danger" },
    58: { name: "Fermeture", icon: "🚫", severity: "danger" },
    59: { name: "Déviation", icon: "↔️", severity: "warning" }
};

export const DEPARTEMENTS_CONFIG = {
    "38": {
        name: "Isère",
        format: "turbolead-geojson",
        sources: [
            { url: 'https://itinisere.fr/mod_turbolead/mod/inforoute/index.php?action=367&layer=layer-deviation', name: 'Déviation' },
            { url: 'https://itinisere.fr/mod_turbolead/mod/inforoute/index.php?action=367&layer=layer-repere_autre', name: 'Autre' },
            { url: 'https://itinisere.fr/mod_turbolead/mod/inforoute/index.php?action=367&layer=layer-repere_travaux', name: 'Travaux' },
            { url: 'https://itinisere.fr/mod_turbolead/mod/inforoute/index.php?action=367&layer=layer-lane-closures', name: 'Voie' },
            { url: 'https://itinisere.fr/mod_turbolead/mod/inforoute/index.php?action=367&layer=Layer-barreau_fh', name: 'Hiver' }
        ]
    },
    "73": {
        name: "Savoie",
        format: "savoie-api",
        apiUrlBase: "https://savoie-route.fr/api/v1/evenements"
    },
    "74": {
        name: "Haute-Savoie",
        format: "turbolead-geojson",
        sources: [
            { url: 'https://www.inforoute74.fr/mod_turbolead/mod/inforoute/index.php?action=376', name: 'Fermetures' },
            { url: 'https://www.inforoute74.fr/mod_turbolead/mod/inforoute/index.php?action=374', name: 'Alertes' }
        ]
    }
};

// Mots-clés à filtrer (Liste noire issue de votre script)
export const BLACKLIST_KEYWORDS = [
    "Etat route :",
    "Station de Ski -",
    "Restriction de Hauteur",
    "Restrictions de tonnage",
    "Transit Intertid"
];