import io, pytest
from fastapi.testclient import TestClient
from app.main import create_app
from app import csvstats, planner

@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("API_TOKEN", "chave-de-teste-nao-publica")
    return TestClient(create_app(str(tmp_path / "t.db")),
                      headers={"X-API-Key": "chave-de-teste-nao-publica"})

def test_health(client):
    assert client.get("/api/health").json()["status"] == "ok"

def test_integrations_not_implemented(client):
    j = client.get("/api/integrations").json()
    assert j["github"]["implemented"] is False and j["claude"]["implemented"] is False

def test_planner_size():
    assert 3 <= len(planner.make_plan("Analise meu repositório e corrija os problemas no código")) <= 5
    assert 3 <= len(planner.make_plan("organizar minhas tarefas")) <= 5

def test_plan_flow_and_persistence(client):
    p = client.post("/api/plans", json={"goal": "Analise o CSV de vendas"}).json()
    assert all(s["status"] == "pendente" for s in p["steps"])
    r = client.patch(f"/api/plans/{p['id']}/steps/1", json={"action": "complete"}).json()
    assert r["steps"][0]["status"] == "concluída"
    assert client.get(f"/api/plans/{p['id']}").json()["steps"][0]["status"] == "concluída"
    assert any("concluída" in h["message"] for h in client.get("/api/history").json())

def test_invalid_inputs(client):
    assert client.post("/api/plans", json={"goal": "x"}).status_code == 422
    p = client.post("/api/plans", json={"goal": "um objetivo válido"}).json()
    assert client.patch(f"/api/plans/{p['id']}/steps/1", json={"action": "x"}).status_code == 422
    assert client.patch(f"/api/plans/{p['id']}/steps/99", json={"action": "start"}).status_code == 404
    assert client.get("/api/plans/999").status_code == 404

def test_delete_requires_confirmation(client):
    p = client.post("/api/plans", json={"goal": "um objetivo válido"}).json()
    assert client.delete(f"/api/plans/{p['id']}").status_code == 400
    assert client.delete(f"/api/plans/{p['id']}?confirm=true").status_code == 200
    assert client.get(f"/api/plans/{p['id']}").status_code == 404

def test_api_token(tmp_path, monkeypatch):
    monkeypatch.setenv("API_TOKEN", "segredo")
    c = TestClient(create_app(str(tmp_path / "a.db")))
    assert c.get("/api/health").status_code == 200
    assert c.get("/api/plans").status_code == 401
    assert c.get("/api/plans", headers={"X-API-Key": "segredo"}).status_code == 200


def test_api_sem_token_servidor_bloqueia(tmp_path, monkeypatch):
    monkeypatch.delenv("API_TOKEN", raising=False)
    c = TestClient(create_app(str(tmp_path / "a.db")))
    assert c.get("/api/health").status_code == 200
    assert c.get("/api/plans").status_code == 503
    assert c.post("/api/plans", json={"goal": "Criar um painel"}).status_code == 503
    assert c.get("/api/plans", headers={"X-API-Key": "inventada"}).status_code == 503


def test_api_chave_errada_bloqueada(tmp_path, monkeypatch):
    monkeypatch.setenv("API_TOKEN", "chave-correta")
    c = TestClient(create_app(str(tmp_path / "a.db")))
    assert c.post("/api/plans", json={"goal": "Criar um painel"},
                  headers={"X-API-Key": "chave-errada"}).status_code == 401


def test_api_csv_limite_arquivo(client):
    payload = {"file": ("grande.csv", io.BytesIO(b"a,b\n" + b"1,2\n" * 1_300_000), "text/csv")}
    assert client.post("/api/data/analyze", files=payload).status_code == 413

def test_csv_stats():
    r = csvstats.analyze("a;b\n1;x\n2;\n2;\n")
    assert r["rows"] == 3 and r["duplicates"] == 1
    assert r["cols"][0]["type"] == "numérico" and r["cols"][0]["mean"] == 1.67
    assert r["cols"][1]["missing"] == 2

def test_csv_endpoint(client):
    f = {"file": ("d.csv", io.BytesIO(b"a,b\n1,2\n3,4\n"), "text/csv")}
    assert client.post("/api/data/analyze", files=f).json()["rows"] == 2
    bad = {"file": ("d.csv", io.BytesIO(b"a,b\n"), "text/csv")}
    assert client.post("/api/data/analyze", files=bad).status_code == 422
