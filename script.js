"use strict";

/*
  MyTube Downloader
  Frontend controller

  This script:
  - Validates YouTube URLs
  - Extracts video IDs
  - Shows thumbnail preview
  - Handles dark/light theme
  - Handles download button state

  IMPORTANT:
  The actual media download must be connected to
  an authorized backend for videos you own or have
  permission to download.
*/

const CONFIG = {
  DOWNLOAD_ENDPOINT: "/api/download"
};

const elements = {
  urlInput: document.getElementById("urlInput"),
  analyzeBtn: document.getElementById("analyzeBtn"),
  downloadBtn: document.getElementById("downloadBtn"),
  result: document.getElementById("result"),
  message: document.getElementById("message"),
  thumbnail: document.getElementById("thumbnail"),
  videoTitle: document.getElementById("videoTitle"),
  videoId: document.getElementById("videoId"),
  formatSelect: document.getElementById("formatSelect"),
  themeBtn: document.getElementById("themeBtn")
};

let currentVideo = {
  id: null,
  url: null
};


/* =========================================
   MESSAGE SYSTEM
========================================= */

function showMessage(text, type = "info") {
  if (!elements.message) return;

  elements.message.textContent = text;
  elements.message.className = "message show " + type;
}

function hideMessage() {
  if (!elements.message) return;

  elements.message.textContent = "";
  elements.message.className = "message";
}


/* =========================================
   YOUTUBE URL PARSER
========================================= */

function extractYouTubeVideoId(value) {
  if (!value) return null;

  let url;

  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }

  const hostname = url.hostname.toLowerCase();
  const pathname = url.pathname;

  const isYouTube =
    hostname === "youtube.com" ||
    hostname === "www.youtube.com" ||
    hostname === "m.youtube.com" ||
    hostname === "music.youtube.com";

  const isShortYouTube =
    hostname === "youtu.be" ||
    hostname === "www.youtu.be";

  if (isShortYouTube) {
    const id = pathname
      .split("/")
      .filter(Boolean)[0];

    return isValidYouTubeId(id) ? id : null;
  }

  if (!isYouTube) {
    return null;
  }

  if (pathname === "/watch") {
    const id = url.searchParams.get("v");

    return isValidYouTubeId(id) ? id : null;
  }

  if (pathname.startsWith("/shorts/")) {
    const id = pathname.split("/")[2];

    return isValidYouTubeId(id) ? id : null;
  }

  if (pathname.startsWith("/embed/")) {
    const id = pathname.split("/")[2];

    return isValidYouTubeId(id) ? id : null;
  }

  return null;
}


/* =========================================
   VIDEO ID VALIDATION
========================================= */

function isValidYouTubeId(id) {
  return Boolean(
    id &&
    /^[A-Za-z0-9_-]{11}$/.test(id)
  );
}


/* =========================================
   THUMBNAIL
========================================= */

function setThumbnail(videoId) {
  if (!elements.thumbnail) return;

  elements.thumbnail.src =
    "https://i.ytimg.com/vi/" +
    encodeURIComponent(videoId) +
    "/hqdefault.jpg";

  elements.thumbnail.alt =
    "YouTube video thumbnail";
}


/* =========================================
   RESET RESULT
========================================= */

function resetResult() {
  currentVideo = {
    id: null,
    url: null
  };

  if (elements.result) {
    elements.result.classList.remove("show");
  }

  if (elements.downloadBtn) {
    elements.downloadBtn.disabled = true;
  }
}


/* =========================================
   ANALYZE VIDEO
========================================= */

function analyzeVideo() {

  hideMessage();

  const value =
    elements.urlInput.value.trim();

  if (!value) {
    resetResult();

    showMessage(
      "Please paste a YouTube video URL.",
      "error"
    );

    elements.urlInput.focus();

    return;
  }

  const videoId =
    extractYouTubeVideoId(value);

  if (!videoId) {
    resetResult();

    showMessage(
      "Invalid YouTube URL. Please enter a valid video link.",
      "error"
    );

    elements.urlInput.focus();

    return;
  }

  currentVideo.id = videoId;
  currentVideo.url = value;

  setThumbnail(videoId);

  if (elements.videoTitle) {
    elements.videoTitle.textContent =
      "YouTube Video";
  }

  if (elements.videoId) {
    elements.videoId.textContent =
      "Video ID: " + videoId;
  }

  if (elements.result) {
    elements.result.classList.add("show");
  }

  if (elements.downloadBtn) {
    elements.downloadBtn.disabled = false;
  }

  showMessage(
    "Video URL recognized. Select a format to continue.",
    "success"
  );
}


