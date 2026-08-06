import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const root = createRoot(document.getElementById("root"));
// Note: StrictMode removed — it double-mounts components in dev which destroys the WebSocket
root.render(
  <App />
);
