if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("/static/sw.js")
      .then(() => console.log("SAIVEX PWA service worker registered"))
      .catch(error => console.log("Service worker failed:", error));
  });
}
