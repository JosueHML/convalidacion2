import http.server
import socketserver
import os
import json

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, format, *args):
        # Silenciar logs de cada request para no llenar la consola
        pass


def diagnostico():
    print("=" * 60)
    print("DIAGNÓSTICO DE ARCHIVOS")
    print("=" * 60)
    archivos = [
        "index.html",
        "js/app.js",
        "js/motor.js",
        "js/lector.js",
        "js/generador_pdf.js",
        "js/generador_excel.js",
        "data/equivalencias.json",
        "data/plan_1998.json",
        "data/malla_2023.json",
    ]
    for f in archivos:
        if os.path.exists(f):
            size = os.path.getsize(f)
            print(f"  ✅ {f:35s} ({size:,} bytes)")
        else:
            print(f"  ❌ FALTA: {f}")

    print()
    print("VERIFICANDO JSON")
    print("-" * 60)
    try:
        with open("data/equivalencias.json", encoding="utf-8") as fh:
            eq = json.load(fh)
        print(f"  equivalencias.json: {len(eq)} filas")
        inf111 = [e for e in eq if e.get("cod_1998") == "INF-111"]
        print(f"  Entradas INF-111: {len(inf111)}")
        for e in inf111:
            print(f"    - {e['mencion']:50s} → {e['cod_2023aj']}")
    except Exception as e:
        print(f"  ❌ Error leyendo equivalencias.json: {e}")

    try:
        with open("data/plan_1998.json", encoding="utf-8") as fh:
            p98 = json.load(fh)
        print(f"  plan_1998.json: {len(p98)} materias")
    except Exception as e:
        print(f"  ❌ Error leyendo plan_1998.json: {e}")

    try:
        with open("data/malla_2023.json", encoding="utf-8") as fh:
            m23 = json.load(fh)
        print(f"  malla_2023.json: {len(m23)} materias")
    except Exception as e:
        print(f"  ❌ Error leyendo malla_2023.json: {e}")

    print("=" * 60)
    print()


if __name__ == "__main__":
    diagnostico()
    PORT = 8000
    with socketserver.TCPServer(("", PORT), NoCacheHandler) as httpd:
        print(f"🚀 Servidor SIN CACHÉ corriendo en http://localhost:{PORT}")
        print("   Presiona Ctrl+C para detener")
        print("=" * 60)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n👋 Servidor detenido")