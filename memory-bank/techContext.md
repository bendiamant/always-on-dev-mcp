# Technical Context: Mandatory Workflow MCP Server

## Technology Stack

### Core Technologies

**Language & Runtime**
- **TypeScript 5.0+**: Primary development language
  - Provides type safety for MCP protocol compliance
  - Excellent tooling and IDE support
  - Compatible with @modelcontextprotocol/sdk

- **Node.js 18+**: Runtime environment
  - LTS version for stability
  - Native ESModule support
  - Built-in crypto and file system APIs
  - Cross-platform compatibility (Windows, macOS, Linux)

### Dependencies

**Production Dependencies (Minimal)**
- `@modelcontextprotocol/sdk`: Core MCP framework
- `uuid`: Session ID generation (RFC 4122 compliant)

**Development Dependencies**
- `typescript`: TypeScript compiler
- `@types/node`: Node.js type definitions
- `@types/uuid`: UUID type definitions
- `tsx`: TypeScript execution for development

### Transport Protocol

**STDIO Transport (MVP)**
- Direct process spawning from Cursor
- JSON-RPC 2.0 messaging over stdin/stdout
- Synchronous request-response pattern
- No network configuration required

**Future Transports (Post-MVP)**
- HTTP/HTTPS for remote deployments
- Server-Sent Events (SSE) for real-time updates
- WebSocket for bidirectional communication

## Development Environment

### Setup Requirements

**Prerequisites**
- Node.js 18+ (recommended: 20.x LTS)
- npm or yarn package manager
- TypeScript knowledge
- Understanding of MCP protocol basics

**Project Structure**
```
mandatory-workflow-mcp/
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # MCP server implementation  
│   ├── tools/
│   │   ├── initialize.ts     # Initialize workspace tool
│   │   └── finalize.ts       # Finalize workspace tool
│   ├── session.ts            # Session management
│   └── logger.ts             # Logging utilities
├── logs/                     # Log files (created at runtime)
├── package.json
├── tsconfig.json
├── README.md
└── .gitignore
```

### Build Configuration

**TypeScript Configuration (tsconfig.json)**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Package.json Scripts**
```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "start": "node dist/index.js",
    "test": "echo \"No tests yet\" && exit 0"
  }
}
```

## Configuration Management

### Environment Variables

**Core Configuration**
- `LOG_LEVEL`: Logging verbosity (debug, info, warn, error)
- `LOG_DIR`: Directory for log files (default: ./logs)
- `SESSION_TIMEOUT`: Session timeout in minutes (default: 60)

**Development vs Production**
- Development: Console logging, verbose output
- Production: File logging, structured JSON output

### File System Requirements

**Permissions**
- Read/write access to log directory
- Read access to workspace files (for path validation)
- No execute permissions required

**Storage Locations**
- Session logs: `{LOG_DIR}/sessions/`
- Server logs: `{LOG_DIR}/server.log`
- Temporary files: OS temp directory

## Protocol Compliance

### MCP Protocol Version
- **Target**: MCP v1.0+ specification
- **Transport**: STDIO transport only (MVP)
- **Message Format**: JSON-RPC 2.0

### Tool Schema Compliance
```typescript
interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}
```

### Error Handling Standards
- Non-fatal errors returned as successful responses with error context
- Fatal errors logged and server continues operation
- Invalid input handled gracefully with helpful messages

## Performance Characteristics

### Resource Requirements (MVP)

**Memory Usage**
- Base server: ~10MB
- Per active session: ~1KB
- Target: <50MB total for 100 sessions

**CPU Usage**
- Idle: <1% CPU
- Per tool call: <100ms processing time
- Target: <2 second response time

**Disk Usage**
- Log files: ~1MB per day (typical usage)
- Session data: ~1KB per session
- Log rotation: Daily, 30-day retention

### Scalability Limits (MVP)

**Concurrent Sessions**
- Target: 10+ concurrent sessions
- Bottleneck: File I/O for logging
- Memory-based session storage

**Tool Call Frequency**
- No artificial rate limiting
- Natural limiting by agent behavior
- File system I/O as primary constraint

## Security Considerations

### Input Validation
- JSON schema validation for all tool inputs
- Path sanitization for workspace paths
- String length limits (task descriptions, file paths)
- Character encoding validation (UTF-8)

### File System Security
- Restricted write access to designated log directories
- No code execution from user inputs
- Read-only access to workspace files
- Path traversal prevention

### Data Privacy
- Session data stored locally only
- No network transmission of sensitive data
- Configurable data retention periods
- Option to disable logging for sensitive projects

## Integration Requirements

### Cursor Integration

**Spawning Process**
- Server launched as child process
- STDIO pipes for communication
- Graceful shutdown on parent process exit

**Configuration Discovery**
- MCP configuration in Cursor settings
- Server executable path specification
- Environment variable passing

### Workspace Integration

**File System Access**
- Read access to workspace directory (optional)
- Write access to log directory
- Respect for gitignore patterns
- No modification of source files

## Development Workflow

### Local Development
1. `npm install` - Install dependencies
2. `npm run dev` - Start development server
3. Configure Cursor to use local server
4. Test with real coding sessions

### Testing Strategy
- Manual testing with Cursor
- Unit tests for core functions
- Integration tests for MCP protocol compliance
- Error scenario testing

### Deployment Process
1. `npm run build` - Compile TypeScript
2. Package for distribution (npm, binary, docker)
3. Update Cursor configuration
4. Verify integration works

## Technical Constraints

### MVP Limitations
- Single transport protocol (STDIO)
- File-based storage only
- No authentication/authorization
- Basic error handling
- Limited configuration options

### Platform Compatibility
- **Supported**: Windows 10+, macOS 10.14+, Linux (Ubuntu 18.04+)
- **Node.js**: 18.x, 19.x, 20.x (LTS recommended)
- **Architectures**: x64, ARM64

### External Dependencies
- Minimal external dependencies by design
- All dependencies must be actively maintained
- Prefer Node.js built-in modules when possible
- No native dependencies (platform compatibility)

## Future Technical Considerations

### Post-MVP Enhancements
- Database storage backends (SQLite, PostgreSQL)
- Multiple transport protocols
- Authentication and authorization
- Metrics collection and export
- Plugin architecture

### Scalability Planning
- Connection pooling for database backends
- Horizontal scaling for multi-instance deployments
- Load balancing for high-availability setups
- Caching strategies for session data

This technical foundation provides a solid, maintainable base for the MVP while keeping future enhancements in mind. 