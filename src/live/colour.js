import { palette } from "../lib/palette";

/** A member's colour on the board: their character's body colour. */
export const colourOf = (member) => palette[member.avatar.body] ?? palette.sky;
