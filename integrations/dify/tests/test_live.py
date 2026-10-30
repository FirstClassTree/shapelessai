# Live test against prod: lists accounts and posts, schedules a 2027 Bluesky post and cancels it.
import dify_plugin  # first, as main.py does: it gevent-patches ssl before requests loads
import os, sys, types
from pathlib import Path
import requests
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from provider.shapelessai import ShapelessAIProvider
from tools.list_accounts import ListAccountsTool
from tools.create_post import CreatePostTool
from tools.list_posts import ListPostsTool
from dify_plugin.errors.tool import ToolProviderCredentialValidationError

key = os.environ["SHAPELESS_API_KEY"]
creds = {"api_key": key}

def run(cls, params):
    t = cls.__new__(cls)
    t.runtime = types.SimpleNamespace(credentials=creds)
    for name in ("create_text_message", "create_json_message"):
        setattr(t, name, (lambda n: lambda x: (n, x))(name))
    return list(cls._invoke(t, params))

ShapelessAIProvider.__new__(ShapelessAIProvider)._validate_credentials(creds)
try:
    ShapelessAIProvider.__new__(ShapelessAIProvider)._validate_credentials({"api_key": "slk_bad"})
    raise SystemExit("bad key accepted")
except ToolProviderCredentialValidationError as e:
    print("bad key refused:", e)
accts = run(ListAccountsTool, {})[1][1]["accounts"]
print("accounts:", len(accts))
bsky = next(a for a in accts if a["platform"] == "bluesky")
made = run(CreatePostTool, {"account_id": bsky["id"], "text": "Dify plugin test post from ShapelessAI, scheduled for 2027 and cancelled right after.", "when": "at", "scheduled_at": "2027-01-05T09:00:00Z"})
print(made[0][1]); post = made[1][1]
try:
    assert post["status"] == "scheduled"
    listed = run(ListPostsTool, {"status": "scheduled", "limit": 50})[1][1]["posts"]
    assert any(p["id"] == post["id"] for p in listed), "new post not listed"
    print("listed scheduled:", len(listed))
finally:
    r = requests.delete(f"https://shapelessai.com/api/posts/{post['id']}", headers={"Authorization": f"Bearer {key}"}, timeout=30)
    print("cancel:", r.status_code)
q = run(CreatePostTool, {"account_id": bsky["id"], "text": "Dify plugin queue test from ShapelessAI, cancelled right after."})[1][1]
print("queue:", q.get("status"), q.get("scheduledAt"))
print("cancel queue:", requests.delete(f"https://shapelessai.com/api/posts/{q['id']}", headers={"Authorization": f"Bearer {key}"}, timeout=30).status_code)
after = requests.get(f"https://shapelessai.com/api/posts/{post['id']}", headers={"Authorization": f"Bearer {key}"}, timeout=30).json()
print("after cancel:", (after.get("post") or after).get("status"))
