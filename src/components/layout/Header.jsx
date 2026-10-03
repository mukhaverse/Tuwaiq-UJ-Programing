import { motion } from "motion/react";
import { track } from "../../data/track";
import Mountain from "../brand/Mountain";
import "./Layout.css";

// `minor` links are dropped on phones, where all of them don't fit next to the logo.
const links = [
  { href: "#members", label: "Members" },
  { href: "#journey", label: "Journey" },
  { href: "#builds", label: "Builds" },
  { href: "#playground", label: "Playground", minor: true },
];

/* While the splash plays, the header is bare and its mark is an empty slot; when
   it ends the mark mounts with the splash mountain's layoutId and flies in. */
export default function Header({ booting = false }) {
  return (
    <header className={`header ${booting ? "is-booting" : ""}`}>
      <div className="wrap header__inner">
        <a href="#top" className="logo" aria-label={`${track.name}, ${track.club}: home`}>
          {booting ? (
            <span className="logo__mark" />
          ) : (
            <motion.span
              layoutId="brand-mountain"
              className="logo__mark"
              transition={{ type: "spring", stiffness: 110, damping: 19 }}
            >
              <Mountain />
            </motion.span>
          )}
          <img
            className="logo__word"
            src={`${import.meta.env.BASE_URL}brand/tuwaiq-club-mark.png`}
            alt=""
            width="248"
            height="173"
          />
        </a>
        <nav className="header__links" aria-label="Main">
          {links.map((l) => (
            <a key={l.href} href={l.href} className={`header__link mono${l.minor ? " header__link--minor" : ""}`}>
              {l.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
