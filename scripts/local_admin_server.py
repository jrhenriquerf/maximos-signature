#!/usr/bin/env python3
"""Servidor local do gerenciador Maximos Signature.

Serve o site apenas em 127.0.0.1 e publica alteracoes de data/products.json
usando a autenticacao Git configurada na maquina.
"""

from __future__ import annotations

import argparse
from datetime import date, datetime
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import subprocess
import tempfile
import threading
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
PRODUCTS_FILE = ROOT / "data" / "products.json"
BACKUP_DIR = ROOT / ".local-backups"
MAX_BODY = 8 * 1024 * 1024
PRODUCT_ID = re.compile(r"^[a-z0-9][a-z0-9-]{0,119}$")
WRITE_LOCK = threading.Lock()
SESSION_TOKEN = secrets.token_urlsafe(32)


class ApiError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status


def git(*arguments: str, timeout: int = 120) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", "-C", str(ROOT), *arguments],
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
    )


def git_context() -> dict[str, object]:
    branch_result = git("branch", "--show-current")
    remote_result = git("remote", "get-url", "origin")
    status_result = git("status", "--porcelain")
    return {
        "branch": branch_result.stdout.strip() or "main",
        "remote": remote_result.stdout.strip() if remote_result.returncode == 0 else "",
        "dirty": bool(status_result.stdout.strip()),
    }


def validate_catalog(value: object) -> dict:
    if not isinstance(value, dict):
        raise ApiError(HTTPStatus.BAD_REQUEST, "O catalogo precisa ser um objeto JSON.")
    products = value.get("products")
    if not isinstance(products, list):
        raise ApiError(HTTPStatus.BAD_REQUEST, "O campo products precisa ser uma lista.")
    if len(products) > 500:
        raise ApiError(HTTPStatus.BAD_REQUEST, "O catalogo excede o limite de 500 produtos.")

    identifiers: set[str] = set()
    for position, product in enumerate(products, start=1):
        if not isinstance(product, dict):
            raise ApiError(HTTPStatus.BAD_REQUEST, f"Produto {position} invalido.")
        identifier = product.get("id")
        name = product.get("nome")
        if not isinstance(identifier, str) or not PRODUCT_ID.fullmatch(identifier):
            raise ApiError(HTTPStatus.BAD_REQUEST, f"ID invalido no produto {position}.")
        if identifier in identifiers:
            raise ApiError(HTTPStatus.BAD_REQUEST, f"ID duplicado: {identifier}.")
        if not isinstance(name, str) or not name.strip():
            raise ApiError(HTTPStatus.BAD_REQUEST, f"Nome ausente no produto {identifier}.")
        identifiers.add(identifier)

    normalized = dict(value)
    normalized["updatedAt"] = date.today().isoformat()
    normalized.setdefault("currency", "BRL")
    normalized["products"] = products
    return normalized


