import re

def make_plan(goal: str):
    t = goal.lower()
    s = [("Interpretar o objetivo e o resultado esperado", "Alta", "Automática",
          f"Revisar o objetivo: “{goal}” e definir o que será considerado concluído.")]
    gh = re.search(r"repo|github|branch|pull|commit", t)
    dat = re.search(r"dado|csv|excel|dashboard|sql|power ?bi|relat", t)
    code = re.search(r"c[oó]digo|erro|bug|login|teste|react|p[aá]gina|sistema", t)
    if gh:
        s.append(("Conectar GitHub e escolher o repositório", "Alta", "Exige você",
                  "Depende da GitHub App autorizada por você. Sem ela, esta etapa não pode ser executada de verdade."))
    if code:
        s.append(("Investigar os arquivos relevantes", "Alta", "Exige integração",
                  "Ler o código antes de propor qualquer mudança; apresentar problema, correção, arquivos afetados e riscos."))
    if dat:
        s.append(("Importar e validar os dados", "Média", "Automática",
                  "Usar a Central de Dados para checar ausentes, duplicidades e tipos."))
    if len(s) < 3:
        s.append(("Levantar recursos e dependências", "Média", "Automática", "Listar ferramentas, arquivos e acessos necessários."))
    if len(s) < 4:
        s.append(("Executar o trabalho principal", "Alta", "Parcial",
                  "Parte exige IA ou backend; o que não puder ser feito será informado."))
    s.append(("Validar e documentar o resultado", "Média", "Exige você",
              "Conferir resultados reais (testes só contam se executados) e registrar o relatório final."))
    return [dict(n=i + 1, title=a, prio=b, kind=c, detail=d) for i, (a, b, c, d) in enumerate(s[:5])]
