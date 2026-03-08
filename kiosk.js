const state = {
  stream: null,
  cameraDevices: [],
  currentDeviceId: null,
  facingMode: "user",
  currentFilter: "none",
  runningCapture: false,
  eventRecord: null,
  sessionId: null,
  sessionManager: null,
};

const filters = [
  { id: "none", name: "Natural", css: "none" },
  { id: "mono", name: "Mono", css: "grayscale(1)" },
  { id: "warm", name: "Warm", css: "sepia(0.45) saturate(1.1)" },
  { id: "cool", name: "Cool", css: "contrast(1.1) hue-rotate(170deg)" },
  { id: "vivid", name: "Vivid", css: "saturate(1.45) contrast(1.08)" },
];

const eventNameEl = document.getElementById("eventName");
const eventMetaEl = document.getElementById("eventMeta");
const cameraEl = document.getElementById("camera");
const captureCanvas = document.getElementById("captureCanvas");
const resultCanvas = document.getElementById("resultCanvas");
const countdownEl = document.getElementById("countdown");
const statusEl = document.getElementById("status");
const cameraSelectEl = document.getElementById("cameraSelect");
const timerSelectEl = document.getElementById("timerSelect");
const layoutSelectEl = document.getElementById("layoutSelect");
const filterChipsEl = document.getElementById("filterChips");
const guestNameEl = document.getElementById("guestName");
const guestEmailEl = document.getElementById("guestEmail");
const consentEl = document.getElementById("consent");

const startCameraBtn = document.getElementById("startCameraBtn");
const captureBtn = document.getElementById("captureBtn");
const switchBtn = document.getElementById("switchBtn");
const downloadBtn = document.getElementById("downloadBtn");
const retakeBtn = document.getElementById("retakeBtn");
const shareStubBtn = document.getElementById("shareStubBtn");
const galleryContainer = document.getElementById("galleryContainer");
const galleryImage = document.getElementById("galleryImage");
const galleryVideo = document.getElementById("galleryVideo");
const galleryPrevBtn = document.getElementById("galleryPrevBtn");
const galleryNextBtn = document.getElementById("galleryNextBtn");
const galleryCounter = document.getElementById("galleryCounter");
const galleryExportBtn = document.getElementById("galleryExportBtn");
const zipDownloadBtn = document.getElementById("zipDownloadBtn");
const clearSessionBtn = document.getElementById("clearSessionBtn");
const sessionEventName = document.getElementById("sessionEventName");
const sessionCaptureCount = document.getElementById("sessionCaptureCount");
const sessionStorageSize = document.getElementById("sessionStorageSize");
const sessionIdEl = document.getElementById("sessionId");
const sessionStatus = document.getElementById("sessionStatus");
const galleryEmpty = document.getElementById("galleryEmpty");
const videoDurationSelect = document.getElementById("videoDurationSelect");

function setStatus(text, ok = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle("ok", ok);
}

function queryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function resolveEvent() {
  const requestedEventId = queryParam("event");
  const events = window.photoActiveStore.getEvents();

  if (requestedEventId) {
    return events.find((e) => e.id === requestedEventId) || null;
  }

  return window.photoActiveStore.getLiveEvent();
}

function configureEventUi() {
  state.eventRecord = resolveEvent();

  if (!state.eventRecord) {
    eventNameEl.textContent = "No active event";
    eventMetaEl.textContent = "Open admin.html and set one event to Live.";
    captureBtn.disabled = true;
    setStatus("No live event found. Admin setup is required.");
    return;
  }

  const event = state.eventRecord;
  eventNameEl.textContent = event.name;
  eventMetaEl.textContent = `${event.type} | ${event.publicGallery ? "Public" : "Private"} gallery`;
  document.documentElement.style.setProperty("--accent", event.accentColor || "#f95d2f");

  const supportsStrip = Boolean(event.modes?.strip);
  const supportsPhoto = Boolean(event.modes?.photo);

  layoutSelectEl.innerHTML = "";

  if (supportsPhoto) {
    const single = document.createElement("option");
    single.value = "single";
    single.textContent = "Single photo";
    layoutSelectEl.appendChild(single);
  }

  if (supportsStrip) {
    const strip = document.createElement("option");
    strip.value = "strip";
    strip.textContent = "4-photo strip";
    layoutSelectEl.appendChild(strip);
  }

  if (!supportsPhoto && !supportsStrip) {
    captureBtn.disabled = true;
    setStatus("This event has no supported capture modes yet.");
  }
}

function buildFilterChips() {
  filterChipsEl.innerHTML = "";
  for (const filter of filters) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = filter.name;
    chip.setAttribute("role", "radio");
    chip.setAttribute("aria-checked", filter.id === state.currentFilter ? "true" : "false");

    chip.addEventListener("click", () => {
      state.currentFilter = filter.id;
      applyCurrentFilter();
      buildFilterChips();
    });

    filterChipsEl.appendChild(chip);
  }
}

