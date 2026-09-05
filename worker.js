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
    if (request.method === "GET" && url.pathname === "/api/health") {
      return json({
        service: "MyTube Downloader API",
        status: "online",
        authorizedDownloadsOnly: true
      });
    }

    // Download endpoint
    if (request.method === "POST" && url.pathname === "/api/download") {
      return handleDownload(request, env);
    }

    return json({
      error: "Endpoint not found"
    }, 404);
  }
};

async function handleDownload(request, env) {
  try {
    const body = await request.json();

    const videoId = String(body.videoId || "").trim();
    const format = String(body.format || "720").trim();

    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
      return json({
        error: "Invalid YouTube video ID."
      }, 400);
    }

    const allowedFormats = ["720", "1080", "480", "audio"];

    if (!allowedFormats.includes(format)) {
      return json({
        error: "Invalid format."
      }, 400);
    }

    /*
      IMPORTANT:
      This Worker does not download or scrape a YouTube video.

      Instead, it expects your own authorized video files
      to be stored in Cloudflare R2.

      Example R2 object names:

      videos/VIDEO_ID/720.mp4
      videos/VIDEO_ID/1080.mp4
      videos/VIDEO_ID/480.mp4
      videos/VIDEO_ID/audio.mp3
    */

    if (!env.VIDEOS) {
      return json({
        error: "R2 storage is not connected yet."
      }, 503);
    }

    const extension = format === "audio" ? "mp3" : "mp4";
    const objectKey = `videos/${videoId}/${format}.${extension}`;

    const object = await env.VIDEOS.head(objectKey);

    if (!object) {
      return json({
        error:
          "Authorized video file was not found in your storage.",
        videoId,
        format
      }, 404);
    }

    /*
      For now we return a clear response.
      In the next step we'll add a secure download URL
      using your R2 setup.
    */

    return json({
      success: true,
      videoId,
      format,
      file: objectKey,
      message: "Authorized video found in storage."
    });

  } catch (error) {
    return json({
      error: "Invalid request.",
      details: error.message
    }, 400);
  }
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders()
    }
  });
}
