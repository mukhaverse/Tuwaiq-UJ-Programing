// Site-wide copy for the track (name, tagline, semester, intro), loaded from
// the database at startup (see content.js).
//
//   club, name, short, tagline, semester
//   intro  printed in the hero terminal as the answer to `whatis this-site`
export let track = {};

export function setTrack(value) {
  track = value;
}
