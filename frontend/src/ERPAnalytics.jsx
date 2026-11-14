import {useEffect,useMemo,useState} from "react";
import {CORE,loadBases,putBase,deleteBase,allRows,filterRows,summarize,money,integer,percentage,exportRowsCSV,exportExcel,download} from "./analytics-engine";

const fields = CORE.fields;
const dimensions = [["company","Empresa"],["datasetId","Arquivo"],["store","Loja"],["category","Categoria"],["brand","Marca"],["channel","Canal"],["status","Status"],["paymentMethod","Forma de pagamento"]];
const norm = x => String(x??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
function Metric({label,value}){return <div className="card kpi"><b>{value}</b><span>{label}</span></div>;}
function Bars({title,rows,keyName}){
  const grouped=useMemo(()=>{
    const map=new Map();
    rows.forEach(r=>{const label=String(r[keyName]||"Sem informação");map.set(label,(map.get(label)||0)+(r.revenue||0));});
    return [...map].map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value).slice(0,8);
  },[rows,keyName]);
  const max=Math.max(1,...grouped.map(x=>Math.abs(x.value)));
  return <div className="card"><h2>{title}</h2>{grouped.length ? grouped.map(x=><div className="erp-bar" key={x.label}><span title={x.label}>{x.label}</span><div className="erp-track"><i style={{width:Math.abs(x.value)/max*100+"%"}}/></div><strong>{money(x.value)}</strong></div>):<p className="sub">Sem registros para este gráfico.</p>}</div>;
}
function Monthly({rows}){
  const data=useMemo(()=>{
    const month=new Map();
    for(const r of rows){if(!r.date)continue;const k=r.date.slice(0,7);const p=month.get(k)||[];p.push(r);month.set(k,p);}
    return [...month.keys()].sort().map(m=>({month:m,...summarize(month.get(m))}));
  },[rows]);
  if(!data.length)return <div className="card"><h2>Evolução mensal</h2><p className="sub">Informe uma coluna de data válida para visualizar a evolução mensal.</p></div>;
  const W=680,H=230,L=60,R=15,T=16,B=39,max=Math.max(1,...data.map(d=>d.revenue));const min=Math.min(0,...data.map(d=>d.revenue));
  const x=i=>L+(W-L-R)*(data.length===1?.5:i/(data.length-1));
  const y=v=>T+(H-T-B)*(max-v)/(max-min||1);
  const path=data.map((d,i)=>(i?"L":"M")+x(i)+","+y(d.revenue)).join(" ");
  return <div className="card"><h2>Evolução mensal da receita / valor transacionado</h2><svg className="erp-month" viewBox={"0 0 "+W+" "+H} role="img" aria-label="Gráfico mensal da receita"><g stroke="#394366">{[0,.25,.5,.75,1].map(n=><line key={n} x1={L} y1={y(min+(max-min)*n)} x2={W-R} y2={y(min+(max-min)*n)}/>)}</g><path d={path} fill="none" stroke="#6c99ff" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>{data.map((d,i)=><g key={d.month}><circle cx={x(i)} cy={y(d.revenue)} r="4" fill="#ad7fff"><title>{d.month+" — "+money(d.revenue)}</title></circle>{i%Math.max(1,Math.ceil(data.length/7))===0&&<text x={x(i)} y={H-9} fontSize="12" textAnchor="middle" fill="#aeb8dc">{d.month}</text>}</g>)}</svg><p className="sub">O gráfico utiliza somente registros com datas válidas.</p></div>;
}
function SampleTable({rows}){return <div className="card tw"><h2>Prévia dos registros filtrados (até 25)</h2><table><thead><tr>{["Linha","Data","Empresa","Pedido","Canal","Status","Receita","Custo"].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.slice(0,25).map((r,i)=><tr key={(r.datasetId||"")+":"+(r.sourceLine||i)}><td>{r.sourceLine??"—"}</td><td>{r.date||"—"}</td><td>{r.company||"—"}</td><td>{r.order||"—"}</td><td>{r.channel||"—"}</td><td>{r.status||"—"}</td><td>{money(r.revenue)}</td><td>{money(r.cost)}</td></tr>)}</tbody></table></div>;}

