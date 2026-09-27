#!/usr/bin/env python3

from __future__ import annotations

import csv
from io import StringIO
import unittest

from generate_meta_feed import FeedError, build_rows, render_feed


class MetaFeedTests(unittest.TestCase):
    def setUp(self) -> None:
        self.catalog = {
            "currency": "BRL",
            "products": [{
                "id": "bolsa-aura",
                "nome": "Bolsa Aura",
                "categoria": "Bolsas",
                "colecao": "Grandes",
                "descricao": "Bolsa artesanal.",
                "variantes": [
                    {
                        "sku": "MX-001",
                        "cor": "Vinho",
                        "preco": 320.25,
                        "precoAnterior": 427,
                        "disponivel": True,
                        "estoque": 2,
                        "imagens": ["assets/01.webp", "assets/02.webp"],
                    },
                    {
                        "sku": "MX-002",
                        "cor": "Preta",
                        "preco": 300,
                        "disponivel": False,
                        "estoque": 0,
                        "imagens": ["assets/03.webp"],
                    },
                ],
            }],
        }

    def test_one_row_per_sku_with_independent_inventory_and_prices(self) -> None:
        rows = build_rows(self.catalog, "https://example.com/loja/")
        self.assertEqual([row["id"] for row in rows], ["MX-001", "MX-002"])
        self.assertEqual(rows[0]["availability"], "in stock")
        self.assertEqual(rows[0]["quantity_to_sell_on_facebook"], "2")
        self.assertEqual(rows[0]["price"], "427.00 BRL")
        self.assertEqual(rows[0]["sale_price"], "320.25 BRL")
        self.assertEqual(rows[1]["availability"], "out of stock")

    def test_links_and_images_are_absolute_and_select_the_sku(self) -> None:
        first = build_rows(self.catalog, "https://example.com/loja/")[0]
        self.assertEqual(
            first["link"],
            "https://example.com/loja/produto.html?id=bolsa-aura&sku=MX-001",
        )
        self.assertEqual(first["image_link"], "https://example.com/loja/assets/01.webp")
        self.assertEqual(
            first["additional_image_link"], "https://example.com/loja/assets/02.webp"
        )

    def test_rendered_csv_round_trips_fields_with_commas(self) -> None:
        self.catalog["products"][0]["descricao"] = "Couro, forro e acabamento artesanal."
        rows = list(csv.DictReader(StringIO(render_feed(self.catalog, "https://example.com/"))))
        self.assertEqual(rows[0]["description"], "Couro, forro e acabamento artesanal.")

    def test_duplicate_sku_is_rejected(self) -> None:
        self.catalog["products"][0]["variantes"][1]["sku"] = "MX-001"
        with self.assertRaises(FeedError):
            build_rows(self.catalog)


if __name__ == "__main__":
    unittest.main()
