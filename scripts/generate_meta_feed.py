#!/usr/bin/env python3
"""Gera o feed CSV do Meta Commerce a partir do catalogo publico."""

from __future__ import annotations

import argparse
import csv
from io import StringIO
import json
from pathlib import Path
import sys
from urllib.parse import quote, urljoin

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CATALOG = ROOT / "data" / "products.json"
DEFAULT_OUTPUT = ROOT / "data" / "meta-commerce.csv"
DEFAULT_BASE_URL = "https://jrhenriquerf.github.io/maximos-signature/"
FIELDNAMES = [
    "id", "title", "description", "availability", "condition", "price",
    "sale_price", "link", "image_link", "additional_image_link", "brand",
    "quantity_to_sell_on_facebook", "product_type",
    "google_product_category", "color", "custom_label_0", "custom_label_1",
    "custom_label_2",
]

UNKNOWN_COLORS = {"consultar disponibilidade", "a consultar", "sob consulta"}
GOOGLE_HANDBAGS_CATEGORY = (
    "Apparel & Accessories > Handbags, Wallets & Cases > Handbags"
)
PRODUCT_TYPES = {"Tote", "Tiracolo", "Porta-celular"}
PRODUCT_SIZES = {"Mini", "Compacta", "Média", "Grande"}


class FeedError(ValueError):
    """Erro de dados que impede a publicacao de um feed valido."""


def absolute_url(base_url: str, path: str) -> str:
    return urljoin(base_url.rstrip("/") + "/", path.lstrip("/"))


def money(value: object, currency: str) -> str:
    try:
        amount = float(value)
    except (TypeError, ValueError) as error:
        raise FeedError(f"Preco invalido: {value!r}.") from error
    if amount < 0:
        raise FeedError(f"Preco negativo: {value!r}.")
    return f"{amount:.2f} {currency}"


def build_rows(catalog: dict, base_url: str = DEFAULT_BASE_URL) -> list[dict[str, str]]:
    products = catalog.get("products")
    if not isinstance(products, list):
        raise FeedError("O catalogo nao possui uma lista products.")
    currency = str(catalog.get("currency") or "BRL").upper()
    rows: list[dict[str, str]] = []
    seen_skus: set[str] = set()

    for product in products:
        product_id = str(product.get("id") or "").strip()
        product_name = str(product.get("nome") or "").strip()
        variants = product.get("variantes")
        if not product_id or not product_name or not isinstance(variants, list) or not variants:
            label = product_id or product_name or "(sem identificacao)"
            raise FeedError(f"Produto incompleto no feed: {label}.")
        product_type = str(product.get("tipo") or "").strip()
        product_line = str(product.get("linha") or "").strip()
        product_size = str(product.get("porte") or "").strip()
        if product_type not in PRODUCT_TYPES or not product_line or product_size not in PRODUCT_SIZES:
            raise FeedError(f"Taxonomia incompleta no produto {product_name}.")

        for variant in variants:
            sku = str(variant.get("sku") or "").strip().upper()
            color = str(variant.get("cor") or "").strip()
            feed_color = "" if color.casefold() in UNKNOWN_COLORS else color
            images = variant.get("imagens") or product.get("imagens") or []
            if not sku or sku in seen_skus:
                raise FeedError(f"SKU ausente ou duplicado no feed: {sku or '(vazio)'}.")
            if not color:
                raise FeedError(f"Modelo sem nome no SKU {sku}.")
            if not isinstance(images, list) or not images:
                raise FeedError(f"O SKU {sku} precisa de ao menos uma imagem.")

            try:
                stock = max(0, int(variant.get("estoque", 0)))
            except (TypeError, ValueError) as error:
                raise FeedError(f"Estoque invalido no SKU {sku}.") from error
            available = bool(variant.get("disponivel")) and stock > 0
            current_price = variant.get("preco", product.get("preco"))
            previous_price = variant.get("precoAnterior", product.get("precoAnterior"))
            try:
                has_sale = previous_price is not None and float(previous_price) > float(current_price)
            except (TypeError, ValueError) as error:
                raise FeedError(f"Preco invalido no SKU {sku}.") from error
            description = str(
                product.get("descricao") or product.get("resumo") or product_name
            ).strip()
            additional_images = [
                absolute_url(base_url, str(image)) for image in images[1:]
            ]

            rows.append({
                "id": sku,
                "title": (
                    f"{product_name} - {feed_color}"
                    if feed_color
                    else f"{product_name} - {sku}"
                ),
                "description": description,
                "availability": "in stock" if available else "out of stock",
                "condition": "new",
                "price": money(previous_price if has_sale else current_price, currency),
                "sale_price": money(current_price, currency) if has_sale else "",
                "link": absolute_url(
                    base_url,
                    f"produto.html?id={quote(product_id, safe='')}&sku={quote(sku, safe='')}",
                ),
                "image_link": absolute_url(base_url, str(images[0])),
                "additional_image_link": ",".join(additional_images),
                "brand": "Maximos Signature",
                "quantity_to_sell_on_facebook": str(stock if available else 0),
                "product_type": " > ".join(
                    value for value in [
                        str(product.get("categoria") or "").strip(),
                        product_type,
                        str(product.get("subtipo") or "").strip(),
                    ] if value
                ),
                "google_product_category": GOOGLE_HANDBAGS_CATEGORY,
                "color": feed_color,
                "custom_label_0": product_size,
                "custom_label_1": product_line,
                "custom_label_2": str(product.get("acabamento") or "").strip(),
            })
            seen_skus.add(sku)

    if not rows:
        raise FeedError("O catalogo nao gerou nenhum item para o feed.")
    return rows


def render_feed(catalog: dict, base_url: str = DEFAULT_BASE_URL) -> str:
    output = StringIO(newline="")
    writer = csv.DictWriter(output, fieldnames=FIELDNAMES, lineterminator="\n")
    writer.writeheader()
    writer.writerows(build_rows(catalog, base_url))
    return output.getvalue()


def load_catalog(path: Path = DEFAULT_CATALOG) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Gera o feed CSV para Meta Commerce/WhatsApp Business."
    )
    parser.add_argument("--catalog", type=Path, default=DEFAULT_CATALOG)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument(
        "--check",
        action="store_true",
        help="Falha se o feed versionado estiver desatualizado.",
    )
    arguments = parser.parse_args()

    try:
        catalog = load_catalog(arguments.catalog)
        rows = build_rows(catalog, arguments.base_url)
        rendered = render_feed(catalog, arguments.base_url)
    except (FeedError, json.JSONDecodeError, OSError) as error:
        print(f"Erro: {error}", file=sys.stderr)
        return 1

    if arguments.check:
        if (
            not arguments.output.exists()
            or arguments.output.read_text(encoding="utf-8") != rendered
        ):
            print(f"Erro: {arguments.output} esta ausente ou desatualizado.", file=sys.stderr)
            return 1
        print(f"Feed valido e atualizado: {arguments.output} ({len(rows)} itens)")
        return 0

    arguments.output.parent.mkdir(parents=True, exist_ok=True)
    arguments.output.write_text(rendered, encoding="utf-8", newline="")
    print(f"Feed gerado: {arguments.output} ({len(rows)} itens)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
