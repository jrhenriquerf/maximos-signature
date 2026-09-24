"""Build responsive product images from the best matching local originals.

The product JSON keeps pointing at the full/detail file (01.webp). Two siblings
are generated for each image: 01-card.webp and 01-thumb.webp.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter, ImageOps

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
SIZES = {"thumb": 360, "card": 900, "detail": 1800}


def phash(path: Path, hash_size: int = 16, highfreq_factor: int = 4) -> np.ndarray:
    size = hash_size * highfreq_factor
    with Image.open(path) as image:
        image = ImageOps.exif_transpose(image).convert("L").resize((size, size), Image.Resampling.LANCZOS)
        pixels = np.asarray(image, dtype=np.float32)
    n = np.arange(size)
    k = n.reshape(-1, 1)
    transform = np.cos((math.pi / size) * (n + 0.5) * k)
    low = (transform @ pixels @ transform.T)[:hash_size, :hash_size]
    return low > np.median(low[1:, 1:])


def image_paths(root: Path) -> list[Path]:
    return [path for path in root.rglob("*") if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS]


def collect_site_images(products_path: Path) -> list[Path]:
    data = json.loads(products_path.read_text(encoding="utf-8"))
    relative = set()
    for product in data["products"]:
        relative.update(product.get("imagens", []))
        for variant in product.get("variantes", []):
            relative.update(variant.get("imagens", []))
    root = products_path.parent.parent
    return sorted(root / path for path in relative if path.startswith("assets/products/") and (root / path).exists())


def build_matches(current: list[Path], originals: list[Path], cache_path: Path) -> dict[str, dict]:
    cached = json.loads(cache_path.read_text(encoding="utf-8")) if cache_path.exists() else {}
    original_hashes = []
    for index, path in enumerate(originals, 1):
        try:
            original_hashes.append((path, phash(path)))
        except Exception as error:
            print(f"skip source {path}: {error}")
        if index % 100 == 0:
            print(f"hashed {index}/{len(originals)} originals")

    matches = {}
    for index, path in enumerate(current, 1):
        key = path.as_posix()
        if key in cached and Path(cached[key]["source"]).exists():
            matches[key] = cached[key]
            continue
        target = phash(path)
        candidates = sorted(
            ((int(np.count_nonzero(target != source_hash)), source) for source, source_hash in original_hashes),
            key=lambda item: item[0],
        )[:3]
        matches[key] = {
            "source": str(candidates[0][1]),
            "distance": candidates[0][0],
            "alternatives": [{"source": str(source), "distance": distance} for distance, source in candidates[1:]],
        }
        print(f"match {index}/{len(current)} d={candidates[0][0]:3}: {path.name} <- {candidates[0][1].name}")

    cache_path.write_text(json.dumps(matches, ensure_ascii=False, indent=2), encoding="utf-8")
    return matches


def prepare(image: Image.Image, max_edge: int) -> Image.Image:
    image = ImageOps.exif_transpose(image).convert("RGB")
    if max(image.size) > max_edge:
        image.thumbnail((max_edge, max_edge), Image.Resampling.LANCZOS)
        image = image.filter(ImageFilter.UnsharpMask(radius=0.7, percent=75, threshold=3))
    return image


def save_webp(source: Path, destination: Path, max_edge: int, quality: int) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as image:
        prepare(image, max_edge).save(destination, "WEBP", quality=quality, method=6)


def generate(matches: dict[str, dict], max_distance: int, dry_run: bool) -> None:
    accepted = skipped = 0
    for current_name, match in matches.items():
        current = Path(current_name)
        source = Path(match["source"])
        distance = int(match["distance"])
        matched = distance <= max_distance
        if matched:
            accepted += 1
        else:
            skipped += 1
            source = current
            print(f"keep current (low confidence d={distance}): {current}")
        stem = current.with_suffix("")
        outputs = {
            Path(f"{stem}-card.webp"): (SIZES["card"], 87),
            Path(f"{stem}-thumb.webp"): (SIZES["thumb"], 84),
        }
        if matched:
            outputs[current] = (SIZES["detail"], 90)
        if not dry_run:
            for destination, (size, quality) in outputs.items():
                save_webp(source, destination, size, quality)
    print(f"accepted: {accepted}; kept current: {skipped}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--products", type=Path, required=True)
    parser.add_argument("--source", type=Path, action="append", required=True)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--max-distance", type=int, default=48)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    current = collect_site_images(args.products)
    originals = list(dict.fromkeys(path for root in args.source for path in image_paths(root)))
    print(f"current: {len(current)}; originals: {len(originals)}")
    matches = build_matches(current, originals, args.cache)
    generate(matches, args.max_distance, args.dry_run)


if __name__ == "__main__":
    main()