function applyCurrentFilter() {
  const found = filters.find((f) => f.id === state.currentFilter) || filters[0];
  cameraEl.style.filter = found.css;
}

async function getCameraDevices() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  state.cameraDevices = devices.filter((d) => d.kind === "videoinput");
  cameraSelectEl.innerHTML = "";

  state.cameraDevices.forEach((device, i) => {
    const opt = document.createElement("option");
    opt.value = device.deviceId;
    opt.textContent = device.label || `Camera ${i + 1}`;
    cameraSelectEl.appendChild(opt);
  });

  switchBtn.disabled = state.cameraDevices.length < 2;
}

function stopStream() {
  if (!state.stream) {
    return;
  }

  state.stream.getTracks().forEach((track) => track.stop());
  cameraEl.pause();
  cameraEl.srcObject = null;
  state.stream = null;
  captureBtn.disabled = true;
  switchBtn.disabled = true;
}

async function startCamera(deviceId = null) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera API not supported in this browser.");
  }

  stopStream();

  const constraints = {
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: false,
  };

  if (deviceId) {
    constraints.video.deviceId = { exact: deviceId };
  } else {
    constraints.video.facingMode = { ideal: state.facingMode };
  }

  state.stream = await navigator.mediaDevices.getUserMedia(constraints);
  cameraEl.srcObject = state.stream;
  await cameraEl.play();

  const [track] = state.stream.getVideoTracks();
  const settings = track?.getSettings() || {};
  state.currentDeviceId = settings.deviceId || deviceId;

  await getCameraDevices();
  if (state.currentDeviceId) {
    cameraSelectEl.value = state.currentDeviceId;
  }

  captureBtn.disabled = false;
  setStatus("Camera active. Ready to capture.", true);
}

function showCountdown(value) {
  countdownEl.textContent = value > 0 ? String(value) : "";
  countdownEl.classList.toggle("visible", value > 0);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function drawVideoFrameToCanvas(canvas, width, height) {
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  const current = filters.find((f) => f.id === state.currentFilter) || filters[0];
  ctx.filter = current.css;
  ctx.drawImage(cameraEl, 0, 0, width, height);
  ctx.filter = "none";
}

async function captureSingle(timerSec) {
  for (let i = timerSec; i > 0; i--) {
    showCountdown(i);
    await wait(1000);
  }
  showCountdown(0);

  const width = cameraEl.videoWidth || 1280;
  const height = cameraEl.videoHeight || 720;
  drawVideoFrameToCanvas(resultCanvas, width, height);
}

async function captureStrip(timerSec) {
  const frameW = 720;
  const frameH = 960;
  const margin = 26;
  const spacer = 22;
  const frames = 4;
  const stripW = frameW + margin * 2;
  const stripH = margin * 2 + frameH * frames + spacer * (frames - 1) + 120;

  resultCanvas.width = stripW;
  resultCanvas.height = stripH;
  const ctx = resultCanvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, stripW, stripH);

  for (let i = 0; i < frames; i++) {
    for (let c = timerSec; c > 0; c--) {
      showCountdown(c);
      await wait(1000);
    }

    showCountdown(0);
    drawVideoFrameToCanvas(captureCanvas, frameW, frameH);

    const y = margin + i * (frameH + spacer);
    ctx.drawImage(captureCanvas, margin, y, frameW, frameH);

    if (i < frames - 1) {
      await wait(550);
    }
  }

  const brand = state.eventRecord?.logoText || "PHOTO ACTIVE";
  ctx.fillStyle = "#14212f";
  ctx.font = "bold 36px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText(brand, stripW / 2, stripH - 68);

  ctx.font = "20px Trebuchet MS";
  ctx.fillStyle = state.eventRecord?.accentColor || "#f95d2f";
  ctx.fillText(new Date().toLocaleString(), stripW / 2, stripH - 32);
}

