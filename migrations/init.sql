-- Tạo bảng users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  days_studied INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tạo bảng vocabulary_groups
CREATE TABLE IF NOT EXISTS vocabulary_groups (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tạo bảng vocabulary_words
CREATE TABLE IF NOT EXISTS vocabulary_words (
  id SERIAL PRIMARY KEY,
  group_id INTEGER REFERENCES vocabulary_groups(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  ipa TEXT NOT NULL,
  part_of_speech TEXT NOT NULL,
  definition TEXT NOT NULL,
  meanings JSONB NOT NULL,
  learned BOOLEAN NOT NULL DEFAULT FALSE,
  level INTEGER NOT NULL DEFAULT 1,
  last_studied TIMESTAMP,
  studied_today BOOLEAN NOT NULL DEFAULT FALSE,
  last_studied_date TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tạo bảng user_stats nếu cần thiết
CREATE TABLE IF NOT EXISTS user_stats (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  words_studied INTEGER NOT NULL DEFAULT 0,
  words_learned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tạo dữ liệu mẫu cho tài khoản mặc định nếu chưa tồn tại
INSERT INTO users (username, password) 
SELECT 'admin', '$2b$10$5OwoM7O3LwRxL0QMBDJmge3Ygg6V0SkL9PL8bj1g65Yl0xn4OqSRW' 
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');