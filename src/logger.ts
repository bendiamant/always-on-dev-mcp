import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url'; // For ES Modules

// Helper to get __dirname in ES Modules, will be used if baseDirectory is not provided
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// Determine project root assuming logger.js is in dist/ and src/ is one level up from dist/
// This makes the log path independent of the current working directory.
// const projectRoot = path.resolve(__dirname, '..');
// const defaultLogDir = path.join(projectRoot, 'logs');

declare const process: any;

export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

export class Logger {
  private logFilePath: string;
  // private logDir: string; // Removed as it's not used
  private effectiveLogDir: string; // To store the final log directory path

  constructor(baseDirectory: string, logDirectory?: string, fileName: string = 'server.log') {
    // baseDirectory is now mandatory.
    // It should typically be the project root.
    
    // Remove import { fileURLToPath } from 'url'; if it's no longer used.
    // The import statement for fileURLToPath might need to be removed if this was the only usage.

    const defaultLogDirCalculated = path.join(baseDirectory, 'logs');

    if (logDirectory) {
      this.effectiveLogDir = logDirectory;
    } else if (process.env.LOG_DIR) {
      this.effectiveLogDir = path.resolve(process.env.LOG_DIR); // Resolve LOG_DIR to absolute path
    } else {
      this.effectiveLogDir = defaultLogDirCalculated;
    }

    if (!fs.existsSync(this.effectiveLogDir)) {
      try {
        fs.mkdirSync(this.effectiveLogDir, { recursive: true });
        this.logFilePath = path.join(this.effectiveLogDir, fileName);
      } catch (error) {
        this.logFilePath = ''; // Signal fallback to stderr
        // Write plain text to stderr instead of JSON to avoid MCP protocol conflicts
        const errorMsg = `[ERROR] ${new Date().toISOString()} - Failed to create log directory: ${error instanceof Error ? error.message : String(error)}\n`;
        process.stderr.write(errorMsg);
      }
    } else {
      this.logFilePath = path.join(this.effectiveLogDir, fileName);
    }
  }

  private formatAndWrite(level: string, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logData = typeof data === 'object' && data !== null ? data : { details: data }; 
    const logEntryString = JSON.stringify({ timestamp, level, message, data: logData }) + '\n';

    if (this.logFilePath) {
      try {
        fs.appendFileSync(this.logFilePath, logEntryString);
      } catch (error) {
        // Fallback to stderr if file writing fails - use plain text format
        const fileErrorMsg = `[ERROR] ${new Date().toISOString()} - Failed to write to log file: ${error instanceof Error ? error.message : String(error)}\n`;
        process.stderr.write(fileErrorMsg);
        // Also log the original message in plain text format
        const plainLogMsg = `[${level.toUpperCase()}] ${timestamp} - ${message}${data ? ' - Data: ' + JSON.stringify(data) : ''}\n`;
        process.stderr.write(plainLogMsg);
      }
    } else {
      // Log to stderr if logFilePath was not set - use plain text format
      const plainLogMsg = `[${level.toUpperCase()}] ${timestamp} - ${message}${data ? ' - Data: ' + JSON.stringify(data) : ''}\n`;
      process.stderr.write(plainLogMsg);
    }
  }

  info(message: string, data?: any): void {
    this.formatAndWrite('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.formatAndWrite('warn', message, data);
  }

  error(message: string, data?: any): void {
    this.formatAndWrite('error', message, data);
  }
} 