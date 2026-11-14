import sqlite3, os
from datetime import datetime, timezone

SCHEMA = """
CREATE TABLE IF NOT EXISTS plans(id INTEGER PRIMARY KEY AUTOINCREMENT, goal TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS steps(plan_id INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE, n INTEGER NOT NULL,
  title TEXT, prio TEXT, kind TEXT, detail TEXT, status TEXT NOT NULL DEFAULT 'pendente', PRIMARY KEY(plan_id, n));
CREATE TABLE IF NOT EXISTS history(id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT NOT NULL, message TEXT NOT NULL);
"""

def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")

class Store:
    def __init__(self, path):
        if path != ":memory:":
            os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        self.path = path
        with self.conn() as c:
            c.executescript(SCHEMA)

    def conn(self):
        c = sqlite3.connect(self.path)
        c.row_factory = sqlite3.Row
        c.execute("PRAGMA foreign_keys=ON")
        return c

    def log(self, c, message):
        c.execute("INSERT INTO history(ts,message) VALUES(?,?)", (now(), message))

    def plan(self, c, pid):
        p = c.execute("SELECT * FROM plans WHERE id=?", (pid,)).fetchone()
        if not p:
            return None
        s = c.execute("SELECT n,title,prio,kind,detail,status FROM steps WHERE plan_id=? ORDER BY n", (pid,)).fetchall()
        return {"id": p["id"], "goal": p["goal"], "created_at": p["created_at"], "steps": [dict(x) for x in s]}
