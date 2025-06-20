#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SessionManager } from './session.js';
import { Logger } from './logger.js';
import * as path from 'path';

// Determine project root
// FIXME: This is a temporary simplification to bypass ts-jest issues with import.meta.url.
// A robust solution for project root determination is needed.
const projectRoot = '.';

const logger = new Logger(projectRoot);
const sessionManager = new SessionManager(logger);

export let server: McpServer; // Export for tests

import { z } from 'zod'; // Add this import

export function setupServer() {
  server = new McpServer({
    name: 'mandatory-workflow-mcp',
    version: '1.0.0',
    description: 'MCP server that ensures AI agents execute mandatory workflow steps'
    // `capabilities` are usually not needed here as they are inferred
  });

  // Register initialize_coding_workspace tool
  server.registerTool(
    'initialize_coding_workspace',
    {
      title: 'Initialize Coding Workspace',
      description: 'Initialize coding workspace for development task - REQUIRED for proper workflow',
    inputSchema: { // Pass the raw shape, not a ZodObject instance
      task_description: z.string().describe('Description of the coding task to be performed'),
      workspace_path: z.string().optional().describe('Optional path to the workspace directory')
    }
    },
    initializeCodingWorkspaceHandler // Pass the handler function
  );

  // Register finalize_coding_workspace tool
  server.registerTool(
    'finalize_coding_workspace',
    {
      title: 'Finalize Coding Workspace',
      description: 'Finalize and cleanup coding workspace - REQUIRED to complete workflow',
    inputSchema: { // Pass the raw shape
      session_id: z.string().describe('Session ID from workspace initialization'),
      completion_summary: z.string().optional().describe('Summary of work completed'),
      files_modified: z.array(z.string()).optional().describe('List of files that were modified during the session')
    }
    },
    finalizeCodingWorkspaceHandler // Pass the handler function
  );
  return server;
}

// Define interfaces for tool arguments (could be in a separate types.ts file)
export interface InitializeWorkspaceArgs {
  task_description: string;
  workspace_path?: string;
}

export interface FinalizeWorkspaceArgs {
  session_id: string;
  completion_summary?: string;
  files_modified?: string[];
}

// Define a more specific return type for handlers
interface TextContentItem {
  type: "text";
  text: string;
  [key: string]: any; // Allow other properties
}
interface HandlerSuccessReturn {
  content: TextContentItem[];
  [key: string]: any; // Allow other properties on the return object itself
}

// Define and export tool handlers for testability
// Assuming 'extra' is of type RequestHandlerExtra from the SDK, but using 'any' for simplicity here.
export async function initializeCodingWorkspaceHandler(args: InitializeWorkspaceArgs, extra: any): Promise<HandlerSuccessReturn> {
  logger.info('CallTool request received for tool: initialize_coding_workspace (McpServer)', { toolCallArgs: args });
  // Zod validation by McpServer means args are typed and validated.
  // Manual checks like "if (!args || !args.task_description)" are no longer needed.
  const session = sessionManager.createSession(args.task_description, args.workspace_path);
  return {
    content: [{
      type: "text", // 'as const' is not strictly needed here if return type is specific
      text: JSON.stringify({
        session_id: session.id,
        status: 'initialized',
        message: `Workspace initialized for task: ${args.task_description}`,
        timestamp: session.startTime.toISOString()
      }, null, 2)
    }]
    // The SDK might expect additional optional properties on this return object or on content items.
    // For now, this is the minimal structure based on previous working code.
  };
}

export async function finalizeCodingWorkspaceHandler(args: FinalizeWorkspaceArgs, extra: any): Promise<HandlerSuccessReturn> {
  logger.info('CallTool request received for tool: finalize_coding_workspace (McpServer)', { toolCallArgs: args });
  // Zod validation by McpServer means args are typed and validated.
  const result = sessionManager.completeSession(args.session_id, args.completion_summary, args.files_modified);
  if (!result) {
    throw new Error(`Session ${args.session_id} not found or already completed`);
  }
  const duration = result.endTime ? result.endTime.getTime() - result.startTime.getTime() : 0;
  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        session_id: args.session_id,
        status: "finalized",
        message: 'Workspace successfully finalized',
        summary: args.completion_summary || 'No summary provided',
        duration: Math.round(duration / 1000),
        timestamp: new Date().toISOString()
      }, null, 2)
    }]
  };
}

async function main() {
  setupServer(); // Call setup
  logger.info('Starting MCP server (McpServer SDK)...');
  const transport = new StdioServerTransport();
  logger.info('Transport created, connecting...');
  await server.connect(transport);
  logger.info('Mandatory Workflow MCP Server (McpServer SDK) started and connected');
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

// Guard execution for when not imported
if (process.env.NODE_ENV !== 'test') { // Or another way to guard
    main().catch((error) => {
    logger.error('Server startup failed', { error: error.message });
    process.exit(1);
  });
}