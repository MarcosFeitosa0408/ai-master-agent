import "./erp-core.js";
export const CORE = globalThis.ImportCore;
const DB = "ai-master-agent-analytics-v1";
const STORE = "bases";

function openDB() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) return reject(new Error("IndexedDB indisponível neste navegador."));
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: "id" }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function tx(mode, operation) {
  const db = await openDB();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = operation(transaction.objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      transaction.onerror = () => reject(transaction.error);
    });
  } finally { db.close(); }
}
export const loadBases = () => tx("readonly", store => store.getAll());
export const putBase = base => tx("readwrite", store => store.put(base));
export const deleteBase = id => tx("readwrite", store => store.delete(id));
export const money = v => v == null || !Number.isFinite(v) ? "—" : new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v);
export const integer = v => v == null || !Number.isFinite(v) ? "—" : new Intl.NumberFormat("pt-BR",{maximumFractionDigits:2}).format(v);
export const percentage = v => v == null || !Number.isFinite(v) ? "—" : new Intl.NumberFormat("pt-BR",{style:"percent",maximumFractionDigits:1}).format(v);
export const allRows = bases => bases.flatMap(b => b.rows.map(r => ({...r,company:b.company,sourceFile:b.name,sheet:b.sheet,datasetId:b.id})));
export function summarize(rows) {
  const adapted = rows.map(r => ({...r, order:r.order ? JSON.stringify([r.company||"",r.store||"",r.order]) : "",store:"",customer:r.customer?JSON.stringify([r.company||"",r.customer]):""}));
  return CORE.summarize(adapted);
}
export function filterRows(rows, filters) {
  return rows.filter(r => ["company","store","channel","category","brand","status","paymentMethod","datasetId"].every(k => !filters[k] || (r[k]||"")===filters[k])
    && (!filters.from || (r.date && r.date >= filters.from))
    && (!filters.to || (r.date && r.date <= filters.to)));
}
export function download(name, text, type="text/csv;charset=utf-8") {
  const url=URL.createObjectURL(new Blob([text],{type}));
  const a=document.createElement("a");a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function exportRowsCSV(rows) {
  const keys=["company","sourceFile","sheet","date","order","customer","product","category","brand","store","channel","status","paymentMethod","revenue","cost","refund","quantity","sourceLine"];
  return CORE.csv([["Empresa","Arquivo","Aba","Data","ID_Pedido","Cliente","Produto","Categoria","Marca","Loja","Canal","Status","Forma_Pagamento","Receita","Custo","Estorno","Quantidade","Linha_Original"],...rows.map(r => keys.map(k => r[k]??""))]);
}
export function exportExcel(rows,filename) {
  if(!globalThis.XLSX) throw Error("Biblioteca Excel não carregou. Exporte CSV.");
  const content = exportRowsCSV(rows).replace(/^\ufeff/,"");
  const sheet = globalThis.XLSX.utils.aoa_to_sheet(CORE.parseCSV(content, ";").rows);
  const wb = globalThis.XLSX.utils.book_new();
  globalThis.XLSX.utils.book_append_sheet(wb,sheet,"Dados validados");
  globalThis.XLSX.writeFile(wb,filename);
}
