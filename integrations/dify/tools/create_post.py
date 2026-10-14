from collections.abc import Generator
from typing import Any

from dify_plugin import Tool
from dify_plugin.entities.tool import ToolInvokeMessage

from .client import ShapelessError, post_summary, request


class CreatePostTool(Tool):
    def _invoke(self, tool_parameters: dict[str, Any]) -> Generator[ToolInvokeMessage, None, None]:
        p = tool_parameters
        account_id = str(p.get("account_id") or "").strip()
        text = str(p.get("text") or "").strip()
        if not account_id or not text:
            raise ShapelessError("account_id and text are required.")
        when = p.get("when") or "queue"
        body: dict[str, Any] = {"connectionId": account_id, "postText": text}
        if when == "at":
            at = str(p.get("scheduled_at") or "").strip()
            if not at:
                raise ShapelessError('scheduled_at is required when when is "at".')
            body["scheduledAt"] = at
        elif when != "now":
            body["queue"] = True
        res = request(self.runtime.credentials, "POST", "/api/posts", json=body)
        post = post_summary(res.get("post") or res)
        where = post.get("scheduledAt") or "now"
        yield self.create_text_message(f"Post {post.get('id')} is {post.get('status')} ({where}).")
        yield self.create_json_message(post)
