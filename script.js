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
  document.body.classList.toggle("dark");

  const isDark =
    document.body.classList.contains("dark");

  themeBtn.textContent =
    isDark ? "Light" : "Dark";
});


// ==========================================
// MESSAGE
// ==========================================

function showMessage(text, type = "") {
  message.textContent = text;
  message.className = "message";

  if (type) {
    message.classList.add(type);
    message.classList.add("show");
  }
}


// ==========================================
// EXTRACT VIDEO ID
// ==========================================

function extractVideoId(value) {
  try {
    const url = new URL(value.trim());

    const hostname =
      url.hostname.toLowerCase();

    // youtube.com
    if (
      hostname === "youtube.com" ||
      hostname === "www.youtube.com" ||
      hostname.endsWith(".youtube.com")
    ) {
      const watchId =
        url.searchParams.get("v");

      if (
        watchId &&
        isValidVideoId(watchId)
      ) {
        return watchId;
      }

      const shortsMatch =
        url.pathname.match(
          /\/shorts\/([A-Za-z0-9_-]{11})/
        );

      if (shortsMatch) {
        return shortsMatch[1];
      }

      const embedMatch =
        url.pathname.match(
          /\/embed\/([A-Za-z0-9_-]{11})/
        );

      if (embedMatch) {
        return embedMatch[1];
      }
    }

    // youtu.be
    if (hostname === "youtu.be") {
      const id =
        url.pathname.split("/")[1];

      if (
        id &&
        isValidVideoId(id)
      ) {
        return id;
      }
    }

  } catch {
    return null;
  }

  return null;
}


// ==========================================
// VALIDATE VIDEO ID
// ==========================================

function isValidVideoId(videoId) {
  return /^[A-Za-z0-9_-]{11}$/.test(videoId);
}


// ==========================================
// ANALYZE
// ==========================================

analyzeBtn?.addEventListener(
  "click",
  async () => {

    const input =
      urlInput.value.trim();

    if (!input) {
      showMessage(
        "Please paste a YouTube video URL.",
        "error"
      );
      return;
    }

    const videoId =
      extractVideoId(input);

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

    result.classList.remove("show");
    result.classList.remove("visible");

    showMessage(
      "Analyzing video...",
      "info"
    );

    try {

      const response =
        await fetch(
          `${API_BASE}/api/analyze`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              videoId
            })
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
          "Unable to analyze video."
        );
      }

      thumbnail.src =
        data.thumbnail ||
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

      thumbnail.alt =
        "YouTube video thumbnail";

      videoTitle.textContent =
        data.title ||
        "Authorized YouTube Video";

      videoIdElement.textContent =
        `Video ID: ${videoId}`;

      result.classList.add("show");
      result.classList.add("visible");

      downloadBtn.disabled = false;

      showMessage(
        "Video recognized. Select a format.",
        "success"
      );

    } catch (error) {

      console.error(error);

      result.classList.remove("show");
      result.classList.remove("visible");

      downloadBtn.disabled = true;

      showMessage(
        error.message ||
        "Unable to analyze this URL.",
        "error"
      );

    } finally {

      analyzeBtn.disabled = false;
      analyzeBtn.textContent = "Analyze";
    }
  }
);


// ==========================================
// DOWNLOAD
// ==========================================

downloadBtn?.addEventListener(
  "click",
  async () => {

    if (!currentVideoId) {
      showMessage(
        "Analyze a video first.",
        "error"
      );
      return;
    }

    const selected =
      formatSelect.value;

    const formatMap = {
      "mp4-720": "720",
      "mp4-1080": "1080",
      "mp4-480": "480",
      "audio": "audio"
    };

    const format =
      formatMap[selected];

    if (!format) {
      showMessage(
        "Invalid format selected.",
        "error"
      );
      return;
    }

    downloadBtn.disabled = true;
    downloadBtn.textContent =
      "Checking...";

    showMessage(
      "Checking authorized file...",
      "info"
    );

    try {

      const response =
        await fetch(
          `${API_BASE}/api/download`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              videoId:
                currentVideoId,
              format
            })
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
          "Authorized file is not available."
        );
      }

      if (data.downloadUrl) {

        const link =
          document.createElement("a");

        link.href =
          data.downloadUrl;

        link.download = "";

        document.body.appendChild(link);
        link.click();
        link.remove();

        showMessage(
          "Download started.",
          "success"
        );

      } else {

        showMessage(
          "Authorized file is ready, but no download URL was returned.",
          "info"
        );
      }

    } catch (error) {

      console.error(error);

      showMessage(
        error.message ||
        "Download is not available.",
        "error"
      );

    } finally {

      downloadBtn.disabled = false;

      downloadBtn.textContent =
        "Download Authorized File";
    }
  }
);


// ==========================================
// ENTER KEY
// ==========================================

urlInput?.addEventListener(
  "keydown",
  (event) => {

    if (event.key === "Enter") {
      event.preventDefault();
      analyzeBtn.click();
    }

  }
);


// ==========================================
// INITIAL STATE
// ==========================================

result.classList.remove("show");
result.classList.remove("visible");

showMessage(
  "Paste an authorized YouTube video URL to begin."
);
