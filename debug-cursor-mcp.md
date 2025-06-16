# Debugging Cursor MCP Connection

## Current Status
- ✅ Server works perfectly (verified by test)
- ✅ Files exist and have correct permissions
- ✅ Node path is valid
- ❌ Cursor still shows "0 tools enabled"
- ❌ No connection attempts in server logs

## Possible Issues & Solutions

### 1. Try Different Configuration Formats

**Current config in `.cursor/mcp.json`:**
```json
{
  "mcpServers": {
    "mandatory-workflow": {
      "command": "node",
      "args": ["/Users/bend/Desktop/dev/always-on-dev-mcp/dist/index.js"],
      "env": {}
    }
  }
}
```

**Alternative 1: Remove env field**
```json
{
  "mcpServers": {
    "mandatory-workflow": {
      "command": "node",
      "args": ["/Users/bend/Desktop/dev/always-on-dev-mcp/dist/index.js"]
    }
  }
}
```

**Alternative 2: Use relative path**
```json
{
  "mcpServers": {
    "mandatory-workflow": {
      "command": "node",
      "args": ["./dist/index.js"]
    }
  }
}
```

### 2. Check Cursor Version Compatibility
- Some Cursor versions have different MCP implementations
- Try updating Cursor to the latest version
- Check if MCP is enabled in Cursor settings

### 3. Try Global Configuration
Instead of project-specific, try adding via Cursor's UI:
- Open Cursor Settings → MCP
- Add Custom MCP Server
- Use: `node` and `/Users/bend/Desktop/dev/always-on-dev-mcp/dist/index.js`

### 4. Verify Cursor MCP Feature
- Check if MCP is actually enabled in your Cursor version
- Look for MCP-related settings or features
- Some Cursor versions might have MCP as a beta feature

### 5. Debug Steps
1. Delete `.cursor/mcp.json` temporarily
2. Add server only via Cursor UI
3. Restart Cursor
4. Check server logs for connection attempts
5. If still no connection, try different Cursor version

## Next Actions
1. Try Alternative 1 config (remove env field)
2. Restart Cursor
3. If still 0 tools, try global UI configuration
4. Check Cursor version and MCP feature availability 