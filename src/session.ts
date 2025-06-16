import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

declare const process: any;

export interface SessionData {
  id: string;
  startTime: Date;
  endTime?: Date;
  taskDescription: string;
  workspacePath?: string;
  status: 'active' | 'completed' | 'failed' | 'timeout';
  artifacts: string[];
}

export class SessionManager {
  private activeSessions: Map<string, SessionData> = new Map();
  private logger: any;
  private sessionTimeout: number;

  constructor(logger: any) {
    this.logger = logger;
    this.sessionTimeout = parseInt(process.env.SESSION_TIMEOUT || '60') * 60 * 1000; // Convert minutes to milliseconds
  }

  createSession(taskDescription: string, workspacePath?: string): SessionData {
    const sessionId = uuidv4();
    const session: SessionData = {
      id: sessionId,
      startTime: new Date(),
      taskDescription,
      workspacePath,
      status: 'active',
      artifacts: []
    };

    this.activeSessions.set(sessionId, session);
    this.logger.info('Session created', { sessionId, taskDescription, workspacePath });

    // Set timeout for session cleanup
    setTimeout(() => {
      this.timeoutSession(sessionId);
    }, this.sessionTimeout);

    return session;
  }

  getSession(sessionId: string): SessionData | undefined {
    return this.activeSessions.get(sessionId);
  }

  completeSession(sessionId: string, completionSummary?: string, filesModified?: string[]): SessionData | null {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      this.logger.warn('Attempted to complete non-existent session', { sessionId });
      return null;
    }

    session.endTime = new Date();
    session.status = 'completed';
    if (filesModified) {
      session.artifacts = filesModified;
    }

    // Remove from active sessions
    this.activeSessions.delete(sessionId);

    // Persist completed session
    this.persistSession(session, completionSummary);

    this.logger.info('Session completed', { 
      sessionId, 
      duration: session.endTime.getTime() - session.startTime.getTime(),
      completionSummary,
      artifactCount: session.artifacts.length
    });

    return session;
  }

  private timeoutSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session && session.status === 'active') {
      session.status = 'timeout';
      session.endTime = new Date();
      this.activeSessions.delete(sessionId);
      
      this.persistSession(session, 'Session timed out');
      this.logger.warn('Session timed out', { sessionId });
    }
  }

  private persistSession(session: SessionData, summary?: string): void {
    try {
      const logDir = process.env.LOG_DIR || './logs';
      const sessionsDir = path.join(logDir, 'sessions');
      
      // Ensure sessions directory exists
      if (!fs.existsSync(sessionsDir)) {
        fs.mkdirSync(sessionsDir, { recursive: true });
      }

      const dateStr = session.startTime.toISOString().split('T')[0];
      const sessionFile = path.join(sessionsDir, `${dateStr}-sessions.json`);
      
      const sessionRecord = {
        ...session,
        startTime: session.startTime.toISOString(),
        endTime: session.endTime?.toISOString(),
        summary
      };

      // Read existing sessions for the day
      let sessions: any[] = [];
      if (fs.existsSync(sessionFile)) {
        const fileContent = fs.readFileSync(sessionFile, 'utf-8');
        sessions = JSON.parse(fileContent);
      }

      // Add new session
      sessions.push(sessionRecord);

      // Write back to file
      fs.writeFileSync(sessionFile, JSON.stringify(sessions, null, 2));

    } catch (error) {
      this.logger.error('Failed to persist session', { sessionId: session.id, error });
    }
  }

  getActiveSessionCount(): number {
    return this.activeSessions.size;
  }

  getActiveSessions(): SessionData[] {
    return Array.from(this.activeSessions.values());
  }

  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up session manager', { activeSessionCount: this.activeSessions.size });
    
    // Complete all active sessions
    for (const [sessionId, session] of this.activeSessions) {
      session.status = 'failed';
      session.endTime = new Date();
      this.persistSession(session, 'Server shutdown');
    }

    this.activeSessions.clear();
  }
} 