import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from "@shared/schema";
// import { migrate } from 'drizzle-orm/better-sqlite3/migrator'; // Not needed for manual table creation
import path from 'path';

// Create SQLite database file in the project root
const dbPath = path.join(process.cwd(), 'database.sqlite');
const sqlite = new Database(dbPath);

// Enable WAL mode for better performance
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });

// Initialize database tables if they don't exist
try {
  // Create tables using SQL if they don't exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      original_language TEXT,
      translated_from INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bubbles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL,
      x INTEGER NOT NULL DEFAULT 0,
      y INTEGER NOT NULL DEFAULT 0,
      width INTEGER NOT NULL DEFAULT 280,
      height INTEGER NOT NULL DEFAULT 120,
      category TEXT NOT NULL DEFAULT 'general',
      color TEXT NOT NULL DEFAULT 'blue',
      title TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      bubble_ids TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  console.log('✅ SQLite database initialized successfully');
} catch (error) {
  console.error('❌ Error initializing database:', error);
}