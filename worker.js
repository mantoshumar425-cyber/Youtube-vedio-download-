const ALLOWED_FORMATS = ["720", "1080", "480", "audio"];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }

    // Health check
    if (
      request.method === "GET" &&
      url.pathname === "/api/health"
    ) {
      return json({
        service: "MyTube Downloader API",
        status: "online",
        storage: "none",
        authorizedDownloadsOnly: true,
        message: "Worker is running without R2."
      });
    }

    // Analyze
    if (
      request.method === "POST" &&
      url.pathname === "/api/analyze"
    ) {
      return handleAnalyze(request);
    }

    // Download request
    if (
      request.method === "POST" &&
      url.pathname === "/api/download"
    ) {
      return handleDownload(request);
    }

    return json({
      error: "Endpoint not found."
    }, 404);
  }
};


// ==========================================
// ANALYZE
// ==========================================

async function handleAnalyze(request) {
  try {
    const body = await request.json();

    const videoId =
      String(body.videoId || "").trim();

    if (!isValidVideoId(videoId)) {
      return json({
        success: false,
        error: "Invalid video ID."
      }, 400);
    }

    return json({
      success: true,
      videoId,
      thumbnail:
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      title: "Authorized YouTube Video",
      message: "Video ID recognized successfully."
    });

  } catch (error) {
    return json({
      success: false,
      error: "Invalid request."
    }, 400);
  }
}


// ==========================================
// DOWNLOAD
// ==========================================

async function handleDownload(request) {
  try {
    const body = await request.json();

    const videoId =
      String(body.videoId || "").trim();

    const format =
      String(body.format || "720").trim();

    if (!isValidVideoId(videoId)) {
      return json({
        success: false,
        error: "Invalid video ID."
      }, 400);
    }

    if (!ALLOWED_FORMATS.includes(format)) {
      return json({
        success: false,
        error: "Invalid format."
      }, 400);
    }

    /*
      R2 has intentionally been removed.

      This Worker does not scrape, bypass, or retrieve
      protected YouTube media streams.

      For authorized files, connect a storage provider
      later and return its authorized file URL here.
    */

    return json({
      success: false,
      authorized: true,
      videoId,
      format,
      error:
        "No authorized file storage is connected. " +
        "R2 is not configured for this Worker."
    }, 503);

  } catch (error) {
    return json({
      success: false,
      error: "Invalid request."
    }, 400);
  }
}


// ==========================================
// VIDEO ID VALIDATION
// ==========================================

function isValidVideoId(videoId) {
  return /^[A-Za-z0-9_-]{11}$/.test(videoId);
}


// ==========================================
// CORS
// ==========================================

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods":
      "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type",
    "Access-Control-Expose-Headers":
      "Content-Type"
  };
}


// ==========================================
// JSON RESPONSE
// ==========================================

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data, null, 2),
    {
      status,
      headers: {
        "Content-Type":
          "application/json; charset=utf-8",
        ...corsHeaders()
      }
    }
  );
}
