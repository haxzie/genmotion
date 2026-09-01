import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Side-effect import: teaches the chat's tool cards this harness's vocabulary.
import "./tool-presentation";
import "./composer-accessory";
import { App } from "./App";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("missing #root");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
