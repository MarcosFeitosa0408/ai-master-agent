const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
export const remote = !!BASE;
export async function api(path, opts = {}) {
  const headers = typeof opts.body === "string" ? { "Content-Type": "application/json" } : {};
  const r = await fetch(BASE + path, { headers, ...opts });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(typeof j.detail === "string" ? j.detail : "Erro " + r.status);
  }
  return r.json();
}
