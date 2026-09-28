import { track } from "../../data/track";
import Mountain from "../brand/Mountain";
import "./Layout.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer__inner">
        <span className="footer__brand">
          <span className="logo__mark">
            <Mountain />
          </span>
          {track.name}
        </span>
        <span className="mono">
          {track.club} · {track.semester}
        </span>
      </div>
    </footer>
  );
}
