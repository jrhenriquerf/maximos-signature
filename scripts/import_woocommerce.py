import csv, html, io, json, re, sys, unicodedata
from collections import OrderedDict
from datetime import date
from pathlib import Path
from urllib.request import Request, urlopen
from PIL import Image, ImageOps

csv_path = Path(sys.argv[1])
project = Path(sys.argv[2])
output_json = project / "data" / "products.json"
assets_root = project / "assets" / "products"

def slugify(value):
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", value).strip("-")

def text(value):
    value = html.unescape(value or "")
    value = re.sub(r"<[^>]+>", " ", value)
    value = value.replace("\\r\\n", " ").replace("\\n", " ").replace("\r", " ").replace("\n", " ")
    return re.sub(r"\s+", " ", value).strip()

def number(value):
    value = (value or "").strip().replace(".", "").replace(",", ".")
    try: return float(value)
    except ValueError: return None

def measure(row):
    values = {
        "largura": number(row.get("Largura (cm)")),
        "altura": number(row.get("Altura (cm)")),
        "profundidade": number(row.get("Comprimento (cm)")),
    }
    return values if any(v is not None for v in values.values()) else None

download_cache = {}
downloaded = 0
failed = []

def import_image(url, model_slug, sku_slug, index):
    global downloaded
    if url in download_cache:
        return download_cache[url]
    folder = assets_root / model_slug / sku_slug
    folder.mkdir(parents=True, exist_ok=True)
    target = folder / f"{index:02d}.webp"
    relative = target.relative_to(project).as_posix()
    if target.exists() and target.stat().st_size > 0:
        download_cache[url] = relative
        return relative
    try:
        request = Request(url, headers={"User-Agent": "Mozilla/5.0 MaximosCatalogImport/1.0"})
        with urlopen(request, timeout=45) as response:
            raw = response.read()
        with Image.open(io.BytesIO(raw)) as source:
            image = ImageOps.exif_transpose(source)
            image.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
            if image.mode not in ("RGB", "RGBA"):
                image = image.convert("RGBA" if "transparency" in image.info else "RGB")
            image.save(target, "WEBP", quality=84, method=6)
        downloaded += 1
        download_cache[url] = relative
        print(f"[{downloaded}] {relative}", flush=True)
        return relative
    except Exception as exc:
        failed.append({"url": url, "error": str(exc)})
        print(f"FALHA {url}: {exc}", flush=True)
        return url

with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
    rows = [row for row in csv.DictReader(handle) if row.get("Publicado") == "1" and row.get("Visibilidade no catálogo") != "hidden"]

groups = OrderedDict()
for row in rows:
    groups.setdefault(row["Nome"].strip(), []).append(row)

products = []
for order, (name, variants_rows) in enumerate(groups.items(), 1):
    model_slug = slugify(name)
    variants = []
    for row in variants_rows:
        sku = row.get("SKU") or f"wc-{row.get('ID')}"
        sku_slug = slugify(sku)
        urls = [part.strip() for part in (row.get("Imagens") or "").split(",") if part.strip()]
        images = [import_image(url, model_slug, sku_slug, index) for index, url in enumerate(urls, 1)]
        regular = number(row.get("Preço"))
        sale = number(row.get("Preço promocional"))
        current = sale if sale is not None else regular
        color = text(row.get("Valores do atributo 1")) or "Consultar disponibilidade"
        variants.append({
            "id": slugify(f"{model_slug}-{sku}"), "sku": sku, "cor": color,
            "preco": current, "precoAnterior": regular if sale is not None and regular != sale else None,
            "disponivel": row.get("Em estoque?") == "1", "estoque": int(number(row.get("Estoque")) or 0),
            "pesoKg": ((number(row.get("Peso (kg)")) / 1000) if (number(row.get("Peso (kg)")) or 0) > 20 else number(row.get("Peso (kg)"))), "medidas": measure(row), "imagens": images,
        })
    first = next((v for v in variants if v["disponivel"]), variants[0])
    source = variants_rows[0]
    category = "Pequenas" if "Pequenas" in source.get("Categorias", "") else "Grandes"
    colors = list(OrderedDict.fromkeys(v["cor"] for v in variants))
    all_covers = [v["imagens"][0] for v in variants if v["imagens"]]
    products.append({
        "id": model_slug, "nome": name, "categoria": "Bolsas", "colecao": category,
        "preco": min(v["preco"] for v in variants if v["preco"] is not None),
        "precoAnterior": first["precoAnterior"], "disponivel": any(v["disponivel"] for v in variants),
        "destaque": any(r.get("Em destaque?") == "1" for r in variants_rows),
        "resumo": text(source.get("Descrição curta")), "descricao": text(source.get("Descrição")),
        "materiais": ["Couro legítimo", "Construção artesanal"], "cores": colors,
        "medidas": first["medidas"], "imagens": all_covers or first["imagens"],
        "variantes": variants, "imagemConceitual": False, "ordem": order,
    })

showcase = []
if output_json.exists():
    try: showcase = json.loads(output_json.read_text(encoding="utf-8")).get("showcase", [])
    except Exception: pass

payload = {
    "updatedAt": date.today().isoformat(), "currency": "BRL",
    "source": {"type": "woocommerce-csv", "records": len(rows), "models": len(products)},
    "products": products, "showcase": showcase,
}
output_json.parent.mkdir(parents=True, exist_ok=True)
output_json.write_bytes((json.dumps(payload, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
print(json.dumps({"records": len(rows), "models": len(products), "downloaded": downloaded, "failed": len(failed)}, ensure_ascii=False), flush=True)
if failed:
    (project / "data" / "image-import-failures.json").write_bytes((json.dumps(failed, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
