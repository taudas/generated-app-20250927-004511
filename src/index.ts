export interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Proxy request for Spinitron spins to bypass CORS
    if (url.pathname === "/api/spins" || url.pathname.startsWith("/api/spins/")) {
      try {
        const targetUrl = "https://spinitron-proxy.d08jp15rftr3s.us-east-2.cs.amazonlightsail.com/api/spins";
        const response = await fetch(targetUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          }
        });
        
        if (!response.ok) {
          return new Response(JSON.stringify({ error: `Spinitron API returned ${response.status}` }), {
            status: response.status,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
              "Access-Control-Allow-Headers": "*"
            }
          });
        }

        const data = await response.json();
        return new Response(JSON.stringify(data), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
            "Access-Control-Allow-Headers": "*"
          }
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message || "Failed to fetch from Spinitron proxy" }), {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
            "Access-Control-Allow-Headers": "*"
          }
        });
      }
    }

    // Proxy request for Album Art images to bypass CORS
    if (url.pathname === "/api/image-proxy") {
      const targetImgUrl = url.searchParams.get("url");
      if (!targetImgUrl) {
        return new Response("Missing url param", { status: 400 });
      }
      try {
        const response = await fetch(targetImgUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          }
        });
        if (!response.ok) {
          return new Response(`Failed to fetch image: ${response.status}`, { status: response.status });
        }
        
        const contentType = response.headers.get("Content-Type") || "image/jpeg";
        const body = await response.arrayBuffer();
        
        return new Response(body, {
          headers: {
            "Content-Type": contentType,
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=86400"
          }
        });
      } catch (err: any) {
        return new Response(err.message, { status: 500 });
      }
    }

    // Default to serving static assets
    return env.ASSETS.fetch(request);
  }
};