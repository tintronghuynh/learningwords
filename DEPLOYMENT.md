# Hướng dẫn triển khai ứng dụng Vocabulary Learning

Ứng dụng này được thiết kế để triển khai tách biệt:
- Frontend được triển khai trên Netlify
- Backend API được triển khai trên Render
- Database được lưu trữ trên Neon (PostgreSQL serverless)

## Bước 1: Đẩy mã nguồn lên GitHub

Trước tiên, bạn cần đẩy mã nguồn của dự án lên GitHub:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/vocab-learning.git
git push -u origin main
```

## Bước 2: Triển khai Backend lên Render

1. Đăng nhập vào [Render](https://render.com/)
2. Chọn "New" → "Web Service"
3. Kết nối với GitHub repository của bạn
4. Cấu hình dịch vụ web:
   - **Tên**: vocab-learning-api
   - **Environment**: Node
   - **Build Command**: `npm install && node scripts/server-only.js`
   - **Start Command**: `node dist/index.js`
   - **Branch**: main (hoặc branch bạn muốn triển khai)

5. Trong phần "Environment Variables", thêm:
   - `NODE_ENV`: production
   - `ALLOWED_ORIGINS`: URL của ứng dụng Netlify của bạn (vd: https://your-app-name.netlify.app)

6. Tạo database trên Neon:
   - Đăng ký tài khoản tại [Neon](https://neon.tech)
   - Tạo một project mới
   - Tạo một database mới (ví dụ: vocab_learning)
   - Lấy connection string từ phần "Connection Details"

7. Quay lại dịch vụ web trên Render, thêm biến môi trường:
   - `DATABASE_URL`: [Connection string từ Neon Database]

8. Nhấn "Create Web Service"

## Bước 3: Triển khai Frontend lên Netlify

1. Đăng nhập vào [Netlify](https://www.netlify.com/)
2. Nhấn "Add new site" → "Import an existing project"
3. Kết nối với GitHub repository của bạn
4. Cấu hình deployments:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist/public`
   - **Branch to deploy**: main (hoặc branch bạn muốn triển khai)

5. Trong phần "Environment variables", thêm:
   - `VITE_API_URL`: URL của dịch vụ Render (vd: https://vocab-learning-api.onrender.com)

6. Nhấn "Deploy site"

## Bước 4: Cập nhật URL redirect trong Netlify và Render

Sau khi cả hai dịch vụ đã được triển khai, bạn cần cập nhật một số cấu hình:

1. Trong Netlify, vào mục "Site settings" → "Build & deploy" → "Environment", cập nhật:
   - `VITE_API_URL`: https://vocab-learning-api.onrender.com (URL thực tế của API)

2. Trong file netlify.toml ở repository của bạn, cập nhật:
   ```toml
   [[redirects]]
     from = "/api/*"
     to = "https://vocab-learning-api.onrender.com/api/:splat"
     status = 200
     force = true
   ```

3. Trong Render, cập nhật biến môi trường của web service:
   - `ALLOWED_ORIGINS`: https://your-netlify-app-name.netlify.app (URL thực tế của frontend)

4. Deploy lại cả hai dịch vụ sau khi cập nhật

## Bước 5: Kiểm tra việc triển khai

1. Truy cập vào URL Netlify của bạn
2. Đăng nhập với tài khoản demo (hoặc tạo mới)
3. Kiểm tra xem ứng dụng có hoạt động đúng không
4. Kiểm tra log trong Netlify và Render nếu có lỗi

## Lưu ý quan trọng

- Đảm bảo rằng URL trong `ALLOWED_ORIGINS` và `VITE_API_URL` được cập nhật đúng
- Nếu bạn thêm domain tùy chỉnh, cần cập nhật các URL này
- Cookie có thể không hoạt động nếu Netlify và Render không được cấu hình đúng
- Cẩn thận với DATABASE_URL và không bao giờ chia sẻ công khai
- Khi sử dụng Neon Database, hãy đảm bảo rằng:
  - Connection string đã được đặt đúng trong biến môi trường `DATABASE_URL`
  - SSL được bật (mặc định trong môi trường sản xuất)
  - Tường lửa của Neon Database cho phép kết nối từ IP của Render

## Giải thích về các scripts build

- `scripts/server-only.js`: Script này được sử dụng để tạo một phiên bản server-only cho Render mà không phụ thuộc vào vite. Script này sẽ:
  - Tạo một file server đơn giản không sử dụng vite
  - Tạo thư mục `dist/public` và file `index.html` cơ bản
  - Tạo một phiên bản đơn giản của server code tập trung vào API endpoints

- `scripts/prepare-deploy.js`: Script này được sử dụng để chuẩn bị các file cấu hình cho việc triển khai:
  - Cập nhật URL trong `netlify.toml` để chỉ đến API backend trên Render
  - Cập nhật biến môi trường trong `.env.production` và `client/.env.production`
  - Thực thi script này với lệnh: `node scripts/prepare-deploy.js https://vocab-learning.netlify.app https://vocab-learning-api.onrender.com`