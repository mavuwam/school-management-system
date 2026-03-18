// Main entry point for the School Management System
import { Database, defaultConfig } from './utils/database';

export * from './models';
export * from './interfaces';

// Initialize database connection
export const db = new Database(defaultConfig);

// Application initialization
export async function initialize(): Promise<void> {
  await db.connect();
  await db.runMigrations();
  console.log('School Management System initialized');
}

// Application shutdown
export async function shutdown(): Promise<void> {
  await db.disconnect();
  console.log('School Management System shut down');
}
