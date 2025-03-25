#!/usr/bin/env node

/**
 * Script để build dự án trên Render mà không cần cài đặt vite toàn cục
 */

import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Kiểm tra và tạo thư mục dist và dist/public
if (!fs.existsSync(path.join(rootDir, 'dist'))) {
  fs.mkdirSync(path.join(rootDir, 'dist'));
}

if (!fs.existsSync(path.join(rootDir, 'dist', 'public'))) {
  fs.mkdirSync(path.join(rootDir, 'dist', 'public'));
}

// Kiểm tra và sửa đổi file server/vite.ts để tránh import vite trong production
const viteFilePath = path.join(rootDir, 'server', 'vite.ts');
let viteFileContent = fs.readFileSync(viteFilePath, 'utf8');

// Tạo bản sao của file vite.ts để có thể khôi phục
fs.writeFileSync(`${viteFilePath}.bak`, viteFileContent);

// Thay thế code import vite và cấu hình vite trong môi trường production
viteFileContent = viteFileContent.replace(
  /import.*from ['"]vite['"]/g,
  '// Import vite chỉ trong môi trường development'
);

// Cập nhật hàm setupVite để không sử dụng vite trong production
viteFileContent = viteFileContent.replace(
  /export async function setupVite\(app: Express, server: Server\) {[\s\S]*?}/,
  `export async function setupVite(app: Express, server: Server) {
  const isDev = process.env.NODE_ENV !== 'production';
  if (!isDev) {
    log('Running in production mode, skipping Vite setup');
    serveStatic(app);
    return;
  }
  
  // Chỉ import vite trong môi trường development
  try {
    const { createServer } = await import('vite');
    log('Setting up Vite');
    const vite = await createServer({
      server: { 
        middlewareMode: true,
        hmr: { server }
      },
      appType: 'spa',
    });
    
    app.use(vite.middlewares);
    log('Vite middleware setup complete');
  } catch (error) {
    console.error('Error setting up Vite:', error);
    // Fallback to static serving in case of error
    serveStatic(app);
  }
}`
);

fs.writeFileSync(viteFilePath, viteFileContent);
console.log('✅ Updated server/vite.ts for production build');

// Thực hiện build server
console.log('Building server...');
exec('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --define:process.env.NODE_ENV=\\"production\\"', 
  (error, stdout, stderr) => {
    if (error) {
      console.error(`Server build error: ${error.message}`);
      
      // Khôi phục file vite.ts từ bản sao
      fs.copyFileSync(`${viteFilePath}.bak`, viteFilePath);
      fs.unlinkSync(`${viteFilePath}.bak`);
      
      return;
    }
    
    if (stderr) {
      console.error(`Server build stderr: ${stderr}`);
    }
    
    console.log(`Server build stdout: ${stdout}`);
    console.log('✅ Server build completed');
    
    // Khôi phục file vite.ts từ bản sao
    fs.copyFileSync(`${viteFilePath}.bak`, viteFilePath);
    fs.unlinkSync(`${viteFilePath}.bak`);
    console.log('✅ Restored original server/vite.ts');
    
    // Tạo một file index.html đơn giản trong dist/public để Render có thể phục vụ
    fs.writeFileSync(
      path.join(rootDir, 'dist', 'public', 'index.html'),
      `<!DOCTYPE html>
<html>
<head>
  <title>Vocabulary Learning API</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; max-width: 650px; margin: 0 auto; }
    h1 { margin-bottom: 1rem; }
    p { margin-bottom: 1rem; line-height: 1.5; }
    code { background: #f4f4f4; padding: 0.2rem 0.4rem; border-radius: 3px; font-size: 0.9rem; }
  </style>
</head>
<body>
  <h1>Vocabulary Learning API</h1>
  <p>This is the API server for the Vocabulary Learning application.</p>
  <p>The API endpoints are available at <code>/api/*</code></p>
</body>
</html>`
    );
    
    console.log('✅ Created dist/public/index.html');
    console.log('🚀 Build process completed successfully!');
  }
);