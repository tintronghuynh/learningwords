'use strict';

/**
 * Script này tạo một phiên bản đơn giản của server chỉ phục vụ API - không có Vite hoặc client.
 * Được sử dụng cho việc triển khai trên Render.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');

console.log('🔄 Building server-only version for Render deployment...');

// Tạo dist directory nếu không tồn tại
if (!fs.existsSync(path.join(rootDir, 'dist'))) {
  fs.mkdirSync(path.join(rootDir, 'dist'));
}

if (!fs.existsSync(path.join(rootDir, 'dist', 'public'))) {
  fs.mkdirSync(path.join(rootDir, 'dist', 'public'));
}

// Tạo một package.json mặc định trong dist
fs.writeFileSync(
  path.join(rootDir, 'dist', 'package.json'),
  `{
  "name": "vocab-learning-api",
  "version": "1.0.0",
  "description": "Vocabulary Learning API Server",
  "main": "index.js",
  "type": "commonjs",
  "private": true,
  "engines": {
    "node": ">=18.0.0"
  }
}`
);
console.log('✅ Created dist/package.json');

// Tạo một all-in-one file server đơn giản không phụ thuộc vào vite
console.log('🔄 Creating all-in-one server file with bundled dependencies...');

// Đọc nội dung của schema.ts để nhúng trực tiếp vào file
const schemaPath = path.join(rootDir, 'shared', 'schema.ts');
const schemaContent = fs.readFileSync(schemaPath, 'utf8');

// Extract các phần quan trọng từ schema.ts, loại bỏ các export và import
// và gói trong một hàm để tránh xung đột tên biến
const extractSchemaCode = () => {
  let code = schemaContent
    // Loại bỏ các import
    .replace(/import.*from.*;\n/g, '')
    // Giữ lại các khai báo và loại bỏ export từ khóa
    .replace(/export const/g, 'const')
    // Xóa các TypeScript types
    .replace(/export type.*$/gm, '')
    // Xóa các TypeScript type annotations - thêm các pattern phổ biến
    .replace(/\.\$type<[^>]+>\(\)/g, '')
    .replace(/\$type<z\.infer<typeof [^>]+>\[\]>\(\)/g, '')
    .replace(/\.\$type<[^>]+>/g, '')
    .replace(/\$type<[^>]+>/g, '')
    .replace(/<z\.infer<typeof [^>]+>\[\]>/g, '')
    .replace(/<[^>]+>/g, '')
    // Xử lý các trường hợp đặc biệt của TypeScript annotations
    .replace(/\.notNull\(\)\.\(\)/g, '.notNull()')
    .replace(/\.notNull\(\)\./g, '.notNull(),')
    .replace(/\),unique\(\)/g, ').unique()')
    .replace(/,unique\(\)/g, '.unique()')
    // Sửa lỗi dấu phẩy trùng lặp
    .replace(/,,/g, ',')
    // Xóa các type definitions
    .replace(/type\s+\w+\s*=\s*[^;]+;/g, '');

  return `// Schema definitions
function setupSchema() {
  const { 
    pgTable, serial, varchar, text, json, integer, boolean, timestamp, date, jsonb 
  } = pg;
  
  // Zod schemas
  const z = zod;

  ${code}

  return {
    users,
    vocabularyGroups,
    vocabularyWords,
    userStats,
    insertUserSchema,
    insertVocabularyGroupSchema,
    insertVocabularyWordSchema,
    insertUserStatsSchema,
    exampleSchema,
    meaningSchema,
    wordSchema,
    dictionarySchema,
  };
}
`;
};

// Tạo một file server đơn giản không phụ thuộc vào TypeScript
const serverCode = `'use strict';
// All-in-one server file - Generated for Render deployment
const express = require('express');
const cors = require('cors');
const { Server } = require('http');
const session = require('express-session');
const { Pool } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');
const { eq, and, sql, desc, isNull, or, asc, gt, lt, between } = require('drizzle-orm');
const pg = require('drizzle-orm/pg-core');
const zod = require('zod');
const path = require('path');

// ----- SCHEMA DEFINITIONS -----
${extractSchemaCode()}

// ----- STORAGE IMPLEMENTATION -----
class PostgresStorage {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' 
        ? { rejectUnauthorized: false } 
        : false
    });

    this.db = drizzle(this.pool);
    
    // Initialize schema
    const schema = setupSchema();
    this.users = schema.users;
    this.vocabularyGroups = schema.vocabularyGroups;
    this.vocabularyWords = schema.vocabularyWords;
    this.userStats = schema.userStats;
    this.insertUserSchema = schema.insertUserSchema;
    this.insertVocabularyGroupSchema = schema.insertVocabularyGroupSchema;
    this.insertVocabularyWordSchema = schema.insertVocabularyWordSchema;
    this.insertUserStatsSchema = schema.insertUserStatsSchema;
  }

  async createDefaultUser() {
    console.log("Checking for default user...");
    
    try {
      const existingUser = await this.getUserByUsername("demo");
      
      if (!existingUser) {
        console.log("Creating default user 'demo'...");
        await this.createUser({
          username: "demo",
          password: "demo123"
        });
        console.log("Default user created successfully");
      } else {
        console.log("Default user already exists");
      }
    } catch (error) {
      console.error("Error creating default user:", error);
    }
  }

  async getUser(id) {
    const result = await this.db
      .select()
      .from(this.users)
      .where(eq(this.users.id, id));
    
    return result[0];
  }

  async getUserByUsername(username) {
    const result = await this.db
      .select()
      .from(this.users)
      .where(eq(this.users.username, username));
    
    return result[0];
  }

  async createUser(insertUser) {
    const validatedUser = this.insertUserSchema.parse(insertUser);
    
    const result = await this.db
      .insert(this.users)
      .values(validatedUser)
      .returning();
    
    // Tạo bản ghi user_stats ban đầu
    await this.db
      .insert(this.userStats)
      .values({
        userId: result[0].id,
        wordsStudied: 0,
        wordsLearned: 0,
      });
    
    return result[0];
  }

  async updateUserDaysStudied(userId) {
    // Kiểm tra xem hôm nay đã học chưa, nếu chưa thì tăng daysStudied lên 1
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    const lastStudyDate = user.lastStudyDate ? new Date(user.lastStudyDate) : null;
    
    if (!lastStudyDate || lastStudyDate.getTime() < today.getTime()) {
      // Ngày mới, cập nhật lastStudyDate và tăng daysStudied
      const result = await this.db
        .update(this.users)
        .set({ 
          lastStudyDate: today, 
          daysStudied: (user.daysStudied || 0) + 1 
        })
        .where(eq(this.users.id, userId))
        .returning();
      
      return result[0];
    }
    
    return user;
  }

  async createVocabularyGroup(insertGroup) {
    const validatedGroup = this.insertVocabularyGroupSchema.parse(insertGroup);
    
    const result = await this.db
      .insert(this.vocabularyGroups)
      .values(validatedGroup)
      .returning();
    
    return result[0];
  }

  async getVocabularyGroups(userId) {
    return await this.db
      .select()
      .from(this.vocabularyGroups)
      .where(eq(this.vocabularyGroups.userId, userId))
      .orderBy(asc(this.vocabularyGroups.name));
  }

  async getVocabularyGroup(id) {
    const result = await this.db
      .select()
      .from(this.vocabularyGroups)
      .where(eq(this.vocabularyGroups.id, id));
    
    return result[0];
  }

  async updateVocabularyGroup(id, name) {
    const result = await this.db
      .update(this.vocabularyGroups)
      .set({ name })
      .where(eq(this.vocabularyGroups.id, id))
      .returning();
    
    return result[0];
  }

  async deleteVocabularyGroup(id) {
    // Xóa tất cả các từ vựng thuộc nhóm trước
    await this.db
      .delete(this.vocabularyWords)
      .where(eq(this.vocabularyWords.groupId, id));
    
    // Sau đó xóa nhóm
    const result = await this.db
      .delete(this.vocabularyGroups)
      .where(eq(this.vocabularyGroups.id, id))
      .returning();
    
    return result.length > 0;
  }

  async createVocabularyWord(insertWord) {
    const validatedWord = this.insertVocabularyWordSchema.parse(insertWord);
    
    const result = await this.db
      .insert(this.vocabularyWords)
      .values(validatedWord)
      .returning();
    
    return result[0];
  }

  async createVocabularyWords(insertWords) {
    if (insertWords.length === 0) return [];
    
    const validatedWords = insertWords.map(word => 
      this.insertVocabularyWordSchema.parse(word)
    );
    
    const result = await this.db
      .insert(this.vocabularyWords)
      .values(validatedWords)
      .returning();
    
    return result;
  }

  async getVocabularyWords(groupId, options = {}) {
    const { levels, onlyDueToday = false, onlyStudiedToday = false } = options;
    
    let query = this.db
      .select()
      .from(this.vocabularyWords)
      .where(eq(this.vocabularyWords.groupId, groupId));
    
    if (levels && levels.length > 0) {
      query = query.where(sql\`\${this.vocabularyWords.level} = ANY(\${JSON.stringify(levels)}::int[])\`);
    }
    
    // Nếu chỉ lấy các từ đến hạn học hôm nay
    if (onlyDueToday) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      query = query.where(
        or(
          // Chưa bao giờ học (nextReviewDate = null)
          isNull(this.vocabularyWords.nextReviewDate),
          // Hoặc đến hạn ôn tập (nextReviewDate <= today)
          sql\`\${this.vocabularyWords.nextReviewDate} <= \${today.toISOString()}\`
        )
      );
    }
    
    // Nếu chỉ lấy các từ đã học hôm nay
    if (onlyStudiedToday) {
      query = query.where(eq(this.vocabularyWords.studiedToday, true));
    }
    
    // Sắp xếp theo mức độ (level) và ngày ôn tập tiếp theo
    query = query.orderBy(asc(this.vocabularyWords.level), asc(this.vocabularyWords.nextReviewDate));
    
    return await query;
  }

  async getVocabularyWord(id) {
    const result = await this.db
      .select()
      .from(this.vocabularyWords)
      .where(eq(this.vocabularyWords.id, id));
    
    return result[0];
  }

  async markWordAsLearned(id, learned) {
    const result = await this.db
      .update(this.vocabularyWords)
      .set({ learned })
      .where(eq(this.vocabularyWords.id, id))
      .returning();
    
    return result[0];
  }

  async updateWordLastStudied(id) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const result = await this.db
      .update(this.vocabularyWords)
      .set({ 
        lastStudiedDate: new Date(),
        studiedToday: true,
      })
      .where(eq(this.vocabularyWords.id, id))
      .returning();
    
    return result[0];
  }

  async updateWordLevel(id, isCorrect) {
    // Lấy thông tin từ vựng hiện tại
    const word = await this.getVocabularyWord(id);
    if (!word) return undefined;
    
    // Tính toán mức độ mới dựa trên kết quả trả lời
    const currentLevel = word.level || 0;
    let newLevel;
    let nextReviewDate;
    
    if (isCorrect) {
      // Trả lời đúng: tăng level và tính toán ngày ôn tập tiếp theo
      newLevel = Math.min(5, currentLevel + 1);
      
      // Tính toán ngày ôn tập tiếp theo dựa trên khoảng cách tăng dần
      const today = new Date();
      const reviewIntervals = [1, 3, 7, 14, 30]; // ngày
      const daysToAdd = reviewIntervals[newLevel - 1] || 30;
      
      nextReviewDate = new Date(today);
      nextReviewDate.setDate(today.getDate() + daysToAdd);
    } else {
      // Trả lời sai: giảm level và đặt lại ngày ôn tập
      newLevel = Math.max(0, currentLevel - 1);
      nextReviewDate = new Date(); // Hôm nay
    }
    
    // Cập nhật từ vựng
    const result = await this.db
      .update(this.vocabularyWords)
      .set({ 
        level: newLevel,
        nextReviewDate,
        lastStudiedDate: new Date(),
        studiedToday: true,
      })
      .where(eq(this.vocabularyWords.id, id))
      .returning();
    
    return result[0];
  }

  async resetWordStudiedToday() {
    // Đặt lại trạng thái studiedToday cho tất cả các từ
    await this.db
      .update(this.vocabularyWords)
      .set({ studiedToday: false });
  }

  async resetUnstudiedWordsLevel() {
    // Lấy ngày hiện tại
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Tính toán ngày 60 ngày trước
    const sixtyDaysAgo = new Date(today);
    sixtyDaysAgo.setDate(today.getDate() - 60);
    
    // Tìm các từ có lastStudiedDate quá 60 ngày hoặc null và level > 0
    const result = await this.db
      .update(this.vocabularyWords)
      .set({ 
        level: 0,
        nextReviewDate: today, // Đặt lại ngày ôn tập là hôm nay
      })
      .where(
        and(
          or(
            isNull(this.vocabularyWords.lastStudiedDate),
            lt(this.vocabularyWords.lastStudiedDate, sixtyDaysAgo)
          ),
          gt(this.vocabularyWords.level, 0)
        )
      )
      .returning();
    
    return result.length;
  }

  async getVocabularyStats(userId) {
    // Lấy tổng số nhóm
    const groupsResult = await this.db
      .select({ count: sql\`count(*)\` })
      .from(this.vocabularyGroups)
      .where(eq(this.vocabularyGroups.userId, userId));
    
    const totalGroups = groupsResult[0]?.count || 0;
    
    // Lấy tổng số từ và số từ đã học
    const wordsResult = await this.db
      .select({
        totalWords: sql\`count(*)\`,
        learnedWords: sql\`sum(case when learned = true then 1 else 0 end)\`
      })
      .from(this.vocabularyWords)
      .innerJoin(
        this.vocabularyGroups,
        eq(this.vocabularyWords.groupId, this.vocabularyGroups.id)
      )
      .where(eq(this.vocabularyGroups.userId, userId));
    
    const totalWords = Number(wordsResult[0]?.totalWords || 0);
    const learnedWords = Number(wordsResult[0]?.learnedWords || 0);
    
    // Lấy số ngày đã học
    const userResult = await this.db
      .select({ daysStudied: this.users.daysStudied })
      .from(this.users)
      .where(eq(this.users.id, userId));
    
    const daysStudied = userResult[0]?.daysStudied || 0;
    
    return {
      totalGroups,
      totalWords,
      learnedWords,
      daysStudied
    };
  }

  async recordWordStudied(userId) {
    // Tìm hoặc tạo bản ghi thống kê
    const existingStats = await this.db
      .select()
      .from(this.userStats)
      .where(eq(this.userStats.userId, userId));
    
    if (existingStats.length === 0) {
      // Tạo mới nếu chưa có
      const result = await this.db
        .insert(this.userStats)
        .values({
          userId,
          wordsStudied: 1,
          wordsLearned: 0,
        })
        .returning();
      
      return result[0];
    } else {
      // Cập nhật nếu đã có
      const result = await this.db
        .update(this.userStats)
        .set({ 
          wordsStudied: existingStats[0].wordsStudied + 1 
        })
        .where(eq(this.userStats.userId, userId))
        .returning();
      
      return result[0];
    }
  }

  async recordWordLearned(userId) {
    // Tìm hoặc tạo bản ghi thống kê
    const existingStats = await this.db
      .select()
      .from(this.userStats)
      .where(eq(this.userStats.userId, userId));
    
    if (existingStats.length === 0) {
      // Tạo mới nếu chưa có
      const result = await this.db
        .insert(this.userStats)
        .values({
          userId,
          wordsStudied: 0,
          wordsLearned: 1,
        })
        .returning();
      
      return result[0];
    } else {
      // Cập nhật nếu đã có
      const result = await this.db
        .update(this.userStats)
        .set({ 
          wordsLearned: existingStats[0].wordsLearned + 1 
        })
        .where(eq(this.userStats.userId, userId))
        .returning();
      
      return result[0];
    }
  }
}

// Create storage instance
const storage = new PostgresStorage();

// ----- ROUTES -----
async function registerRoutes(app) {
  // Kiểm tra xem có phải bắt đầu ngày mới không
  function isStartOfDay() {
    const now = new Date();
    return now.getHours() === 0 && now.getMinutes() < 10; // Từ 00:00 đến 00:10
  }

  // Kiểm tra và thực hiện reset hàng ngày nếu cần
  async function performDailyReset() {
    if (isStartOfDay()) {
      console.log("Performing daily reset...");
      try {
        await storage.resetWordStudiedToday();
        const resetCount = await storage.resetUnstudiedWordsLevel();
        console.log(\`Reset studiedToday flag for all words. Reset level for \${resetCount} inactive words.\`);
      } catch (error) {
        console.error("Error performing daily reset:", error);
      }
    }
  }

  // Middleware xử lý reset hàng ngày
  app.use(async (req, res, next) => {
    try {
      await performDailyReset();
      next();
    } catch (error) {
      next(error);
    }
  });

  // Đăng nhập
  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    
    try {
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(401).json({ message: "Username không tồn tại" });
      }
      
      if (user.password !== password) {
        return res.status(401).json({ message: "Password không đúng" });
      }
      
      // Lưu thông tin user vào session
      req.session.userId = user.id;
      
      return res.json({ 
        id: user.id,
        username: user.username
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Lỗi máy chủ" });
    }
  });

  // Kiểm tra đăng nhập
  app.get("/api/auth/me", async (req, res) => {
    const userId = req.session.userId;
    
    if (!userId) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }
    
    try {
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User không tồn tại" });
      }
      
      return res.json({ 
        id: user.id,
        username: user.username
      });
    } catch (error) {
      console.error("Auth check error:", error);
      return res.status(500).json({ message: "Lỗi máy chủ" });
    }
  });

  // Đăng xuất
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Lỗi khi đăng xuất" });
      }
      
      res.json({ success: true });
    });
  });

  // Cập nhật số ngày đã học
  app.put("/api/users/:id/days-studied", async (req, res) => {
    const userId = parseInt(req.params.id);
    
    try {
      const updatedUser = await storage.updateUserDaysStudied(userId);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User không tồn tại" });
      }
      
      return res.json(updatedUser);
    } catch (error) {
      console.error("Update days studied error:", error);
      return res.status(500).json({ message: "Lỗi máy chủ" });
    }
  });

  // Lấy thống kê học tập
  app.get("/api/stats/:userId", async (req, res) => {
    const userId = parseInt(req.params.userId);
    
    try {
      const stats = await storage.getVocabularyStats(userId);
      return res.json(stats);
    } catch (error) {
      console.error("Get stats error:", error);
      return res.status(500).json({ message: "Lỗi máy chủ" });
    }
  });

  // Lấy danh sách nhóm từ vựng
  app.get("/api/groups/:userId", async (req, res) => {
    const userId = parseInt(req.params.userId);
    
    try {
      const groups = await storage.getVocabularyGroups(userId);
      
      // Lấy số lượng từ và số từ đã học cho mỗi nhóm
      const result = await Promise.all(groups.map(async (group) => {
        const words = await storage.getVocabularyWords(group.id);
        const learnedWords = words.filter(word => word.learned).length;
        
        return {
          ...group,
          wordsCount: words.length,
          learnedWords
        };
      }));
      
      return res.json(result);
    } catch (error) {
      console.error("Get vocabulary groups error:", error);
      return res.status(500).json({ message: "Lỗi máy chủ" });
    }
  });

  // Tạo nhóm từ vựng mới
  app.post("/api/groups", async (req, res) => {
    const { name, userId } = req.body;
    
    if (!name || !userId) {
      return res.status(400).json({ message: "Thiếu thông tin" });
    }
    
    try {
      const newGroup = await storage.createVocabularyGroup({
        name,
        userId
      });
      
      return res.status(201).json(newGroup);
    } catch (error) {
      console.error("Create vocabulary group error:", error);
      return res.status(500).json({ message: "Lỗi máy chủ" });
    }
  });

  // Cập nhật tên nhóm từ vựng
  app.put("/api/groups/:id", async (req, res) => {
    const groupId = parseInt(req.params.id);
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: "Thiếu tên nhóm" });
    }
    
    try {
      const updatedGroup = await storage.updateVocabularyGroup(groupId, name);
      
      if (!updatedGroup) {
        return res.status(404).json({ message: "Nhóm không tồn tại" });
      }
      
      return res.json(updatedGroup);
    } catch (error) {
      console.error("Update vocabulary group error:", error);
      return res.status(500).json({ message: "Lỗi máy chủ" });
    }
  });

  // Xóa nhóm từ vựng
  app.delete("/api/groups/:id", async (req, res) => {
    const groupId = parseInt(req.params.id);
    
    try {
      const success = await storage.deleteVocabularyGroup(groupId);
      
      if (!success) {
        return res.status(404).json({ message: "Nhóm không tồn tại" });
      }
      
      return res.json({ success: true });
    } catch (error) {
      console.error("Delete vocabulary group error:", error);
      return res.status(500).json({ message: "Lỗi máy chủ" });
    }
  });

  // Lấy danh sách từ vựng trong một nhóm
  app.get("/api/words/:groupId", async (req, res) => {
    const groupId = parseInt(req.params.groupId);
    const levelsStr = req.query.levels;
    const onlyDueToday = req.query.dueToday === 'true';
    const onlyStudiedToday = req.query.studiedToday === 'true';
    
    const levels = levelsStr ? levelsStr.split(',').map(l => parseInt(l)) : undefined;
    
    try {
      const words = await storage.getVocabularyWords(groupId, {
        levels,
        onlyDueToday,
        onlyStudiedToday
      });
      
      return res.json(words);
    } catch (error) {
      console.error("Get vocabulary words error:", error);
      return res.status(500).json({ message: "Lỗi máy chủ" });
    }
  });

  // Thêm từ vựng mới
  app.post("/api/words", async (req, res) => {
    const { word, groupId, userId } = req.body;
    
    if (!word || !groupId) {
      return res.status(400).json({ message: "Thiếu thông tin" });
    }
    
    try {
      // Thêm từ vựng mới
      const newWord = await storage.createVocabularyWord({
        word: JSON.stringify(word),
        groupId,
        level: 0,
        learned: false,
        studiedToday: false,
        nextReviewDate: new Date()
      });
      
      // Cập nhật thống kê
      if (userId) {
        await storage.recordWordStudied(userId);
      }
      
      return res.status(201).json(newWord);
    } catch (error) {
      console.error("Create vocabulary word error:", error);
      return res.status(500).json({ message: "Lỗi máy chủ" });
    }
  });

  // Thêm nhiều từ vựng cùng lúc
  app.post("/api/words/batch", async (req, res) => {
    const { words, groupId, userId } = req.body;
    
    if (!words || !Array.isArray(words) || words.length === 0 || !groupId) {
      return res.status(400).json({ message: "Thiếu thông tin hoặc định dạng không đúng" });
    }
    
    try {
      // Chuẩn bị dữ liệu từ vựng
      const wordEntries = words.map(word => ({
        word: JSON.stringify(word),
        groupId,
        level: 0,
        learned: false,
        studiedToday: false,
        nextReviewDate: new Date()
      }));
      
      // Thêm từ vựng
      const newWords = await storage.createVocabularyWords(wordEntries);
      
      // Cập nhật thống kê
      if (userId) {
        for (let i = 0; i < words.length; i++) {
          await storage.recordWordStudied(userId);
        }
      }
      
      return res.status(201).json(newWords);
    } catch (error) {
      console.error("Batch create vocabulary words error:", error);
      return res.status(500).json({ message: "Lỗi máy chủ" });
    }
  });

  // Đánh dấu từ vựng đã học hoặc chưa học
  app.put("/api/words/:id/learned", async (req, res) => {
    const wordId = parseInt(req.params.id);
    const { learned, userId } = req.body;
    
    if (learned === undefined) {
      return res.status(400).json({ message: "Thiếu trạng thái learned" });
    }
    
    try {
      const updatedWord = await storage.markWordAsLearned(wordId, learned);
      
      if (!updatedWord) {
        return res.status(404).json({ message: "Từ vựng không tồn tại" });
      }
      
      // Cập nhật thống kê
      if (userId) {
        if (learned) {
          await storage.recordWordLearned(userId);
        }
      }
      
      return res.json(updatedWord);
    } catch (error) {
      console.error("Mark word as learned error:", error);
      return res.status(500).json({ message: "Lỗi máy chủ" });
    }
  });

  // Cập nhật trạng thái đã học của từ vựng
  app.put("/api/words/:id/last-studied", async (req, res) => {
    const wordId = parseInt(req.params.id);
    const { userId } = req.body;
    
    try {
      const updatedWord = await storage.updateWordLastStudied(wordId);
      
      if (!updatedWord) {
        return res.status(404).json({ message: "Từ vựng không tồn tại" });
      }
      
      // Cập nhật thống kê
      if (userId) {
        await storage.recordWordStudied(userId);
      }
      
      return res.json(updatedWord);
    } catch (error) {
      console.error("Update word last studied error:", error);
      return res.status(500).json({ message: "Lỗi máy chủ" });
    }
  });

  // Cập nhật level của từ vựng
  app.put("/api/words/:id/level", async (req, res) => {
    const wordId = parseInt(req.params.id);
    const { isCorrect, userId } = req.body;
    
    if (isCorrect === undefined) {
      return res.status(400).json({ message: "Thiếu thông tin isCorrect" });
    }
    
    try {
      const updatedWord = await storage.updateWordLevel(wordId, isCorrect);
      
      if (!updatedWord) {
        return res.status(404).json({ message: "Từ vựng không tồn tại" });
      }
      
      // Cập nhật thống kê
      if (userId) {
        await storage.recordWordStudied(userId);
      }
      
      return res.json(updatedWord);
    } catch (error) {
      console.error("Update word level error:", error);
      return res.status(500).json({ message: "Lỗi máy chủ" });
    }
  });

  return app;
}

// ----- SERVER SETUP -----
// Cấu hình CORS cho production
const isProduction = process.env.NODE_ENV === "production";
const allowedOrigins = isProduction 
  ? (process.env.ALLOWED_ORIGINS || "").split(",").map(origin => origin.trim()) 
  : ["http://localhost:5000"];

console.log("CORS configuration:", 
  "NODE_ENV=" + process.env.NODE_ENV, 
  "Allowed origins:", allowedOrigins
);

const app = express();
const server = new Server(app);

// Middleware
app.use(express.json());
app.use(cors({
  origin: (origin, callback) => {
    // Cho phép gọi không có origin (như từ Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'CORS policy không cho phép truy cập từ origin này.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

// Middleware session
app.use(session({
  secret: process.env.SESSION_SECRET || "vocablearningsecret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7 // 1 tuần
  }
}));

// Serve static files
const distPath = path.resolve(__dirname, "public");
app.use(express.static(distPath));

// API routes
registerRoutes(app);

// 404 handler for API
app.use("/api/*", (req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

// Đón tất cả các request khác và trả về index.html
app.use("*", (req, res) => {
  res.sendFile(path.resolve(distPath, "index.html"));
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

// Khởi động server
const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(\`Server is running on port \${PORT}\`);
});

// Khởi tạo user mặc định nếu chưa có
storage.createDefaultUser();

module.exports = server;
`;

// Ghi file server vào thư mục dist
fs.writeFileSync(path.join(rootDir, 'dist', 'index.js'), serverCode);
console.log('✅ Created server-only version in dist/index.js');

// Tạo một file index.html đơn giản trong dist/public
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
console.log('🚀 Server-only build completed successfully!');