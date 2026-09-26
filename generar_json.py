import json
import os
import re
import pandas as pd

def norm_codigo(c):
    c = str(c).upper().replace(" ", "").replace(".", "").strip()
    m = re.match(r"^([A-Z]+)[\-]?(\d+)$", c)
    if m:
        return f"{m.group(1)}-{m.group(2)}"
    return c

def norm_mencion(texto):
    if not texto:
        return ""
    t = texto.upper()
    for p in ["MENCIÓN:", "MENCION:", "MENCIÓN", "MENCION",
              "PLAN DE ESTUDIOS 2023 AJUSTADO", "PLAN DE ESTUDIOS 2020 AJUSTADO",
              "PLAN DE ESTUDIOS 2023", "PLAN DE ESTUDIOS 2020",
              "AJUSTADO", "LIC. EN INFORMATICA", "LIC. EN INFORMÁTICA"]:
        t = t.replace(p, "")
    t = t.strip(" :-")
    if "INTELIGENCIA ARTIFICIAL" in t: return "INTELIGENCIA ARTIFICIAL Y CIENCIA DE DATOS"
    if "REDES Y TECNOLOG" in t: return "REDES Y TECNOLOGIAS DE LA INFORMACION"
    if "CIENCIAS DE LA COMPUTACION" in t: return "CIENCIAS DE LA COMPUTACION"
    if "DESARROLLO DE SOFTWARE" in t: return "DESARROLLO DE SOFTWARE E INNOVACION TECNOLOGICA"
    if "INFORMATICA INDUSTRIAL" in t: return "INFORMATICA INDUSTRIAL"
    if "INGENIERIA DE SISTEMAS" in t: return "INGENIERIA DE SISTEMAS"
    if "SEGURIDAD DE LA INFORMACION" in t: return "SEGURIDAD DE LA INFORMACION"
    return t

def generar_equivalencias():
    ruta = "../convalidacion/planes/convalidacion_1998.xlsx"
    xls = pd.ExcelFile(ruta)
    eqs = []
    for hoja in xls.sheet_names:
        df = pd.read_excel(ruta, sheet_name=hoja, header=None, dtype=str).fillna("")
        mencion = None
        for i in range(0, 8):
            for j in range(0, 8):
                try:
                    celda = str(df.iloc[i, j]).strip()
                except: continue
                if "PLAN DE ESTUDIOS" in celda.upper() and ("2023" in celda or "2020" in celda):
                    mencion = norm_mencion(celda)
                    break
            if mencion: break
        if not mencion: mencion = f"HOJA_{hoja}"
        
        for _, fila in df.iloc[4:].iterrows():
            c1998 = str(fila[0]).strip()
            n1998 = str(fila[1]).strip()
            c2023 = str(fila[2]).strip()
            n2023 = str(fila[3]).strip()
            if not c1998 or c1998.upper().startswith(("NOTA", "-", "ELECTIVAS PLAN", "ELECTICAS PLAN", "SI LAS")):
                continue
            if c1998.upper() in ("NAN", "NONE", ""): continue
            cod_1998 = norm_codigo(c1998)
            if not cod_1998: continue
            if not c2023 and not n2023:
                tipo, cod_2023, nom_2023 = "no_convalida", None, None
            elif "ELECTIVA" in c2023.upper() or "ELECTIVA" in n2023.upper():
                tipo, cod_2023, nom_2023 = "electiva", "ELECTIVA", "ELECTIVA"
            elif c2023.startswith("="):
                tipo, cod_2023, nom_2023 = "pendiente", None, n2023
            else:
                tipo, cod_2023, nom_2023 = "directa", norm_codigo(c2023), n2023
            eqs.append({
                "mencion": mencion,
                "cod_1998": cod_1998,
                "nombre_1998": n1998,
                "cod_2023aj": cod_2023,
                "nombre_2023aj": nom_2023,
                "tipo": tipo,
            })
    with open("data/equivalencias.json", "w", encoding="utf-8") as f:
        json.dump(eqs, f, ensure_ascii=False, indent=2)
    print(f"OK equivalencias.json: {len(eqs)} filas")

