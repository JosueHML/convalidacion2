import json
import os
import re
import unicodedata
import pandas as pd


def quitar_tildes(texto):
    if not texto:
        return ""
    texto = str(texto)
    texto = unicodedata.normalize('NFD', texto)
    texto = texto.encode('ascii', 'ignore').decode('utf-8')
    return texto.upper().strip()


def norm_mencion(texto):
    if not texto:
        return ""
    t = quitar_tildes(texto)
    for p in ["MENCIÓN:", "MENCION:", "MENCIÓN", "MENCION",
              "PLAN DE ESTUDIOS 2023 AJUSTADO", "PLAN DE ESTUDIOS 2020 AJUSTADO",
              "PLAN DE ESTUDIOS 2023", "PLAN DE ESTUDIOS 2020",
              "AJUSTADO", "LIC. EN INFORMATICA", "LIC. EN INFORMÁTICA",
              "FACULTAD DE CIENCIAS PURAS Y NATURALES",
              "CARRERA DE INFORMATICA"]:
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


def norm_codigo(c):
    c = str(c).upper().replace(" ", "").replace(".", "").replace("_", "").strip()
    m = re.match(r"^([A-Z]+)[\-]?(\d+)$", c)
    if m:
        return f"{m.group(1)}-{m.group(2)}"
    return c


