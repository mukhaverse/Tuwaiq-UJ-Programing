// Entry point of the admin page (its own HTML file, see vite.config.js), so the
// public site's bundle never contains or links to the admin panel.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../styles/tokens.css";
import "../styles/global.css";
import { loadContent } from "../data/content";
import AdminApp from "./AdminApp";

const root = createRoot(document.getElementById("root"));

// Some shared helpers (member names, badges) read the site content, so load it first.
loadContent()
  .catch((err) => console.error(err))
  .finally(() =>
    root.render(
      <StrictMode>
        <AdminApp />
      </StrictMode>
    )
  );
