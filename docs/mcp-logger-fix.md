# MCP Logger Fix - Plain Text stderr Output

## Problem
The MCP server was causing protocol conflicts by writing JSON-formatted log entries to stderr. Since MCP uses STDIO transport (stdin/stdout) for JSON-RPC 2.0 protocol, any JSON written to stderr was being parsed by the MCP client as protocol messages, causing validation errors.

## Error Symptoms
```
[error] project-0-always-on-dev-mcp-mandatory-workflow: Client error for command [
  {
    "code": "invalid_union",
    "unionErrors": [
      {
        "issues": [
          {
            "code": "invalid_literal",
            "expected": "2.0",
            "path": ["jsonrpc"],
            "message": "Invalid literal value, expected \"2.0\""
          }
        ]
      }
    ]
  }
]
```

## Root Cause
The logger was writing JSON to stderr in these scenarios:
1. When log directory creation failed
2. When file writing failed  
3. When no log file path was set

Example of problematic code:
```typescript
// This caused MCP protocol conflicts
process.stderr.write(JSON.stringify({ timestamp, level, message }));
```

## Solution
Changed all stderr output from JSON to plain text format:

```typescript
// Plain text format prevents MCP protocol conflicts
const errorMsg = `[ERROR] ${new Date().toISOString()} - Failed to create log directory: ${error.message}\n`;
process.stderr.write(errorMsg);
```

## Changes Made
1. **Directory creation errors**: Now outputs `[ERROR] timestamp - message`
2. **File write failures**: Outputs `[ERROR] timestamp - message` followed by `[LEVEL] timestamp - original message`
3. **No log file fallback**: Outputs `[LEVEL] timestamp - message - Data: {...}`

## Benefits
- No more MCP protocol validation errors
- stderr remains human-readable for debugging
- File logs still use JSON format (unchanged)
- MCP client only parses actual JSON-RPC messages

## Testing
Both test scripts pass without errors:
- `test-mcp.cjs` - Protocol compliance test ✅
- `test-tool-calls.cjs` - Tool execution test ✅

The server now works correctly with Cursor and other MCP clients. 