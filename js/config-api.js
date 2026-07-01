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
    "01": { name: "Ain", format: "geojson-get", urls: ["https://www.inforoute01.fr/mod_turbolead/mod/inforoute/index.php?action=374"] },
    "04": { name: "Alpes-de-Haute-Provence", format: "geojson-get", urls: ["https://www.inforoute04.fr/mod_turbolead/mod/inforoute/index.php?action=374"] },
    "09": { name: "Ariège", format: "geojson-get", urls: ["https://www.inforoute09.fr/mod_turbolead/mod/inforoute/index.php?action=374"] },
    "11": { name: "Aude", format: "geojson-get", urls: ["https://www.inforoute11.fr/mod_turbolead/mod/inforoute/index.php?action=374"] },
    "12": { name: "Aveyron", format: "geojson-get", urls: ["https://www.inforoute12.fr/mod_turbolead/mod/inforoute/index.php?action=374"] },
    "13": { name: "Zone Méditerranée", format: "geojson-get", urls: ["https://www.inforoute-mediterranee.fr/"] },
    "14": { name: "Calvados", format: "geojson-get", urls: ["https://www.inforoute14.fr/mod_turbolead/mod/inforoute/index.php?action=374"] },
    "15": { name: "Cantal", format: "geojson-get", urls: ["https://www.inforoute15.fr/mod_turbolead/mod/inforoute/index.php?action=374"] },
    "18": { name: "Cher", format: "geojson-get", urls: ["https://www.inforoute18.fr/mod_turbolead/mod/inforoute/index.php?action=374"] },
    "21": { name: "Côte-d'Or", format: "geojson-get", urls: ["https://www.inforoute21.fr/mod_turbolead/mod/inforoute/index.php?action=374"] },
    "24": { name: "Dordogne", format: "geojson-get", urls: ["https://dordogne.maps.arcgis.com/apps/instant/sidebar/index.html?appid=7482ab5a19814d30a3373f4aa9e3fe3f"] },
    "25": { name: "Doubs", format: "geojson-get", urls: ["https://www.inforoute25.fr/mod_turbolead/mod/inforoute/index.php?action=374"] },
    "27": { name: "Eure", format: "geojson-get", urls: ["https://www.inforoute27.fr/mod_turbolead/mod/inforoute/index.php?action=374"] },
    "28": { name: "Eure-et-Loir", format: "geojson-get", urls: ["https://www.inforoute28.fr/mod_turbolead/mod/inforoute/index.php?action=374"] },
    "29": { name: "Finistère", format: "geojson-get", urls: ["https://www.inforoute29.fr/mod_turbolead/mod/inforoute/index.php?action=374"] },
    "30": { name: "Gard", format: "geojson-get", urls: ["https://www.inforoute30.fr/mod_turbolead/mod/inforoute/index.php?action=374"] },
    "31": { name: "Haute-Garonne", format: "geojson-get", urls: ["https://www.inforoute31.fr/mod_turbolead/mod/inforoute/index.php?action=374"] },
    "36": { name: "Indre", format: "geojson-get", urls: ["https://www.inforoute36.fr/mod_turbolead/mod/inforoute/index.php?action=374"] },
    "38": { 
        name: "Isère", 
        format: "geojson-get", 
        urls: [
            "https://itinisere.fr/mod_turbolead/mod/inforoute/index.php?action=367&layer=layer-deviation",
            "https://itinisere.fr/mod_turbolead/mod/inforoute/index.php?action=367&layer=layer-repere_autre",
            "https://itinisere.fr/mod_turbolead/mod/inforoute/index.php?action=367&layer=layer-repere_travaux",
            "https://itinisere.fr/mod_turbolead/mod/inforoute/index.php?action=367&layer=layer-lane-closures",
            "https://itinisere.fr/mod_turbolead/mod/inforoute/index.php?action=367&layer=Layer-barreau_fh"
        ] 
    },
    "39": { name: "Jura", format: "geojson-get", urls: ["https://www.inforoute39.fr/mod_turbolead/mod/inforoute/index.php?action=376"] },
    "40": { name: "Landes", format: "geojson-get", urls: ["https://travaux.landes.fr/json"] },
    "42": { name: "Loire", format: "geojson-get", urls: ["https://www.inforoute42.fr/mod_turbolead/mod/inforoute/index.php?action=374"] },
    "43": { name: "Haute-Loire", format: "geojson-get", urls: ["https://www.inforoute43.fr/"] },
    "47": { name: "Lot-et-Garonne", format: "geojson-get", urls: ["https://www.inforoute47.fr/mod_turbolead/mod/inforoute/index.php?action=374"] },
    "48": { name: "Lozère", format: "geojson-get", urls: ["https://www.inforoute48.fr/mod_turbolead/mod/inforoute/index.php?action=374"] },
    "54": { name: "Meurthe-et-Moselle", format: "geojson-get", urls: ["https://www.inforoute54.fr/mod_turbolead/mod/inforoute/index.php?action=374"] },
    "57": { name: "Moselle", format: "geojson-get", urls: ["https://www.inforoute57.fr/mod_turbolead/mod/inforoute/index.php?action=374"] },
    "64": { name: "Pyrénées-Atlantiques", format: "geojson-get", urls: ["https://inforoute.le64.fr/mod_turbolead/mod/inforoute/index.php?action=374"] },
    "65": { name: "Hautes-Pyrénées", format: "geojson-get", urls: ["https://inforoute.ha-py.fr/myd/proxy.php?cluster=&tifid=&type=30.09;30.07;32.03;31.02;32.01;30.01;30.02;30.05;30.06&theme=&categorie=31.04.02;30.05.02&unlimited=&date=&cc=19ea1c31393"] },
    "66": { name: "Pyrénées-Orientales", format: "geojson-get", urls: ["https://www.inforoute66.fr/mod_turbolead/mod/inforoute/index.php?action=374"] },
    "67": { name: "Bas-Rhin / Alsace", format: "geojson-get", urls: ["https://inforoute.alsace.eu/mod_turbolead/mod/inforoute/index.php?action=374"] },
    "69": { name: "Rhône", format: "geojson-get", urls: ["https://www.inforoute69.fr/mod_turbolead/mod/inforoute/index.php?action=374"] },
    "73": {
        name: "Savoie",
        format: "savoie-api",
        apiUrlBase: "https://savoie-route.fr/api/v1/evenements"
    },
    "74": { 
        name: "Haute-Savoie", 
        format: "geojson-get", 
        urls: [
            "https://www.inforoute74.fr/mod_turbolead/mod/inforoute/index.php?action=376",
            "https://www.inforoute74.fr/mod_turbolead/mod/inforoute/index.php?action=374"
        ] 
    },
    "76": { name: "Seine-Maritime", format: "geojson-get", urls: ["https://www.inforoute76.fr/mod_turbolead/mod/inforoute/index.php?action=374"] },
    "81": { name: "Tarn", format: "geojson-get", urls: ["https://www.inforoute81.fr/mod_turbolead/mod/inforoute/index.php?action=374"] },
    "83": { name: "Var", format: "geojson-get", urls: ["https://www.inforoute-mediterranee.fr/mod_turbolead/mod/inforoute/index.php?action=374"] },
    "88": { name: "Vosges", format: "geojson-get", urls: ["https://inforoute88.fr/"] },
    "90": { name: "Territoire de Belfort", format: "geojson-get", urls: ["https://www.inforoute90.fr/mod_turbolead/mod/inforoute/index.php?action=374"] }
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
