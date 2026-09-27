import { color, textOn } from "../../lib/palette";
import "./Badge.css";

// Hexagonal chip outline, with a dashed inner ring.
const HEX = "M50 4L90 27V73L50 96L10 73V27Z";
const HEX_INNER = "M50 17L79 34V66L50 83L21 66V34Z";

/* The badge graphic itself. `size` is any CSS length. */
export function BadgeMark({ badge, size = "2.2rem" }) {
  return (
    <svg viewBox="0 0 100 100" className="badge-mark" style={{ width: size }} aria-hidden="true">
      <path d={HEX} fill={color(badge.color)} stroke="var(--ink)" strokeWidth="5" strokeLinejoin="round" />
      <path d={HEX_INNER} fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeDasharray="4 4" opacity=".55" />
      <text x="50" y="51" textAnchor="middle" dominantBaseline="central" fill={textOn(badge.color)}>
        {badge.glyph}
      </text>
    </svg>
  );
}

/* A badge with its name and description, as shown on a member's profile. */
export default function Badge({ badge }) {
  return (
    <div className="badge">
      <BadgeMark badge={badge} size="3.4rem" />
      <div>
        <p className="badge__name">{badge.name}</p>
        <p className="badge__desc">{badge.description}</p>
      </div>
    </div>
  );
}
