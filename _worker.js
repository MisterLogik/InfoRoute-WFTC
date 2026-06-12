// _worker.js - Placé à la racine du projet GitHub
export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // Configuration des en-têtes CORS de réponse
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, X-Requested-With, Accept",
        };

        // Gérer les requêtes de pré-vérification (Preflight OPTIONS) de Chrome
        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        // Si la requête concerne notre passerelle API proxy
        if (url.pathname.startsWith("/api-proxy/")) {
            // On extrait la vraie URL cible (ex: /api-proxy/https://savoie-route.fr/...)
            const targetUrlStr = url.pathname.replace("/api-proxy/", "") + url.search;
            
            try {
                const targetUrl = new URL(targetUrlStr);
                
                // On clone la requête d'origine en adaptant les headers pour la cible
                const modifiedHeaders = new Headers(request.headers);
                modifiedHeaders.set("Host", targetUrl.host);
                
                // Pour Inforoute 74 qui exige de l'AJAX
                if (targetUrlStr.includes("inforoute74") || targetUrlStr.includes("itinisere")) {
                    modifiedHeaders.set("X-Requested-With", "XMLHttpRequest");
                }

                // Exécution de la requête côté serveur Cloudflare
                const response = await fetch(targetUrl.toString(), {
                    method: request.method,
                    headers: modifiedHeaders,
                    body: request.method === "POST" ? await request.text() : null
                });

                // Renvoi de la réponse au navigateur avec le feu vert CORS
                const responseHeaders = new Headers(response.headers);
                Object.keys(corsHeaders).forEach(key => responseHeaders.set(key, corsHeaders[key]));

                return new Response(response.body, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: responseHeaders
                });

            } catch (err) {
                return new Response(JSON.stringify({ error: "Invalid target URL or Fetch error", details: err.message }), {
                    status: 400,
                    headers: corsHeaders
                });
            }
        }

        // Sinon, Cloudflare Pages sert les fichiers statiques de base (index.html, js, css)
        return env.ASSETS.fetch(request);
    }
};
