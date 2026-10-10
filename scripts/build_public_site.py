#!/usr/bin/env python3
"""Prepara dist somente com arquivos públicos, após validar o catálogo e as páginas."""
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
PAGES = ["index.html", "catalogo.html", "produto.html", "404.html", "como-comprar.html",
         "trocas-e-envios.html", "privacidade.html", "termos.html"]


def main():
    subprocess.run(["python3", "scripts/generate_meta_feed.py", "--check"], cwd=ROOT, check=True)
    subprocess.run(["node", "scripts/generate_public_pages.cjs", "--check"], cwd=ROOT, check=True)
    DIST.mkdir(exist_ok=True)
    # dist é um artefato gerado e nunca contém os backups ou ferramentas locais.
    allowed = set(PAGES + ["robots.txt", "sitemap.xml", "_headers", "_redirects"])
    allowed.update(file.name for file in ROOT.glob("*.css") if file.name != "admin.css")
    allowed.update(file.name for file in ROOT.glob("*.js") if file.name != "admin.js")
    for file in DIST.iterdir():
        if file.name not in allowed and file.name not in {"assets", "bolsas", "data"}:
            if file.is_dir():
                shutil.rmtree(file)
            else:
                file.unlink()
    for file in allowed:
        shutil.copy2(ROOT / file, DIST / file)
    for folder in ["assets", "bolsas"]:
        target = DIST / folder
        if target.exists():
            shutil.rmtree(target)
        shutil.copytree(ROOT / folder, target)
    data = DIST / "data"
    if data.exists():
        shutil.rmtree(data)
    data.mkdir()
    for file in ["products.json", "meta-commerce.csv"]:
        shutil.copy2(ROOT / "data" / file, data / file)
    print("dist preparada: páginas, estilos, scripts públicos, imagens, catálogo e feed.")


if __name__ == "__main__":
    main()