export default function ERPAnalytics({onDataChange}){
  const [bases,setBases]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[msg,setMsg]=useState("");
  const [file,setFile]=useState(null),[book,setBook]=useState(null),[grid,setGrid]=useState(null),[sheet,setSheet]=useState("CSV");
  const [headerRow,setHeaderRow]=useState(1),[company,setCompany]=useState("Minha empresa"),[map,setMap]=useState({});
  const [locale,setLocale]=useState("pt-BR"),[dateOrder,setDateOrder]=useState("DMY"),[revenueMode,setRevenueMode]=useState("net"),[removeDuplicates,setRemoveDuplicates]=useState(false);
  const [preview,setPreview]=useState(null),[filters,setFilters]=useState({});
  const prepared=useMemo(()=>{if(!grid)return null;try{return CORE.prepare(grid,headerRow-1);}catch{return null;}},[grid,headerRow]);
  const columnProfile=useMemo(()=>{
    if(!prepared)return [];
    return prepared.headers.map((name,i)=>{
      const values=prepared.data.map(row=>String(row[i]??"").trim());
      const nonEmpty=values.filter(Boolean);
      const numbers=nonEmpty.map(v=>CORE.parseNumber(v,locale));
      const numeric=nonEmpty.length>0 && numbers.every(v=>v!==null);
      const dates=nonEmpty.length>0 && nonEmpty.every(v=>CORE.parseDate(v,dateOrder)!==null);
      return {name,missing:values.length-nonEmpty.length,distinct:new Set(nonEmpty).size,type:numeric?"numérico":dates?"data":"texto",min:numeric?Math.min(...numbers):null,max:numeric?Math.max(...numbers):null,mean:numeric?numbers.reduce((a,b)=>a+b,0)/numbers.length:null};
    });
  },[prepared,locale,dateOrder]);
  useEffect(()=>{loadBases().then(items=>{setBases(items);onDataChange?.(allRows(items));}).catch(e=>setError("Não foi possível carregar bases locais: "+e.message)).finally(()=>setLoading(false));},[]);
  async function updateList(items){setBases(items);onDataChange?.(allRows(items));}
  function newGrid(rows,name){
    setGrid(rows);setSheet(name);setHeaderRow(1);setPreview(null);
    try{
      const p=CORE.prepare(rows);const suggested=CORE.suggest(p.headers);
      setMap(suggested);
      const sample=p.data.slice(0,25).map(r=>r[suggested.revenue]).filter(v=>v!=null && String(v).trim());
      setLocale(sample.some(v=>typeof v==="string" && /^\s*-?\d+\.\d{1,2}\s*$/.test(v)) && !sample.some(v=>String(v).includes(","))?"en-US":"pt-BR");
      setRevenueMode(suggested.refund!==undefined?"gross":"net");
      setError("");
    }catch(e){setError(e.message);}
  }
  async function handleFile(event){
    const f=event.target.files?.[0];if(!f)return;
    setError("");setMsg("");setBook(null);setGrid(null);setPreview(null);setFile(f);
    try{
      if(f.size>20*1024*1024)throw Error("Limite de 20 MB por arquivo.");
      const ext=f.name.split(".").pop().toLowerCase();
      if(["xlsx","xls"].includes(ext)){
        if(!globalThis.XLSX)throw Error("Leitor Excel indisponível. Recarregue a página.");
        const b=globalThis.XLSX.read(await f.arrayBuffer(),{type:"array",cellDates:false});setBook(b);
        const first=b.SheetNames[0];newGrid(globalThis.XLSX.utils.sheet_to_json(b.Sheets[first],{header:1,raw:true,defval:""}),first);
      }else if(["csv","tsv","txt"].includes(ext)){
        const text=await f.text();const parsed=CORE.parseCSV(text,ext==="tsv"?"\t":"auto");
        newGrid(parsed.rows,"CSV");
      }else throw Error("Selecione CSV, TSV, XLSX ou XLS.");
    }catch(e){setError(e.message);}
  }
  function changeSheet(next){if(!book)return;newGrid(globalThis.XLSX.utils.sheet_to_json(book.Sheets[next],{header:1,raw:true,defval:""}),next);}
  async function commitImport(){
    setError("");setMsg("");
    try{
      if(!file||!prepared)throw Error("Importe um arquivo e confira o cabeçalho.");
      if(bases.length>=50 && !bases.some(b=>b.id===company+"|"+file.name+"|"+sheet))throw Error("Limite de 50 bases salvas no navegador.");
      const opts={locale,dateOrder,revenueMode,removeDuplicates,sourceLines:prepared.rowNumbers};
      const res=CORE.convert(prepared.data,map,opts);
      if(!res.valid.length)throw Error("Nenhum registro válido. Confira o mapeamento e os formatos.");
      if(removeDuplicates && res.removed && !window.confirm("Confirmar a remoção de "+res.removed+" linhas exatamente iguais na nova base? O arquivo original será preservado."))return;
      const id=company.trim()+"|"+file.name+"|"+sheet;
      if(bases.some(b=>b.id===id) && !window.confirm("Esta empresa/arquivo/aba já foi importada. Substituir a base salva?"))return;
      const next={id,name:file.name,sheet,company:company.trim()||"Minha empresa",rows:res.valid,duplicates:res.duplicates,removed:res.removed,errors:res.errors,total:res.total,updatedAt:new Date().toISOString()};
      if(allRows(bases.filter(b=>b.id!==id)).length+res.valid.length>200000)throw Error("Limite de 200.000 registros armazenados.");
      await putBase(next);
      const items=[...bases.filter(b=>b.id!==id),next];
      await updateList(items);setPreview(next);setMsg("Base importada e analisada: "+res.valid.length+" registros válidos. Os indicadores usam somente dados confirmados.");
      setFilters({});
    }catch(e){setError(e.message);}
  }
  async function removeBase(b){
    if(!window.confirm("Remover os dados locais de "+b.name+" / "+b.sheet+"? Exporte um backup antes."))return;
    try{await deleteBase(b.id);await updateList(bases.filter(x=>x.id!==b.id));if(preview?.id===b.id)setPreview(null);setMsg("Base removida deste navegador.");}catch(e){setError(e.message);}
  }
  const all=useMemo(()=>allRows(bases),[bases]);
  const filtered=useMemo(()=>filterRows(all,filters),[all,filters]);
  const s=useMemo(()=>summarize(filtered),[filtered]);
  const distinct=(k)=>[...new Set(all.map(r=>r[k]).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),"pt-BR"));
  const filteredRefund=filtered.reduce((sum,r)=>sum+(r.refund??0),0);
  const kpis=[["Receita / valor",money(s.revenue)],["Custos totais",money(s.cost)],["Resultado",money(s.profit)],["Margem",percentage(s.margin)],["Pedidos distintos",integer(s.orders)],["Ticket médio",money(s.ticket)],["Clientes distintos",integer(s.customers)],["Quantidade",integer(s.quantity)],["Registros",integer(s.count)],["Valor por registro",money(s.average)]];
  function exportFiltered(asExcel=false){if(!filtered.length){setError("Não há dados para exportar com os filtros atuais.");return;}try{if(asExcel)exportExcel(filtered,"ai-master-dados-filtrados.xlsx");else download("ai-master-dados-filtrados.csv",exportRowsCSV(filtered));}catch(e){setError(e.message);}}
  return <div className="erp-view">
    <div className="card"><h2>Central Analítica — tecnologia do ERP Business Platform</h2><p className="sub">Importe CSV ou Excel, confirme as colunas, valide os dados e explore indicadores e gráficos reais. O original não é alterado; os dados ficam neste navegador (IndexedDB).</p>
      <input type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" onChange={handleFile}/>
      <p className="sub" style={{marginTop:10}}>CSV, TSV, XLSX ou XLS · até 20 MB · até 50.000 linhas por arquivo</p>
    </div>
    {error&&<div className="card erp-error" role="alert">{error}</div>}{msg&&<div className="card erp-success" role="status">{msg}</div>}
    {grid&&<div className="card">
      <h2>Conferir o significado dos dados — {file?.name}</h2>
      <div className="erp-fields">
        {book&&<label>Aba do Excel<select value={sheet} onChange={e=>changeSheet(e.target.value)}>{book.SheetNames.map(n=><option key={n}>{n}</option>)}</select></label>}
        <label>Nome da empresa / análise<input value={company} maxLength={100} onChange={e=>setCompany(e.target.value)}/></label>
        <label>Linha do cabeçalho<input type="number" min={1} max={20} value={headerRow} onChange={e=>setHeaderRow(Math.max(1,Math.min(20,Number(e.target.value)||1)))}/></label>
        <label>Formato numérico<select value={locale} onChange={e=>setLocale(e.target.value)}><option value="pt-BR">Brasil (1.234,56)</option><option value="en-US">EUA (1,234.56)</option></select></label>
        <label>Formato das datas<select value={dateOrder} onChange={e=>setDateOrder(e.target.value)}><option value="DMY">Dia / mês / ano</option><option value="MDY">Mês / dia / ano</option></select></label>
        <label>Interpretação da receita<select value={revenueMode} onChange={e=>setRevenueMode(e.target.value)}><option value="net">Valor já líquido: não descontar estornos</option><option value="gross">Valor bruto: descontar devoluções e estornos</option></select></label>
      </div>
      <p className="sub" style={{marginTop:10}}>Confira o mapeamento. Cada coluna deve representar apenas um campo. Custos e outras informações podem ficar não informados.</p>
      {columnProfile.length>0&&<details open><summary><b>Qualidade por coluna — valores ausentes e estatísticas</b></summary><div className="tw"><table><thead><tr><th>Coluna</th><th>Tipo identificado</th><th>Ausentes</th><th>Distintos</th><th>Estatísticas numéricas</th></tr></thead><tbody>{columnProfile.map((col,i)=><tr key={i}><td>{col.name}</td><td>{col.type}</td><td>{integer(col.missing)}</td><td>{integer(col.distinct)}</td><td>{col.type==="numérico"?"mín "+integer(col.min)+" · máx "+integer(col.max)+" · média "+integer(col.mean):"—"}</td></tr>)}</tbody></table></div><p className="sub">Campos opcionais vazios podem ser normais, por exemplo Data_Estorno sem estorno. Confira os tipos inferidos.</p></details>}
      {prepared?<><div className="erp-fields">{fields.map(([key,label])=><label key={key}>{label}<select value={map[key]??""} onChange={e=>setMap(p=>({...p,[key]:e.target.value===""?undefined:Number(e.target.value)}))}><option value="">Não informado</option>{prepared.headers.map((name,i)=><option key={i} value={i} disabled={Object.entries(map).some(([k,v])=>k!==key&&v===i)}>{name}</option>)}</select></label>)}</div>
        <label className="erp-check"><input type="checkbox" checked={removeDuplicates} onChange={e=>setRemoveDuplicates(e.target.checked)}/> Remover cópias de linhas exatamente iguais, somente após confirmar</label>
        <p className="sub">Registros originais: {integer(prepared.data.length)}. Identificadores de pedido repetidos podem representar itens diferentes.</p>
        <button className="btn" onClick={commitImport}>Validar, adicionar base e atualizar dashboard</button>
      </>:<p className="erp-error">Cabeçalho inválido. Ajuste a linha do cabeçalho.</p>}
    </div>}
    {preview&&<div className="card"><h2>Relatório da última importação: {preview.name}</h2><div className="erp-quality">
      <span>Válidas: <b>{integer(preview.rows.length)}</b></span><span>Duplicatas exatas: <b>{integer(preview.duplicates)}</b></span><span>Removidas: <b>{integer(preview.removed)}</b></span><span>Rejeitadas: <b>{integer(preview.errors.length)}</b></span><span>Custos desconhecidos: <b>{integer(preview.rows.filter(r=>r.cost===null).length)}</b></span>
    </div>{preview.errors.length>0&&<details><summary>Ver rejeições e motivos</summary><div className="tw"><table><thead><tr><th>Linha do arquivo</th><th>Motivo</th></tr></thead><tbody>{preview.errors.slice(0,50).map((x,i)=><tr key={i}><td>{x.line}</td><td>{x.reasons}</td></tr>)}</tbody></table></div><p className="sub">Mostradas até 50 rejeições. Nenhum registro rejeitado entra nos indicadores.</p></details>}</div>}
    <div className="card"><h2>Bases importadas e preservadas</h2>{loading?<p className="sub">Carregando armazenamento local...</p>:bases.length?bases.map(b=><div key={b.id} className="erp-base"><span><b>{b.company}</b> · {b.name} · {b.sheet} · {integer(b.rows.length)} registros</span><button className="btn s" onClick={()=>removeBase(b)}>Remover base</button></div>):<p className="sub">Nenhuma base importada ainda. Selecione uma planilha acima para iniciar.</p>}</div>
    {all.length>0&&<>
      <div className="card"><h2>Filtros do dashboard</h2><div className="erp-fields">{dimensions.filter(([k])=>distinct(k).length>0).map(([key,label])=><label key={key}>{label}<select value={filters[key]||""} onChange={e=>setFilters(p=>({...p,[key]:e.target.value}))}><option value="">Todos</option>{distinct(key).map(v=><option key={v} value={v}>{key==="datasetId"?(bases.find(b=>b.id===v)?.name||v):v}</option>)}</select></label>)}
        <label>De<input type="date" value={filters.from||""} onChange={e=>setFilters(p=>({...p,from:e.target.value}))}/></label>
        <label>Até<input type="date" value={filters.to||""} onChange={e=>setFilters(p=>({...p,to:e.target.value}))}/></label>
      </div><div className="row" style={{marginTop:12}}><button className="btn s" onClick={()=>setFilters({})}>Limpar filtros</button><button className="btn s" onClick={()=>exportFiltered(false)}>Exportar filtro CSV</button><button className="btn s" onClick={()=>exportFiltered(true)}>Exportar filtro Excel</button><button className="btn s" onClick={()=>download("ai-master-backup.json",JSON.stringify(bases,null,2),"application/json")}>Backup JSON</button></div>
      <p className="sub" style={{marginTop:10}}>{integer(filtered.length)} de {integer(all.length)} registros. Gráficos e KPIs são recalculados automaticamente.</p></div>
      <h2>Dashboard executivo — dados reais</h2><div className="erp-kpis">{kpis.map(([label,value])=><Metric key={label} label={label} value={value}/>)}</div>
      {filtered.some(r=>r.refund!==null&&r.refund!==undefined)&&<p className="sub">Estornos/devoluções mapeados: {money(filteredRefund)}. Verifique se a receita foi configurada como bruta ou líquida para evitar dupla subtração.</p>}
      {s.cost===null&&<div className="card erp-notice">Custos ausentes ou incompletos: resultado e margem indisponíveis. Não são estimados nem tratados como zero.</div>}
      <Monthly rows={filtered}/>
      <div className="erp-charts">
        <Bars title="Receita por empresa" rows={filtered} keyName="company"/>
        <Bars title="Receita por canal" rows={filtered} keyName="channel"/>
        <Bars title="Receita por loja" rows={filtered} keyName="store"/>
        <Bars title="Receita por categoria" rows={filtered} keyName="category"/>
        <Bars title="Receita por status" rows={filtered} keyName="status"/>
        <Bars title="Receita por forma de pagamento" rows={filtered} keyName="paymentMethod"/>
      </div>
      <SampleTable rows={filtered}/>
      <p className="sub">Resultado = receita após ajustes selecionados − custos informados. Não equivale necessariamente ao lucro líquido contábil. Os valores dependem do significado confirmado para cada coluna.</p>
    </>}
  </div>;
}
