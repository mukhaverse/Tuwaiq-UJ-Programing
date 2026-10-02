// Reads the first sheet of an .xlsx (or a .csv) file in the browser, without a
// spreadsheet library: an .xlsx is a zip of XML files, and the browser can unzip
// it with DecompressionStream. Returns { headers, rows } where each row maps a
// column header to the cell's text (empty cells are left out).

export async function readSheet(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  const table = isZip ? await readXlsx(bytes) : parseCsv(new TextDecoder().decode(bytes));
  return toRecords(table);
}

/* ---------- Rows → records ---------- */

function toRecords(table) {
  const at = table.findIndex((r) => r.filter((c) => c.trim()).length >= 2);
  if (at < 0) throw new Error("This file doesn't have a header row.");
  const headers = table[at].map((h) => h.trim());
  const rows = [];
  for (const cells of table.slice(at + 1)) {
    const row = {};
    headers.forEach((h, i) => {
      const v = (cells[i] ?? "").trim();
      if (h && v) row[h] = v;
    });
    if (Object.keys(row).length) rows.push(row);
  }
  return { headers: headers.filter(Boolean), rows };
}

/* ---------- CSV ---------- */

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  text = text.replace(/^﻿/, "");
  const endCell = () => {
    row.push(cell);
    cell = "";
  };
  const endRow = () => {
    endCell();
    rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") endCell();
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      endRow();
    } else cell += ch;
  }
  if (cell || row.length) endRow();
  return rows;
}

/* ---------- XLSX ---------- */

async function readXlsx(bytes) {
  const files = unzipIndex(bytes);
  const text = async (name) => (files.has(name) ? new TextDecoder().decode(await inflate(bytes, files.get(name))) : "");

  // The first sheet, found through the workbook's relationships.
  const workbook = await text("xl/workbook.xml");
  const rels = await text("xl/_rels/workbook.xml.rels");
  const rid = attr(workbook.match(/<sheet\b[^>]*>/)?.[0] ?? "", "r:id");
  const relTag = [...rels.matchAll(/<Relationship\b[^>]*>/g)].map((m) => m[0]).find((t) => attr(t, "Id") === rid);
  let target = relTag ? attr(relTag, "Target") : "worksheets/sheet1.xml";
  target = target.startsWith("/") ? target.slice(1) : `xl/${target}`;
  const sheet = await text(target);
  if (!sheet) throw new Error("Couldn't find a sheet in this file.");

  const shared = [...(await text("xl/sharedStrings.xml")).matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((m) => runs(m[1]));
  const dateStyles = await findDateStyles(await text("xl/styles.xml"));

  const table = [];
  for (const [, rowXml] of sheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = [];
    for (const m of rowXml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = m[1];
      const inner = m[2] ?? "";
      const col = colIndex(attr(attrs, "r"));
      const type = attr(attrs, "t");
      const raw = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      let value = "";
      if (type === "s") value = shared[Number(raw)] ?? "";
      else if (type === "inlineStr") value = runs(inner);
      else if (type === "b") value = raw === "1" ? "TRUE" : "FALSE";
      else if (raw !== undefined) {
        value = decode(raw);
        if (type !== "str" && dateStyles.has(Number(attr(attrs, "s"))) && value !== "") value = serialToIso(Number(value));
      }
      cells[col] = value;
    }
    table.push(Array.from(cells, (c) => c ?? ""));
  }
  return table;
}

// Cell styles whose number format is a date, so their serial numbers become dates.
async function findDateStyles(styles) {
  const custom = new Map([...styles.matchAll(/<numFmt\b[^>]*>/g)].map((m) => [Number(attr(m[0], "numFmtId")), attr(m[0], "formatCode")]));
  const isDate = (id) => (id >= 14 && id <= 22) || (id >= 45 && id <= 47) || /[dmyhs]/i.test((custom.get(id) ?? "").replace(/"[^"]*"|\[[^\]]*\]/g, ""));
  const xfs = styles.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/)?.[1] ?? "";
  const out = new Set();
  [...xfs.matchAll(/<xf\b[^>]*>/g)].forEach((m, i) => isDate(Number(attr(m[0], "numFmtId"))) && out.add(i));
  return out;
}

// Excel stores dates as days since 1899-12-30, in the sheet's local time.
function serialToIso(serial) {
  if (!Number.isFinite(serial)) return "";
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  return new Date(ms).toISOString().slice(0, 19);
}

const attr = (tag, name) => tag.match(new RegExp(`\\b${name.replace(":", "\\:")}="([^"]*)"`))?.[1] ?? "";
const runs = (xml) => [...xml.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((m) => decode(m[1])).join("");
const decode = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e) =>
    e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" }[e.toLowerCase()]
  );
const colIndex = (ref) => [...ref.replace(/\d+/g, "")].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;

/* ---------- Zip ---------- */

// Lists the files in a zip from its central directory: name → { method, offset, size }.
function unzipIndex(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = bytes.length - 22;
  while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end--;
  if (end < 0) throw new Error("This doesn't look like an .xlsx file.");
  const count = view.getUint16(end + 10, true);
  let p = view.getUint32(end + 16, true);
  const files = new Map();
  for (let i = 0; i < count && view.getUint32(p, true) === 0x02014b50; i++) {
    const method = view.getUint16(p + 10, true);
    const size = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const offset = view.getUint32(p + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + nameLen));
    files.set(name, { method, offset, size });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

async function inflate(bytes, { method, offset, size }) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const start = offset + 30 + view.getUint16(offset + 26, true) + view.getUint16(offset + 28, true);
  const data = bytes.subarray(start, start + size);
  if (method === 0) return data;
  if (method !== 8) throw new Error("This .xlsx uses a compression the browser can't read.");
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
