// Script để thực thi file migration.sql trực tiếp với PostgreSQL
import dotenv from 'dotenv';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const { Client } = pg;

async function applyMigrations() {
  // Đảm bảo DATABASE_URL đã được thiết lập
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is required. Please set it in your environment variables.');
    process.exit(1);
  }

  // Tạo kết nối PostgreSQL
  const client = new Client({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false // Cần thiết cho kết nối SSL tới Render/Neon
    }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!');

    // Đọc file SQL migration
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const migrationPath = path.join(__dirname, '..', 'migrations', 'init.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Applying migrations...');
    await client.query(migrationSQL);
    console.log('Migrations applied successfully!');

  } catch (error) {
    console.error('Error applying migrations:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

// Chạy migrations
applyMigrations();