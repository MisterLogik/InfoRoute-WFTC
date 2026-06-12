export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Configuration des headers CORS permissifs pour ton frontend
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*", // Idéalement, remplace par ton domaine Cloudflare Pages/Pages final
      "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Requested-With, Accept",
      "Access-Control-Max-Age": "86400",
    };

    // 1. Gestion du Preflight (requêtes OPTIONS envoyées par le navigateur)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // 2. Extraction de l'URL cible passée en paramètre (ex: /proxy?url=https://...)
    const targetUrlStr = url.searchParams.get("url");
    if (!targetUrlStr) {
      return new Response(JSON.stringify({ error: "Missing 'url' query parameter." }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    try {
      const targetUrl = new URL(targetUrlStr);

      // Clone et modification de la requête pour tromper le serveur cible
      // On lui fait croire que la requête vient de son propre domaine
      const modifiedRequest = new Request(targetUrl, {
        method: request.method,
        headers: new Headers(request.headers),
        body: request.method !== "GET" && request.method !== "HEAD" ? await request.arrayBuffer() : null
      });

      modifiedRequest.headers.set("Origin", targetUrl.origin);
      modifiedRequest.headers.set("Host", targetUrl.host);

      // On exécute l'appel vers l'API d'Inforoute / Itinisère
      const response = await fetch(modifiedRequest);

      // On reconstruit la réponse pour pouvoir y greffer nos headers CORS
      const proxyResponse = new Response(response.body, response);
      
      // Injection des droits CORS pour ton site web
      Object.keys(corsHeaders).forEach(key => {
        proxyResponse.headers.set(key, corsHeaders[key]);
      });

      // Sécurité : On force le cache navigateur à suivre l'Origin
      proxyResponse.headers.append("Vary", "Origin");

      return proxyResponse;

    } catch (error) {
      return new Response(JSON.stringify({ error: "Invalid URL or Fetch Failure", details: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  },
};
