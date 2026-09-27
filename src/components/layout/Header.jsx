import { track } from "../../data/track";
import "./Layout.css";

const links = [
  { href: "#members", label: "Members" },
  { href: "#playground", label: "Playground" },
  { href: "#journey", label: "Journey" },
];

export function LogoMark() {
  return (
    <svg viewBox="0 0 64 64" className="logo__mark" aria-hidden="true">
      <rect x="3" y="3" width="58" height="58" rx="14" fill="var(--accent)" stroke="var(--ink)" strokeWidth="4" />
      <path
        d="M22 22 12 32l10 10M42 22l10 10-10 10M36 18l-8 28"
        fill="none"
        stroke="var(--cream)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Header() {
  return (
    <header className="header">
      <div className="wrap header__inner">
        <a href="#top" className="logo" aria-label={`${track.name} home`}>
          <LogoMark />
          <span className="logo__word">{track.name}</span>
        </a>
        <nav className="header__links" aria-label="Main">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="header__link mono">
              {l.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