def save_and_publish(catalog: dict, message: str) -> dict[str, object]:
    serialized = json.dumps(catalog, ensure_ascii=False, indent=2) + "\n"
    current = PRODUCTS_FILE.read_text(encoding="utf-8")
    if current == serialized:
        return {"changed": False, "published": True, "message": "O catalogo ja esta atualizado."}

    BACKUP_DIR.mkdir(exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    shutil.copy2(PRODUCTS_FILE, BACKUP_DIR / f"products-{stamp}.json")

    temporary_name = ""
    try:
        with tempfile.NamedTemporaryFile(
            "w",
            encoding="utf-8",
            dir=PRODUCTS_FILE.parent,
            prefix=".products-",
            suffix=".json",
            delete=False,
        ) as temporary:
            temporary.write(serialized)
            temporary_name = temporary.name
        os.replace(temporary_name, PRODUCTS_FILE)
    finally:
        if temporary_name and Path(temporary_name).exists():
            Path(temporary_name).unlink()

    add_result = git("add", "--", "data/products.json")
    if add_result.returncode != 0:
        raise ApiError(HTTPStatus.INTERNAL_SERVER_ERROR, add_result.stderr.strip() or "Falha ao preparar o commit.")

    safe_message = " ".join(message.split())[:72] or "catalog: atualiza produtos"
    commit_result = git("commit", "-m", safe_message, "--", "data/products.json")
    if commit_result.returncode != 0:
        raise ApiError(HTTPStatus.INTERNAL_SERVER_ERROR, commit_result.stderr.strip() or "Falha ao criar o commit.")

    context = git_context()
    if not context["remote"]:
        raise ApiError(
            HTTPStatus.CONFLICT,
            "Alteracao salva e commit criado, mas o remote origin nao esta configurado.",
        )

    push_result = git("push", "origin", f"HEAD:{context['branch']}", timeout=180)
    if push_result.returncode != 0:
        raise ApiError(
            HTTPStatus.BAD_GATEWAY,
            "Alteracao salva e commit criado, mas o push falhou: "
            + (push_result.stderr.strip() or "erro desconhecido"),
        )

    commit_hash = git("rev-parse", "--short", "HEAD").stdout.strip()
    return {
        "changed": True,
        "published": True,
        "commit": commit_hash,
        "branch": context["branch"],
        "message": "Catalogo salvo e enviado ao GitHub.",
    }


class MaximosHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def _local_request(self) -> bool:
        host = self.headers.get("Host", "").partition(":")[0].lower()
        return self.client_address[0] in {"127.0.0.1", "::1"} and host in {"127.0.0.1", "localhost"}

    def _json(self, status: int, payload: object) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def _require_local(self) -> None:
        if not self._local_request():
            raise ApiError(HTTPStatus.FORBIDDEN, "Acesso permitido apenas pelo servidor local.")

    def _require_token(self) -> None:
        self._require_local()
        if not secrets.compare_digest(self.headers.get("X-Maximos-Token", ""), SESSION_TOKEN):
            raise ApiError(HTTPStatus.FORBIDDEN, "Sessao local invalida. Recarregue o gerenciador.")

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        try:
            if path == "/api/status":
                self._require_local()
                self._json(
                    HTTPStatus.OK,
                    {
                        "local": True,
                        "token": SESSION_TOKEN,
                        **git_context(),
                    },
                )
                return
            if path == "/api/products":
                self._require_local()
                self._json(HTTPStatus.OK, json.loads(PRODUCTS_FILE.read_text(encoding="utf-8")))
                return
            super().do_GET()
        except ApiError as error:
            self._json(error.status, {"error": str(error)})
        except Exception as error:
            self._json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(error)})

    def do_PUT(self) -> None:
        try:
            if urlparse(self.path).path != "/api/products":
                raise ApiError(HTTPStatus.NOT_FOUND, "Rota nao encontrada.")
            self._require_token()
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > MAX_BODY:
                raise ApiError(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, "Conteudo vazio ou muito grande.")
            try:
                payload = json.loads(self.rfile.read(length))
            except json.JSONDecodeError:
                raise ApiError(HTTPStatus.BAD_REQUEST, "JSON invalido.") from None
            catalog = validate_catalog(payload.get("catalog"))
            message = str(payload.get("message", "catalog: atualiza produtos"))
            with WRITE_LOCK:
                result = save_and_publish(catalog, message)
            self._json(HTTPStatus.OK, result)
        except ApiError as error:
            self._json(error.status, {"error": str(error)})
        except subprocess.TimeoutExpired:
            self._json(HTTPStatus.GATEWAY_TIMEOUT, {"error": "O Git excedeu o tempo limite."})
        except Exception as error:
            self._json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(error)})

    def do_OPTIONS(self) -> None:
        self.send_error(HTTPStatus.METHOD_NOT_ALLOWED)

    def log_message(self, format: str, *args: object) -> None:
        print(f"[local] {self.address_string()} - {format % args}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Gerenciador local da Maximos Signature")
    parser.add_argument("--port", type=int, default=8080)
    arguments = parser.parse_args()

    server = ThreadingHTTPServer(("127.0.0.1", arguments.port), MaximosHandler)
    print("")
    print("Maximos Signature - gerenciador local")
    print(f"Abra: http://127.0.0.1:{arguments.port}/admin.html")
    print("Use Ctrl+C para encerrar. O servidor aceita conexoes somente deste computador.")
    print("")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor encerrado.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
