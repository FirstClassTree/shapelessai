from typing import Any

from dify_plugin import ToolProvider
from dify_plugin.errors.tool import ToolProviderCredentialValidationError

from tools.client import ShapelessError, request


class ShapelessAIProvider(ToolProvider):
    def _validate_credentials(self, credentials: dict[str, Any]) -> None:
        # GET /api/me only reads the key's own account, so validating spends nothing.
        try:
            request(credentials, "GET", "/api/me")
        except ShapelessError as e:
            raise ToolProviderCredentialValidationError(str(e)) from None
