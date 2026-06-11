export default {
  async fetch(request, env, ctx) {
    // Liste des origines autorisées (Modifiez si vous utilisez un domaine personnalisé pour votre site)
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*", // Autorise l'accès universel pour simplifier le débogage de l'application
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept",
    };

    // Gestion de la pré-vérification CORS (Preflight Request du navigateur)
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Récupération de l'URL finale ciblée par l'application
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get("url");

    if (!targetUrl) {
      return new Response(JSON.stringify({ error: "Paramètre 'url' manquant dans la requête." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    try {
      // Préparation minutieuse des en-têtes pour tromper les serveurs cibles (Itinisère/Inforoute74)
      const forwardHeaders = new Headers();
      forwardHeaders.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
      forwardHeaders.set("Accept", "application/json, text/javascript, */*; q=0.01");
      forwardHeaders.set("X-Requested-With", "XMLHttpRequest");
      
      // Si l'application envoie un type de contenu spécifique (comme du JSON pour la Savoie)
      if (request.headers.has("Content-Type")) {
        forwardHeaders.set("Content-Type", request.headers.get("Content-Type"));
      }

      // Lecture du corps de la requête s'il s'agit d'une méthode POST (Cas du département 73)
      let requestBody = null;
      if (request.method === "POST") {
        requestBody = await request.text();
      }

      // Exécution de la requête de serveur à serveur (Le CORS n'est plus un obstacle ici)
      const response = await fetch(decodeURIComponent(targetUrl), {
        method: request.method,
        headers: forwardHeaders,
        body: requestBody
      });

      // Duplication des en-têtes de réponse du serveur distant et ajout des droits CORS pour le navigateur
      const modifiedHeaders = new Headers(response.headers);
      Object.keys(corsHeaders).forEach(key => {
        modifiedHeaders.set(key, corsHeaders[key]);
      });

      // On force l'en-tête de réponse à être du JSON si on détecte une structure JSON valide, pour éviter les confusions
      if (targetUrl.includes("action=367") || targetUrl.includes("api/v1")) {
        modifiedHeaders.set("Content-Type", "application/json; charset=utf-8");
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: modifiedHeaders
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }
};