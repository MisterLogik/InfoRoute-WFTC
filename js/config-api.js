// CONFIGURATION DU PROXY CORS CLOUDFLARE
export const PROXY_URL = "https://inforoutefrance-proxy.xtremxlogik.workers.dev/";

// Configuration unique pour la Savoie (73)
export const SAVOIE_CONFIG = {
    name: "Savoie",
    code: "73",
    apiUrlEvents: "https://savoie-route.fr/api/v1/evenements",
    apiUrlFlash: "https://savoie-route.fr/api/v1/flashsInfo/flashsInfo"
};

// Liste des IDs catégories officiels de l'API Savoie-Route
export const SAVOIE_CATEGORIES = {
    38: { name: "Accident", icon: "⚠️", severity: "danger" },
    40: { name: "Bouchon", icon: "🚗", severity: "warning" },
    42: { name: "Travaux", icon: "🚧", severity: "warning" },
    43: { name: "Manifestation", icon: "🚲", severity: "warning" },
    55: { name: "Obstacle", icon: "🛑", severity: "danger" },
    58: { name: "Fermeture", icon: "🚫", severity: "danger" },
    59: { name: "Déviation", icon: "↔️", severity: "warning" }
};

// Système de détection multi-tags basé sur le texte (Titre / Commentaire)
export const TAGS_KEYWORDS = {
    "Accident": ["accident"],
    "Bouchon": ["bouchon", "embouteillage", "ralentissement", "bouchons"],
    "Travaux": ["travaux", "chantier", "alternat", "rabotage", "goudronnage"],
    "Manifestation": ["manifestation", "sport", "course", "cycliste"],
    "Obstacle": ["obstacle", "éboulement", "arbre", "pierre", "matériaux"],
    "Fermeture": ["fermeture", "coupé", "coupée", "barré", "barrée", "fermé", "fermée", "interdit", "interdite"],
    "Déviation": ["déviation", "deviation", "itinéraire conseillé"]
};

// Mots-clés définissant une fausse alerte à nettoyer (Règle Liste Noire)
export const BLACKLIST_KEYWORDS = ["test"];
