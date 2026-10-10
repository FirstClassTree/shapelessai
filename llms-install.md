# Installing ShapelessAI in an agent (Cline and other MCP clients)

ShapelessAI is a hosted MCP server. There is nothing to clone, build or run locally.

1. Add the server to the client's MCP settings. For Cline, `cline_mcp_settings.json`:

```json
{
  "mcpServers": {
    "shapeless": {
      "type": "streamableHttp",
      "url": "https://shapelessai.com/mcp",
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

2. Connect. The server answers 401 with OAuth metadata; the client opens a browser tab to sign in
   to ShapelessAI (dynamic client registration, no API key) and grant `read`, `write`, `publish`.
3. The user connects a social account once at https://shapelessai.com (Accounts).
4. Check it works: call the `me` tool, then `platforms_list`.

Docs for every tool: https://shapelessai.com/docs (append `.md` to any page for Markdown).