# ============================================================
# PARCHE MANUAL: equivalencias oficiales que faltan en el Excel
# Basado en las TABLAS DE CONVALIDACIÓN OFICIALES 1998 → 2023
# ============================================================
PARCHE_EQUIVALENCIAS = {
    # Todas las menciones tienen INF-111 y LAB-111 → INF-111
    "COMUN": [
        ("INF-111", "INTRODUCCION A LA INFORMATICA", "INF-111", "Programación I"),
        ("LAB-111", "LABORATORIO DE INF-111",        "INF-111", "Programación I"),
        ("LAB-121", "LABORATORIO DE INF-121",        "INF-121", "Programación II"),
        ("LAB-131", "LABORATORIO DE INF-131",        "INF-131", "Programación III"),
        ("LAB-122", "LABORATORIO DE FISICA I",       "INF-116", "Física"),
        ("LAB-132", "LABORATORIO FISICA II",         "INF-123", "Electrónica general I"),
    ],
    # INFORMATICA INDUSTRIAL
    "INFORMATICA INDUSTRIAL": [
        ("INF-112", "ORGANIZACION DE COMPUTADORAS", "INF-112", "Fundamentos digitales"),
        ("INF-113", "LABORATORIO DE COMPUTACION",   "INF-113", "Programación Web I"),
        ("MAT-114", "MATEMATICA DISCRETA I",        "INF-114", "Álgebra"),
        ("MAT-115", "ANALISIS MATEMATICO I",        "INF-115", "Cálculo I"),
        ("LIN-116", "GRAMATICA ESPAÑOLA",           "TRA-136", "Metodología de la investigación"),
        ("INF-121", "ALGORITMOS Y PROGRAMACION",    "INF-121", "Programación II"),
        ("FIS-122", "FISICA I",                     "INF-116", "Física"),
        ("MAT-123", "MATEMATICA DISCRETA II",       "IID-311", "Programación de Dispositivos Móviles II"),
        ("MAT-124", "ALGEBRA LINEAL",               "INF-125", "Álgebra Lineal"),
        ("MAT-125", "ANALISIS MATEMATICO II",       "INF-126", "Cálculo II"),
        ("INF-131", "ESTRUCTURA DE DATOS Y ALGORITMOS", "INF-131", "Programación III"),
        ("FIS-132", "FISICA II",                    "INF-123", "Electrónica general I"),
        ("EST-133", "ESTADISTICA I",                "INF-124", "Estadística I"),
        ("MAT-134", "ANALISIS MATEMATICO III",      "IID-247", "Cálculo III"),
        ("LIN-135", "IDIOMA I",                     "INF-314", "Inglés técnico"),
        ("INF-141", "SISTEMAS DE GESTIÓN",          "IID-312", "Comunicaciones por Satélite"),
        ("INF-142", "FUNDAMENTOS DIGITALES",        "INF-112", "Fundamentos digitales"),
        ("INF-143", "TALLER DE PROGRAMACION",       "INF-131", "Programación III"),
        ("INF-144", "LOGICA PARA LA CIENCIA DE LA COMPUTACION", "IID-313", "Sistemas Avanzados de Comunicaciones"),
        ("EST-145", "ESTADISTICA II",               "INF-134", "Estadística II"),
        ("INF-151", "SISTEMAS OPERATIVOS",          "IID-317", "Instrumentación de Procesos para la Industria Minera"),
        ("INF-152", "SISTEMAS DE INFORMACION GERENCIAL", "INF-318", "Computación en la Nube"),
        ("INF-153", "ASSEMBLER",                    "INF-319", "Programación a bajo nivel"),
        ("INF-154", "LENGUAJES FORMALES Y AUTOMATAS", "IID-316", "Leng. formales y autómatas"),
        ("EST-155", "INVESTIGACIÓN DE OPERACIONES I", "INF-243", "Investigación Operativa I"),
        ("MAT-156", "ANALISIS NUMERICO",            "IID-320", "Sistemas Hidráulicos y Neumáticos de Potencia"),
        ("INF-161", "DISEÑO Y ADMINISTRACIÓN DE BASE DE DATOS", "INF-132", "Base de datos I"),
        ("INF-162", "ANALISIS Y DISEÑO DE SISTEMAS DE INFORMACION", "INF-241", "Análisis y diseño de sistemas I"),
        ("INF-163", "INGENIERIA DE SOFTWARE",       "IID-264", "Ingeniería de software I"),
        ("INF-166", "INFORMATICA Y SOCIEDAD",       "TRA-256", "Legislación Informática y ética"),
        ("INF-273", "TELEMATICA",                   "INF-242", "Redes I"),
        ("LAB-273", "LABORATORIO DE INF-273",       "INF-242", "Redes I"),
        ("INF-281", "TALLER DE SISTEMAS DE INFORMACION", "INF-266", "Taller de Proyecto"),
        ("INF-391", "SIMULACION DE SISTEMAS",       "IID-261", "Simulación de sistemas"),
        ("INF-327", "SISTEMAS DE CONTROL AUTOMATICO", "IID-251", "Sistemas de control"),
        ("INF-329", "IDIOMAS II",                   "INF-314", "Inglés técnico"),
        ("INF-333", "PREPARACION Y EVALUACION DE PROYECTOS I", "INF-315", "Preparación y evaluación de proyectos"),
        ("INF-354", "INTELIGENCIA ARTIFICIAL",      "INF-335", "Inteligencia Artificial"),
        ("INF-357", "ROBÓTICA",                     "INF-244", "Introducción a la robótica"),
    ],
}


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
                except:
                    continue
                if "PLAN DE ESTUDIOS" in celda.upper() and ("2023" in celda or "2020" in celda):
                    mencion = norm_mencion(celda)
                    break
            if mencion:
                break
        if not mencion:
            mencion = f"HOJA_{hoja}"

        for _, fila in df.iloc[4:].iterrows():
            c1998 = str(fila[0]).strip()
            n1998 = str(fila[1]).strip()
            c2023 = str(fila[2]).strip()
            n2023 = str(fila[3]).strip()

            if not c1998 or c1998.upper().startswith(("NOTA", "-", "ELECTIVAS PLAN", "ELECTICAS PLAN", "SI LAS")):
                continue
            if c1998.upper() in ("NAN", "NONE", ""):
                continue

            cod_1998 = norm_codigo(c1998)
            if not cod_1998:
                continue

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

    # ────────────────────────────────────────────────────────
    # PARCHE: agregar equivalencias oficiales que el Excel
    # no tiene bien parseadas
    # ────────────────────────────────────────────────────────
    menciones_json = sorted(set(e["mencion"] for e in eqs))

    # Primero las COMUNES a todas las menciones
    for mencion in menciones_json:
        for cod98, nom98, cod23, nom23 in PARCHE_EQUIVALENCIAS["COMUN"]:
            ya_tiene = any(
                e["mencion"] == mencion and e["cod_1998"] == cod98
                for e in eqs
            )
            if not ya_tiene:
                eqs.append({
                    "mencion": mencion,
                    "cod_1998": cod98,
                    "nombre_1998": nom98,
                    "cod_2023aj": cod23,
                    "nombre_2023aj": nom23,
                    "tipo": "directa",
                })

    # Luego las específicas por mención
    for mencion_patch, lista in PARCHE_EQUIVALENCIAS.items():
        if mencion_patch == "COMUN":
            continue
        if mencion_patch not in menciones_json:
            continue
        for cod98, nom98, cod23, nom23 in lista:
            ya_tiene = any(
                e["mencion"] == mencion_patch and e["cod_1998"] == cod98
                for e in eqs
            )
            if not ya_tiene:
                eqs.append({
                    "mencion": mencion_patch,
                    "cod_1998": cod98,
                    "nombre_1998": nom98,
                    "cod_2023aj": cod23,
                    "nombre_2023aj": nom23,
                    "tipo": "directa",
                })
    # ────────────────────────────────────────────────────────

    with open("data/equivalencias.json", "w", encoding="utf-8") as f:
        json.dump(eqs, f, ensure_ascii=False, indent=2)
    print(f"OK equivalencias.json: {len(eqs)} filas")

    menciones = sorted(set(e["mencion"] for e in eqs))
    print("   Menciones:", menciones)

    # Diagnóstico INF-111
    inf111 = [e for e in eqs if e["cod_1998"] == "INF-111"]
    print(f"   Entradas INF-111: {len(inf111)}")
    for e in inf111:
        print(f"     - {e['mencion']:50s} → {e['cod_2023aj']}")


