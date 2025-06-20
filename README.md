# Mandatory Workflow MCP Server

An MCP (Model Context Protocol) server that ensures AI coding agents execute mandatory workflow steps at the beginning and end of coding sessions through compelling tool names.

## Overview

This server exposes tools with "mandatory-sounding" names that AI agents naturally prioritize:
- `initialize_coding_workspace` - Creates a new coding session with tracking
- `finalize_coding_workspace` - Completes and logs the session

The core innovation is psychological: tools appear essential for proper development workflow, ensuring high adoption rates without forcing compliance.

## Features

- **Session Tracking**: Complete lifecycle management of AI coding sessions
- **File-based Logging**: Simple JSON logs for session data and server events
- **STDIO Transport**: Direct integration with Cursor via MCP protocol
- **Minimal Dependencies**: TypeScript + MCP SDK + UUID only
- **Cross-platform**: Works on Windows, macOS, and Linux

## Prerequisites

- Node.js 18+ (20.x LTS recommended)
- npm or yarn
- Cursor IDE with MCP support

## Installation

1. **Clone or create the project:**
   ```bash
   mkdir mandatory-workflow-mcp
   cd mandatory-workflow-mcp
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

## Configuration

The server uses environment variables for configuration:

- `LOG_LEVEL`: Logging verbosity (debug, info, warn, error) - default: info
- `LOG_DIR`: Directory for log files - default: ./logs
- `SESSION_TIMEOUT`: Session timeout in minutes - default: 60

## Cursor Integration

1. **Configure Cursor MCP settings** by adding to your Cursor configuration:
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

2. **Restart Cursor** to load the MCP server

3. **Verify integration** by checking that the tools are discoverable in Cursor

## Usage

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

## Tool Reference

### initialize_coding_workspace

Initializes a new coding workspace session.

**Parameters:**
- `task_description` (required): Description of the coding task
- `workspace_path` (optional): Path to the workspace directory

**Returns:**
```json
{
  "session_id": "uuid",
  "status": "initialized",
  "message": "Workspace initialized for task: ...",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### finalize_coding_workspace

Finalizes and completes the coding workspace session.

**Parameters:**
- `session_id` (required): Session ID from initialization
- `completion_summary` (optional): Summary of work completed
- `files_modified` (optional): Array of modified file paths

**Returns:**
```json
{
  "session_id": "uuid",
  "status": "completed",
  "duration_minutes": 15,
  "summary": "Task completed successfully",
  "artifacts_count": 3,
  "timestamp": "2024-01-01T00:15:00.000Z"
}
```

## Logging

### Server Logs
Located at `{LOG_DIR}/server.log` in JSON format:
```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "level": "info",
  "message": "Session created",
  "data": {
    "sessionId": "uuid",
    "taskDescription": "..."
  }
}
```

### Session Logs
Located at `{LOG_DIR}/sessions/{date}-sessions.json`:
```json
[
  {
    "id": "uuid",
    "startTime": "2024-01-01T00:00:00.000Z",
    "endTime": "2024-01-01T00:15:00.000Z",
    "taskDescription": "...",
    "status": "completed",
    "artifacts": ["file1.ts", "file2.js"],
    "summary": "Task completed"
  }
]
```

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Cursor        │◄──►│   MCP Server    │◄──►│   File System   │
│   IDE           │    │   (STDIO)       │    │   (Logs)        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Development

### Project Structure
```
src/
├── index.ts              # Entry point, server bootstrap
├── logger.ts             # Logging utilities
├── session.ts            # Session management
└── tools/
    ├── initialize.ts     # Initialize workspace tool
    └── finalize.ts       # Finalize workspace tool
```

### Scripts
- `npm run build` - Compile TypeScript
- `npm run dev` - Development mode with auto-reload
- `npm start` - Production mode
- `npm test` - Run tests (placeholder)

## Troubleshooting

### Tool Not Discovered
1. Check Cursor MCP configuration
2. Verify server is running: `npm run dev`
3. Check logs for startup errors

### Session Not Found
- Ensure `session_id` matches the one returned from `initialize_coding_workspace`
- Check if session timed out (default 60 minutes)

### File Permission Errors
- Ensure write permissions for log directory
- Check disk space availability

## Future Enhancements

After MVP validation:
- Multi-agent support (Claude Desktop, GitHub Copilot)
- Database storage backends
- HTTP/SSE transport protocols
- Team collaboration features
- Advanced analytics and reporting

## License

MIT

## Support

For issues and questions, please check the logs first and ensure proper configuration of Cursor MCP settings.

## Test Coverage

Running the test script (e.g., `npm test` or `yarn test`) will generate a coverage report.
The HTML report can be found at `coverage/lcov-report/index.html`.