export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // En-têtes CORS permissifs pour que ton localhost (ou ton futur site global) puisse lire le Worker
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*", 
      "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Requested-With, Accept, Origin",
      "Access-Control-Max-Age": "86400",
    };

    // 1. Interception obligatoire des requêtes de vérification (Preflight OPTIONS)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // 2. Extraction et validation de l'URL cible
    const targetUrlStr = url.searchParams.get("url");
    if (!targetUrlStr) {
      return new Response(JSON.stringify({ error: "Missing 'url' query parameter." }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    try {
      const targetUrl = new URL(targetUrlStr);

      // 3. Reconstruction NEUTRE de la requête (On supprime le bruit de CORS du navigateur)
      const cleanHeaders = new Headers();
      
      // On conserve uniquement ce qui est nécessaire pour Itinisère / Inforoute
      if (request.headers.has("accept")) cleanHeaders.set("accept", request.headers.get("accept"));
      if (request.headers.has("content-type")) cleanHeaders.set("content-type", request.headers.get("content-type"));
      if (request.headers.has("x-requested-with")) cleanHeaders.set("x-requested-with", request.headers.get("x-requested-with"));
      
      // On force le Host et l'Origin pour simuler une requête légitime en direct
      cleanHeaders.set("Host", targetUrl.host);
      cleanHeaders.set("Origin", targetUrl.origin);
      cleanHeaders.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

      // Gestion du corps de la requête (pour les requêtes POST de la Savoie 73)
      let bodyPayload = null;
      if (request.method !== "GET" && request.method !== "HEAD") {
        bodyPayload = await request.arrayBuffer();
      }

      // 4. Appel de l'API cible
      const response = await fetch(targetUrl.href, {
        method: request.method,
        headers: cleanHeaders,
        body: bodyPayload,
        redirect: "follow" // Suivre les redirections si Itinisere change d'endpoint
      });

      // 5. Création de la réponse à renvoyer à ton site web local
      const proxyResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: new Headers(response.headers)
      });
      
      // Injection forcée des headers CORS pour ton navigateur
      Object.keys(corsHeaders).forEach(key => {
        proxyResponse.headers.set(key, corsHeaders[key]);
      });

      // On s'assure que le cache du navigateur gère correctement la provenance
      proxyResponse.headers.append("Vary", "Origin");

      return proxyResponse;

    } catch (error) {
      return new Response(JSON.stringify({ error: "Fetch Proxy Execution Failure", details: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  },
};
