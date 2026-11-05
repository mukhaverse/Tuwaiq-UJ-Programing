import { palette as c } from "../../lib/palette";
import { Eye } from "./Character";

/* The committee characters (their ids and names are in src/data/crew.ts), drawn on
   the same 200×200 canvas as the members' shapes. They stand on the dark board, so a
   line with nothing behind it needs a colour inside its outline: that's Pole. */

const INK = c.ink;
const S = { stroke: INK, strokeWidth: 4.5, strokeLinejoin: "round", strokeLinecap: "round" };
// Colours only these objects use.
const ORANGE = "#f4a664";
const VIOLET = "#a380ff";
const CARDBOARD = "#d9a066";
const STEEL = "#5b5670";
const CHARCOAL = "#38334a";
const SILVER = "#d9d6e3";
const GLASS = "#4f29b7";

function Smile({ x1, y, x2, dip = 14, colour = INK }) {
  return <path d={`M${x1} ${y}Q${(x1 + x2) / 2} ${y + dip} ${x2} ${y}`} fill="none" stroke={colour} strokeWidth="4.5" strokeLinecap="round" />;
}

function Pole({ d, colour, w = 5 }) {
  const line = { d, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" };
  return (
    <>
      <path {...line} stroke={INK} strokeWidth={w + 8} />
      <path {...line} stroke={colour} strokeWidth={w} />
    </>
  );
}

function Label({ x, y, size, fill, children }) {
  return (
    <text x={x} y={y} textAnchor="middle" fill={fill} fontFamily="JetBrains Mono, monospace" fontWeight="700" fontSize={size}>
      {children}
    </text>
  );
}

const shapes = {
  /* Operations: event management */
  calendar: (d) => (
    <>
      <rect x="28" y="36" width="144" height="146" rx="16" fill={c.cream} {...S} />
      <path d="M28 78V52Q28 36 44 36H156Q172 36 172 52V78Z" fill={ORANGE} {...S} />
      <rect x="58" y="18" width="14" height="34" rx="7" fill={c.snow} {...S} strokeWidth={4} />
      <rect x="128" y="18" width="14" height="34" rx="7" fill={c.snow} {...S} strokeWidth={4} />
      <Eye cx={74} cy={106} r={15} delay={d} />
      <Eye cx={126} cy={106} r={15} delay={d} />
      <Smile x1={86} y={130} x2={114} dip={12} />
      <rect x="44" y="154" width="20" height="16" rx="4" fill={INK} opacity=".2" />
      <rect x="72" y="154" width="20" height="16" rx="4" fill={INK} opacity=".2" />
      <rect x="100" y="154" width="20" height="16" rx="4" fill={INK} opacity=".2" />
      <rect x="128" y="152" width="24" height="20" rx="5" fill={c.tomato} {...S} strokeWidth={3.5} />
    </>
  ),
  "staff-pass": (d) => (
    <>
      <Pole d="M66 8L100 54L134 8" colour={c.tomato} />
      <rect x="42" y="52" width="116" height="136" rx="14" fill={VIOLET} {...S} />
      <rect x="86" y="60" width="28" height="8" rx="4" fill={INK} />
      <Eye cx={78} cy={100} r={15} delay={d} />
      <Eye cx={122} cy={100} r={15} delay={d} />
      <Smile x1={88} y={124} x2={112} dip={10} />
      <rect x="56" y="150" width="88" height="24" rx="6" fill={INK} />
      <Label x={100} y={168} size={16} fill={c.cream}>
        CREW
      </Label>
    </>
  ),
  "check-in": (d) => (
    <>
      <rect x="22" y="30" width="156" height="136" rx="16" fill={c.sky} {...S} />
      <rect x="36" y="44" width="128" height="108" rx="6" fill={c.snow} {...S} strokeWidth={3.5} />
      <Eye cx={80} cy={78} r={14} delay={d} />
      <Eye cx={120} cy={78} r={14} delay={d} />
      <Smile x1={88} y={102} x2={112} dip={10} />
      <path d="M48 120h10v10h-10zM64 120h10v10h-10zM48 136h10v10h-10zM66 138h8v8h-8z" fill={INK} />
      <circle cx="150" cy="146" r="26" fill={c.mint} {...S} />
      <path d="M138 146l9 10l16 -19" fill="none" {...S} strokeWidth={5.5} />
    </>
  ),
  banner: (d) => (
    <>
      <rect x="56" y="20" width="88" height="152" fill={VIOLET} {...S} />
      <rect x="46" y="12" width="108" height="14" rx="7" fill={c.snow} {...S} strokeWidth={4} />
      <rect x="34" y="168" width="132" height="16" rx="8" fill={c.snow} {...S} strokeWidth={4} />
      <Eye cx={80} cy={68} r={14} delay={d} />
      <Eye cx={120} cy={68} r={14} delay={d} />
      <Smile x1={88} y={94} x2={112} dip={11} />
      <path d="M70 128H130M70 146H112" stroke={c.cream} strokeWidth="7" strokeLinecap="round" />
    </>
  ),
  tent: (d) => (
    <>
      <Pole d="M100 24V8" colour={c.snow} w={3} />
      <path d="M100 5l18 7l-18 7Z" fill={c.tomato} {...S} strokeWidth={3.5} />
      <rect x="42" y="82" width="116" height="94" fill={c.cream} {...S} />
      <path d="M100 20L176 76H24Z" fill={c.tomato} {...S} />
      <path d="M100 22L64 74H86ZM100 22L114 74H136Z" fill={c.cream} opacity=".9" />
      <path
        d="M24 76H176V84Q166 94 156 84Q146 94 136 84Q126 94 116 84Q106 94 96 84Q86 94 76 84Q66 94 56 84Q46 94 36 84Q30 90 24 84Z"
        fill={c.butter}
        {...S}
        strokeWidth={4}
      />
      <Eye cx={78} cy={122} r={15} delay={d} />
      <Eye cx={122} cy={122} r={15} delay={d} />
      <Smile x1={86} y={150} x2={114} dip={12} />
      <Pole d="M26 180H174" colour={c.snow} w={4} />
    </>
  ),
  // The Arabic coffee pot: hospitality.
  dallah: (d) => (
    <>
      <path d="M78 92Q40 80 18 42Q52 52 82 66Z" fill={c.butter} {...S} />
      <Pole d="M130 70Q178 64 170 122Q166 146 146 150" colour={c.butter} w={6} />
      <path d="M74 78Q56 112 46 150Q42 178 66 182H134Q158 178 154 150Q144 112 126 78Z" fill={c.butter} {...S} />
      <rect x="72" y="62" width="56" height="18" rx="5" fill={c.butter} {...S} strokeWidth={4} />
      <path d="M72 62Q100 26 128 62Z" fill={c.lemon} {...S} />
      <circle cx="100" cy="30" r="8" fill={c.lemon} {...S} strokeWidth={4} />
      <Eye cx={78} cy={116} r={14} delay={d} />
      <Eye cx={122} cy={116} r={14} delay={d} />
      <Smile x1={86} y={142} x2={114} dip={12} />
      <path d="M48 166Q100 176 152 166" fill="none" {...S} strokeWidth={3.5} opacity=".5" />
    </>
  ),
  "gift-bag": (d) => (
    <>
      <Pole d="M72 64Q70 18 100 18Q130 18 128 64" colour={c.bubblegum} />
      <path d="M50 62L62 40L84 56L100 32L118 56L138 40L150 62Z" fill={c.aqua} {...S} strokeWidth={4} />
      <rect x="36" y="60" width="128" height="124" rx="8" fill={c.bubblegum} {...S} />
      <Eye cx={78} cy={106} r={15} delay={d} />
      <Eye cx={122} cy={106} r={15} delay={d} />
      <Smile x1={86} y={134} x2={114} dip={13} />
      <path d="M52 170H148" stroke={INK} strokeWidth="4" strokeLinecap="round" opacity=".35" />
    </>
  ),
  chair: (d) => (
    <>
      <Pole d="M60 134L134 186M140 134L66 186" colour={c.sky} />
      <Pole d="M62 92V116M138 92V116" colour={c.sky} />
      <rect x="46" y="16" width="108" height="80" rx="14" fill={c.sky} {...S} />
      <rect x="36" y="114" width="128" height="20" rx="9" fill={c.sky} {...S} />
      <Eye cx={80} cy={48} r={14} delay={d} />
      <Eye cx={120} cy={48} r={14} delay={d} />
      <Smile x1={88} y={72} x2={112} dip={10} />
    </>
  ),

  /* Operations: industrial engineering */
  "hard-hat": (d) => (
    <>
      <rect x="48" y="104" width="104" height="78" rx="30" fill={c.cream} {...S} />
      <path d="M36 100C36 50 66 26 100 26C134 26 164 50 164 100Z" fill={c.lemon} {...S} />
      <path d="M86 28V72Q100 78 114 72V28" fill={c.lemon} {...S} strokeWidth={4} />
      <rect x="20" y="94" width="160" height="20" rx="10" fill={c.lemon} {...S} />
      <Eye cx={80} cy={138} r={13} delay={d} />
      <Eye cx={120} cy={138} r={13} delay={d} />
      <Smile x1={90} y={162} x2={110} dip={8} />
    </>
  ),
  gear: (d) => (
    <>
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x="86" y="10" width="28" height="40" rx="6" fill={c.sky} {...S} transform={`rotate(${i * 45} 100 100)`} />
      ))}
      <circle cx="100" cy="100" r="66" fill={c.sky} {...S} />
      <circle cx="100" cy="100" r="47" fill={c.cream} {...S} strokeWidth={4} />
      <Eye cx={82} cy={92} r={13} delay={d} />
      <Eye cx={118} cy={92} r={13} delay={d} />
      <Smile x1={88} y={114} x2={112} dip={10} />
    </>
  ),
  factory: (d) => (
    <>
      <circle cx="158" cy="20" r="9" fill={c.snow} {...S} strokeWidth={3.5} />
      <circle cx="174" cy="12" r="6" fill={c.snow} {...S} strokeWidth={3.5} />
      <path d="M24 180V96L66 122V96L108 122V96L144 118V34H172V180Z" fill={ORANGE} {...S} />
      <Eye cx={62} cy={146} r={13} delay={d} />
      <Eye cx={104} cy={146} r={13} delay={d} />
      <Smile x1={72} y={166} x2={94} dip={8} />
      <rect x="132" y="138" width="26" height="42" rx="3" fill={c.sky} {...S} strokeWidth={4} />
    </>
  ),
  conveyor: (d) => (
    <>
      <rect x="52" y="50" width="96" height="96" rx="8" fill={CARDBOARD} {...S} />
      <rect x="88" y="50" width="24" height="24" fill={c.cream} {...S} strokeWidth={3.5} />
      <Eye cx={78} cy={98} r={14} delay={d} />
      <Eye cx={122} cy={98} r={14} delay={d} />
      <Smile x1={86} y={122} x2={114} dip={11} />
      <rect x="12" y="148" width="176" height="34" rx="17" fill={c.mint} {...S} />
      <circle cx="36" cy="165" r="9" fill={c.snow} {...S} strokeWidth={4} />
      <circle cx="100" cy="165" r="9" fill={c.snow} {...S} strokeWidth={4} />
      <circle cx="164" cy="165" r="9" fill={c.snow} {...S} strokeWidth={4} />
    </>
  ),
  forklift: (d) => (
    <>
      <Pole d="M44 86V36H120V86" colour={c.snow} />
      <rect x="26" y="84" width="112" height="76" rx="12" fill={c.lemon} {...S} />
      <Pole d="M152 22V170H190" colour={c.sky} />
      <rect x="158" y="126" width="32" height="38" rx="3" fill={CARDBOARD} {...S} strokeWidth={3.5} />
      <Eye cx={62} cy={112} r={13} delay={d} />
      <Eye cx={104} cy={112} r={13} delay={d} />
      <Smile x1={70} y={136} x2={96} dip={9} />
      <circle cx="54" cy="170" r="18" fill={STEEL} {...S} />
      <circle cx="54" cy="170" r="7" fill={c.snow} />
      <circle cx="114" cy="170" r="18" fill={STEEL} {...S} />
      <circle cx="114" cy="170" r="7" fill={c.snow} />
    </>
  ),
  gantt: (d) => (
    <>
      <rect x="22" y="26" width="156" height="150" rx="12" fill={c.cream} {...S} />
      <Eye cx={76} cy={66} r={15} delay={d} />
      <Eye cx={124} cy={66} r={15} delay={d} />
      <Smile x1={88} y={88} x2={112} dip={10} />
      <rect x="38" y="112" width="58" height="13" rx="4" fill={c.aqua} {...S} strokeWidth={3} />
      <rect x="72" y="131" width="64" height="13" rx="4" fill={ORANGE} {...S} strokeWidth={3} />
      <rect x="112" y="150" width="50" height="13" rx="4" fill={c.mint} {...S} strokeWidth={3} />
    </>
  ),
  stopwatch: (d) => (
    <>
      <rect x="86" y="14" width="28" height="18" rx="6" fill={c.sky} {...S} strokeWidth={4} />
      <rect x="94" y="30" width="12" height="16" fill={c.sky} {...S} strokeWidth={4} />
      <Pole d="M148 44L162 58" colour={c.sky} />
      <circle cx="100" cy="114" r="70" fill={c.sky} {...S} />
      <circle cx="100" cy="114" r="54" fill={c.cream} {...S} strokeWidth={4} />
      <Eye cx={80} cy={104} r={13} delay={d} />
      <Eye cx={120} cy={104} r={13} delay={d} />
      <Smile x1={88} y={134} x2={112} dip={11} />
      <path d="M100 62V72M100 156V166M48 114H58M142 114H152" stroke={INK} strokeWidth="4" strokeLinecap="round" opacity=".5" />
    </>
  ),
  cone: (d) => (
    <>
      <rect x="26" y="160" width="148" height="22" rx="9" fill={ORANGE} {...S} />
      <path d="M86 28Q100 14 114 28L152 166H48Z" fill={ORANGE} {...S} />
      <path d="M77 58H123L128 78H72Z" fill={c.cream} {...S} strokeWidth={4} />
      <Eye cx={80} cy={112} r={13} delay={d} />
      <Eye cx={120} cy={112} r={13} delay={d} />
      <Smile x1={90} y={138} x2={110} dip={10} />
    </>
  ),

  /* Media: photography */
  camera: (d) => (
    <>
      <rect x="146" y="50" width="26" height="24" rx="5" fill={c.tomato} {...S} strokeWidth={4} />
      <path d="M64 74L76 38Q78 32 86 32H110Q118 32 120 38L132 74Z" fill={CHARCOAL} {...S} />
      <rect x="12" y="68" width="176" height="114" rx="22" fill={CHARCOAL} {...S} />
      <path d="M150 68H166Q188 68 188 90V160Q188 182 166 182H150Q140 124 150 68Z" fill={STEEL} {...S} strokeWidth={4} />
      <path d="M166 88V162M176 96V154" stroke={INK} strokeWidth="3.5" strokeLinecap="round" opacity=".45" />
      <circle cx="96" cy="118" r="42" fill={SILVER} {...S} />
      <circle cx="96" cy="118" r="33.6" fill={CHARCOAL} {...S} strokeWidth={3} />
      <circle cx="96" cy="118" r="23.5" fill={GLASS} {...S} strokeWidth={3} />
      <circle cx="87.6" cy="109.6" r="5.9" fill="#fff" opacity=".9" />
      <circle cx="104.4" cy="127.2" r="2.9" fill="#fff" opacity=".55" />
      <Smile x1={84} y={166} x2={108} dip={9} colour={c.cream} />
      <Eye cx={56} cy={62} r={20} delay={d} />
      <Eye cx={134} cy={62} r={20} delay={d} />
    </>
  ),
  "film-roll": (d) => (
    <>
      <rect x="108" y="78" width="80" height="68" fill={STEEL} {...S} />
      <path d="M120 85h9v9h-9zM138 85h9v9h-9zM156 85h9v9h-9zM174 85h9v9h-9zM120 130h9v9h-9zM138 130h9v9h-9zM156 130h9v9h-9zM174 130h9v9h-9z" fill={c.cream} />
      <rect x="58" y="12" width="24" height="22" rx="4" fill={SILVER} {...S} strokeWidth={4} />
      <rect x="36" y="28" width="68" height="20" rx="5" fill={CHARCOAL} {...S} strokeWidth={4} />
      <rect x="36" y="162" width="68" height="20" rx="5" fill={CHARCOAL} {...S} strokeWidth={4} />
      <rect x="26" y="44" width="88" height="122" rx="12" fill={c.lemon} {...S} />
      <Eye cx={52} cy={86} r={14} delay={d} />
      <Eye cx={88} cy={86} r={14} delay={d} />
      <Smile x1={56} y={112} x2={84} dip={11} />
      <Label x={70} y={152} size={15} fill={INK}>
        35mm
      </Label>
    </>
  ),
  softbox: (d) => (
    <>
      <Pole d="M100 130V176M100 176L68 192M100 176L132 192" colour={SILVER} />
      <rect x="18" y="12" width="164" height="124" rx="14" fill={CHARCOAL} {...S} />
      <rect x="30" y="24" width="140" height="100" rx="8" fill={c.snow} {...S} strokeWidth={3.5} />
      <Eye cx={72} cy={66} r={16} delay={d} />
      <Eye cx={128} cy={66} r={16} delay={d} />
      <Smile x1={84} y={94} x2={116} dip={13} />
    </>
  ),
  lens: (d) => (
    <>
      <circle cx="100" cy="100" r="88" fill={CHARCOAL} {...S} />
      {Array.from({ length: 24 }, (_, i) => (
        <path key={i} d="M100 18V26" stroke={SILVER} strokeWidth="4" strokeLinecap="round" transform={`rotate(${i * 15} 100 100)`} />
      ))}
      <circle cx="100" cy="100" r="68" fill={SILVER} {...S} strokeWidth={4} />
      <circle cx="100" cy="100" r="54" fill={GLASS} {...S} strokeWidth={4} />
      <Eye cx={80} cy={92} r={15} delay={d} />
      <Eye cx={120} cy={92} r={15} delay={d} />
      <Smile x1={86} y={120} x2={114} dip={12} colour={c.cream} />
    </>
  ),

  /* Media: videography */
  clapperboard: (d) => (
    <>
      <g transform="rotate(-14 28 74)">
        <rect x="24" y="46" width="152" height="28" rx="5" fill={c.snow} {...S} strokeWidth={4} />
        <path d="M44 49h17l-11 22h-17z" fill={c.tomato} />
        <path d="M78 49h17l-11 22h-17z" fill={c.lemon} />
        <path d="M112 49h17l-11 22h-17z" fill={c.aqua} />
        <path d="M146 49h17l-11 22h-17z" fill={c.bubblegum} />
      </g>
      <rect x="24" y="74" width="152" height="110" rx="8" fill={VIOLET} {...S} />
      <path d="M28 78H172V98H28Z" fill={c.snow} />
      <path d="M36 80h17l11 16h-17z" fill={c.bubblegum} />
      <path d="M70 80h17l11 16h-17z" fill={c.aqua} />
      <path d="M104 80h17l11 16h-17z" fill={c.lemon} />
      <path d="M138 80h17l11 16h-17z" fill={c.tomato} />
      <circle cx="31" cy="74" r="6" fill={SILVER} {...S} strokeWidth={3} />
      <Eye cx={72} cy={130} r={18} delay={d} />
      <Eye cx={128} cy={130} r={18} delay={d} />
      <Smile x1={84} y={158} x2={116} dip={13} />
    </>
  ),
  "cine-camera": (d) => (
    <>
      <circle cx="62" cy="50" r="30" fill={c.bubblegum} {...S} />
      <circle cx="62" cy="50" r="9" fill={SILVER} {...S} strokeWidth={3} />
      <circle cx="118" cy="54" r="25" fill={c.bubblegum} {...S} />
      <circle cx="118" cy="54" r="8" fill={SILVER} {...S} strokeWidth={3} />
      <path d="M146 100L186 84V158L146 142Z" fill={SILVER} {...S} />
      <Pole d="M84 174V190M84 174L62 190M84 174L106 190" colour={SILVER} w={4} />
      <rect x="18" y="78" width="130" height="96" rx="14" fill={CHARCOAL} {...S} />
      <circle cx="130" cy="94" r="6" fill={c.tomato} />
      <Eye cx={56} cy={118} r={16} delay={d} />
      <Eye cx={106} cy={118} r={16} delay={d} />
      <Smile x1={66} y={146} x2={96} dip={11} colour={c.cream} />
    </>
  ),
  drone: (d) => (
    <>
      <Pole d="M60 60L36 36M140 60L164 36M60 140L36 164M140 140L164 164" colour={SILVER} w={6} />
      {[
        [36, 36],
        [164, 36],
        [36, 164],
        [164, 164],
      ].map(([x, y]) => (
        <g key={`${x} ${y}`}>
          <circle cx={x} cy={y} r="27" fill={STEEL} {...S} strokeWidth={4} />
          <path d={`M${x - 21} ${y + 8}L${x + 21} ${y - 8}`} stroke={c.cream} strokeWidth="5" strokeLinecap="round" />
        </g>
      ))}
      <rect x="54" y="56" width="92" height="88" rx="22" fill={c.snow} {...S} />
      <Eye cx={80} cy={90} r={14} delay={d} />
      <Eye cx={120} cy={90} r={14} delay={d} />
      <Smile x1={88} y={116} x2={112} dip={10} />
    </>
  ),
  viewfinder: (d) => (
    <>
      <rect x="16" y="28" width="168" height="144" rx="14" fill={CHARCOAL} {...S} />
      <Pole d="M34 66V46H58M142 46H166V66M166 134V154H142M58 154H34V134" colour={c.snow} w={3} />
      <circle cx="56" cy="66" r="6" fill={c.tomato} />
      <Label x={84} y={71} size={14} fill={c.cream}>
        REC
      </Label>
      <Eye cx={76} cy={100} r={16} delay={d} />
      <Eye cx={124} cy={100} r={16} delay={d} />
      <Smile x1={84} y={128} x2={116} dip={12} colour={c.cream} />
    </>
  ),

  /* Media: editing */
  play: (d) => (
    <>
      <path d="M50 40L158 100L50 160Z" fill={INK} stroke={INK} strokeWidth="36" strokeLinejoin="round" />
      <path d="M50 40L158 100L50 160Z" fill={c.tomato} stroke={c.tomato} strokeWidth="27" strokeLinejoin="round" />
      <Eye cx={66} cy={80} r={15} delay={d} />
      <Eye cx={108} cy={90} r={15} delay={d} />
      <Smile x1={62} y={122} x2={100} dip={11} />
    </>
  ),
  timeline: (d) => (
    <>
      <rect x="14" y="24" width="172" height="152" rx="14" fill={CHARCOAL} {...S} />
      <Eye cx={72} cy={64} r={16} delay={d} />
      <Eye cx={128} cy={64} r={16} delay={d} />
      <Smile x1={86} y={90} x2={114} dip={10} colour={c.cream} />
      <rect x="28" y="110" width="60" height="13" rx="3" fill={c.aqua} />
      <rect x="92" y="110" width="80" height="13" rx="3" fill={c.bubblegum} />
      <rect x="28" y="128" width="100" height="13" rx="3" fill={c.lemon} />
      <rect x="132" y="128" width="40" height="13" rx="3" fill={c.mint} />
      <rect x="28" y="146" width="44" height="13" rx="3" fill={VIOLET} />
      <rect x="76" y="146" width="96" height="13" rx="3" fill={c.sky} />
      <path d="M112 104V164" stroke={c.tomato} strokeWidth="4" />
      <path d="M104 98H120L112 108Z" fill={c.tomato} />
    </>
  ),
  "colour-wheel": (d) => {
    const pt = (k) => `${(100 + Math.cos((Math.PI / 4) * k - Math.PI / 2) * 88).toFixed(1)} ${(100 + Math.sin((Math.PI / 4) * k - Math.PI / 2) * 88).toFixed(1)}`;
    return (
      <>
        {[c.tomato, ORANGE, c.lemon, c.mint, c.aqua, c.sky, c.grape, c.bubblegum].map((fill, i) => (
          <path key={fill} d={`M100 100L${pt(i)}A88 88 0 0 1 ${pt(i + 1)}Z`} fill={fill} {...S} strokeWidth={3.5} />
        ))}
        <circle cx="100" cy="100" r="52" fill={c.cream} {...S} />
        <Eye cx={82} cy={92} r={14} delay={d} />
        <Eye cx={118} cy={92} r={14} delay={d} />
        <Smile x1={88} y={116} x2={112} dip={10} />
      </>
    );
  },
  scissors: (d) => (
    <>
      <path d="M90 98L44 12Q84 32 114 86Z" fill={SILVER} {...S} />
      <path d="M110 98L156 12Q116 32 86 86Z" fill={SILVER} {...S} />
      <Pole d="M110 92L78 130" colour={c.bubblegum} w={8} />
      <Pole d="M90 92L122 130" colour={c.bubblegum} w={8} />
      <circle cx="100" cy="92" r="8" fill={c.snow} {...S} strokeWidth={3.5} />
      <circle cx="64" cy="150" r="36" fill={c.bubblegum} {...S} />
      <circle cx="136" cy="150" r="36" fill={c.bubblegum} {...S} />
      <Eye cx={64} cy={150} r={24} delay={d} />
      <Eye cx={136} cy={150} r={24} delay={d} />
    </>
  ),

  /* Media: socials */
  like: (d) => (
    <>
      <path
        d="M100 180C40 136 18 104 18 74C18 44 42 26 64 26C80 26 94 36 100 52C106 36 120 26 136 26C158 26 182 44 182 74C182 104 160 136 100 180Z"
        fill={c.bubblegum}
        {...S}
      />
      <Eye cx={72} cy={82} r={17} delay={d} />
      <Eye cx={128} cy={82} r={17} delay={d} />
      <Smile x1={82} y={116} x2={118} dip={16} />
      <rect x="132" y="6" width="60" height="32" rx="16" fill={c.lemon} {...S} strokeWidth={4} />
      <Label x={162} y={28} size={18} fill={INK}>
        +1
      </Label>
    </>
  ),
  hashtag: (d) => (
    <>
      <rect x="62" y="56" width="76" height="88" rx="6" fill={c.cream} {...S} strokeWidth={4} />
      <Pole d="M68 20L48 180M152 20L132 180" colour={c.aqua} w={13} />
      <Pole d="M22 60H178M22 140H178" colour={c.aqua} w={13} />
      <Eye cx={84} cy={92} r={14} delay={d} />
      <Eye cx={118} cy={92} r={14} delay={d} />
      <Smile x1={88} y={116} x2={112} dip={10} />
    </>
  ),
  bell: (d) => (
    <>
      <path d="M80 152Q100 192 120 152Z" fill={ORANGE} {...S} />
      <circle cx="100" cy="20" r="10" fill={c.lemon} {...S} strokeWidth={4} />
      <path d="M100 26C62 26 46 58 46 92C46 124 38 142 22 156H178C162 142 154 124 154 92C154 58 138 26 100 26Z" fill={c.lemon} {...S} />
      <Eye cx={78} cy={88} r={16} delay={d} />
      <Eye cx={122} cy={88} r={16} delay={d} />
      <Smile x1={84} y={118} x2={116} dip={14} />
      <circle cx="158" cy="38" r="24" fill={c.tomato} {...S} strokeWidth={4} />
      <Label x={158} y={47} size={26} fill={c.cream}>
        3
      </Label>
    </>
  ),
  comment: (d) => (
    <>
      <path d="M50 24H150Q182 24 182 56V112Q182 144 150 144H98L52 184L60 144H50Q18 144 18 112V56Q18 24 50 24Z" fill={c.sky} {...S} />
      <Eye cx={70} cy={76} r={17} delay={d} />
      <Eye cx={130} cy={76} r={17} delay={d} />
      <Smile x1={82} y={106} x2={118} dip={15} />
    </>
  ),
};

/* A committee character. A name left over from a drawing since removed draws nothing. */
export default function CrewCharacter({ character, blink = 0, className = "" }) {
  const draw = shapes[character];
  return (
    <svg viewBox="0 0 200 200" className={`char ${className}`} aria-hidden="true">
      {draw?.(blink)}
    </svg>
  );
}
