// Colours and labels shared by the TV and the drawer.
import { getTrack, isCollab } from "../../data/projects";
import { inkOn } from "../../lib/palette";

// Our own projects glow violet (--violet in tokens.css); collaborations take their track's colour.
export const VIOLET = "#a380ff";

export const hueOf = (build) => (isCollab(build) ? getTrack(build.trackId).color : VIOLET);

/** --hue and the text colour that reads on it, as inline style. */
export const hueVars = (hex) => ({ "--hue": hex, "--hue-ink": inkOn(hex) });

/** The label stuck on a build: "collab × Media", "project · for the club"… */
export function stickerOf(build) {
  if (isCollab(build)) return `collab × ${getTrack(build.trackId).name}`;
  return build.forLabel ? `project · for ${build.forLabel}` : "project";
}
