import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  setupServer,
  initializeCodingWorkspaceHandler,
  finalizeCodingWorkspaceHandler,
  InitializeWorkspaceArgs,
  FinalizeWorkspaceArgs
} from './index'; // Adjusted path for imports from index.ts
// SessionManager and SessionData are imported for type annotations and mocking.
import { SessionManager, SessionData } from './session';
import { Logger } from './logger';

// Mock SessionManager module
jest.mock('./session', () => {
  // Define mocks within the factory scope
  const mockCreateSession = jest.fn();
  const mockCompleteSession = jest.fn();
  const mockGetSession = jest.fn();
  const mockCleanup = jest.fn();

  const MockedSessionManager = jest.fn().mockImplementation(() => {
    return {
      createSession: mockCreateSession,
      completeSession: mockCompleteSession,
      getSession: mockGetSession,
      cleanup: mockCleanup,
    };
  });
  // Attach mocks to the constructor for test access
  (MockedSessionManager as any).__mockCreateSession = mockCreateSession;
  (MockedSessionManager as any).__mockCompleteSession = mockCompleteSession;
  (MockedSessionManager as any).__mockGetSession = mockGetSession;
  (MockedSessionManager as any).__mockCleanup = mockCleanup;

  return { SessionManager: MockedSessionManager };
});

// Mock Logger
jest.mock('./logger', () => {
  return {
    Logger: jest.fn().mockImplementation(() => {
      return {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
      };
    }),
  };
});

describe('MCP Server Tooling', () => {
  // serverInstance is not directly used for handler tests anymore
  // let serverInstance: McpServer;
  // mockSessionManagerInstance is not strictly needed for configuring mocks if using module-scoped mocks,
  // but can be kept if any test specifically needs to assert something about the instance itself.
  // let mockSessionManagerInstance: jest.Mocked<SessionManager>;

  // Explicitly type the handlers
  let testInitializeHandler: (args: InitializeWorkspaceArgs, extra: any) => Promise<{ content: { type: "text"; text: string; }[] }>;
  let testFinalizeHandler: (args: FinalizeWorkspaceArgs, extra: any) => Promise<{ content: { type: "text"; text: string; }[] }>;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';

    testInitializeHandler = initializeCodingWorkspaceHandler;
    testFinalizeHandler = finalizeCodingWorkspaceHandler;

    setupServer(); // This will ensure the SessionManager in src/index.ts is instantiated using the mock

    // Optional: capture the instance if needed for specific instance-based assertions,
    // but mock configuration will now primarily use the module-scoped mocks.
    // const MockedSessionManagerCtor = SessionManager as jest.MockedClass<typeof SessionManager>;
    // if (MockedSessionManagerCtor.mock.instances.length > 0) {
    //   mockSessionManagerInstance = MockedSessionManagerCtor.mock.instances[0] as jest.Mocked<SessionManager>;
    // }
  });

  beforeEach(() => {
    // Access the static mock functions and clear/reset them
    const MockedSessionManager = SessionManager as any; // Cast to access static mocks
    MockedSessionManager.__mockCreateSession.mockClear().mockReset();
    MockedSessionManager.__mockCompleteSession.mockClear().mockReset();
    MockedSessionManager.__mockGetSession.mockClear().mockReset();
    MockedSessionManager.__mockCleanup.mockClear().mockReset();
  });

  describe('initialize_coding_workspace tool', () => {
    it('should successfully initialize a workspace', async () => {
      const taskDescription = 'Test task';
      const workspacePath = '/test/path';
      const mockSession: SessionData = { // Use full SessionData
        id: 'test-session-id',
        startTime: new Date(),
        taskDescription: taskDescription,
        workspacePath: workspacePath,
        status: 'active', // Provide all required fields
        artifacts: [],
        // endTime can be undefined initially
      };
      // Access static mock for configuration
      (SessionManager as any).__mockCreateSession.mockReturnValue(mockSession);

      const result = await testInitializeHandler({ // Use the explicitly typed handler
        task_description: taskDescription,
        workspace_path: workspacePath,
      }, null);

      expect((SessionManager as any).__mockCreateSession).toHaveBeenCalledWith(taskDescription, workspacePath);
      expect(result).toHaveProperty('content');
      expect(result.content[0].type).toBe('text');
      const parsedText = JSON.parse(result.content[0].text);
      expect(parsedText.session_id).toBe(mockSession.id);
      expect(parsedText.status).toBe('initialized');
      expect(parsedText.message).toContain(taskDescription);
      expect(new Date(parsedText.timestamp).toISOString()).toBe(mockSession.startTime?.toISOString());
    });

    /* Test for missing task_description (Zod should handle this via McpServer)
    it('should throw an error if task_description is missing', async () => {
      await expect(
        testInitializeHandler({} as InitializeWorkspaceArgs, null)
      ).rejects.toThrow('task_description is required and must be a string');
      expect(mockSessionManager.createSession).not.toHaveBeenCalled();
    });
    */
  });

  describe('finalize_coding_workspace tool', () => {
    const sessionId = 'test-session-id';
    const completionSummary = 'Work completed successfully';

    it('should successfully finalize a workspace', async () => {
      const startTime = new Date(Date.now() - 1000 * 60 * 5);
      const endTime = new Date();
      const mockCompletedSession: SessionData = { // Use full SessionData
        id: sessionId,
        status: 'completed',
        startTime: startTime,
        endTime: endTime,
        taskDescription: 'some task', // Add required fields
        artifacts: [],
        // workspacePath can be undefined
      };
      (SessionManager as any).__mockCompleteSession.mockReturnValue(mockCompletedSession);

      const result = await testFinalizeHandler({ // Use the explicitly typed handler
        session_id: sessionId,
        completion_summary: completionSummary,
      }, null);

      expect((SessionManager as any).__mockCompleteSession).toHaveBeenCalledWith(sessionId, completionSummary, undefined); // files_modified is undefined
      expect(result).toHaveProperty('content');
      expect(result.content[0].type).toBe('text');
      const parsedText = JSON.parse(result.content[0].text);
      expect(parsedText.session_id).toBe(sessionId);
      expect(parsedText.status).toBe('finalized');
      expect(parsedText.summary).toBe(completionSummary);
      expect(parsedText.duration).toBe(Math.round((endTime.getTime() - startTime.getTime()) / 1000));
    });

    /* Test for missing session_id (Zod should handle this via McpServer)
    it('should throw an error if session_id is missing', async () => {
      await expect(
        testFinalizeHandler({ completion_summary: 'Done' } as FinalizeWorkspaceArgs, null)
      ).rejects.toThrow('session_id is required and must be a string');
      expect(mockSessionManager.completeSession).not.toHaveBeenCalled();
    });
    */

    it('should throw an error if session is not found or already completed', async () => {
      (SessionManager as any).__mockCompleteSession.mockReturnValue(null);

      await expect(
        testFinalizeHandler({ session_id: sessionId }, null)
      ).rejects.toThrow(`Session ${sessionId} not found or already completed`);
      expect((SessionManager as any).__mockCompleteSession).toHaveBeenCalledWith(sessionId, undefined, undefined);
    });
  });
});
