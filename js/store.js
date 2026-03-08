const PHOTO_ACTIVE_DB_KEY = "photoActive.db.v1";

function loadDb() {
  try {
    const raw = localStorage.getItem(PHOTO_ACTIVE_DB_KEY);
    if (!raw) {
      return { events: [], captures: [] };
    }

    const parsed = JSON.parse(raw);
    return {
      events: Array.isArray(parsed.events) ? parsed.events : [],
      captures: Array.isArray(parsed.captures) ? parsed.captures : [],
    };
  } catch {
    return { events: [], captures: [] };
  }
}

function saveDb(db) {
  localStorage.setItem(PHOTO_ACTIVE_DB_KEY, JSON.stringify(db));
}

function getEvents() {
  return loadDb().events;
}

function upsertEvent(eventRecord) {
  const db = loadDb();
  const idx = db.events.findIndex((e) => e.id === eventRecord.id);

  if (idx >= 0) {
    db.events[idx] = eventRecord;
  } else {
    db.events.push(eventRecord);
  }

  saveDb(db);
  return eventRecord;
}

function setLiveEvent(eventId) {
  const db = loadDb();
  db.events = db.events.map((e) => ({ ...e, isLive: e.id === eventId }));
  saveDb(db);
}

function getLiveEvent() {
  return getEvents().find((e) => e.isLive) || null;
}

function appendCapture(capture) {
  const db = loadDb();
  db.captures.push(capture);
  saveDb(db);
}

function getCapturesForEvent(eventId) {
  return loadDb().captures.filter((c) => c.eventId === eventId);
}

window.photoActiveStore = {
  getEvents,
  upsertEvent,
  setLiveEvent,
  getLiveEvent,
  appendCapture,
  getCapturesForEvent,
};
