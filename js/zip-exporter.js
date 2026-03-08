/**
 * ZIP export utility using JSZip for bundling captures
 * Load JSZip library first: <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
 */

class ZipExporter {
  constructor(eventName) {
    this.eventName = eventName || "photo-session";
    this.zip = new JSZip();
  }

  addImageFile(fileName, dataUrl) {
    const base64 = dataUrl.split(",")[1];
    if (base64) {
      this.zip.file(`images/${fileName}`, base64, { base64: true });
    }
  }

  addTextFile(fileName, content) {
    this.zip.file(fileName, content);
  }

  async generateBlob() {
    return await this.zip.generateAsync({ type: "blob" });
  }

  async download() {
    const blob = await this.generateBlob();
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().split("T")[0];
    link.href = URL.createObjectURL(blob);
    link.download = `${this.eventName}-${timestamp}.zip`;
    link.click();
    URL.revokeObjectURL(link.href);
  }
}

window.ZipExporter = ZipExporter;
