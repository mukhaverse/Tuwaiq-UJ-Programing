// The track roster. Add a member by copying one entry and editing it.
// These are sample members — replace them with the real roster.
//
//   id       unique, URL-safe slug (used in links like #member/sara-ali)
//   name     display name
//   role     e.g. "Member", "Track Lead"
//   year     academic year / level (the member filters are built from these)
//   focus    what they're into right now
//   language favourite language
//   bio      one or two sentences, shown on their profile
//   quote    what their character says on the playground board
//   avatar   their character:
//              char  blob | star | ghost | robot | cat | cloud
//              body  character colour, any palette key in lib/palette.js
//   badges   list of badge ids from badges.js
export const members = [
  {
    id: "sara-ali",
    name: "Sara Ali",
    role: "Track Lead",
    year: "4th year",
    focus: "Backend & APIs",
    language: "Go",
    bio: "Runs the meetings and keeps the snacks-to-bugs ratio healthy.",
    quote: "Did everyone push their code?",
    avatar: { char: "robot", body: "sky" },
    badges: ["first-meeting"],
  },
  {
    id: "omar-hassan",
    name: "Omar Hassan",
    role: "Member",
    year: "2nd year",
    focus: "Web frontends",
    language: "TypeScript",
    bio: "Will turn any idea into a landing page within the hour.",
    quote: "Just one more CSS tweak…",
    avatar: { char: "blob", body: "plum" },
    badges: ["first-meeting"],
  },
  {
    id: "lina-khaled",
    name: "Lina Khaled",
    role: "Member",
    year: "3rd year",
    focus: "Competitive programming",
    language: "C++",
    bio: "Solves problems faster than she can read them out loud.",
    quote: "O(n log n) or bust.",
    avatar: { char: "star", body: "butter" },
    badges: ["first-meeting"],
  },
  {
    id: "yusuf-karim",
    name: "Yusuf Karim",
    role: "Member",
    year: "1st year",
    focus: "Learning the basics",
    language: "Python",
    bio: "Brand new to programming and asking all the right questions.",
    quote: "Wait, why is it called a bug?",
    avatar: { char: "cloud", body: "cream" },
    badges: ["first-meeting"],
  },
  {
    id: "noor-saleh",
    name: "Noor Saleh",
    role: "Member",
    year: "2nd year",
    focus: "Mobile apps",
    language: "Kotlin",
    bio: "Building a habit tracker she actually uses.",
    quote: "There's an app for that. I'm making it.",
    avatar: { char: "cat", body: "butter" },
    badges: ["first-meeting"],
  },
  {
    id: "adam-farouk",
    name: "Adam Farouk",
    role: "Member",
    year: "3rd year",
    focus: "Game dev",
    language: "C#",
    bio: "Has three unfinished games and a plan for a fourth.",
    quote: "It's not a bug, it's a game mechanic.",
    avatar: { char: "ghost", body: "cream" },
    badges: ["first-meeting"],
  },
  {
    id: "maya-rahman",
    name: "Maya Rahman",
    role: "Member",
    year: "1st year",
    focus: "Data & scripting",
    language: "Python",
    bio: "Automates anything she has to do more than twice.",
    quote: "I wrote a script for that.",
    avatar: { char: "blob", body: "tomato" },
    badges: ["first-meeting"],
  },
  {
    id: "zaid-nasser",
    name: "Zaid Nasser",
    role: "Member",
    year: "2nd year",
    focus: "Systems & Linux",
    language: "Rust",
    bio: "Joined after the first meeting — already configuring everyone's terminals.",
    quote: "Have you tried it in the terminal?",
    avatar: { char: "robot", body: "mint" },
    badges: [],
  },
];

export function getMember(id) {
  return members.find((m) => m.id === id);
}
