import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import "./styles/global.css";
import App from "./App.jsx";
import { loadContent } from "./data/content";

const root = createRoot(document.getElementById("root"));

// Content comes from the API; render once it's in.
loadContent()
  .then(() => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  })
  .catch((err) => {
    console.error(err);
    root.render(
      <main className="load-error">
        <p className="mono">Couldn't load the site.</p>
        <p>Check your connection and refresh the page.</p>
      </main>
    );
  });
