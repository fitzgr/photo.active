# Photo Active Booth

A browser-based photo booth web app inspired by event booth experiences.

## Features

- Uses the device built-in camera via `getUserMedia`.
- Works in modern desktop and mobile browsers.
- Timer-based capture (`0`, `3`, `5`, `10` seconds).
- Single photo mode and 4-photo strip mode.
- Basic live filters.
- Download final image as PNG.
- Camera selector and lens switch support.

## Run

You can open `index.html` directly, but camera access usually requires **HTTPS** or **localhost** in most browsers.

### Option 1: VS Code Live Server

1. Install the `Live Server` extension.
2. Right-click `index.html` and choose **Open with Live Server**.

### Option 2: Python simple server

```bash
python -m http.server 5500
```

Then open `http://localhost:5500` in your browser.

## Notes

- For production, host this over HTTPS.
- On iOS Safari, camera usage requires a direct user interaction (already handled by Start Camera button).
- If multiple cameras exist, grant permission first so labels/device list populate.
