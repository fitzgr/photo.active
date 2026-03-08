/**
 * Gallery manager for browsing and exporting event captures
 */

class GalleryManager {
  constructor(eventId) {
    this.eventId = eventId;
    this.captures = [];
    this.currentIndex = 0;
  }

  load() {
    this.captures = window.photoActiveStore.getCapturesForEvent(this.eventId);
    return this.captures;
  }

  getCurrent() {
    return this.captures[this.currentIndex] || null;
  }

  next() {
    if (this.currentIndex < this.captures.length - 1) {
      this.currentIndex++;
      return this.getCurrent();
    }
    return null;
  }

  prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      return this.getCurrent();
    }
    return null;
  }

  exportCSV() {
    const headers = ["ID", "Timestamp", "Layout", "Guest Name", "Guest Email", "Consent"];
    const rows = this.captures.map((cap) => [
      cap.id,
      new Date(cap.createdAt).toLocaleString(),
      cap.layout,
      cap.guestName || "",
      cap.guestEmail || "",
      cap.consent ? "Yes" : "No",
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    return csv;
  }

  downloadCSV(eventName) {
    const csv = this.exportCSV();
    const link = document.createElement("a");
    link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    link.download = `${eventName.replace(/\s+/g, "-").toLowerCase()}-guests.csv`;
    link.click();
  }
}

window.GalleryManager = GalleryManager;
