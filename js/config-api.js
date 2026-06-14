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
    38: "Accident",
    40: "Bouchon",
    42: "Travaux",
    43: "Manifestation",
    55: "Obstacle",
    58: "Fermeture",
    59: "Déviation"
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

// Liste noire demandée (réduite temporairement à "test")
export const BLACKLIST_KEYWORDS = ["test"];