function storeCaptureRecord() {
  if (!state.eventRecord) {
    return;
  }

  window.photoActiveStore.appendCapture({
    id: `cap-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    eventId: state.eventRecord.id,
    createdAt: new Date().toISOString(),
    layout: layoutSelectEl.value,
    guestName: guestNameEl.value.trim(),
    guestEmail: guestEmailEl.value.trim(),
    consent: consentEl.checked,
    imageDataUrl: resultCanvas.toDataURL("image/png"),
  });

  if (!galleryManager) {
    initGallery();
  } else {
    galleryManager.load();
    updateGalleryView();
  }

  // Update session summary after capture
  updateSessionSummary();
}
}

async function captureSequence() {
  if (state.runningCapture || !state.stream) {
    return;
  }

  state.runningCapture = true;
  captureBtn.disabled = true;
  switchBtn.disabled = true;
  downloadBtn.disabled = true;
  retakeBtn.disabled = true;
  shareStubBtn.disabled = true;

  try {
    const timerSec = Number(timerSelectEl.value);
    const layout = layoutSelectEl.value;

    setStatus("Capturing photos... hold still.", true);

    if (layout === "strip") {
      await captureStrip(timerSec);
    } else {
      await captureSingle(timerSec);
    }

    storeCaptureRecord();
    downloadBtn.disabled = false;
    retakeBtn.disabled = false;
    shareStubBtn.disabled = false;
    setStatus("Capture complete. Download or queue share.", true);
  } catch (err) {
    console.error(err);
    setStatus(`Capture failed: ${err.message}`);
  } finally {
    captureBtn.disabled = false;
    switchBtn.disabled = state.cameraDevices.length < 2;
    state.runningCapture = false;
    showCountdown(0);
  }
}

function downloadResult() {
  const link = document.createElement("a");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  link.href = resultCanvas.toDataURL("image/png");
  link.download = `${(state.eventRecord?.name || "event").replace(/\s+/g, "-").toLowerCase()}-${stamp}.png`;
  link.click();
}

async function switchLens() {
  state.facingMode = state.facingMode === "user" ? "environment" : "user";
  try {
    await startCamera();
  } catch (err) {
    state.facingMode = state.facingMode === "user" ? "environment" : "user";
    setStatus(`Unable to switch lens: ${err.message}`);
  }
}

function resetResult() {
  const ctx = resultCanvas.getContext("2d");
  ctx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
  downloadBtn.disabled = true;
  retakeBtn.disabled = true;
  shareStubBtn.disabled = true;
}

function queueShareStub() {
  const details = [];
  if (guestNameEl.value.trim()) {
    details.push(`Name: ${guestNameEl.value.trim()}`);
  }
  if (guestEmailEl.value.trim()) {
    details.push(`Email: ${guestEmailEl.value.trim()}`);
  }

  setStatus(`Share queued locally (${details.join(" | ") || "anonymous"}). Cloud delivery hook pending.`, true);
}

let galleryManager = null;

function initGallery() {
  if (!state.eventRecord) {
    return;
  }

  galleryManager = new window.GalleryManager(state.eventRecord.id);
  galleryManager.load();
  updateGalleryView();
}

function updateGalleryView() {
  if (!galleryManager || galleryManager.captures.length === 0) {
    galleryContainer.style.display = "none";
    galleryEmpty.style.display = "block";
    return;
  }

  galleryContainer.style.display = "block";
  galleryEmpty.style.display = "none";

  const current = galleryManager.getCurrent();
  if (!current) {
    return;
  }

  galleryImage.style.display = "none";
  galleryVideo.style.display = "none";

  if (current.imageDataUrl) {
    galleryImage.src = current.imageDataUrl;
    galleryImage.style.display = "block";
  } else if (current.videoDataUrl) {
    galleryVideo.src = current.videoDataUrl;
    galleryVideo.style.display = "block";
  }

  galleryCounter.textContent = `${galleryManager.currentIndex + 1} / ${galleryManager.captures.length}`;
  galleryExportBtn.disabled = false;
}

function galleryPrev() {
  if (galleryManager && galleryManager.prev()) {
    updateGalleryView();
  }
}

function galleryNext() {
  if (galleryManager && galleryManager.next()) {
    updateGalleryView();
  }
}

function exportGalleryCSV() {
  if (galleryManager && state.eventRecord) {
    galleryManager.downloadCSV(state.eventRecord.name);
    setStatus("CSV exported successfully.", true);
  }
}

function updateSessionSummary() {
  if (!state.sessionManager || !state.eventRecord || !state.sessionId) return;

  // Update event name
  if (sessionEventName) {
    sessionEventName.textContent = state.eventRecord.name || "Unnamed Event";
  }

  // Update capture count
  state.sessionManager.updateSessionCaptureCount(state.sessionId);
  const captureCount =
    store.getEvent(state.eventRecord.id)?.captures?.length || 0;
  if (sessionCaptureCount) {
    sessionCaptureCount.textContent = captureCount;
  }

  // Update storage estimate
  const storageBytes = state.sessionManager.getStorageEstimate();
  const storageFormatted = state.sessionManager.formatBytes(storageBytes);
  if (sessionStorageSize) {
    sessionStorageSize.textContent = storageFormatted;
  }

  // Update session ID
  if (sessionIdEl) {
    sessionIdEl.textContent = state.sessionId;
  }

  // Update status
  if (sessionStatus) {
    sessionStatus.textContent = "Session active - captures accumulating locally";
    sessionStatus.className = "session-active";
  }
}

async function downloadSessionZip() {
  if (!state.sessionManager || !state.eventRecord || !galleryManager) {
    setStatus("No session or event loaded.", false);
    return;
  }

  try {
    setStatus("Preparing ZIP download...", true);

    const zipExporter = new window.ZipExporter();

    // Get all captures from the current event
    const captures = galleryManager.captures || [];
    if (captures.length === 0) {
      setStatus("No captures to download.", false);
      return;
    }

    // Add all images to the ZIP
    captures.forEach((capture, idx) => {
      const fileName = `photo_${idx + 1}.png`;
      zipExporter.addImageFile(fileName, capture.imageDataUrl);
    });

    // Generate and add CSV metadata
    try {
      const csvContent = generateCSVContent(captures, state.eventRecord.name);
      zipExporter.addTextFile("captures.csv", csvContent);
    } catch (err) {
      console.warn("CSV generation failed, continuing with images only:", err);
    }

    // Generate ZIP blob and trigger download
    await zipExporter.download(state.eventRecord.name);
    setStatus(`ZIP downloaded: ${captures.length} photos + metadata`, true);
  } catch (err) {
    console.error("ZIP export failed:", err);
    setStatus(`ZIP export failed: ${err.message}`, false);
  }
}

function generateCSVContent(captures, eventName) {
  const headers = ["Photo", "Timestamp", "Filter", "Type"];
  const rows = captures.map((capture, idx) => [
    `photo_${idx + 1}.png`,
    new Date(capture.timestamp).toLocaleString(),
    capture.filter || "none",
    capture.type || "photo",
  ]);

  const csvLines = [
    `Event,${eventName}`,
    `Date,${new Date().toLocaleString()}`,
    "",
    headers.join(","),
    ...rows.map((r) => r.map((v) => `"${v}"`).join(",")),
  ];

  return csvLines.join("\n");
}

function clearSession() {
  if (!state.eventRecord) return;

  try {
    // Archive the current session
    if (state.sessionManager && state.sessionId) {
      state.sessionManager.archiveSession(state.sessionId);
    }

    // Clear the captures for this event
    store.updateEvent(state.eventRecord.id, { captures: [] });
    galleryManager.captures = [];
    resetResult();
    initGallery();

    // Create a new session
    const newSessionId = state.sessionManager.createSession(
      state.eventRecord.id,
      state.eventRecord.name
    );
    state.sessionId = newSessionId;
    updateSessionSummary();

    setStatus("Session cleared. New session started.", true);
  } catch (err) {
    console.error("Clear session failed:", err);
    setStatus(`Clear failed: ${err.message}`, false);
  }
}

startCameraBtn.addEventListener("click", async () => {
  try {
    await startCamera(state.currentDeviceId || null);
  } catch (err) {
    console.error(err);
    setStatus(`Camera start failed: ${err.message}. Use HTTPS or localhost.`);
  }
});

captureBtn.addEventListener("click", captureSequence);
switchBtn.addEventListener("click", switchLens);
downloadBtn.addEventListener("click", downloadResult);
retakeBtn.addEventListener("click", resetResult);
shareStubBtn.addEventListener("click", queueShareStub);

cameraSelectEl.addEventListener("change", async (e) => {
  const deviceId = e.target.value;
  try {
    await startCamera(deviceId);
  } catch (err) {
    console.error(err);
    setStatus(`Unable to switch camera: ${err.message}`);
  }
});

galleryPrevBtn.addEventListener("click", galleryPrev);
galleryNextBtn.addEventListener("click", galleryNext);
galleryExportBtn.addEventListener("click", exportGalleryCSV);

window.addEventListener("beforeunload", stopStream);
window.addEventListener("pagehide", stopStream);

document.addEventListener("visibilitychange", () => {
  // Release camera when tab is backgrounded to avoid locking device resources.
  if (document.visibilityState === "hidden") {
    stopStream();
  }
});

configureEventUi();
buildFilterChips();
resetResult();
applyCurrentFilter();
initGallery();

// Initialize session manager
state.sessionManager = new window.SessionManager();
if (state.eventRecord) {
  const sessionId = state.sessionManager.createSession(
    state.eventRecord.id,
    state.eventRecord.name
  );
  state.sessionId = sessionId;
  updateSessionSummary();
}

// Session ZIP download handler
zipDownloadBtn?.addEventListener("click", downloadSessionZip);

// Clear session handler
clearSessionBtn?.addEventListener("click", () => {
  if (confirm("Clear all captures in this session? This cannot be undone.")) {
    clearSession();
  }
});

if (!navigator.mediaDevices?.getUserMedia) {
  setStatus("This browser does not support camera access.");
}
