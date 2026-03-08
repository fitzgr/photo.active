/**
 * GIF Encoder Library
 * Simple synchronous GIF generation from canvas frames
 * Uses a basic LZW-style compression for small file sizes
 */

(function() {
  "use strict";

  const GifEncoder = function(width, height, delay = 100) {
    this.width = width;
    this.height = height;
    this.delay = delay;
    this.frames = [];
    this.palette = null;
  };

  GifEncoder.prototype.addFrame = function(canvas) {
    const ctx = canvas.getContext("2d");
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    this.frames.push(imageData);
    return this;
  };

  GifEncoder.prototype.render = function() {
    if (this.frames.length === 0) {
      throw new Error("No frames to render");
    }

    const gif = new GIFEncoder(this.width, this.height);
    gif.setDelay(this.delay);
    gif.setRepeat(0);
    gif.start();

    for (const frame of this.frames) {
      gif.addFrame(this._imageDataToCanvas(frame));
    }

    gif.finish();
    const binaryString = gif.stream().getData();
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return new Blob([bytes], { type: "image/gif" });
  };

  GifEncoder.prototype._imageDataToCanvas = function(imageData) {
    const canvas = document.createElement("canvas");
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext("2d");
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  };

  window.GifEncoder = GifEncoder;
})();
