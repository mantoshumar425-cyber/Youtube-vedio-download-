const API_BASE =
  "https://youtube-vedio-download.novasearch.workers.dev";

const urlInput = document.getElementById("urlInput");
const analyzeBtn = document.getElementById("analyzeBtn");
const downloadBtn = document.getElementById("downloadBtn");
const formatSelect = document.getElementById("formatSelect");

const message = document.getElementById("message");
const result = document.getElementById("result");
const thumbnail = document.getElementById("thumbnail");
const videoTitle = document.getElementById("videoTitle");
const videoIdElement = document.getElementById("videoId");

const themeBtn = document.getElementById("themeBtn");

let currentVideoId = null;


// ==========================================
// THEME
// ==========================================

themeBtn?.addEventListener("click", () => {
  document.body.classList.toggle("light-theme");

  themeBtn.textContent =
    document.body.classList.contains("light-theme")
      ? "Dark"
      : "Light";
});


// ==========================================
// MESSAGE
// ==========================================

function showMessage(text, type = "") {
  message.textContent = text;
  message.className = "message";

  if (type) {
    message.classList.add(type);
  }
}


// ==========================================
// EXTRACT YOUTUBE VIDEO ID
// ==========================================

function extractVideoId(value) {
  try {
    const url = new URL(value.trim());

    // youtube.com/watch?v=
    if (
      url.hostname === "youtube.com" ||
      url.hostname === "www.youtube.com" ||
      url.hostname.endsWith(".youtube.com")
    ) {
      const id = url.searchParams.get("v");

      if (id && /^[A-Za-z0-9_-]{11}$/.test(id)) {
        return id;
      }

      // /shorts/VIDEO_ID
      const shorts = url.pathname.match(
        /\/shorts\/([A-Za-z0-9_-]{11})/
      );

      if (shorts) {
        return shorts[1];
      }

      // /embed/VIDEO_ID
      const embed = url.pathname.match(
        /\/embed\/([A-Za-z0-9_-]{11})/
      );

      if (embed) {
        return embed[1];
      }
    }

    // youtu.be/VIDEO_ID
    if (url.hostname === "youtu.be") {
      const id = url.pathname.split("/")[1];

      if (id && /^[A-Za-z0-9_-]{11}$/.test(id)) {
        return id;
      }
    }

  } catch {
    return null;
  }

  return null;
}


// ==========================================
// ANALYZE
// ==========================================

analyzeBtn.addEventListener("click", async () => {
  const input = urlInput.value.trim();

  if (!input) {
    showMessage(
      "Please paste a YouTube video URL.",
      "error"
    );
    return;
  }

  const videoId = extractVideoId(input);

  if (!videoId) {
    showMessage(
      "Please enter a valid YouTube video URL.",
      "error"
    );
    return;
  }

  currentVideoId = videoId;

  analyzeBtn.disabled = true;
  analyzeBtn.textContent = "Checking...";

  downloadBtn.disabled = true;
  result.classList.remove("visible");

  showMessage(
    "Checking your authorized video...",
    "loading"
  );

  try {
    /*
      We only identify the video here.
      We do not scrape or bypass YouTube media streams.
    */

    thumbnail.src =
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    videoTitle.textContent =
      "Authorized YouTube Video";

    videoIdElement.textContent =
      `Video ID: ${videoId}`;

    result.classList.add("visible");

    showMessage(
      "Video recognized. Select an available format.",
      "success"
    );

    downloadBtn.disabled = false;

  } catch (error) {
    console.error(error);

    showMessage(
      "Unable to analyze this URL.",
      "error"
    );

  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = "Analyze";
  }
});


// ==========================================
// DOWNLOAD
// ==========================================

downloadBtn.addEventListener("click", async () => {
  if (!currentVideoId) {
    showMessage(
      "Analyze a video first.",
      "error"
    );
    return;
  }

  /*
    IMPORTANT:
    Frontend values:
      mp4-720
      mp4-1080
      mp4-480

    Worker expects:
      720
      1080
      480
      audio
  */

  const selected = formatSelect.value;

  const formatMap = {
    "mp4-720": "720",
    "mp4-1080": "1080",
    "mp4-480": "480",
    "audio": "audio"
  };

  const format = formatMap[selected];

  if (!format) {
    showMessage(
      "Invalid format selected.",
      "error"
    );
    return;
  }

  downloadBtn.disabled = true;
  downloadBtn.textContent = "Preparing...";

  showMessage(
    "Checking authorized file...",
    "loading"
  );

  try {
    const response = await fetch(
      `${API_BASE}/api/download`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          videoId: currentVideoId,
          format: format
        })
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.error ||
        "Authorized file is not available."
      );
    }

    if (!data.downloadUrl) {
      throw new Error(
        "Download URL was not returned by the server."
      );
    }

    showMessage(
      "Download is ready.",
      "success"
    );

    /*
      Start browser download.
    */

    const link = document.createElement("a");

    link.href = data.downloadUrl;
    link.download = "";

    document.body.appendChild(link);
    link.click();
    link.remove();

  } catch (error) {
    console.error(error);

    showMessage(
      error.message ||
      "Download failed.",
      "error"
    );

  } finally {
    downloadBtn.disabled = false;
    downloadBtn.textContent =
      "Continue to Authorized Download";
  }
});


// ==========================================
// ENTER KEY
// ==========================================

urlInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    analyzeBtn.click();
  }
});


// ==========================================
// INITIAL STATE
// ==========================================

result.classList.remove("visible");

showMessage(
  "Paste an authorized YouTube video URL to begin."
);
