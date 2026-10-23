# Smoke tests for Actualiza Presupuesto remap/resolve logic (mirror of logistica.js)

def textos_identidad(fila):
    out = []

    def push(s):
        s = str(s or "").strip().lower()
        if s and s not in out:
            out.append(s)

    ov = fila.get("over") or {}
    sn = fila.get("snap") or {}
    f = sn.get("ficha") or {}
    push(ov.get("titulo"))
    push(f.get("titulo"))
    push(sn.get("nombre"))
    if f.get("titulo") and sn.get("nombre") and f.get("titulo") != sn.get("nombre"):
        push(str(sn["nombre"]).strip() + " — " + str(f["titulo"]).strip())
    return out


def resolver_elem(fila, elems):
    if fila.get("elem") and any(str(e["id"]) == str(fila["elem"]) for e in elems):
        return str(fila["elem"])
    if not elems:
        return ""
    if len(elems) == 1:
        return str(elems[0]["id"])
    claves = textos_identidad(fila)
    if not claves:
        return ""
    for e in elems:
        n = str(e.get("nombre") or "").strip().lower()
        if n and n in claves:
            return str(e["id"])
    for e in elems:
        t = str((e.get("fichaComercial") or {}).get("titulo") or "").strip().lower()
        n = str(e.get("nombre") or "").strip().lower()
        for clave in claves:
            if (t and (t == clave or t in clave or clave in t)) or (
                n and (n in clave or clave in n)
            ):
                return str(e["id"])
    return ""


def escalas_prev(fila):
    sn = fila.get("snap") or {}
    out = []

    def push(id_, q=None, pu=None):
        if id_ is None or id_ == "":
            return
        if any(e["id"] == id_ for e in out):
            return
        out.append(
            {
                "id": id_,
                "q": None if q is None else float(q),
                "puCop": None if pu is None else float(pu),
            }
        )

    if sn.get("escalas"):
        for e in sn["escalas"]:
            if e:
                push(e["id"], e.get("q"), e.get("puCop"))
    elif sn.get("q") is not None and fila.get("lote"):
        push(fila["lote"], sn["q"], sn.get("puCop"))
    for id_ in (fila.get("opc") or {}).values():
        known = next((e for e in out if e["id"] == id_), None)
        push(id_, known["q"] if known else None, known["puCop"] if known else None)
    if fila.get("lote"):
        push(fila["lote"])
    return out


def remap(fila, pr_escalas, prev):
    map_id = {}
    for old in prev:
        if not old or old.get("id") is None:
            continue
        neu = None
        if old.get("q") is not None:
            neu = next((e for e in pr_escalas if float(e["q"]) == float(old["q"])), None)
        if not neu:
            neu = next((e for e in pr_escalas if e["id"] == old["id"]), None)
        if neu:
            map_id[old["id"]] = neu["id"]

    def resolver(lote_id):
        if lote_id is None or lote_id == "":
            return lote_id
        if lote_id in map_id:
            return map_id[lote_id]
        if any(e["id"] == lote_id for e in pr_escalas):
            return lote_id
        old = next((e for e in prev if e and e["id"] == lote_id), None)
        if old and old.get("q") is not None:
            neu = next((e for e in pr_escalas if float(e["q"]) == float(old["q"])), None)
            if neu:
                return neu["id"]
        return lote_id

    nuevo = resolver(fila["lote"])
    if nuevo and any(e["id"] == nuevo for e in pr_escalas):
        fila["lote"] = nuevo
    elif not any(e["id"] == fila.get("lote") for e in pr_escalas):
        fila["lote"] = pr_escalas[0]["id"]
    if fila.get("opc"):
        for k, v in list(fila["opc"].items()):
            r = resolver(v)
            if r and any(e["id"] == r for e in pr_escalas):
                fila["opc"][k] = r
    return fila


fails = []


def check(name, cond):
    if not cond:
        fails.append(name)
        print("FAIL", name)
    else:
        print("OK  ", name)


elems = [
    {
        "id": "m1",
        "nombre": "Floor Display Sempertex (Metal/Plástico)",
        "fichaComercial": {"titulo": "Floor Display Sempertex (Metal/Plástico)"},
    },
    {
        "id": "c1",
        "nombre": "Cartonplast",
        "fichaComercial": {"titulo": "Versión Cartonplast"},
    },
]
pr_m = [{"id": "eA", "q": 5, "puCop": 384330}, {"id": "eB", "q": 10, "puCop": 371149}]
pr_c = [{"id": "eA", "q": 5, "puCop": 400000}, {"id": "eB", "q": 10, "puCop": 390000}]

