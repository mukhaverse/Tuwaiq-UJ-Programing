import { track } from "../../data/track";
import { LogoMark } from "./Header";
import "./Layout.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer__inner">
        <span className="footer__brand">
          <LogoMark />
          {track.name}
        </span>
        <span className="mono">
          {track.club} · {track.semester}
        </span>
      </div>
    </footer>
  );
}
