# Photo Active Booth

A browser-based event photo booth platform foundation with two web interfaces:

- `admin.html` for event setup and live event control
- `kiosk.html` for guest capture flow

## MVP Features (Current Branch)

- Camera capture via `getUserMedia` in kiosk mode.
- Event builder in admin mode with event type, gallery visibility, branding color, and capture mode toggles.
- Live event selector (`Go Live`) that drives kiosk behavior.
- Capture modes: single photo and 4-photo strip.
- Guest metadata fields (name, email, consent) captured locally as share queue stubs.
- Event and capture records stored in browser `localStorage`.
- Download output as PNG.

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

## App Routes

- `http://localhost:5500/index.html` - launcher
- `http://localhost:5500/admin.html` - admin setup
- `http://localhost:5500/kiosk.html` - guest kiosk (uses live event)

Typical local flow:

1. Open `admin.html` and create at least one event.
2. Click `Set Live` on that event.
3. Open `kiosk.html` and start camera capture.

## Notes

- For production, host this over HTTPS.
- On iOS Safari, camera usage requires a direct user interaction (already handled by Start Camera button).
- If multiple cameras exist, grant permission first so labels/device list populate.

## Publish to the Web (GitHub Pages)

This repository uses `.github/workflows/deploy-gh-pages-branch.yml` to publish static files to the `gh-pages` branch.

1. Open your repository settings:
	- `https://github.com/fitzgr/photo.active/settings/pages`
2. Run or wait for the deploy workflow in the **Actions** tab.
3. In Pages settings, set source to `Deploy from a branch` using `gh-pages` and `/ (root)`.
4. Wait until Pages finishes provisioning.

Expected live URL:

- `https://fitzgr.github.io/photo.active/`

If the page shows old content, hard refresh (`Ctrl+F5`) after deployment.
