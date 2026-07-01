// CONFIGURATION DU PROXY CORS CLOUDFLARE
export const PROXY_URL = "https://inforoutefrance-proxy.xtremxlogik.workers.dev/";

// Les catégories officielles issues de l'API Savoie-Route
export const SAVOIE_CATEGORIES = {
    38: { name: "Accident", icon: "⚠️", severity: "danger" },
    40: { name: "Bouchon", icon: "🚗", severity: "warning" },
    42: { name: "Travaux", icon: "🚧", severity: "warning" },
    43: { name: "Manifestation", icon: "🚲", severity: "warning" },
    55: { name: "Obstacle", icon: "🛑", severity: "danger" },
    58: { name: "Fermeture", icon: "🚫", severity: "danger" },
    59: { name: "Déviation", icon: "↔️", severity: "warning" }
};

// Configuration globale restreinte à la Savoie unique (73)
export const DEPARTEMENTS_CONFIG = {
    "01": { 
        name: "Ain", 
        format: "geojson-standard", 
        apiUrlBase: "https://www.inforoute01.fr/mod_turbolead/mod/inforoute/index.php?action=374" 
    },
    "04": { 
        name: "Alpes-de-Haute-Provence", 
        format: "geojson-standard", 
        apiUrlBase: "https://www.inforoute04.fr/mod_turbolead/mod/inforoute/index.php?action=374" 
    },
    "05": { 
        name: "Hautes-Alpes", 
        format: "geojson-standard", 
        apiUrlBase: "https://www.inforoute05.fr/mod_turbolead/mod/inforoute/index.php?action=374" 
    },
    "11": { 
        name: "Aude", 
        format: "geojson-standard", 
        apiUrlBase: "https://www.inforoute11.fr/mod_turbolead/mod/inforoute/index.php?action=374" 
    },
    "14": { 
        name: "Calvados", 
        format: "geojson-standard", 
        apiUrlBase: "https://www.inforoute14.fr/mod_turbolead/mod/inforoute/index.php?action=374" 
    },
    "21": { 
        name: "Côte-d'Or", 
        format: "geojson-standard", 
        apiUrlBase: "https://www.inforoute21.fr/mod_turbolead/mod/inforoute/index.php?action=374" 
    },
    "23": { 
        name: "Creuse", 
        format: "geojson-standard", 
        apiUrlBase: "https://www.inforoute23.fr/mod_turbolead/mod/inforoute/index.php?action=374" 
    },
    "26": { 
        name: "Drôme", 
        format: "geojson-standard", 
        apiUrlBase: "https://www.inforoute26.fr/mod_turbolead/mod/inforoute/index.php?action=374" 
    },
    "30": { 
        name: "Gard", 
        format: "geojson-standard", 
        apiUrlBase: "https://www.inforoute30.fr/mod_turbolead/mod/inforoute/index.php?action=374" 
    },
    "34": { 
        name: "Hérault", 
        format: "geojson-standard", 
        apiUrlBase: "https://www.inforoute34.fr/mod_turbolead/mod/inforoute/index.php?action=374" 
    },
    "38": { 
        name: "Isère", 
        format: "geojson-standard", 
        apiUrlBase: "https://www.itinisere.fr/mod_turbolead/mod/inforoute/index.php?action=374" 
    },
    "42": { 
        name: "Loire", 
        format: "geojson-standard", 
        apiUrlBase: "https://www.inforoute42.fr/mod_turbolead/mod/inforoute/index.php?action=374" 
    },
    "43": { 
        name: "Haute-Loire", 
        format: "geojson-standard", 
        apiUrlBase: "https://www.inforoute43.fr/mod_turbolead/mod/inforoute/index.php?action=374" 
    },
    "48": { 
        name: "Lozère", 
        format: "geojson-standard", 
        apiUrlBase: "https://www.inforoute48.fr/mod_turbolead/mod/inforoute/index.php?action=374" 
    },
    "52": { 
        name: "Haute-Marne", 
        format: "geojson-standard", 
        apiUrlBase: "https://www.inforoute52.fr/mod_turbolead/mod/inforoute/index.php?action=374" 
    },
    "54": { 
        name: "Meurthe-et-Moselle", 
        format: "geojson-standard", 
        apiUrlBase: "https://www.inforoute54.fr/mod_turbolead/mod/inforoute/index.php?action=374" 
    },
    "55": { 
        name: "Meuse", 
        format: "geojson-standard", 
        apiUrlBase: "https://www.inforoute55.fr/mod_turbolead/mod/inforoute/index.php?action=374" 
    },
    "58": { 
        name: "Nièvre", 
        format: "geojson-standard", 
        apiUrlBase: "https://www.inforoute58.fr/mod_turbolead/mod/inforoute/index.php?action=374" 
    },
    "69": { 
        name: "Rhône", 
        format: "geojson-standard", 
        apiUrlBase: "https://www.inforoute69.fr/mod_turbolead/mod/inforoute/index.php?action=374" 
    },
    "70": { 
        name: "Haute-Saône", 
        format: "geojson-standard", 
        apiUrlBase: "https://www.inforoute70.fr/mod_turbolead/mod/inforoute/index.php?action=374" 
    },
    "71": { 
        name: "Saône-et-Loire", 
        format: "geojson-standard", 
        apiUrlBase: "https://www.inforoute71.fr/mod_turbolead/mod/inforoute/index.php?action=374" 
    },
    "73": { 
        name: "Savoie", 
        format: "savoie-api", 
        apiUrlBase: "https://savoie-route.fr/api/v1/evenements" 
    },
    "74": { 
        name: "Haute-Savoie", 
        format: "geojson-standard", 
        apiUrlBase: "https://www.inforoute74.fr/mod_turbolead/mod/inforoute/index.php?action=374" 
    },
    "76": { 
        name: "Seine-Maritime", 
        format: "geojson-standard", 
        apiUrlBase: "https://www.inforoute76.fr/mod_turbolead/mod/inforoute/index.php?action=374" 
    },
    "81": { 
        name: "Tarn", 
        format: "geojson-standard", 
        apiUrlBase: "https://www.inforoute81.fr/mod_turbolead/mod/inforoute/index.php?action=374" 
    },
    "83": { 
        name: "Var", 
        format: "geojson-standard", 
        apiUrlBase: "https://www.inforoute-mediterranee.fr/mod_turbolead/mod/inforoute/index.php?action=374" 
    },
    "88": { 
        name: "Vosges", 
        format: "geojson-standard", 
        apiUrlBase: "https://inforoute88.fr/mod_turbolead/mod/inforoute/index.php?action=374" 
    },
    "90": { 
        name: "Territoire de Belfort", 
        format: "geojson-standard", 
        apiUrlBase: "https://www.inforoute90.fr/mod_turbolead/mod/inforoute/index.php?action=374" 
    }
};

// Mots-clés définissant une fausse alerte à nettoyer (Règle Liste Noire)
export const BLACKLIST_KEYWORDS = [
    "Station de Ski -", 
    "Col d", 
    "Tunnel d", 
    "Paravalanche",
    "CERD d", 
    "P+R", 
    "Parc départemental", 
    "Restriction de Hauteur",
    "Restrictions de tonnage", 
    "Restriction de tonnage", 
    "Restriction de Longueur",
    "Restriction de Largeur", 
    "Transit Intercit", 
    "Transport de matières dangereuses -",
    "Direction des Routes -",
    /*"1-", "2-", "3-", "4-", "5-", "6-", "7-",
    "1 -", "2 -", "3 -", "4 -", "5 -", "6 -", "7 -"*/
];
