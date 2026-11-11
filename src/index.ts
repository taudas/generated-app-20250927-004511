export interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Endpoint to fetch and parse 2-week WCBN show archive from floyd.wcbn.org
    if (url.pathname === "/api/archive") {
      try {
        const archivePageUrl = "https://floyd.wcbn.org/listen/index.html";
        const response = await fetch(archivePageUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          }
        });

        if (!response.ok) {
          return new Response(JSON.stringify({ error: `Archive returned status ${response.status}` }), {
            status: response.status,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            }
          });
        }

        const html = await response.text();
        const sourceRegex = /<source\s+src="([^"]+)"\s+title="([^"]+)">/gi;
        const shows = [];
        let match;

        while ((match = sourceRegex.exec(html)) !== null) {
          const src = match[1];
          const rawTitle = match[2];

          const dateMatch = rawTitle.match(/^(.*?)-(\d{4})-(\d{2})-(\d{2})-(\d{4})$/);
          let showDjPart = rawTitle;
          let dateStr = "";
          let timestamp = 0;

          if (dateMatch) {
            showDjPart = dateMatch[1];
            const [, y, m, d, hhmm] = dateMatch;
            const hh = hhmm.substring(0, 2);
            const mm = hhmm.substring(2, 4);
            dateStr = `${y}-${m}-${d} ${hh}:${mm}`;
            timestamp = parseInt(`${y}${m}${d}${hh}${mm}`, 10) || 0;
          }

          let showName = showDjPart;
          let djName = "";

          if (showDjPart.includes("_with_")) {
            const parts = showDjPart.split("_with_");
            showName = parts[0];
            djName = parts.slice(1).join(" with ");
          } else if (showDjPart.includes("-with-")) {
            const parts = showDjPart.split("-with-");
            showName = parts[0];
            djName = parts.slice(1).join(" with ");
          }

          showName = showName.replace(/_/g, " ").trim();
          djName = djName.replace(/_/g, " ").trim();

          shows.push({
            id: rawTitle,
            title: rawTitle,
            showName,
            djName,
            dateStr,
            timestamp,
            src,
            audioUrl: `https://floyd.wcbn.org/listen/${src}`
          });
        }

        return new Response(JSON.stringify({ shows, total: shows.length }), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=300"
          }
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message || "Failed to fetch archive" }), {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          }
        });
      }
    }

    // Proxy request for Spinitron to bypass CORS
    const isSpinitronProxy = 
      url.pathname === "/api/spins" || url.pathname.startsWith("/api/spins/") ||
      url.pathname === "/api/playlists" || url.pathname.startsWith("/api/playlists/") ||
      url.pathname === "/api/personas" || url.pathname.startsWith("/api/personas/") ||
      url.pathname === "/api/shows" || url.pathname.startsWith("/api/shows/");

    if (isSpinitronProxy) {
      try {
        const targetUrl = `https://spinitron-proxy.d08jp15rftr3s.us-east-2.cs.amazonlightsail.com${url.pathname}${url.search}`;
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

    // Serve index.html for SPA routes like /archive or archive.wcbn.stream
    if (url.pathname === "/archive" || url.pathname === "/archive/" || url.hostname.startsWith("archive.")) {
      const assetUrl = new URL(request.url);
      assetUrl.pathname = "/index.html";
      return env.ASSETS.fetch(new Request(assetUrl.toString(), request));
    }

    // Default to serving static assets
    return env.ASSETS.fetch(request);
  }
};