# ============================================================
# PLAN 1998
# ============================================================
def generar_plan_1998():
    ruta = "../convalidacion/planes/pensum_1998.xlsx"
    xls = pd.ExcelFile(ruta)
    plan = []

    for hoja in xls.sheet_names:
        df = pd.read_excel(ruta, sheet_name=hoja, header=0, dtype=str).fillna("")
        df.columns = [str(c).strip().upper() for c in df.columns]
        mencion = norm_mencion(hoja)

        for _, fila in df.iterrows():
            sem = str(fila.get("SEMESTRE", "")).strip()
            cod = str(fila.get("SIGLA", "")).strip()
            nom = str(fila.get("ASIGNATURA", "")).strip()
            pre = str(fila.get("PRE-REQUISITO", "")).strip()

            if not cod or not nom:
                continue
            try:
                semestre = int(sem)
            except:
                continue

            plan.append({
                "mencion": mencion,
                "semestre": semestre,
                "codigo": norm_codigo(cod),
                "nombre": nom,
                "prerequisitos": pre,
            })

    # PARCHE: agregar INF-111 al plan 1998 de Ing. Sistemas si falta
    for mencion_objetivo in ["INGENIERIA DE SISTEMAS"]:
        tiene_inf111 = any(
            p["mencion"] == mencion_objetivo and p["codigo"] == "INF-111"
            for p in plan
        )
        if not tiene_inf111:
            plan.append({
                "mencion": mencion_objetivo,
                "semestre": 1,
                "codigo": "INF-111",
                "nombre": "INTRODUCCION A LA INFORMATICA",
                "prerequisitos": "MODALIDAD DE ADMISION",
            })

    with open("data/plan_1998.json", "w", encoding="utf-8") as f:
        json.dump(plan, f, ensure_ascii=False, indent=2)
    print(f"OK plan_1998.json: {len(plan)} materias")

    menciones = sorted(set(p["mencion"] for p in plan))
    print("   Menciones:", menciones)


# ============================================================
# MALLA 2023
# ============================================================
def generar_malla_2023():
    ruta = "../convalidacion/planes/unidos.xlsx"
    xls = pd.ExcelFile(ruta)
    malla = []
    ordinales = {"PRIMER": 1, "SEGUNDO": 2, "TERCER": 3, "CUARTO": 4, "QUINTO": 5,
                 "SEXTO": 6, "SEPTIMO": 7, "OCTAVO": 8, "NOVENO": 9}

    for hoja in xls.sheet_names:
        df = pd.read_excel(ruta, sheet_name=hoja, header=None, dtype=str).fillna("")
        mencion = None
        for i in range(0, 15):
            for j in range(0, 8):
                try:
                    celda = str(df.iloc[i, j]).strip()
                except:
                    continue
                if "MENCI" in quitar_tildes(celda):
                    mencion = norm_mencion(celda)
                    break
            if mencion:
                break
        if not mencion:
            mencion = f"HOJA_{hoja}"

        sem_izq, sem_der = 0, 0
        for _, fila in df.iterrows():
            celdas = [str(v).strip() for v in fila.values]

            if len(celdas) > 0 and "SEMESTRE" in quitar_tildes(celdas[0]):
                for p in quitar_tildes(celdas[0]).split():
                    if p in ordinales:
                        sem_izq = ordinales[p]
            if len(celdas) > 6 and "SEMESTRE" in quitar_tildes(celdas[6]):
                for p in quitar_tildes(celdas[6]).split():
                    if p in ordinales:
                        sem_der = ordinales[p]

            if (len(celdas) > 0 and "SEMESTRE" in quitar_tildes(celdas[0])) or \
               (len(celdas) > 6 and "SEMESTRE" in quitar_tildes(celdas[6])):
                continue

            for idx_cod, idx_nom, idx_pre, sem in [(0, 1, 4, sem_izq), (6, 7, 9, sem_der)]:
                if idx_cod >= len(celdas) or idx_nom >= len(celdas):
                    continue
                cod_raw, nom_raw = celdas[idx_cod], celdas[idx_nom]
                pre_raw = celdas[idx_pre] if idx_pre < len(celdas) else ""

                m = re.match(r"^([A-Z]{2,4})[\s\.\-]?(\d{3,4})$", cod_raw.upper())
                if not m or not nom_raw or len(nom_raw) < 3 or sem == 0:
                    continue

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

    menciones = sorted(set(m["mencion"] for m in unicos))
    print("   Menciones:", menciones)


if __name__ == "__main__":
    os.makedirs("data", exist_ok=True)
    print("=" * 60)
    generar_equivalencias()
    print()
    generar_plan_1998()
    print()
    generar_malla_2023()
    print("=" * 60)
    print("JSON regenerados en convalidacion2/data/")