/**
 * Simple video recording and playback using MediaRecorder API
 * Compatible with modern browsers
 */

class VideoRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.stream = null;
  }

  async startRecording(stream, videoBitsPerSecond = 2500000) {
    this.stream = stream;
    this.recordedChunks = [];

    const options = {
      audioBitsPerSecond: 0,
      videoBitsPerSecond,
      mimeType: this._getSupportedMimeType(),
    };

    this.mediaRecorder = new MediaRecorder(stream, options);

    if (!options.mimeType) {
      throw new Error("No supported video codec in this browser");
    }

    return new Promise((resolve, reject) => {
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onerror = (event) => {
        reject(new Error(`Recording error: ${event.error}`));
      };

      this.mediaRecorder.start();
      resolve();
    });
  }

  stopRecording() {
    return new Promise((resolve) => {
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, {
          type: this.mediaRecorder.mimeType,
        });
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  _getSupportedMimeType() {
    const types = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
      "video/mp4",
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return null;
  }
}

window.VideoRecorder = VideoRecorder;
