// Loads all site content from the API in one request and hands it to the data
// modules. main.jsx waits for this before rendering, so components can read
// `members`, `track`, … synchronously, as plain imports.
import { setAnnouncement } from "./announcement";
import { setBadges } from "./badges";
import { setMembers } from "./members";
import { setMilestones } from "./milestones";
import { setTrack } from "./track";

export async function loadContent() {
  // index.html preloads this URL, so the request is usually already in flight.
  const res = await fetch("/api/content");
  if (!res.ok) throw new Error(`Content request failed: ${res.status}`);
  const data = await res.json();
  setTrack(data.track);
  setAnnouncement(data.announcement);
  setMilestones(data.milestones);
  setBadges(data.badges);
  setMembers(data.members);
}
