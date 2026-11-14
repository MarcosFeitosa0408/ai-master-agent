export function makePlan(goal) {
  const t = goal.toLowerCase(), s = [];
  s.push(["Interpretar o objetivo e o resultado esperado", "Alta", "Automática", `Revisar o objetivo: “${goal}” e definir o que será considerado concluído.`]);
  const gh = /repo|github|branch|pull|commit/.test(t), dat = /dado|csv|excel|dashboard|sql|power ?bi|relat/.test(t), code = /c[oó]digo|erro|bug|login|teste|react|p[aá]gina|sistema/.test(t);
  if (gh) s.push(["Conectar GitHub e escolher o repositório", "Alta", "Exige você", "Depende da GitHub App autorizada por você. Sem ela, esta etapa não pode ser executada de verdade."]);
  if (code) s.push(["Investigar os arquivos relevantes", "Alta", "Exige integração", "Ler o código antes de propor qualquer mudança; apresentar problema, correção, arquivos afetados e riscos."]);
  if (dat) s.push(["Importar e validar os dados", "Média", "Automática", "Usar a Central de Dados para checar ausentes, duplicidades e tipos."]);
  if (s.length < 3) s.push(["Levantar recursos e dependências", "Média", "Automática", "Listar ferramentas, arquivos e acessos necessários."]);
  if (s.length < 4) s.push(["Executar o trabalho principal", "Alta", "Parcial", "Parte exige IA ou backend; o que não puder ser feito será informado."]);
  s.push(["Validar e documentar o resultado", "Média", "Exige você", "Conferir resultados reais (testes só contam se executados) e registrar o relatório final."]);
  return s.slice(0, 5).map((x, i) => ({ n: i + 1, title: x[0], prio: x[1], kind: x[2], detail: x[3], status: "pendente" }));
}
