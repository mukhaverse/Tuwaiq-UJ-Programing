// The purple "Up next" tile in the members grid, loaded from the database at
// startup (see content.js). null hides the tile.
//
//   eyebrow   small label next to the live dot, e.g. "Up next · Survey"
//   big       1–3 characters printed huge behind the tile
//   title, body
//   ctaLabel, ctaUrl   the button; links to other sites open in a new tab
//   passLabel, passImage   a second button that opens an entry barcode (an uploaded
//                          image); with no image yet it says the barcode is coming
export let announcement = null;

export function setAnnouncement(value) {
  announcement = value;
}
