const state = {
  stream: null,
  cameraDevices: [],
  currentDeviceId: null,
  facingMode: "user",
  currentFilter: "none",
  runningCapture: false,
  eventRecord: null,
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
  state.stream = null;
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

window.addEventListener("beforeunload", stopStream);

configureEventUi();
buildFilterChips();
resetResult();
applyCurrentFilter();

if (!navigator.mediaDevices?.getUserMedia) {
  setStatus("This browser does not support camera access.");
}
