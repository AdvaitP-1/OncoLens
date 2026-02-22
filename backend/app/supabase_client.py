from __future__ import annotations

from contextlib import asynccontextmanager
from urllib.parse import quote

import httpx

from app.settings import settings


class SupabaseClient:
    """Supabase REST client. Reuses a single httpx client for connection pooling."""

    def __init__(self, client: httpx.AsyncClient) -> None:
        if not settings.supabase_url or not settings.supabase_service_role_key:
            raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.")
        self._client = client
        self._headers = {
            "apikey": settings.supabase_service_role_key,
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }
        self._storage_headers = {
            "apikey": settings.supabase_service_role_key,
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
        }

    async def fetch_case(self, case_id: str) -> dict | None:
        url = f"{settings.postgrest_url}/cases?id=eq.{case_id}&select=*"
        res = await self._client.get(url, headers=self._headers)
        res.raise_for_status()
        rows = res.json()
        return rows[0] if rows else None

    async def fetch_case_assets(self, case_id: str) -> list[dict]:
        url = f"{settings.postgrest_url}/case_assets?case_id=eq.{case_id}&select=*"
        res = await self._client.get(url, headers=self._headers)
        res.raise_for_status()
        return res.json()

    async def update_case(self, case_id: str, payload: dict) -> dict | None:
        url = f"{settings.postgrest_url}/cases?id=eq.{case_id}"
        res = await self._client.patch(url, headers=self._headers, json=payload)
        res.raise_for_status()
        rows = res.json()
        return rows[0] if rows else None

    async def download_storage_object(self, storage_path: str) -> bytes:
        encoded = quote(storage_path, safe="/")
        url = f"{settings.storage_url}/{settings.supabase_storage_bucket}/{encoded}"
        res = await self._client.get(url, headers=self._storage_headers)
        res.raise_for_status()
        return res.content


@asynccontextmanager
async def supabase_client():
    """Context manager that provides a shared httpx client for connection pooling."""
    async with httpx.AsyncClient(timeout=60.0) as client:
        yield SupabaseClient(client)
