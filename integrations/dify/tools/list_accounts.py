from collections.abc import Generator
from typing import Any

from dify_plugin import Tool
from dify_plugin.entities.tool import ToolInvokeMessage

from .client import postable_accounts


class ListAccountsTool(Tool):
    def _invoke(self, tool_parameters: dict[str, Any]) -> Generator[ToolInvokeMessage, None, None]:
        accounts = postable_accounts(self.runtime.credentials)
        if not accounts:
            yield self.create_text_message("No accounts can be posted to. Connect one at https://shapelessai.com/studio.")
        else:
            yield self.create_text_message("\n".join(f"{a['id']}: {a['name']} ({a['platform']})" for a in accounts))
        yield self.create_json_message({"accounts": accounts})
