(async function loadVersionBadge() {
  const buildEl = document.getElementById("buildVersion");
  const rangeEl = document.getElementById("pushRange");

  if (!buildEl || !rangeEl) {
    return;
  }

  try {
    const response = await fetch("version.json", { cache: "no-store" });
    if (!response.ok) {
      return;
    }

    const version = await response.json();
    if (typeof version.build === "string" && version.build.trim()) {
      buildEl.textContent = version.build;
    }

    if (typeof version.pushRange === "string" && version.pushRange.trim()) {
      rangeEl.textContent = version.pushRange;
    }
  } catch {
    // Keep inline fallback values if version.json cannot be loaded.
  }
})();
