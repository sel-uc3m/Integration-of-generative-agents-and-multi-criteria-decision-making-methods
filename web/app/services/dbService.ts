import { join, resolve } from "path";
import { existsSync, mkdirSync } from "fs";
import { createRequire } from "module";

function getResultsDir(): string {
  if (existsSync(resolve(process.cwd(), "results"))) {
    return resolve(process.cwd(), "results");
  }
  return resolve(process.cwd(), "../results");
}

const RESULTS_DIR = getResultsDir();

// Ensure results dir exists
if (!existsSync(RESULTS_DIR)) {
  mkdirSync(RESULTS_DIR, { recursive: true });
}

const dbPath = join(RESULTS_DIR, "sessions.db");

// Universal Runtime SQLite loader (handles Bun and Node 22+ with Next.js Turbopack)
function createDb(): any {
  // 1. Try Bun native sqlite
  if (typeof (globalThis as any).Bun !== "undefined") {
    try {
      const { Database } = (globalThis as any).Bun;
      if (Database) return new Database(dbPath);
      const req = createRequire(join(process.cwd(), "package.json"));
      const bunSqlite = req("bun:sqlite");
      return new bunSqlite.Database(dbPath);
    } catch (e: any) {
      console.warn("bun:sqlite fallback:", e?.message);
    }
  }

  // 2. Try Node native sqlite via createRequire
  try {
    const req = createRequire(join(process.cwd(), "package.json"));
    const nodeSqlite = req("node:sqlite");
    if (nodeSqlite?.DatabaseSync) {
      return new nodeSqlite.DatabaseSync(dbPath);
    }
  } catch (e: any) {
    console.warn("createRequire node:sqlite fallback:", e?.message);
  }

  // 3. Direct global require fallback
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DatabaseSync } = require("node:sqlite");
    return new DatabaseSync(dbPath);
  } catch (err: any) {
    console.error("Failed to initialize SQLite Database in dbService:", err?.message);
    return {
      exec: () => {},
      prepare: () => ({
        run: () => {},
        get: () => null,
        all: () => []
      })
    };
  }
}

const db = createDb();

// Enable foreign keys cascading support
try {
  db.exec("PRAGMA foreign_keys = ON;");
} catch {}

