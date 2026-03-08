/**
 * Enhanced session manager with archiving and multi-session support
 */

class SessionManager {
  constructor() {
    this.allSessions = this.loadSessions();
  }

  loadSessions() {
    try {
      const raw = localStorage.getItem("photoActive.sessions.v1");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  saveSessions() {
    localStorage.setItem("photoActive.sessions.v1", JSON.stringify(this.allSessions));
  }

  createSession(eventId, eventName) {
    const sessionId = `sess-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    this.allSessions[sessionId] = {
      id: sessionId,
      eventId,
      eventName,
      createdAt: new Date().toISOString(),
      captureCount: 0,
      archived: false,
    };
    this.saveSessions();
    return sessionId;
  }

  getSession(sessionId) {
    return this.allSessions[sessionId] || null;
  }

  getSessions(eventId = null) {
    return Object.values(this.allSessions).filter(
      (s) => !eventId || s.eventId === eventId
    );
  }

  updateSessionCaptureCount(sessionId) {
    const sess = this.getSession(sessionId);
    if (sess) {
      const captures = window.photoActiveStore
        .getCapturesForEvent(sess.eventId)
        .filter((c) => {
          const cap = c.createdAt;
          const sessStart = new Date(sess.createdAt);
          return new Date(cap) >= sessStart;
        });
      sess.captureCount = captures.length;
      this.saveSessions();
    }
  }

  archiveSession(sessionId) {
    const sess = this.getSession(sessionId);
    if (sess) {
      sess.archived = true;
      sess.archivedAt = new Date().toISOString();
      this.saveSessions();
    }
  }

  deleteSession(sessionId) {
    delete this.allSessions[sessionId];
    this.saveSessions();
  }

  getStorageEstimate() {
    let totalSize = 0;
    const sessions = Object.values(this.allSessions);

    for (const sess of sessions) {
      const captures = window.photoActiveStore
        .getCapturesForEvent(sess.eventId)
        .filter(
          (c) =>
            new Date(c.createdAt) >=
            new Date(sess.createdAt)
        );

      for (const cap of captures) {
        if (cap.imageDataUrl) {
          totalSize += cap.imageDataUrl.length;
        }
      }
    }

    return totalSize;
  }

  formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + " " + sizes[i];
  }
}

window.SessionManager = SessionManager;