/* =========================================
   DOWNLOAD REQUEST
========================================= */

async function startDownload() {

  hideMessage();

  if (!currentVideo.id) {
    showMessage(
      "Please analyze a valid YouTube URL first.",
      "error"
    );

    return;
  }

  const format =
    elements.formatSelect.value;

  const originalText =
    elements.downloadBtn.textContent;

  elements.downloadBtn.disabled = true;

  elements.downloadBtn.textContent =
    "Preparing...";

  try {

    /*
      This request is intentionally prepared for
      YOUR authorized backend.

      Expected request:

      POST /api/download

      {
        videoId: "...",
        format: "mp4-720"
      }

      The backend must enforce authorization and
      only process videos that the user owns or
      has permission to download.
    */

    const response = await fetch(
      CONFIG.DOWNLOAD_ENDPOINT,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          videoId: currentVideo.id,
          format: format
        })
      }
    );

    if (!response.ok) {
      throw new Error(
        "Download service unavailable."
      );
    }

    const contentType =
      response.headers.get("content-type") || "";

    /*
      JSON response:
      Used when backend returns a temporary
      authorized download URL.
    */

    if (
      contentType.includes(
        "application/json"
      )
    ) {

      const data =
        await response.json();

      if (data.downloadUrl) {

        window.location.href =
          data.downloadUrl;

        showMessage(
          "Your authorized download is ready.",
          "success"
        );

      } else {

        throw new Error(
          "No download URL was returned."
        );
      }

    } else {

      /*
        Blob response:
        Used when your backend directly
        returns the authorized file.
      */

      const blob =
        await response.blob();

      if (!blob.size) {
        throw new Error(
          "The returned file is empty."
        );
      }

      const blobUrl =
        URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = blobUrl;

      link.download =
        "my-youtube-video";

      document.body.appendChild(link);

      link.click();

      link.remove();

      URL.revokeObjectURL(blobUrl);

      showMessage(
        "Download started.",
        "success"
      );
    }

  } catch (error) {

    console.error(
      "Download error:",
      error
    );

    showMessage(
      "The authorized download service is not connected or could not process this video.",
      "error"
    );

  } finally {

    elements.downloadBtn.disabled =
      false;

    elements.downloadBtn.textContent =
      originalText;
  }
}


/* =========================================
   THEME
========================================= */

function applyTheme(theme) {

  const isDark =
    theme === "dark";

  document.body.classList.toggle(
    "dark",
    isDark
  );

  if (elements.themeBtn) {
    elements.themeBtn.textContent =
      isDark ? "Light" : "Dark";
  }
}

function loadTheme() {

  const savedTheme =
    localStorage.getItem(
      "mytube-theme"
    );

  if (savedTheme === "dark") {

    applyTheme("dark");

  } else {

    applyTheme("light");
  }
}

function toggleTheme() {

  const isDark =
    document.body.classList.contains(
      "dark"
    );

  const newTheme =
    isDark ? "light" : "dark";

  localStorage.setItem(
    "mytube-theme",
    newTheme
  );

  applyTheme(newTheme);
}


/* =========================================
   EVENT LISTENERS
========================================= */

if (elements.analyzeBtn) {
  elements.analyzeBtn.addEventListener(
    "click",
    analyzeVideo
  );
}

if (elements.downloadBtn) {
  elements.downloadBtn.addEventListener(
    "click",
    startDownload
  );
}

if (elements.themeBtn) {
  elements.themeBtn.addEventListener(
    "click",
    toggleTheme
  );
}

if (elements.urlInput) {

  elements.urlInput.addEventListener(
    "keydown",
    function(event) {

      if (event.key === "Enter") {
        analyzeVideo();
      }

    }
  );

  elements.urlInput.addEventListener(
    "input",
    function() {

      if (
        elements.message &&
        elements.message.classList.contains(
          "show"
        )
      ) {
        hideMessage();
      }

    }
  );
}


/* =========================================
   INITIALIZATION
========================================= */

document.addEventListener(
  "DOMContentLoaded",
  function() {

    loadTheme();

    if (elements.downloadBtn) {
      elements.downloadBtn.disabled = true;
    }

  }
);
