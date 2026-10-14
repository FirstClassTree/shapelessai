from collections.abc import Generator
from typing import Any

from dify_plugin import Tool
from dify_plugin.entities.tool import ToolInvokeMessage

from .client import post_summary, request


class ListPostsTool(Tool):
    def _invoke(self, tool_parameters: dict[str, Any]) -> Generator[ToolInvokeMessage, None, None]:
        limit = min(max(int(tool_parameters.get("limit") or 20), 1), 50)
        params: dict[str, Any] = {"limit": limit}
        if status := tool_parameters.get("status"):
            params["status"] = status
        posts = [post_summary(p) for p in request(self.runtime.credentials, "GET", "/api/posts", params=params).get("posts", [])]
        lines = [f"{p.get('id')} {p.get('platform')} {p.get('status')}: {str(p.get('postText', ''))[:80]}" for p in posts]
        yield self.create_text_message("\n".join(lines) or "No posts.")
        yield self.create_json_message({"posts": posts})
