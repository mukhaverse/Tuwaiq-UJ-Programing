// Colours and labels for builds on the PT-OS desktop.
import { getTrack, isCollab } from "../../data/projects";
import { inkOn } from "../../lib/palette";

// Our own projects are violet (--violet in tokens.css); collaborations take their
// track's colour. The shipped folder is cyan (--cyan).
export const VIOLET = "#a380ff";
export const CYAN = "#57e3d8";

export const hueOf = (build) => (isCollab(build) ? getTrack(build.trackId).color : VIOLET);

/** --hue and the text colour that reads on it, as inline style. */
export const hueVars = (hex) => ({ "--hue": hex, "--hue-ink": inkOn(hex) });

/** What a build is, in a few words: "collab · Media", "project · for the club"… */
export function labelOf(build) {
  if (isCollab(build)) return `collab · ${getTrack(build.trackId).name}`;
  return build.forLabel ? `project · for ${build.forLabel}` : "project";
}
