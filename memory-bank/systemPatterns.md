# System Patterns: Mandatory Workflow MCP Server

## Architecture Overview

### High-Level System Design

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Cursor        │◄──►│   MCP Server    │◄──►│   File System   │
│   IDE           │    │   (STDIO)       │    │   (Logs)        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Design Principles**:
- **Simplicity First**: MVP focuses on core functionality
- **Agent-Centric**: Tools designed from agent perspective
- **Transparent Integration**: No disruption to developer workflow
- **File-Based Storage**: Simple, reliable, debuggable

### MCP Protocol Integration

**Transport Layer**: STDIO only (MVP scope)
- Direct communication with Cursor
- JSON-RPC based messaging
- Synchronous tool execution

**Tool Registration Pattern**:
```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "initialize_coding_workspace",
      description: "Initialize coding workspace for development task",
      inputSchema: { /* schema */ }
    },
    {
      name: "finalize_coding_workspace", 
      description: "Finalize and cleanup coding workspace",
      inputSchema: { /* schema */ }
    }
  ]
}))
```

## Core Design Patterns

### 1. Tool Naming Strategy

**Pattern**: Use compelling, professional-sounding names that imply necessity

**Examples**:
- `initialize_coding_workspace` (not `start_session`)
- `finalize_coding_workspace` (not `end_session`)
- Future: `validate_workspace_safety`, `ensure_coding_standards`

**Rationale**: Agents prioritize tools that appear essential for proper development workflow.

### 2. Session Lifecycle Management

**Pattern**: Simple state machine with clear transitions

```
[Start] → initialize_coding_workspace → [Active] → finalize_coding_workspace → [Complete]
```

**State Storage**:
- In-memory active sessions (SessionManager)
- File-based persistence for completed sessions
- UUID-based session identification

### 3. Logging and Observability

**Pattern**: Structured logging with consistent format

```typescript
interface LogEntry {
  timestamp: string;
  sessionId: string;
  event: 'session_start' | 'session_end' | 'tool_call' | 'error';
  data: any;
}
```

**Storage Strategy**:
- Console logging for development
- File-based logs for persistence
- JSON format for structured analysis

### 4. Error Handling Philosophy

**Pattern**: Graceful degradation with user-friendly messages

- Input validation at tool entry points
- Non-blocking error responses (tools always return success-like responses)
- Detailed error logging for debugging
- Simple retry mechanisms for transient failures

## Component Architecture

### Core Components

```typescript
├── src/
│   ├── index.ts              # Entry point, server bootstrap
│   ├── server.ts             # MCP server implementation
│   ├── tools/
│   │   ├── initialize.ts     # Session initialization tool
│   │   └── finalize.ts       # Session finalization tool
│   ├── session.ts            # Session management logic
│   └── logger.ts             # Logging utilities
```

### Data Flow Patterns

**Tool Execution Flow**:
1. Agent calls tool via MCP protocol
2. Server validates input parameters
3. SessionManager updates state
4. Logger records event
5. Response returned to agent

**Session Management Flow**:
1. Initialize creates new session with UUID
2. Session stored in memory for active tracking
3. Finalize marks session complete
4. Session data persisted to file system
5. Memory cleaned up

## Technology Choices

### Language and Runtime
- **TypeScript**: Type safety, excellent tooling, MCP SDK compatibility
- **Node.js 18+**: Mature runtime, broad compatibility
- **ESModules**: Modern module system

### Dependencies (Minimal)
- `@modelcontextprotocol/sdk`: Core MCP functionality
- `uuid`: Session ID generation
- Built-in Node.js modules for file system operations

### File System Structure
```
./logs/
├── sessions/
│   ├── 2024-01-15-sessions.json
│   └── 2024-01-16-sessions.json
└── server.log
```

## Integration Patterns

### Cursor Integration
- **Transport**: STDIO (spawned process)
- **Discovery**: Tool list provided on startup
- **Execution**: Synchronous tool calls with JSON responses

### Configuration Management
- **Environment Variables**: Simple key-value configuration
- **Defaults**: Sensible defaults for zero-config operation
- **Validation**: Basic validation with helpful error messages

```typescript
interface Config {
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  logDir: string;
  sessionTimeout: number; // minutes
}
```

## Quality Patterns

### Testing Strategy
- **Unit Tests**: Core logic functions
- **Integration Tests**: MCP protocol compliance
- **Manual Testing**: Cursor integration

### Code Organization
- **Single Responsibility**: Each module has clear purpose
- **Dependency Injection**: Testable, modular design
- **Error Boundaries**: Isolated error handling

### Performance Considerations
- **Memory Management**: Active session cleanup
- **File I/O**: Async operations, error handling
- **Response Times**: <2 second tool execution target

## Security Patterns

### Input Validation
- JSON schema validation for tool inputs
- Path sanitization for workspace paths
- String length limits and character validation

### File System Safety
- Restricted write access to log directories
- No execution of user-provided code
- Read-only access to workspace files

## Extension Points (Future)

### Plugin Architecture Preparation
- Interface-based tool definitions
- Event-driven session lifecycle
- Configuration-based tool registration

### Multi-Transport Support
- Abstract transport layer
- Protocol-agnostic tool definitions
- Connection management patterns

### Storage Abstraction
- Interface for session storage
- Pluggable backends (file, database, cloud)
- Migration and backup strategies

This architecture provides a solid foundation for the MVP while preparing for future enhancements through clean abstractions and extensible patterns. 