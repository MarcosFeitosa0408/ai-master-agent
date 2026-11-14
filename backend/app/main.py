import os
import secrets
from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from .db import Store, now
from . import planner, csvstats

ACTIONS = {"start": "em andamento", "complete": "concluída", "help": None, "verify": None}

class GoalIn(BaseModel):
    goal: str = Field(min_length=3, max_length=500)

class ActionIn(BaseModel):
    action: str

def auth(x_api_key: str | None = Header(default=None)):
    # Bloqueio por padrão: sem token configurado, a API privada não é utilizável.
    # Nunca implemente uma chave secreta diretamente no JavaScript público.
    token = os.getenv("API_TOKEN", "")
    if not token:
        raise HTTPException(503, "API privada não configurada: defina API_TOKEN no servidor")
    if not x_api_key or not secrets.compare_digest(x_api_key, token):
        raise HTTPException(401, "Autenticação necessária")

def create_app(db_path: str | None = None) -> FastAPI:
    app = FastAPI(title="AI MASTER AGENT API", version="0.1.0")
    store = Store(db_path or os.getenv("DB_PATH", "data/app.db"))
    origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]
    app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["*"], allow_headers=["*"])

    @app.get("/api/health")
    def health():
        return {"status": "ok", "version": app.version, "time": now()}

    @app.get("/api/integrations", dependencies=[Depends(auth)])
    def integrations():
        gh = bool(os.getenv("GITHUB_APP_ID") and os.getenv("GITHUB_PRIVATE_KEY"))
        cl = bool(os.getenv("ANTHROPIC_API_KEY"))
        note = "Credenciais detectadas, mas a integração só será implementada na Fase B/C."
        return {"github": {"configured": gh, "implemented": False, "note": note},
                "claude": {"configured": cl, "implemented": False, "note": note},
                "sandbox": {"configured": False, "implemented": False, "note": "Execução de código ainda não existe."}}

    @app.post("/api/plans", status_code=201, dependencies=[Depends(auth)])
    def create_plan(body: GoalIn):
        goal = body.goal.strip()
        with store.conn() as c:
            pid = c.execute("INSERT INTO plans(goal,created_at) VALUES(?,?)", (goal, now())).lastrowid
            for s in planner.make_plan(goal):
                c.execute("INSERT INTO steps(plan_id,n,title,prio,kind,detail) VALUES(?,?,?,?,?,?)",
                          (pid, s["n"], s["title"], s["prio"], s["kind"], s["detail"]))
            store.log(c, f"Plano gerado: {goal}")
            return store.plan(c, pid)

    @app.get("/api/plans", dependencies=[Depends(auth)])
    def list_plans():
        with store.conn() as c:
            ids = [r["id"] for r in c.execute("SELECT id FROM plans ORDER BY id DESC")]
            return [store.plan(c, i) for i in ids]

    @app.get("/api/plans/{pid}", dependencies=[Depends(auth)])
    def get_plan(pid: int):
        with store.conn() as c:
            p = store.plan(c, pid)
        if not p:
            raise HTTPException(404, "Plano não encontrado")
        return p

    @app.patch("/api/plans/{pid}/steps/{n}", dependencies=[Depends(auth)])
    def step_action(pid: int, n: int, body: ActionIn):
        if body.action not in ACTIONS:
            raise HTTPException(422, f"Ação inválida. Use: {', '.join(ACTIONS)}")
        with store.conn() as c:
            step = c.execute("SELECT * FROM steps WHERE plan_id=? AND n=?", (pid, n)).fetchone()
            if not step:
                raise HTTPException(404, "Etapa não encontrada")
            new = ACTIONS[body.action]
            if new:
                c.execute("UPDATE steps SET status=? WHERE plan_id=? AND n=?", (new, pid, n))
            msgs = {"start": f"Etapa {n} iniciada (marcação manual; nenhuma operação externa executada)",
                    "complete": f"Etapa {n} marcada como concluída por você",
                    "help": f"Ajuda solicitada na etapa {n}: a IA ainda não está ligada",
                    "verify": f"Verificação da etapa {n}: sem resultado automático. Status: {new or step['status']}"}
            store.log(c, msgs[body.action])
            return store.plan(c, pid)

    @app.delete("/api/plans/{pid}", dependencies=[Depends(auth)])
    def delete_plan(pid: int, confirm: bool = Query(False)):
        if not confirm:
            raise HTTPException(400, "Exclusão exige confirmação explícita (?confirm=true)")
        with store.conn() as c:
            if not store.plan(c, pid):
                raise HTTPException(404, "Plano não encontrado")
            c.execute("DELETE FROM plans WHERE id=?", (pid,))
            store.log(c, f"Plano {pid} excluído com confirmação")
        return {"deleted": pid}

    @app.get("/api/history", dependencies=[Depends(auth)])
    def history(limit: int = Query(100, ge=1, le=500)):
        with store.conn() as c:
            return [dict(r) for r in c.execute("SELECT ts,message FROM history ORDER BY id DESC LIMIT ?", (limit,))]

    @app.post("/api/data/analyze", dependencies=[Depends(auth)])
    async def analyze(file: UploadFile = File(...)):
        # Lê no máximo o limite + 1 byte, sem carregar arquivos arbitrariamente grandes na memória.
        raw = await file.read(5_000_001)
        if len(raw) > 5_000_000:
            raise HTTPException(413, "Arquivo acima de 5 MB")
        try:
            res = csvstats.analyze(raw.decode("utf-8-sig"))
        except UnicodeDecodeError:
            raise HTTPException(422, "Use CSV em UTF-8")
        except ValueError as e:
            raise HTTPException(422, str(e))
        with store.conn() as c:
            store.log(c, f"CSV analisado: {file.filename} ({res['rows']} linhas, {res['duplicates']} duplicadas)")
        return res

    return app

app = create_app()
