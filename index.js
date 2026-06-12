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

    // ==========================================================================
    // 1. SÉCURITÉ ET CONSOLE (Preflight OPTIONS & Favicons)
    // ==========================================================================

    // Gestion du Preflight OPTIONS pour le proxy ou les assets
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Intercepte la requête automatique favicon.ico de Chrome pour éviter l'erreur 404
    if (url.pathname === '/favicon.ico') {
      return new Response(null, { status: 204 });
    }

    // Gère votre icône personnalisée favicon.png si appelée explicitement
    if (url.pathname === '/favicon.png') {
      try {
        const imgResponse = await fetch('https://raw.githubusercontent.com/.../favicon.png'); // Mettez votre vrai lien brut GitHub si besoin
        return new Response(imgResponse.body, {
          status: 200,
          headers: { 'Content-Type': 'image/png' }
        });
      } catch (e) {
        return new Response(null, { status: 404 });
      }
    }

    // ==========================================================================
    // 2. CAS A : REQUÊTE DE PROXY (Présence du paramètre ?url=)
    // ==========================================================================
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

    // ==========================================================================
    // 3. CAS B : REQUÊTE POUR LE SITE WEB (Fichiers statiques HTML, CSS, JS)
    // ==========================================================================
    if (typeof env.ASSETS !== "undefined") {
      // On va chercher le fichier demandé dans le système d'assets de Cloudflare Pages
      const assetResponse = await env.ASSETS.fetch(request);

      // S'il s'agit d'un fichier CSS, on intercepte la réponse pour FORCER le type MIME text/css
      if (url.pathname.endsWith('.css')) {
        return new Response(assetResponse.body, {
          status: assetResponse.status,
          headers: {
            ...Object.fromEntries(assetResponse.headers.entries()),
            'Content-Type': 'text/css; charset=utf-8'
          }
        });
      }

      // S'il s'agit d'un fichier JS d'application, on FORCE le type application/javascript
      if (url.pathname.endsWith('.js')) {
        return new Response(assetResponse.body, {
          status: assetResponse.status,
          headers: {
            ...Object.fromEntries(assetResponse.headers.entries()),
            'Content-Type': 'application/javascript; charset=utf-8'
          }
        });
      }

      return assetResponse;
    }

    // Si le script s'exécute sur un Worker standard indépendant (sans liaison Cloudflare Pages)
    return fetch(request);
  },
};