// Initialize tables
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      process_name TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_active_at TEXT NOT NULL,
      questions_file TEXT,
      profile TEXT, -- Serialized JSON GraphProfile
      first_interrupt TEXT -- Serialized JSON
    );

    CREATE TABLE IF NOT EXISTS traces (
      session_id TEXT PRIMARY KEY,
      active_node TEXT,
      node_history TEXT NOT NULL, -- Serialized JSON NodeVisit[]
      llm_calls TEXT NOT NULL, -- Serialized JSON LLMCall[]
      node_runs TEXT NOT NULL, -- Serialized JSON NodeRun[]
      FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS results (
      session_id TEXT PRIMARY KEY,
      output_json TEXT NOT NULL, -- Serialized JSON
      task_summaries TEXT NOT NULL, -- Serialized JSON
      output_file_name TEXT NOT NULL,
      completed_at TEXT NOT NULL,
      FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );
  `);
} catch {}

// Alter table to add new columns if they do not exist
try {
  db.exec("ALTER TABLE sessions ADD COLUMN questions_files TEXT;");
} catch (e) {}
try {
  db.exec("ALTER TABLE sessions ADD COLUMN current_file_index INTEGER DEFAULT 0;");
} catch (e) {}
try {
  db.exec("ALTER TABLE sessions ADD COLUMN carried_context_map TEXT;");
} catch (e) {}
try {
  db.exec("ALTER TABLE sessions ADD COLUMN carried_output_json TEXT;");
} catch (e) {}

// Session operations
export interface DbSession {
  id: string;
  process_name: string;
  status: string;
  created_at: string;
  last_active_at: string;
  questions_file?: string;
  profile?: string;
  first_interrupt?: string;
  questions_files?: string;
  current_file_index?: number;
  carried_context_map?: string;
  carried_output_json?: string;
}

export function saveSession(session: DbSession) {
  const stmt = db.prepare(`
    INSERT INTO sessions (
      id, process_name, status, created_at, last_active_at, questions_file, profile, first_interrupt,
      questions_files, current_file_index, carried_context_map, carried_output_json
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status,
      last_active_at = excluded.last_active_at,
      first_interrupt = excluded.first_interrupt,
      current_file_index = excluded.current_file_index,
      carried_context_map = excluded.carried_context_map,
      carried_output_json = excluded.carried_output_json,
      profile = excluded.profile
  `);
  stmt.run(
    session.id,
    session.process_name,
    session.status,
    session.created_at,
    session.last_active_at,
    session.questions_file || null,
    session.profile || null,
    session.first_interrupt || null,
    session.questions_files || null,
    session.current_file_index !== undefined ? session.current_file_index : 0,
    session.carried_context_map || null,
    session.carried_output_json || null
  );
}

export function getSessionFromDb(id: string): DbSession | null {
  const stmt = db.prepare("SELECT * FROM sessions WHERE id = ?");
  const result = stmt.get(id) as DbSession | undefined;
  return result || null;
}

export function listSessionsFromDb(): DbSession[] {
  const stmt = db.prepare("SELECT * FROM sessions ORDER BY last_active_at DESC");
  return stmt.all() as DbSession[];
}

// Trace operations
export interface DbTrace {
  session_id: string;
  active_node: string | null;
  node_history: string;
  llm_calls: string;
  node_runs: string;
}

export function saveTrace(trace: DbTrace) {
  const stmt = db.prepare(`
    INSERT INTO traces (session_id, active_node, node_history, llm_calls, node_runs)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(session_id) DO UPDATE SET
      active_node = excluded.active_node,
      node_history = excluded.node_history,
      llm_calls = excluded.llm_calls,
      node_runs = excluded.node_runs
  `);
  stmt.run(
    trace.session_id,
    trace.active_node || null,
    trace.node_history,
    trace.llm_calls,
    trace.node_runs
  );
}

export function getTraceFromDb(sessionId: string): DbTrace | null {
  const stmt = db.prepare("SELECT * FROM traces WHERE session_id = ?");
  const result = stmt.get(sessionId) as DbTrace | undefined;
  return result || null;
}

// Results operations
export interface DbResult {
  session_id: string;
  output_json: string;
  task_summaries: string;
  output_file_name: string;
  completed_at: string;
}

export function saveResult(result: DbResult) {
  const stmt = db.prepare(`
    INSERT INTO results (session_id, output_json, task_summaries, output_file_name, completed_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(session_id) DO UPDATE SET
      output_json = excluded.output_json,
      task_summaries = excluded.task_summaries,
      output_file_name = excluded.output_file_name,
      completed_at = excluded.completed_at
  `);
  stmt.run(
    result.session_id,
    result.output_json,
    result.task_summaries,
    result.output_file_name,
    result.completed_at
  );
}

export function getResultFromDb(sessionId: string): DbResult | null {
  const stmt = db.prepare("SELECT * FROM results WHERE session_id = ?");
  const result = stmt.get(sessionId) as DbResult | undefined;
  return result || null;
}

export function listResultsFromDb(): DbResult[] {
  const stmt = db.prepare("SELECT * FROM results ORDER BY completed_at DESC");
  return stmt.all() as DbResult[];
}

// Maintenance operations: Delete expired sessions older than TTL days
export function deleteExpiredSessions(ttlDays = 14): number {
  const cutoffDate = new Date(Date.now() - ttlDays * 24 * 60 * 60 * 1000).toISOString();
  
  // Find sessions to delete
  const stmtSelect = db.prepare("SELECT id FROM sessions WHERE last_active_at < ?");
  const expiredSessions = stmtSelect.all(cutoffDate) as { id: string }[];
  
  if (expiredSessions.length === 0) {
    return 0;
  }

  // Delete matching sessions (cascades to traces and results due to ON DELETE CASCADE)
  const stmtDelete = db.prepare("DELETE FROM sessions WHERE last_active_at < ?");
  stmtDelete.run(cutoffDate);
  
  return expiredSessions.length;
}