def generar_plan_1998():
    ruta = "../convalidacion/planes/pensum_1998.xlsx"
    xls = pd.ExcelFile(ruta)
    plan = []
    for hoja in xls.sheet_names:
        df = pd.read_excel(ruta, sheet_name=hoja, header=0, dtype=str).fillna("")
        df.columns = [str(c).strip().upper() for c in df.columns]
        mencion = hoja.upper().strip()
        for _, fila in df.iterrows():
            sem = str(fila.get("SEMESTRE", "")).strip()
            cod = str(fila.get("SIGLA", "")).strip()
            nom = str(fila.get("ASIGNATURA", "")).strip()
            pre = str(fila.get("PRE-REQUISITO", "")).strip()
            if not cod or not nom: continue
            try: semestre = int(sem)
            except: continue
            plan.append({
                "mencion": mencion,
                "semestre": semestre,
                "codigo": norm_codigo(cod),
                "nombre": nom,
                "prerequisitos": pre,
            })
    with open("data/plan_1998.json", "w", encoding="utf-8") as f:
        json.dump(plan, f, ensure_ascii=False, indent=2)
    print(f"OK plan_1998.json: {len(plan)} materias")

def generar_malla_2023():
    ruta = "../convalidacion/planes/unidos.xlsx"
    xls = pd.ExcelFile(ruta)
    malla = []
    ordinales = {"PRIMER":1,"SEGUNDO":2,"TERCER":3,"CUARTO":4,"QUINTO":5,"SEXTO":6,
                 "SEPTIMO":7,"SÉPTIMO":7,"OCTAVO":8,"NOVENO":9}
    for hoja in xls.sheet_names:
        df = pd.read_excel(ruta, sheet_name=hoja, header=None, dtype=str).fillna("")
        mencion = None
        for i in range(0, 15):
            for j in range(0, 8):
                try: celda = str(df.iloc[i, j]).strip()
                except: continue
                if "MENCI" in celda.upper():
                    mencion = norm_mencion(celda)
                    break
            if mencion: break
        if not mencion: mencion = f"HOJA_{hoja}"
        sem_izq, sem_der = 0, 0
        for _, fila in df.iterrows():
            celdas = [str(v).strip() for v in fila.values]
            if len(celdas) > 0 and "SEMESTRE" in celdas[0].upper():
                for p in celdas[0].upper().split():
                    if p in ordinales: sem_izq = ordinales[p]
            if len(celdas) > 6 and "SEMESTRE" in celdas[6].upper():
                for p in celdas[6].upper().split():
                    if p in ordinales: sem_der = ordinales[p]
            if (len(celdas) > 0 and "SEMESTRE" in celdas[0].upper()) or \
               (len(celdas) > 6 and "SEMESTRE" in celdas[6].upper()):
                continue
            for idx_cod, idx_nom, idx_pre, sem in [(0,1,4,sem_izq),(6,7,9,sem_der)]:
                if idx_cod >= len(celdas) or idx_nom >= len(celdas): continue
                cod_raw, nom_raw = celdas[idx_cod], celdas[idx_nom]
                pre_raw = celdas[idx_pre] if idx_pre < len(celdas) else ""
                m = re.match(r"^([A-Z]{2,4})[\s\.\-]?(\d{3,4})$", cod_raw.upper())
                if not m or not nom_raw or len(nom_raw) < 3 or sem == 0: continue
                malla.append({
                    "mencion": mencion,
                    "semestre": sem,
                    "codigo": f"{m.group(1)}-{m.group(2)}",
                    "nombre": nom_raw,
                    "prerequisitos": pre_raw,
                })
    vistos, unicos = set(), []
    for m in malla:
        k = (m["mencion"], m["codigo"])
        if k not in vistos:
            vistos.add(k)
            unicos.append(m)
    with open("data/malla_2023.json", "w", encoding="utf-8") as f:
        json.dump(unicos, f, ensure_ascii=False, indent=2)
    print(f"OK malla_2023.json: {len(unicos)} materias")

if __name__ == "__main__":
    os.makedirs("data", exist_ok=True)
    generar_equivalencias()
    generar_plan_1998()
    generar_malla_2023()
    print("\nJSON generados en convalidacion2/data/")