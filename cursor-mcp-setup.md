# Cursor MCP Configuration Guide

## Current Status
✅ MCP Server is built and working correctly
✅ Server returns 2 tools when tested directly
❌ Cursor is not connecting to the server (0 tools enabled)

## Root Cause
Cursor is not connecting to your MCP server. The server logs show no connection attempts from Cursor.

## Solution: Correct Cursor Configuration

### Step 1: Server Configuration Details
Use these **exact** values in Cursor's MCP interface:

**Server Name:** `mandatory-workflow`
**Command:** `node`
**Arguments:** `/Users/bend/Desktop/dev/always-on-dev-mcp/dist/index.js`

### Step 2: Alternative Configuration (if UI doesn't work)
Create a project-specific MCP config file:

**File:** `.cursor/mcp.json`
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

### Step 3: Verification Steps
1. Add the server configuration in Cursor
2. **Restart Cursor completely** (quit and reopen)
3. Check MCP Tools section - should show "2 tools enabled"
4. Look for these tools:
   - `initialize_coding_workspace`
   - `finalize_coding_workspace`

### Step 4: Troubleshooting
If still showing 0 tools:

1. **Check Cursor's MCP logs** (if available in settings)
2. **Try absolute path format:**
   - Command: `/usr/local/bin/node` (or your node path)
   - Args: `/Users/bend/Desktop/dev/always-on-dev-mcp/dist/index.js`
3. **Verify node path:** Run `which node` in terminal
4. **Check file permissions:** Ensure `dist/index.js` is readable

### Step 5: Expected Behavior
Once working, you should see:
- Server logs showing Cursor connections
- "ListTools request received" messages in logs
- 2 tools enabled in Cursor interface
- Agent automatically using tools in coding sessions

## Technical Details
- **Server Status:** ✅ Working (verified by test script)
- **Tools Available:** 2 (initialize_coding_workspace, finalize_coding_workspace)
- **Protocol:** MCP v2024-11-05 compliant
- **Transport:** STDIO (correct for Cursor)
- **Issue:** Configuration/connection problem, not server problem 