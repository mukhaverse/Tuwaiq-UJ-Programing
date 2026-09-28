// The track roster, from programming_track_members.xlsx (phone numbers and
// emails are left out on purpose — this site is public). Add a member by
// copying one entry and editing it.
//
//   id       unique, URL-safe slug (used in links like #member/shumokh)
//   name     full name, exactly as the member wrote it — shown on their profile
//   short    (optional) card name, if "first + last word" gets it wrong
//   role     "leader" | "co-leader" | "member" (leaders get their own card hue)
//   major    what they study
//   year     academic year, 1–5 (the member filters are built from these)
//   bio      (optional) one or two sentences — profiles say "coming soon" until it's filled
//   quote    (optional) what their character says on the playground board
//   avatar   their character:
//              char  blob | star | ghost | robot | cat | cloud | mushroom | flower | monitor
//                    (sun and planet belong to the leader and co-leader)
//              body  character colour, any palette key in lib/palette.js
//   badges   list of badge ids from badges.js
export const members = [
  {
    id: "shumokh",
    name: "شموخ مشاري الشريف",
    role: "leader",
    major: "Software Engineering",
    year: 5,
    avatar: { char: "sun", body: "butter" },
    badges: [],
  },
  {
    id: "remas",
    name: "ريماس نافع عواض السلمي",
    role: "co-leader",
    major: "Software Engineering",
    year: 5,
    avatar: { char: "planet", body: "blush" },
    badges: [],
  },
  {
    id: "ibrahim-abualghaith",
    name: "ابراهيم عيسى ابراهيم ابو الغيث",
    short: "ابراهيم ابو الغيث",
    role: "member",
    major: "Software Engineering",
    year: 5,
    avatar: { char: "blob", body: "plum" },
    badges: [],
  },
  {
    id: "sarah-alzahrani",
    name: "ساره منصور الزهراني",
    role: "member",
    major: "Software Engineering",
    year: 5,
    avatar: { char: "mushroom", body: "sky" },
    badges: [],
  },
  {
    id: "ramas-badr",
    name: "رماس رأفت بدر",
    role: "member",
    major: "Software Engineering",
    year: 4,
    avatar: { char: "star", body: "butter" },
    badges: [],
  },
  {
    id: "joory-alharbi",
    name: "جوري فايز الحربي",
    role: "member",
    major: "Software Engineering",
    year: 5,
    avatar: { char: "ghost", body: "cream" },
    badges: [],
  },
  {
    id: "wesal-ali",
    name: "وصال اسماعيل ادم علي",
    role: "member",
    major: "Software Engineering",
    year: 4,
    avatar: { char: "flower", body: "mint" },
    badges: [],
  },
  {
    id: "yamam-alkhamesi",
    name: "يمام حامد الخميسي",
    role: "member",
    major: "Software Engineering",
    year: 4,
    avatar: { char: "robot", body: "blush" },
    badges: [],
  },
  {
    id: "farah-alnajjarin",
    name: "فرح جهاد شيخ النجارين",
    role: "member",
    major: "Software Engineering",
    year: 3,
    avatar: { char: "cat", body: "tomato" },
    badges: [],
  },
  {
    id: "diala-alosaimi",
    name: "ديالا خالد العصيمي",
    role: "member",
    major: "Media",
    year: 4,
    avatar: { char: "monitor", body: "plum" },
    badges: [],
  },
  {
    id: "joury-almutairi",
    name: "جوري فيصل المطيري",
    role: "member",
    major: "Software Engineering",
    year: 5,
    avatar: { char: "cloud", body: "sky" },
    badges: [],
  },
  {
    id: "marwa-haddadi",
    name: "مروى علي حدادي",
    role: "member",
    major: "Software Engineering",
    year: 5,
    avatar: { char: "blob", body: "tomato" },
    badges: ["first-meeting", "helping-hand"],
  },
  {
    id: "hassna-alharbi",
    name: "Hassna Abdulaziz Alharbi",
    role: "member",
    major: "Software Engineering",
    year: 4,
    avatar: { char: "mushroom", body: "plum" },
    badges: [],
  },
  {
    id: "asma-aljadani",
    name: "أسماء حماد الجدعاني",
    role: "member",
    major: "Computer Science",
    year: 5,
    avatar: { char: "star", body: "sky" },
    badges: [],
  },
  {
    id: "mayar-alalwan",
    name: "ميار عماد العلوان",
    role: "member",
    major: "Software Engineering",
    year: 3,
    avatar: { char: "ghost", body: "butter" },
    badges: [],
  },
  {
    id: "haya-alothman",
    name: "Haya Abdulaziz Alothman",
    role: "member",
    major: "Software Engineering",
    year: 2,
    avatar: { char: "flower", body: "cream" },
    badges: [],
  },
  {
    id: "khalid-alzabin",
    name: "Khalid Waleed Farouq Alzabin",
    role: "member",
    major: "Electrical Engineering",
    year: 2,
    avatar: { char: "robot", body: "mint" },
    badges: [],
  },
  {
    id: "sadeem-alsulami",
    name: "سديم عايض السلمي",
    role: "member",
    major: "Software Engineering",
    year: 4,
    avatar: { char: "cat", body: "blush" },
    badges: ["first-meeting"],
  },
  {
    id: "ritaj-alharthi",
    name: "ريتاج سعد الحارثي",
    role: "member",
    major: "Computer Engineering",
    year: 3,
    avatar: { char: "monitor", body: "tomato" },
    badges: [],
  },
  {
    id: "osama-alghamdi",
    name: "اسامه احمد سعيد الغامدي",
    role: "member",
    major: "Software Engineering",
    year: 5,
    avatar: { char: "cloud", body: "plum" },
    badges: [],
  },
  {
    id: "khadijah-alamoudi",
    name: "خديجة علي العمودي",
    role: "member",
    major: "Software Engineering",
    year: 4,
    avatar: { char: "blob", body: "blush" },
    badges: [],
  },
  {
    id: "yara-omran",
    name: "يارا عبدالرؤوف محمود عمران",
    role: "member",
    major: "Computer Engineering",
    year: 1,
    avatar: { char: "mushroom", body: "tomato" },
    badges: [],
  },
  {
    id: "jori-baharith",
    name: "جوري عمر باحارث",
    role: "member",
    major: "Artificial Intelligence",
    year: 2,
    avatar: { char: "star", body: "plum" },
    badges: [],
  },
  {
    id: "hadeel-banat",
    name: "هديل زكي بنات",
    role: "member",
    major: "Software Engineering",
    year: 3,
    avatar: { char: "ghost", body: "sky" },
    badges: [],
  },
  {
    id: "layal-mohammed",
    name: "ليال عبدالرحمن محمد",
    role: "member",
    major: "Software Engineering",
    year: 5,
    avatar: { char: "flower", body: "tomato" },
    badges: [],
  },
  {
    id: "mohammad-sweed",
    name: "محمد مهند سويد",
    role: "member",
    major: "Software Engineering",
    year: 3,
    avatar: { char: "robot", body: "cream" },
    badges: [],
  },
  {
    id: "dalia-handoum",
    name: "داليا هندوم",
    role: "member",
    major: "Software Engineering",
    year: 5,
    avatar: { char: "cat", body: "mint" },
    badges: [],
  },
  {
    id: "rahaf-alrashidi",
    name: "رهف مطر الرشيدي",
    role: "member",
    major: "Software Engineering",
    year: 3,
    avatar: { char: "monitor", body: "blush" },
    badges: [],
  },
  {
    id: "jana-aljadani",
    name: "جنى بدر الجدعاني",
    role: "member",
    major: "Software Engineering",
    year: 2,
    avatar: { char: "cloud", body: "tomato" },
    badges: [],
  },
  {
    id: "reuof-alarishi",
    name: "ريوف عبدالوهاب العريشي",
    role: "member",
    major: "Software Engineering",
    year: 2,
    avatar: { char: "blob", body: "mint" },
    badges: [],
  },
];

const ORDINAL = ["", "1st", "2nd", "3rd", "4th", "5th", "6th"];

export function yearLabel(year) {
  return `${ORDINAL[year] ?? year} year`;
}

export const roleLabel = { leader: "Leader", "co-leader": "Co-Leader", member: "Member" };

// First and last name, for cards and tags; profiles show the full name.
// A member's `short` overrides it where the last word alone is wrong
// (e.g. a family name in two words, like "ابو الغيث").
export function shortName(member) {
  if (member.short) return member.short;
  const words = member.name.split(" ");
  return words.length > 2 ? `${words[0]} ${words.at(-1)}` : member.name;
}

// Names are in Arabic or English, as each member wrote them. Tagging the Arabic
// ones lets CSS give them an Arabic font and drop letter-spacing (which breaks
// the joins between Arabic letters).
export function nameLang(name) {
  return /[\u0600-\u06FF]/.test(name) ? "ar" : undefined;
}

export function getMember(id) {
  return members.find((m) => m.id === id);
}
