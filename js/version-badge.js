(async function loadVersionBadge() {
  const versionEl = document.getElementById("appVersion");
  const rangeEl = document.getElementById("pushRange");

  if (!versionEl || !rangeEl) {
    return;
  }

  try {
    const response = await fetch("version.json", { cache: "no-store" });
    if (!response.ok) {
      return;
    }

    const payload = await response.json();
    const resolvedVersion = payload.version || payload.build;

    if (typeof resolvedVersion === "string" && resolvedVersion.trim()) {
      versionEl.textContent = resolvedVersion;
    }

    if (typeof payload.pushRange === "string" && payload.pushRange.trim()) {
      rangeEl.textContent = payload.pushRange;
    }
  } catch {
    // Keep inline fallback values if version.json cannot be loaded.
  }
})();
