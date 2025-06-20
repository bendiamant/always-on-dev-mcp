import { Logger, LogEntry } from './logger';
import * as fs from 'fs';
import * as path from 'path';
import { jest } from '@jest/globals'; // Use this for ESM compatible jest mocking

// Mock the fs module
jest.mock('fs');
const mockedFs = jest.mocked(fs);

// const __filename = fileURLToPath(import.meta.url); // Not needed in test file
// const __dirname = path.dirname(__filename); // Jest provides its own __dirname for the test file
const projectRootForTest = path.resolve(__dirname, '..'); // Resolves to project root from src/
const testLogDir = path.join(__dirname, 'test-logs'); // A temporary dir for test logs relative to src/

describe('Logger', () => {
  let logger: Logger;
  const logFileName = 'test-server.log';
  const fullLogPath = path.join(testLogDir, logFileName);

  // Spy on process.stderr.write
  let stderrSpy: jest.SpiedFunction<typeof process.stderr.write>;

  beforeEach(() => {
    // Reset mocks and spies before each test
    jest.resetAllMocks();
    stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true); // Mock implementation to avoid actual writing

    // Default mock implementations
    mockedFs.existsSync.mockReturnValue(false); // Assume dir doesn't exist by default
    mockedFs.mkdirSync.mockReturnValue(undefined); // Mock successful dir creation
    mockedFs.appendFileSync.mockImplementation(() => {}); // Mock successful file append

    // Ensure the test log directory is "created" for most tests
    // For tests that specifically test directory creation failure, this will be overridden.
    // The default mock for existsSync should now handle the expected default log dir as well for relevant tests.
    mockedFs.existsSync.mockImplementation((p) => {
        // Default: testLogDir and the project's default log dir are considered existing
        return p === testLogDir || p === path.join(projectRootForTest, 'logs');
    });
    mockedFs.mkdirSync.mockImplementation((p) => {
      const allowedPaths = [
        testLogDir, // /app/src/test-logs
        path.join(projectRootForTest, 'logs'), // /app/logs
        path.resolve('env-log-dir') // /app/env-log-dir (if LOG_DIR is 'env-log-dir')
      ];
      const pStr = p.toString(); // Convert PathLike to string
      if (allowedPaths.includes(pStr)) {
        return undefined;
      }
      // console.error(`Unexpected mkdirSync call to path: ${pStr}`); // For debugging
      throw new Error(`Unexpected mkdirSync call to path: ${pStr}. Allowed paths: ${allowedPaths.join(', ')}`);
    });

    // Pass projectRootForTest as the baseDirectory for the logger in tests
    // New signature: constructor(baseDirectory: string, logDirectory?: string, fileName?: string)
    logger = new Logger(projectRootForTest, testLogDir, logFileName);
  });

  afterEach(() => {
    // Restore the original implementation if it was spied on
     if (stderrSpy) {
      stderrSpy.mockRestore();
    }
  });

  describe('Initialization', () => {
    it('should create log directory if it does not exist', () => {
      mockedFs.existsSync.mockImplementation((p) => p !== testLogDir); // Explicitly say target dir doesn't exist
      new Logger(projectRootForTest, testLogDir, logFileName);
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(testLogDir, { recursive: true });
      expect(mockedFs.appendFileSync).not.toHaveBeenCalled(); // No log writing on init
    });

    it('should use existing log directory', () => {
      mockedFs.existsSync.mockImplementation(() => true); // All dirs exist
      new Logger(projectRootForTest, testLogDir, logFileName);
      expect(mockedFs.mkdirSync).not.toHaveBeenCalled();
    });

    it('should use process.env.LOG_DIR if no directory is provided', () => {
      process.env.LOG_DIR = 'env-log-dir';
      mockedFs.existsSync.mockReturnValue(false); // env-log-dir doesn't exist
      // Logger(baseDirectory: string, logDirectory?: string, fileName?: string)
      const envLogger = new Logger(projectRootForTest, undefined, logFileName);
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(path.resolve('env-log-dir'), { recursive: true });
      delete process.env.LOG_DIR; // Clean up env var
    });

    it('should default to "logs" directory relative to project root if no dir and no env var', () => {
      const expectedDefaultDir = path.join(projectRootForTest, 'logs');
      // Ensure only the expectedDefaultDir is reported as not existing for this specific test case
      mockedFs.existsSync.mockImplementation((p) => p !== expectedDefaultDir);

      mockedFs.mkdirSync.mockClear(); // Clear any calls from beforeEach or other tests in the suite

      // Logger(baseDirectory: string, logDirectory?: string, fileName?: string)
      const defaultLogger = new Logger(projectRootForTest, undefined, 'default.log');
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(expectedDefaultDir, { recursive: true });
    });

    it('should fall back to stderr if log directory creation fails', () => {
      // Make the specific testLogDir not exist
      mockedFs.existsSync.mockImplementation((p) => p !== testLogDir);
      const mkdirError = new Error('Permission denied');
      // Ensure mkdirSync only fails for testLogDir for this test
      mockedFs.mkdirSync.mockImplementation((p) => {
        if (p === testLogDir) throw mkdirError; // This is the target log directory for this specific instance
        if (p === path.join(projectRootForTest, 'logs')) throw mkdirError; // Also fail if it tries the default
        return undefined;
      });

      new Logger(projectRootForTest, testLogDir, logFileName);

      expect(stderrSpy).toHaveBeenCalled();
      const callArgs = stderrSpy.mock.calls[0][0] as string; // Assuming this is the relevant call
      expect(callArgs).toContain('[ERROR]');
      expect(callArgs).toContain('Failed to create log directory: Permission denied');
    });
  });

  describe('Logging Methods', () => {
    const testMessage = 'Test log message';
    const testData = { detail: 'some data' };

    // Re-initialize logger for this specific describe block if needed, or ensure beforeEach handles it.
    // The global logger from the outer beforeEach is used by default.

    it('should write info message to log file', () => {
      logger.info(testMessage, testData);
      expect(mockedFs.appendFileSync).toHaveBeenCalledTimes(1);
      const logEntryString = mockedFs.appendFileSync.mock.calls[0][1] as string;
      const logEntry: LogEntry = JSON.parse(logEntryString);
      expect(logEntry.level).toBe('info');
      expect(logEntry.message).toBe(testMessage);
      expect(logEntry.data).toEqual(testData);
      expect(logEntry.timestamp).toBeDefined();
    });

    it('should write warn message to log file', () => {
      logger.warn(testMessage, testData);
      expect(mockedFs.appendFileSync).toHaveBeenCalledTimes(1);
      const logEntry: LogEntry = JSON.parse(mockedFs.appendFileSync.mock.calls[0][1] as string);
      expect(logEntry.level).toBe('warn');
      expect(logEntry.message).toBe(testMessage);
    });

    it('should write error message to log file', () => {
      logger.error(testMessage, testData);
      expect(mockedFs.appendFileSync).toHaveBeenCalledTimes(1);
      const logEntry: LogEntry = JSON.parse(mockedFs.appendFileSync.mock.calls[0][1] as string);
      expect(logEntry.level).toBe('error');
      expect(logEntry.message).toBe(testMessage);
    });

    it('should handle data not being an object', () => {
      logger.info(testMessage, "just a string");
      expect(mockedFs.appendFileSync).toHaveBeenCalledTimes(1);
      const logEntry: LogEntry = JSON.parse(mockedFs.appendFileSync.mock.calls[0][1] as string);
      expect(logEntry.data).toEqual({ details: "just a string" });
    });

    it('should fall back to stderr if appendFileSync fails', () => {
      const appendError = new Error('Disk full');
      mockedFs.appendFileSync.mockImplementation(() => {
        throw appendError;
      });

      logger.error(testMessage, testData);

      expect(stderrSpy).toHaveBeenCalledTimes(2); // Once for the file error, once for the original message
      const fileErrorCall = stderrSpy.mock.calls[0][0] as string;
      expect(fileErrorCall).toContain('[ERROR]');
      expect(fileErrorCall).toContain('Failed to write to log file: Disk full');

      const originalMsgCall = stderrSpy.mock.calls[1][0] as string;
      expect(originalMsgCall).toContain('[ERROR]'); // Original level
      expect(originalMsgCall).toContain(testMessage);
      expect(originalMsgCall).toContain(JSON.stringify(testData));
    });

    it('should log to stderr if logFilePath was not set (e.g. dir creation failed)', () => {
      // Ensure all attempts to create directories fail for this logger instance
      mockedFs.existsSync.mockReturnValue(false); // All paths do not exist
      mockedFs.mkdirSync.mockImplementation(() => { throw new Error('Cannot create'); }); // All mkdir calls fail

      // Pass projectRootForTest here as well
      // Logger(baseDirectory: string, logDirectory?: string, fileName?: string)
      const errorLogger = new Logger(projectRootForTest, testLogDir, logFileName);
      stderrSpy.mockClear(); // Clear spy calls from constructor

      errorLogger.info(testMessage, testData);

      expect(mockedFs.appendFileSync).not.toHaveBeenCalled();
      expect(stderrSpy).toHaveBeenCalledTimes(1);
      const logCall = stderrSpy.mock.calls[0][0] as string;
      expect(logCall).toContain('[INFO]');
      expect(logCall).toContain(testMessage);
      expect(logCall).toContain(JSON.stringify(testData));
    });
  });
});
