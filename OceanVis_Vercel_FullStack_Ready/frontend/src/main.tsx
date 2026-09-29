import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Hide splash screen when React app is ready
function hideSplash() {
  const splash = document.getElementById("splash");
  if (splash) {
    splash.classList.add("hidden");
    setTimeout(() => splash.remove(), 700);
  }
}

const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <App onReady={hideSplash} />
  </React.StrictMode>
);
