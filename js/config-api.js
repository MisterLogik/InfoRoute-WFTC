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
    "73": {
        name: "Savoie",
        format: "savoie-api",
        apiUrlBase: "https://savoie-route.fr/api/v1/evenements"
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
