#!/usr/bin/env python3
"""Deploy backend to Raspberry Pi over SSH (paramiko)."""
from __future__ import annotations

import io
import os
import secrets
import tarfile
from pathlib import Path

import paramiko

HOST = os.environ.get("WISHLIST_PI_HOST", "100.99.85.87")
USER = os.environ.get("WISHLIST_PI_USER", "root")
PASSWORD = os.environ.get("WISHLIST_PI_PASSWORD", "")
REMOTE = "/opt/wishlist"
ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"


def make_tarball() -> bytes:
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        for path in BACKEND.rglob("*"):
            if not path.is_file():
                continue
            rel = path.relative_to(BACKEND)
            parts = rel.parts
            if "node_modules" in parts or "data" in parts:
                continue
            if path.name == ".env":
                continue
            tar.add(path, arcname=str(rel))
        service = ROOT / "deploy" / "wishlist-api.service"
        tar.add(service, arcname="wishlist-api.service")
    return buf.getvalue()


def run(client: paramiko.SSHClient, cmd: str, check: bool = True) -> str:
    print(f"$ {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    code = stdout.channel.recv_exit_status()
    if out:
        print(out)
    if err:
        print(err)
    if check and code != 0:
        raise RuntimeError(f"command failed ({code}): {cmd}")
    return out


def main() -> None:
    if not PASSWORD:
        raise SystemExit("Set WISHLIST_PI_PASSWORD")

    admin_token = os.environ.get("WISHLIST_ADMIN_TOKEN") or secrets.token_urlsafe(24)
    cors = os.environ.get(
        "WISHLIST_CORS_ORIGIN",
        "http://localhost:5173,http://127.0.0.1:5173",
    )

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        HOST,
        username=USER,
        password=PASSWORD,
        timeout=30,
        allow_agent=False,
        look_for_keys=False,
    )

    run(client, f"mkdir -p {REMOTE} /var/lib/wishlist")
    sftp = client.open_sftp()
    remote_tar = "/tmp/wishlist-backend.tgz"
    with sftp.file(remote_tar, "wb") as f:
        f.write(make_tarball())
    sftp.close()

    run(client, f"tar -xzf {remote_tar} -C {REMOTE}")
    run(client, f"rm -rf {REMOTE}/node_modules && cd {REMOTE} && npm install --omit=dev")

    env_body = (
        f"PORT=8791\n"
        f"ADMIN_TOKEN={admin_token}\n"
        f"CORS_ORIGIN={cors}\n"
        f"DB_PATH=/var/lib/wishlist/data.json\n"
    )
    # Always refresh PORT/CORS; keep existing ADMIN_TOKEN if present
    run(
        client,
        f"if [ -f {REMOTE}/.env ]; then "
        f"sed -i 's/^PORT=.*/PORT=8791/' {REMOTE}/.env; "
        f"sed -i 's|^CORS_ORIGIN=.*|CORS_ORIGIN={cors}|' {REMOTE}/.env; "
        f"grep -q '^DB_PATH=' {REMOTE}/.env || echo 'DB_PATH=/var/lib/wishlist/data.json' >> {REMOTE}/.env; "
        f"else cat > {REMOTE}/.env << 'EOF'\n{env_body}EOF\nfi",
    )
    run(
        client,
        f"cp {REMOTE}/wishlist-api.service /etc/systemd/system/wishlist-api.service && "
        "systemctl daemon-reload && systemctl enable --now wishlist-api && "
        "systemctl restart wishlist-api && sleep 1 && systemctl is-active wishlist-api && "
        "curl -s http://127.0.0.1:8791/api/health",
    )

    # print token from remote env for local use
    out = run(client, f"grep ADMIN_TOKEN {REMOTE}/.env")
    print("Deployed. Keep ADMIN_TOKEN secret.")
    print(out.strip())
    client.close()


if __name__ == "__main__":
    main()
