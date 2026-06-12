export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // En-têtes CORS permissifs
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*", 
      "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Requested-With, Accept, Origin",
      "Access-Control-Max-Age": "86400",
    };

    // 1. Gestion du Preflight OPTIONS pour le proxy ou les assets
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // 2. CAS A : C'est une requête de Proxy (Présence du paramètre ?url=)
    const targetUrlStr = url.searchParams.get("url");
    if (targetUrlStr) {
      try {
        const targetUrl = new URL(targetUrlStr);
        const cleanHeaders = new Headers();
        
        if (request.headers.has("accept")) cleanHeaders.set("accept", request.headers.get("accept"));
        if (request.headers.has("content-type")) cleanHeaders.set("content-type", request.headers.get("content-type"));
        if (request.headers.has("x-requested-with")) cleanHeaders.set("x-requested-with", request.headers.get("x-requested-with"));
        
        cleanHeaders.set("Host", targetUrl.host);
        cleanHeaders.set("Origin", targetUrl.origin);
        cleanHeaders.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

        let bodyPayload = null;
        if (request.method !== "GET" && request.method !== "HEAD") {
          bodyPayload = await request.arrayBuffer();
        }

        const response = await fetch(targetUrl.href, {
          method: request.method,
          headers: cleanHeaders,
          body: bodyPayload,
          redirect: "follow"
        });

        const proxyResponse = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: new Headers(response.headers)
        });
        
        Object.keys(corsHeaders).forEach(key => {
          proxyResponse.headers.set(key, corsHeaders[key]);
        });
        proxyResponse.headers.append("Vary", "Origin");

        return proxyResponse;

      } catch (error) {
        return new Response(JSON.stringify({ error: "Proxy Error", details: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    }

    // 3. CAS B : C'est une requête pour ton site web (Fichiers statiques, CSS, JS)
    // On passe le relais au système d'assets par défaut de Cloudflare (env.ASSETS ou fetch natif)
    if (typeof env.ASSETS !== "undefined") {
      return env.ASSETS.fetch(request);
    }

    // Si tu es sur un Worker standard et non Cloudflare Pages, ceci permet de laisser passer la requête vers l'origine configurée
    return fetch(request);
  },
};
