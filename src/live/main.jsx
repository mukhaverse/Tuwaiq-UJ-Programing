// The live board's own page (/live/, see vite.config.js): it doesn't load the main site.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import LiveApp from "./LiveApp";
import "./live.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LiveApp />
  </StrictMode>
);
