const eventForm = document.getElementById("eventForm");
const eventList = document.getElementById("eventList");
const eventStatus = document.getElementById("eventStatus");
const modePhoto = document.getElementById("modePhoto");
const modeStrip = document.getElementById("modeStrip");
const modeGif = document.getElementById("modeGif");
const modeVideo = document.getElementById("modeVideo");

function setStatus(msg) {
  eventStatus.textContent = msg;
}

function uid() {
  return `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function formatModes(modes) {
  return [
    modes.photo ? "Photo" : null,
    modes.strip ? "Strip" : null,
    modes.gif ? "GIF" : null,
    modes.video ? "Video" : null,
  ]
    .filter(Boolean)
    .join(", ");
}

function renderEvents() {
  const events = window.photoActiveStore.getEvents();
  const live = events.find((e) => e.isLive);

  if (!events.length) {
    eventList.innerHTML = "<p class=\"muted\">No events yet. Create your first event below.</p>";
    return;
  }

  eventList.innerHTML = events
    .map((event) => {
      const galleryLabel = event.publicGallery ? "Public" : "Private";
      const goLiveLabel = event.isLive ? "Live now" : "Set Live";
      const captures = window.photoActiveStore.getCapturesForEvent(event.id).length;

      return `
        <article class="event-card ${event.isLive ? "event-card-live" : ""}">
          <div>
            <h3>${event.name}</h3>
            <p><strong>Date:</strong> ${event.date || "Not set"}</p>
            <p><strong>Type:</strong> ${event.type}</p>
            <p><strong>Gallery:</strong> ${galleryLabel}</p>
            <p><strong>Modes:</strong> ${formatModes(event.modes)}</p>
            <p><strong>Captures:</strong> ${captures}</p>
            <p><strong>Kiosk URL:</strong> <code>kiosk.html?event=${event.id}</code></p>
          </div>
          <div class="event-actions">
            <button class="btn" data-action="live" data-id="${event.id}">${goLiveLabel}</button>
          </div>
        </article>
      `;
    })
    .join("");

  if (live) {
    setStatus(`Live event: ${live.name}`);
  } else {
    setStatus("No live event selected.");
  }
}

function readModes() {
  return {
    photo: modePhoto.checked,
    strip: modeStrip.checked,
    gif: modeGif.checked,
    video: modeVideo.checked,
  };
}

eventForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const formData = new FormData(eventForm);
  const eventRecord = {
    id: uid(),
    name: String(formData.get("eventName") || "").trim(),
    date: String(formData.get("eventDate") || "").trim(),
    type: String(formData.get("eventType") || "Private"),
    publicGallery: formData.get("galleryType") === "public",
    accentColor: String(formData.get("accentColor") || "#f95d2f"),
    logoText: String(formData.get("logoText") || "PHOTO ACTIVE").trim(),
    overlayText: String(formData.get("overlayText") || "Tap to start").trim(),
    modes: readModes(),
    isLive: false,
    createdAt: new Date().toISOString(),
  };

  if (!eventRecord.name) {
    setStatus("Event name is required.");
    return;
  }

  if (!eventRecord.modes.photo && !eventRecord.modes.strip && !eventRecord.modes.gif && !eventRecord.modes.video) {
    setStatus("Enable at least one capture mode.");
    return;
  }

  window.photoActiveStore.upsertEvent(eventRecord);
  eventForm.reset();
  modePhoto.checked = true;
  modeStrip.checked = true;
  modeGif.checked = false;
  modeVideo.checked = false;

  setStatus(`Saved event \"${eventRecord.name}\".`);
  renderEvents();
});

eventList.addEventListener("click", (e) => {
  const target = e.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  if (target.dataset.action === "live" && target.dataset.id) {
    window.photoActiveStore.setLiveEvent(target.dataset.id);
    renderEvents();
  }
});

renderEvents();
