from typing import Any

import requests

BASE = "https://shapelessai.com"


class ShapelessError(Exception):
    pass


def request(credentials: dict[str, Any], method: str, path: str, *, params=None, json=None, timeout: int = 30) -> Any:
    key = str(credentials.get("api_key") or "").strip()
    if not key:
        raise ShapelessError("Add your ShapelessAI API key to the plugin's credentials.")
    try:
        r = requests.request(method, BASE + path, params=params, json=json, timeout=timeout,
                             headers={"Authorization": f"Bearer {key}", "Accept": "application/json"})
    except requests.RequestException as e:
        raise ShapelessError(f"Could not reach ShapelessAI ({type(e).__name__}).") from None
    if r.status_code == 401:
        raise ShapelessError("ShapelessAI refused the API key. Make a new one at https://shapelessai.com/studio/api-keys.")
    try:
        body = r.json()
    except ValueError:
        body = {}
    if not r.ok:
        raise ShapelessError(body.get("error") or f"ShapelessAI answered {r.status_code}.")
    return body


def postable_accounts(credentials: dict[str, Any]) -> list[dict[str, Any]]:
    # Tracked-only and paused accounts cannot be posted to.
    rows = request(credentials, "GET", "/api/connections").get("connections", [])
    return [
        {"id": c["id"], "platform": c["platform"], "handle": c.get("handle"), "name": c.get("displayName") or c.get("handle")}
        for c in rows
        if c.get("mode") == "oauth" and c.get("status") == "active"
    ]


def post_summary(p: dict[str, Any]) -> dict[str, Any]:
    keys = ("id", "platform", "status", "postText", "scheduledAt", "publishedAt", "publishedLocation", "error")
    return {k: p.get(k) for k in keys if p.get(k) is not None}
