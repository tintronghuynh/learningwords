#!/usr/bin/env node

/**
 * Script chuẩn bị cho việc triển khai lên Netlify và Render
 * Tự động cập nhật các URL trong file cấu hình dựa trên tham số đầu vào
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Lấy tham số từ dòng lệnh
const args = process.argv.slice(2);
const netlifyUrl = args[0];
const renderUrl = args[1];

if (!netlifyUrl || !renderUrl) {
  console.error('Usage: node scripts/prepare-deploy.js <netlify-url> <render-url>');
  console.error('Example: node scripts/prepare-deploy.js https://my-app.netlify.app https://my-api.onrender.com');
  process.exit(1);
}

console.log(`Preparing deployment with:\nNetlify URL: ${netlifyUrl}\nRender URL: ${renderUrl}`);

// Cập nhật netlify.toml
const netlifyTomlPath = path.join(rootDir, 'netlify.toml');
let netlifyToml = fs.readFileSync(netlifyTomlPath, 'utf8');
netlifyToml = netlifyToml.replace(
  /to = "https:\/\/.*\/api\/:splat"/,
  `to = "${renderUrl}/api/:splat"`
);
fs.writeFileSync(netlifyTomlPath, netlifyToml);
console.log('✅ Updated netlify.toml');

// Cập nhật client/.env.production
const envProductionPath = path.join(rootDir, 'client', '.env.production');
fs.writeFileSync(envProductionPath, `VITE_API_URL=${renderUrl}`);
console.log('✅ Updated client/.env.production');

// Cập nhật render.yaml
const renderYamlPath = path.join(rootDir, 'render.yaml');
let renderYaml = fs.readFileSync(renderYamlPath, 'utf8');
renderYaml = renderYaml.replace(
  /value: "https:\/\/.*"/,
  `value: "${netlifyUrl}"`
);
fs.writeFileSync(renderYamlPath, renderYaml);
console.log('✅ Updated render.yaml');

// Cập nhật .env.production
const rootEnvPath = path.join(rootDir, '.env.production');
fs.writeFileSync(rootEnvPath, `NODE_ENV=production\nALLOWED_ORIGINS=${netlifyUrl}`);
console.log('✅ Updated .env.production');

console.log('\n🚀 Deployment files prepared successfully!');
console.log('Next steps:');
console.log('1. Commit and push these changes to your repository');
console.log('2. Deploy to Netlify and Render following the instructions in DEPLOYMENT.md');