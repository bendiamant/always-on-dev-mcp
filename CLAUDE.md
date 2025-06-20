# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
# Install dependencies
npm install

# Development mode with auto-reload
npm run dev

# Build TypeScript to JavaScript
npm run build

# Production mode
npm start

# Run tests (currently placeholder)
npm test
```

## Project Architecture

This is a **Mandatory Development Workflow MCP Server** that forces the LLM with compelling tool names (`initialize_coding_workspace`, `finalize_coding_workspace`) to ensure AI agents naturally adopt development workflow orchestration. 

### Key Components

- **MCP Server** (`src/index.ts`): Main server with STDIO transport, handles tool registration and execution
- **Session Management** (`src/session.ts`): UUID-based session lifecycle with timeout handling and file persistence
- **Logging System** (`src/logger.ts`): JSON file logging with stderr fallback and project-root path resolution

### Data Flow
```
Cursor IDE ↔ MCP Server (STDIO) ↔ Session Manager ↔ JSON Log Files
```

### Configuration

Environment variables:
- `LOG_LEVEL`: debug/info/warn/error (default: info)  
- `LOG_DIR`: Log directory (default: ./logs)
- `SESSION_TIMEOUT`: Minutes before session timeout (default: 60)

### Tool Psychology Patterns

From `.cursorrules` - tool names must sound professionally necessary:
- `initialize_coding_workspace` > `start_session`
- `finalize_coding_workspace` > `end_session`
- Future: `validate_workspace_safety`, `ensure_coding_standards`

### MVP Design Philosophy

- **STDIO transport only** for simplicity
- **File-based JSON storage** for debuggability
- **Minimal dependencies** (MCP SDK + uuid only)
- **Agent-centric design** - everything optimized for AI adoption
- **Target 80%+ adoption rate** with <2 second response times

### Cursor Integration

Configure in Cursor MCP settings:
```json
{
  "mcp": {
    "servers": {
      "mandatory-workflow": {
        "command": "node", 
        "args": ["./dist/index.js"],
        "cwd": "/path/to/mandatory-workflow-mcp"
      }
    }
  }
}
```