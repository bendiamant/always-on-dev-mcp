#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolRequest
} from '@modelcontextprotocol/sdk/types.js';
import { SessionManager } from './session.js';
import { Logger } from './logger.js';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Determine project root
// Assumes that when running from dist/, __dirname will be .../dist/
// So, path.resolve(__dirname, '..') will give the project root.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const logger = new Logger(projectRoot);
const sessionManager = new SessionManager(logger);

const server = new Server(
  {
    name: 'mandatory-workflow-mcp',
    version: '1.0.0',
    description: 'MCP server that ensures AI agents execute mandatory workflow steps'
  },
  {
    capabilities: { 
      tools: {} 
    }
  }
);

interface InitializeWorkspaceArgs {
  task_description: string;
  workspace_path?: string;
}

interface FinalizeWorkspaceArgs {
  session_id: string;
  completion_summary?: string;
  files_modified?: string[];
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  logger.info('ListTools request received (Low-Level Server)');
  return {
    tools: [
      {
        name: 'initialize_coding_workspace',
        description: 'Initialize coding workspace for development task - REQUIRED for proper workflow',
        inputSchema: { 
          type: 'object',
          properties: {
            task_description: { type: 'string', description: 'Description of the coding task to be performed' },
            workspace_path: { type: 'string', description: 'Optional path to the workspace directory' }
          },
          required: ['task_description']
        }
      },
      {
        name: 'finalize_coding_workspace',
        description: 'Finalize and cleanup coding workspace - REQUIRED to complete workflow',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: { type: 'string', description: 'Session ID from workspace initialization' },
            completion_summary: { type: 'string', description: 'Summary of work completed' },
            files_modified: { type: 'array', items: { type: 'string' }, description: 'List of files that were modified during the session' }
          },
          required: ['session_id']
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  const { name, arguments: toolCallArgsUnsafe } = request.params;

  logger.info(`CallTool request received for tool: ${name} (Low-Level Server)`, { toolCallArgs: toolCallArgsUnsafe });

  try {
    if (name === 'initialize_coding_workspace') {
      const args = toolCallArgsUnsafe as unknown as InitializeWorkspaceArgs;
      if (!args || !args.task_description || typeof args.task_description !== 'string') {
        throw new Error('task_description is required and must be a string');
      }
      const session = sessionManager.createSession(args.task_description, args.workspace_path);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            session_id: session.id,
            status: 'initialized',
            message: `Workspace initialized for task: ${args.task_description}`,
            timestamp: session.startTime.toISOString()
          }, null, 2)
        }]
      };
    } else if (name === 'finalize_coding_workspace') {
      const args = toolCallArgsUnsafe as unknown as FinalizeWorkspaceArgs;
      if (!args || !args.session_id || typeof args.session_id !== 'string') {
        throw new Error('session_id is required and must be a string');
      }
      const result = sessionManager.completeSession(args.session_id, args.completion_summary, args.files_modified);
      if (!result) {
        throw new Error(`Session ${args.session_id} not found or already completed`);
      }
      const duration = result.endTime ? result.endTime.getTime() - result.startTime.getTime() : 0;
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            session_id: args.session_id,
            status: 'finalized',
            message: 'Workspace successfully finalized',
            summary: args.completion_summary || 'No summary provided',
            duration: Math.round(duration / 1000),
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Tool execution error', { tool: name, error: errorMessage, receivedArgs: toolCallArgsUnsafe });
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          status: 'error',
          message: `Error executing ${name}: ${errorMessage}`,
          timestamp: new Date().toISOString()
        }, null, 2)
      }],
      isError: true
    };
  }
});

async function main() {
  logger.info('Starting MCP server (Low-Level Server SDK)...');
  const transport = new StdioServerTransport();
  logger.info('Transport created, connecting...');
  await server.connect(transport);
  logger.info('Mandatory Workflow MCP Server (Low-Level Server SDK) started and connected');
}

process.on('SIGINT', async () => {
  logger.info('Shutting down server...');
  await sessionManager.cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down server...');
  await sessionManager.cleanup();
  process.exit(0);
});

main().catch((error) => {
  logger.error('Server startup failed', { error: error.message });
  process.exit(1);
}); 