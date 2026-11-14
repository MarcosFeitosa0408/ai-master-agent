export function parseCSV(t) {
  const first = t.split("\n")[0], d = first.split(";").length > first.split(",").length ? ";" : ",";
  const rows = []; let r = [], c = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
    else if (ch === '"') q = true;
    else if (ch === d) { r.push(c); c = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && t[i + 1] === "\n") i++; r.push(c); c = ""; rows.push(r); r = []; }
    else c += ch;
  }
  if (c !== "" || r.length) { r.push(c); rows.push(r); }
  return rows.filter((x) => x.some((v) => v.trim() !== ""));
}
export function analyzeCSV(text) {
  const rows = parseCSV(text);
  if (rows.length < 2) throw new Error("Arquivo sem dados suficientes");
  const head = rows[0].map((x) => x.trim()), data = rows.slice(1), seen = new Set();
  let dup = 0;
  data.forEach((r) => { const k = JSON.stringify(r); seen.has(k) ? dup++ : seen.add(k); });
  const cols = head.map((name, j) => {
    const v = data.map((r) => (r[j] ?? "").trim()), ne = v.filter(Boolean);
    const nums = ne.map((x) => Number(x.replace(",", ".")));
    const missing = v.length - ne.length;
    if (ne.length && nums.every((x) => !isNaN(x))) {
      const s = [...nums].sort((a, b) => a - b);
      return { name, missing, type: "numérico", min: s[0], max: s[s.length - 1], mean: +(nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2), median: s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2 };
    }
    return { name, missing, type: "texto", distinct: new Set(ne).size };
  });
  return { rows: data.length, columns: head.length, duplicates: dup, cols };
}
