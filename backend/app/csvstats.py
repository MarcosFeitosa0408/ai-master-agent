import csv, io, statistics

def analyze(text: str):
    first = text.splitlines()[0] if text.strip() else ""
    delim = ";" if first.count(";") > first.count(",") else ","
    rows = [r for r in csv.reader(io.StringIO(text), delimiter=delim) if any(c.strip() for c in r)]
    if len(rows) < 2:
        raise ValueError("Arquivo sem dados suficientes")
    head = [h.strip() for h in rows[0]]
    data = rows[1:]
    seen, dup = set(), 0
    for r in data:
        k = tuple(r)
        if k in seen:
            dup += 1
        else:
            seen.add(k)
    cols = []
    for j, name in enumerate(head):
        v = [(r[j] if j < len(r) else "").strip() for r in data]
        ne = [x for x in v if x]
        nums = []
        for x in ne:
            try:
                nums.append(float(x.replace(",", ".")))
            except ValueError:
                nums = None
                break
        c = {"name": name, "missing": len(v) - len(ne)}
        if ne and nums is not None:
            c.update(type="numérico", min=min(nums), max=max(nums), mean=round(statistics.fmean(nums), 2),
                     median=statistics.median(nums))
        else:
            c.update(type="texto", distinct=len(set(ne)))
        cols.append(c)
    return {"rows": len(data), "columns": len(head), "duplicates": dup, "cols": cols}
