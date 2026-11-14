import { useEffect, useState } from "react";
import { api, remote } from "./api";
import { makePlan } from "./planner";
import ERPAnalytics from "./ERPAnalytics.jsx";
import {summarize, money} from "./analytics-engine.js";

const MODS = [["geral", "▦ Visão Geral"], ["plano", "✦ Planejamento IA"], ["exec", "▶ Execução"], ["gh", "⑂ GitHub"], ["dev", "</> Desenvolvedor IA"], ["dados", "▤ Central de Dados"], ["hist", "◷ Histórico"]];
const stamp = () => new Date().toLocaleString("pt-BR");
const loadLocal = () => { try { return JSON.parse(localStorage.getItem("ama")) || {}; } catch { return {}; } };
const Tag = ({ c = "", children }) => <span className={"tag " + c}>{children}</span>;
const Sec = ({ id, tab, title, sub, children }) => (
  <section className={"sec" + (tab === id ? " on" : "")}><h1>{title}</h1><p className="sub">{sub}</p>{children}</section>
);

export default function App() {
  const init = loadLocal();
  const [tab, setTab] = useState(MODS.some((m) => "#" + m[0] === location.hash) ? location.hash.slice(1) : "geral");
  const [goal, setGoal] = useState(init.goal || "");
  const [plan, setPlan] = useState(init.plan || null);
  const [hist, setHist] = useState(init.hist || []);
  const [open, setOpen] = useState({});
  const [businessRows, setBusinessRows] = useState([]);
  const [code, setCode] = useState("");
  const [info, setInfo] = useState("");
  const [integ, setInteg] = useState(null);
  const [err, setErr] = useState("");
  const steps = plan?.steps || [];
  const done = steps.filter((s) => s.status === "concluída").length;
  const pct = steps.length ? Math.round((done / steps.length) * 100) : 0;
  const addLog = (m) => setHist((h) => [`[${stamp()}] ${m}`, ...h].slice(0, 200));

  const refresh = async () => {
    const [ps, h, i] = await Promise.all([api("/api/plans"), api("/api/history"), api("/api/integrations")]);
    setPlan(ps[0] || null); setHist(h.map((x) => `[${new Date(x.ts).toLocaleString("pt-BR")}] ${x.message}`)); setInteg(i); setErr("");
  };
  const guard = (fn) => async (...a) => { try { await fn(...a); } catch (e) { setErr(e.message); } };
  useEffect(() => { if (remote) guard(refresh)(); }, []);
  useEffect(() => { if (!remote) try { localStorage.setItem("ama", JSON.stringify({ goal, plan, hist })); } catch {} }, [goal, plan, hist]);
  useEffect(() => { try { location.hash = tab; } catch {} }, [tab]);

  const generate = guard(async () => {
    const g = goal.trim(); if (!g) return;
    if (remote) { await api("/api/plans", { method: "POST", body: JSON.stringify({ goal: g }) }); await refresh(); }
    else { setPlan({ goal: g, steps: makePlan(g) }); addLog(`Plano gerado (${makePlan(g).length} etapas): ${g}`); }
  });
  const act = guard(async (s, a) => {
    if (remote) { await api(`/api/plans/${plan.id}/steps/${s.n}`, { method: "PATCH", body: JSON.stringify({ action: a }) }); await refresh(); return; }
    const to = { start: "em andamento", complete: "concluída" }[a];
    if (to) setPlan((p) => ({ ...p, steps: p.steps.map((x) => (x.n === s.n ? { ...x, status: to } : x)) }));
    addLog({ start: `Etapa ${s.n} iniciada (marcação manual; nenhuma operação externa executada): ${s.title}`, complete: `Etapa ${s.n} marcada como concluída por você`, help: `Ajuda solicitada na etapa ${s.n}: a IA ainda não está ligada (requer backend com chave Anthropic)`, verify: `Verificação da etapa ${s.n}: sem resultado automático. Status: ${s.status}` }[a]);
  });
  const gh = integ?.github?.configured ? <Tag c="warn">GitHub: credenciais no servidor, integração ainda não implementada</Tag> : <Tag c="err">GitHub: não conectado</Tag>;
  const logs = hist.length ? hist.map((h, i) => <div key={i}>{h}</div>) : "Nenhuma atividade ainda.";

  return (<>
    <nav><div className="logo">◆ AI MASTER AGENT</div>
      {MODS.map(([k, l]) => <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>)}</nav>
    <main>
      {err && <div className="card"><Tag c="err">Erro</Tag> {err}</div>}
      <Sec id="geral" tab={tab} title="Visão Geral" sub="Planejamento, desenvolvimento e execução inteligente.">
        <div className="grid">
          {[[steps.length ? 1 : 0, "Projetos ativos"], [steps.length - done, "Tarefas pendentes"], [done, "Tarefas concluídas"], [pct + "%", "Progresso geral"]].map(([v, l]) => <div className="card kpi" key={l}><b>{v}</b><span>{l}</span></div>)}</div>
        <div className="card"><h2>Estado real das integrações</h2><div className="row">
          <Tag c={remote ? "ok" : "warn"}>{remote ? "Backend: URL configurada (acesso exige autenticação)" : "Backend: modo local (sem VITE_API_URL)"}</Tag>{gh}
          <Tag c="warn">IA (Claude): não implementada</Tag><Tag c="warn">Execução de código: indisponível</Tag><Tag c="ok">Planejamento: ativo</Tag><Tag c="ok">Análise de CSV: ativa</Tag></div></div>
        <div className="card"><h2>Atividades recentes</h2><div className="log">{hist.length ? hist.slice(0, 6).map((h, i) => <div key={i}>{h}</div>) : "Nenhuma atividade ainda."}</div></div>
        {businessRows.length > 0 && <div className="card"><h2>Resumo empresarial — dados importados</h2><div className="grid"><div className="card kpi"><b>{money(summarize(businessRows).revenue)}</b><span>Receita / valor</span></div><div className="card kpi"><b>{money(summarize(businessRows).profit)}</b><span>Resultado (se custos completos)</span></div><div className="card kpi"><b>{businessRows.length}</b><span>Registros validados</span></div></div><p className="sub">Consulte a Central de Dados para filtros, gráficos, qualidade e exportação.</p></div>}
      </Sec>
      <Sec id="plano" tab={tab} title="Planejamento IA" sub="Informe um objetivo; o plano de 3 a 5 etapas é gerado por regras (não por IA) e você controla cada etapa.">
        <div className="card"><textarea style={{ minHeight: 70, fontFamily: "inherit" }} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Ex.: Analise meu repositório e corrija os problemas encontrados" />
          <div className="row" style={{ marginTop: 8 }}><button className="btn" onClick={generate}>Gerar plano</button>
            {!remote && <button className="btn s" onClick={() => { setPlan(null); addLog("Plano limpo"); }}>Limpar plano</button>}</div></div>
        <div className="card"><div className="row" style={{ justifyContent: "space-between" }}><h2 style={{ margin: 0 }}>Progresso do plano</h2><span>{pct}%</span></div><div className="bar" style={{ marginTop: 8 }}><i style={{ width: pct + "%" }} /></div></div>
        {steps.map((s) => <div className="card" key={s.n}>
          <div className="row" style={{ justifyContent: "space-between" }}><b>{s.n}. {s.title}</b><Tag c={s.status === "concluída" ? "ok" : s.status === "pendente" ? "" : "warn"}>{s.status}</Tag></div>
          <div className="row" style={{ margin: "6px 0" }}><Tag>Prioridade: {s.prio}</Tag><Tag>{s.kind}</Tag></div>
          <div className={"det" + (open[s.n] ? " open" : "")}>{s.detail}</div>
          <div className="row" style={{ marginTop: 8 }}>
            {[["Executar etapa", "start"], ["Pedir ajuda", "help"], ["Verificar resultados", "verify"], ["Reexecutar", "start"], ["Marcar como concluída", "complete"]].map(([l, a]) => <button key={l} className="btn s" onClick={() => act(s, a)}>{l}</button>)}
            <button className="btn s" onClick={() => setOpen({ ...open, [s.n]: !open[s.n] })}>Ver detalhes</button></div></div>)}
      </Sec>
      <Sec id="exec" tab={tab} title="Execução" sub="Ações disponíveis e operações autorizadas.">
        <div className="card tw"><table><thead><tr><th>Ação</th><th>Requer</th><th>Status</th></tr></thead><tbody>
          {[["Planejar tarefas", "—", "ok", "Operacional"], ["Analisar CSV", "—", "ok", "Operacional"], ["Persistir plano e histórico (SQLite)", "Backend (Fase A)", remote ? "ok" : "warn", remote ? "Operacional" : "Requer backend"], ["Ler repositórios GitHub", "GitHub App", "err", "Pendente (Fase B)"], ["Criar branch, commit e PR", "GitHub App + autorização", "err", "Pendente (Fase B)"], ["Conversar com a IA", "Chave Anthropic no backend", "warn", "Pendente (Fase C)"], ["Executar testes e código", "Sandbox isolado", "err", "Pendente (Fase D)"]].map(([a, r, c, s]) => <tr key={a}><td>{a}</td><td>{r}</td><td><Tag c={c}>{s}</Tag></td></tr>)}</tbody></table></div>
        <div className="card"><h2>Console</h2><div className="log">{logs}</div></div>
      </Sec>
      <Sec id="gh" tab={tab} title="GitHub" sub="Repositório do projeto: github.com/MarcosFeitosa0408/ai-master-agent">
        <div className="card"><div className="row">{gh}<button className="btn" disabled>Conectar GitHub (Fase B)</button></div>
          <p className="sub" style={{ margin: "10px 0 0" }}>Repositórios, branch atual, commits, pull requests e testes só aparecerão após a conexão real.</p></div>
        <div className="card"><h2>Como habilitar</h2><ol className="setup">
          <li>Crie uma <b>GitHub App</b> com permissões mínimas: Contents, Pull requests (escrita), Actions e Metadata (leitura).</li>
          <li>Instale a App apenas no repositório <code>ai-master-agent</code>.</li>
          <li>No Render, defina <code>GITHUB_APP_ID</code> e <code>GITHUB_PRIVATE_KEY</code>; nada disso vai para o frontend.</li>
          <li>Regra fixa: trabalhar só em branches novas; nunca na main; excluir ou publicar só com confirmação.</li></ol></div>
      </Sec>
      <Sec id="dev" tab={tab} title="Desenvolvedor IA" sub="Editor de rascunho local. Análise e correções exigem IA e GitHub conectados.">
        <div className="card"><textarea value={code} onChange={(e) => setCode(e.target.value)} placeholder="Cole seu código aqui..." />
          <div className="row" style={{ marginTop: 8 }}><button className="btn s" onClick={() => setInfo(code ? `${code.split("\n").length} linhas, ${code.length} caracteres.` : "Editor vazio.")}>Contar linhas e caracteres</button>
            <button className="btn" disabled>Analisar com IA (pendente)</button><button className="btn" disabled>Aplicar correção (pendente)</button></div>
          <p className="sub" style={{ margin: "8px 0 0" }}>{info}</p></div>
        <div className="card"><h2>Fluxo previsto antes de qualquer mudança</h2><p className="sub" style={{ margin: 0 }}>Problema identificado → correção proposta → arquivos afetados → riscos → sua autorização → branch → alterações → testes → pull request.</p></div>
      </Sec>
      <Sec id="dados" tab={tab} title="Central de Dados" sub="Análise de negócios completa, com o motor de validação do ERP Business Platform.">
        <ERPAnalytics onDataChange={setBusinessRows}/>
      </Sec>
      <Sec id="hist" tab={tab} title="Histórico" sub={remote ? "Registro de ações salvo no banco do backend." : "Registro de ações salvo neste navegador."}>
        <div className="card"><div className="log">{logs}</div></div>
      </Sec>
    </main></>);
}