filas = [
    {
        "tipo": "item",
        "proy": "17710-A",
        "ver": "V1",
        "lote": "old5",
        "opc": {"e1": "old5"},
        "excl": {"e2": True},
        "snap": {
            "nombre": "Floor Display Sempertex (Metal/Plástico)",
            "ficha": {"titulo": "Floor Display Sempertex (Metal/Plástico)"},
            "escalas": [
                {"id": "old5", "q": 5, "puCop": 1},
                {"id": "old10", "q": 10, "puCop": 2},
            ],
        },
    },
    {
        "tipo": "item",
        "proy": "17710-A",
        "ver": "V1",
        "lote": "old10",
        "opc": {"e1": "old10"},
        "excl": {"e2": True},
        "snap": {
            "nombre": "Floor Display Sempertex (Metal/Plástico)",
            "ficha": {"titulo": "Floor Display Sempertex (Metal/Plástico)"},
            "escalas": [{"id": "old5", "q": 5}, {"id": "old10", "q": 10}],
        },
    },
    {
        "tipo": "item",
        "proy": "17710-A",
        "ver": "V1",
        "lote": "old5",
        "opc": {"e2": "old5"},
        "excl": {"e1": True},
        "snap": {
            "nombre": "Cartonplast",
            "ficha": {"titulo": "Versión Cartonplast"},
            "escalas": [{"id": "old5", "q": 5}, {"id": "old10", "q": 10}],
        },
    },
    {
        "tipo": "item",
        "proy": "17710-A",
        "ver": "V1",
        "lote": "old10",
        "opc": {"e2": "old10"},
        "excl": {"e1": True},
        "snap": {
            "ficha": {"titulo": "Versión Cartonplast"},
            "nombre": "Floor Display Sempertex — Versión Cartonplast",
            "escalas": [{"id": "old5", "q": 5}, {"id": "old10", "q": 10}],
        },
    },
]

resolved = []
for f in filas:
    eid = resolver_elem(f, elems)
    f["elem"] = eid
    resolved.append(eid)
    prev = escalas_prev(f)
    pr = pr_m if eid == "m1" else pr_c
    excl_before = dict(f.get("excl") or {})
    opc_before = dict(f.get("opc") or {})
    remap(f, pr, prev)
    check("excl preserved %s %s" % (eid, f["lote"]), f.get("excl") == excl_before)
    check("opc keys preserved %s" % eid, set(f["opc"]) == set(opc_before))

check("metal1", resolved[0] == "m1")
check("metal2", resolved[1] == "m1")
check("cart1", resolved[2] == "c1")
check("cart2", resolved[3] == "c1")
check("lote Q5 metal", filas[0]["lote"] == "eA" and filas[0]["opc"]["e1"] == "eA")
check("lote Q10 metal", filas[1]["lote"] == "eB" and filas[1]["opc"]["e1"] == "eB")
check("lote Q5 cart", filas[2]["lote"] == "eA")
check("lote Q10 cart", filas[3]["lote"] == "eB")

check("indiv empty elems", resolver_elem({"snap": {}}, []) == "")

f = {"lote": "L1", "snap": {"escalas": [{"id": "L1", "q": 100, "puCop": 9}]}}
remap(f, [{"id": "N1", "q": 100, "puCop": 10}, {"id": "N2", "q": 200, "puCop": 8}], escalas_prev(f))
check("unica remap q", f["lote"] == "N1")

f = {"lote": "x", "snap": {"q": 10, "puCop": 50}}
prev = escalas_prev(f)
check("synth escalas", len(prev) == 1 and prev[0]["q"] == 10)
remap(f, [{"id": "a", "q": 5}, {"id": "b", "q": 10}], prev)
check("synth remap Q10", f["lote"] == "b")

todas = [
    {"tipo": "item", "proy": "A"},
    {"tipo": "item", "proy": "B"},
    {"tipo": "envio", "proy": "A"},
    {"tipo": "seccion"},
]
filas_cons = [x for x in todas if x["tipo"] == "item" and x["proy"].upper() == "A"]
check("CONS filter", len(filas_cons) == 1 and filas_cons[0]["proy"] == "A")

check("no match", resolver_elem({"snap": {"ficha": {"titulo": "Otro"}}}, elems) == "")

f = {"over": {"titulo": "Cartonplast"}, "snap": {"ficha": {"titulo": "Metal"}}}
check("over titulo", resolver_elem(f, elems) == "c1")

f = {
    "lote": "eB",
    "opc": {"e1": "eB", "e2": "eA"},
    "excl": {},
    "snap": {"escalas": [{"id": "eA", "q": 5}, {"id": "eB", "q": 10}]},
}
remap(f, pr_m, escalas_prev(f))
check("stable ids", f["lote"] == "eB" and f["opc"]["e1"] == "eB" and f["opc"]["e2"] == "eA")

f = {
    "lote": "old5",
    "opc": {"a": "old5", "b": "old10", "c": "old5"},
    "snap": {"escalas": [{"id": "old5", "q": 5}, {"id": "old10", "q": 10}]},
}
remap(f, pr_m, escalas_prev(f))
check("3 esc", f["opc"] == {"a": "eA", "b": "eB", "c": "eA"})

# grupal multi without elem must refuse
check(
    "refuse multi without elem",
    (len(elems) > 1 and resolver_elem({"snap": {"ficha": {"titulo": "zzz"}}}, elems) == ""),
)

print("---")
if fails:
    print("FAILED", len(fails), fails)
    raise SystemExit(1)
print("ALL OK", "cases passed")
