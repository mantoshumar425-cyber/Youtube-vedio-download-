export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }

    // Health
    if (request.method === "GET" && url.pathname === "/api/health") {
      return json({
        service: "MyTube Downloader API",
        status: "online",
        authorizedDownloadsOnly: true,
        storage: env.VIDEOS ? "connected" : "not_connected"
      });
    }

    // Create download response
    if (
      request.method === "POST" &&
      url.pathname === "/api/download"
    ) {
      return handleDownload(request, env);
    }

    // Serve actual R2 file
    if (
      request.method === "GET" &&
      url.pathname === "/api/file"
    ) {
      return handleFile(request, env);
    }

    return json({
      error: "Endpoint not found"
    }, 404);
  }
};


// ==========================================
// DOWNLOAD API
// ==========================================

async function handleDownload(request, env) {
  try {
    const body = await request.json();

    const videoId = String(body.videoId || "").trim();
    const format = String(body.format || "720").trim();

    // Validate YouTube-style ID
    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
      return json({
        error: "Invalid video ID."
      }, 400);
    }

    const allowedFormats = [
      "720",
      "1080",
      "480",
      "audio"
    ];

    if (!allowedFormats.includes(format)) {
      return json({
        error: "Invalid format."
      }, 400);
    }

    if (!env.VIDEOS) {
      return json({
        error: "R2 storage is not connected."
      }, 503);
    }

    const extension =
      format === "audio" ? "mp3" : "mp4";

    const objectKey =
      `videos/${videoId}/${format}.${extension}`;

    // Check file
    const object = await env.VIDEOS.head(objectKey);

    if (!object) {
      return json({
        success: false,
        error: "Authorized video file was not found.",
        videoId,
        format
      }, 404);
    }

    // URL for actual file endpoint
    const downloadUrl =
      `${new URL(request.url).origin}/api/file` +
      `?videoId=${encodeURIComponent(videoId)}` +
      `&format=${encodeURIComponent(format)}`;

    return json({
      success: true,
      videoId,
      format,
      file: objectKey,
      size: object.size,
      downloadUrl
    });

  } catch (error) {
    return json({
      success: false,
      error: "Invalid request.",
      details: error.message
    }, 400);
  }
}


// ==========================================
// ACTUAL R2 FILE DOWNLOAD
// ==========================================

async function handleFile(request, env) {
  try {
    if (!env.VIDEOS) {
      return new Response(
        "R2 storage is not connected.",
        { status: 503 }
      );
    }

    const url = new URL(request.url);

    const videoId =
      String(url.searchParams.get("videoId") || "").trim();

    const format =
      String(url.searchParams.get("format") || "720").trim();

    // Validate
    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
      return new Response(
        "Invalid video ID.",
        { status: 400 }
      );
    }

    const allowedFormats = [
      "720",
      "1080",
      "480",
      "audio"
    ];

    if (!allowedFormats.includes(format)) {
      return new Response(
        "Invalid format.",
        { status: 400 }
      );
    }

    const extension =
      format === "audio" ? "mp3" : "mp4";

    const objectKey =
      `videos/${videoId}/${format}.${extension}`;

    // Get object from R2
    const object =
      await env.VIDEOS.get(objectKey);

    if (!object) {
      return new Response(
        "File not found.",
        { status: 404 }
      );
    }

    const headers = new Headers();

    headers.set(
      "Content-Type",
      format === "audio"
        ? "audio/mpeg"
        : "video/mp4"
    );

    headers.set(
      "Content-Length",
      String(object.size)
    );

    headers.set(
      "Content-Disposition",
      `attachment; filename="${videoId}-${format}.${extension}"`
    );

    headers.set(
      "Cache-Control",
      "private, max-age=0, no-store"
    );

    // R2 HTTP metadata
    if (object.httpEtag) {
      headers.set(
        "ETag",
        object.httpEtag
      );
    }

    return new Response(
      object.body,
      {
        status: 200,
        headers
      }
    );

  } catch (error) {
    return new Response(
      `Download error: ${error.message}`,
      {
        status: 500,
        headers: {
          "Content-Type": "text/plain"
        }
      }
    );
  }
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
      "Content-Disposition, Content-Length, ETag"
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
