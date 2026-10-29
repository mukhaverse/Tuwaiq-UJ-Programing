// Dev only (`npm run dev`, then /#dev/looks): every shape wearing every
// accessory, to check the anchors in Character.jsx after drawing something new.
import Character from "./Character";
import { ACCESSORIES, SHAPES } from "../../data/looks";
import { palette } from "../../lib/palette";

const COLUMNS = [null, ...ACCESSORIES.map((a) => a.id)];

export default function LookSheet() {
  const cell = { width: 96, textAlign: "center", font: "11px monospace", color: "#ccc" };
  return (
    <main style={{ padding: 16, background: "#0e0b18", minHeight: "100vh" }}>
      <table style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th />
            {COLUMNS.map((id) => (
              <th key={id ?? "none"} style={cell}>
                {id ?? "none"}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SHAPES.map((shape) => (
            <tr key={shape}>
              <th style={cell}>{shape}</th>
              {COLUMNS.map((id) => (
                <td key={id ?? "none"} style={{ padding: 2 }}>
                  <Character type={shape} body={palette.mint} wear={id ? [id] : []} style={{ width: 92, height: 92 }} />
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <th style={cell}>combo · junk</th>
            <td>
              <Character type="blob" body={palette.butter} wear={["gradcap", "shades", "mustache", "grin"]} style={{ width: 92, height: 92 }} />
            </td>
            <td>
              <Character type="blob" body={palette.butter} wear={["jetpack"]} style={{ width: 92, height: 92 }} />
            </td>
          </tr>
        </tbody>
      </table>
    </main>
  );
}
