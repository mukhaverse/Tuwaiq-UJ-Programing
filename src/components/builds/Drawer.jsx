import { useState } from "react";
import { members, shortName } from "../../data/members";
import { monthOf } from "../../data/projects";
import { color } from "../../lib/palette";
import Character from "../character/Character";
import { hueOf, hueVars, stickerOf } from "./hue";

// Tabs sit at staggered spots along the folder tops, like a real filing drawer.
const TAB_SPOTS = ["0%", "34%", "62%"];

/* Everything shipped, filed as folders in an open drawer. Pick one to pull it up:
   what it was, who it was for, who built it, and when. */
export default function Drawer({ builds }) {
  const [open, setOpen] = useState(null);
  // Oldest at the back (top), newest at the front.
  const filed = [...builds].reverse();

  return (
    <div className="cabinet">
      <ul className="cabinet__inside">
        {filed.map((b, i) => (
          <Folder key={b.id} build={b} tab={TAB_SPOTS[i % TAB_SPOTS.length]} open={open === b.id} onToggle={() => setOpen(open === b.id ? null : b.id)} />
        ))}
        {!filed.length && <li className="cabinet__empty mono">empty, for now. The first thing we ship gets filed here.</li>}
      </ul>
      <div className="cabinet__front">
        <span className="cabinet__label mono">
          Shipped · {String(builds.length).padStart(2, "0")}
        </span>
        <span className="cabinet__handle" aria-hidden="true" />
      </div>
    </div>
  );
}

function Folder({ build, tab, open, onToggle }) {
  const crew = members.filter((m) => build.members.includes(m.id));
  const id = `folder-${build.id}`;
  return (
    <li className={`folder${open ? " is-open" : ""}`} style={{ ...hueVars(hueOf(build)), "--tab": tab }}>
      <button type="button" className="folder__tab" onClick={onToggle} aria-expanded={open} aria-controls={id}>
        <span className="folder__name">{build.title}</span>
      </button>
      <div className="folder__body">
        <div className="folder__more" id={id}>
          <div className="folder__sheet">
            <span className="folder__sticker mono">{stickerOf(build)}</span>
            <p className="folder__title display">{build.title}</p>
            {crew.length > 0 && (
              <p className="folder__crew">
                {crew.map((m) => (
                  <span key={m.id} className="folder__mate" title={shortName(m)}>
                    <Character type={m.avatar.char} body={color(m.avatar.body)} />
                    <span className="sr-only">{shortName(m)}</span>
                  </span>
                ))}
              </p>
            )}
            <p className="folder__stamp mono">Shipped · {monthOf(build.finishedAt ?? build.updatedAt)}</p>
          </div>
        </div>
      </div>
    </li>
  );
}
