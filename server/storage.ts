import { 
  User, InsertUser, 
  VocabularyGroup, InsertVocabularyGroup,
  VocabularyWord, InsertVocabularyWord,
  UserStats, InsertUserStats,
  Meaning,
  users,
  vocabularyGroups,
  vocabularyWords,
  userStats
} from "@shared/schema";
import { eq, and, sql, inArray, isNull, or, lt, gt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Check for database URL
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

// Create the connection with SSL enabled for Neon Database if in production
let connectionOptions = {};

// If we're connecting to Neon on production, enable SSL
if (process.env.NODE_ENV === 'production') {
  connectionOptions = { 
    ssl: true,
    max: 10 // Maximum number of connections
  };
}

const client = postgres(process.env.DATABASE_URL, connectionOptions);
const db = drizzle(client);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserDaysStudied(userId: number): Promise<User>;
  
  // Vocabulary Group operations
  createVocabularyGroup(group: InsertVocabularyGroup): Promise<VocabularyGroup>;
  getVocabularyGroups(userId: number): Promise<VocabularyGroup[]>;
  getVocabularyGroup(id: number): Promise<VocabularyGroup | undefined>;
  updateVocabularyGroup(id: number, name: string): Promise<VocabularyGroup | undefined>;
  deleteVocabularyGroup(id: number): Promise<boolean>;
  
  // Vocabulary Word operations
  createVocabularyWord(word: InsertVocabularyWord): Promise<VocabularyWord>;
  createVocabularyWords(words: InsertVocabularyWord[]): Promise<VocabularyWord[]>;
  getVocabularyWords(
    groupId: number, 
    options?: { 
      levels?: number[],
      onlyDueToday?: boolean, 
      onlyStudiedToday?: boolean 
    }
  ): Promise<VocabularyWord[]>;
  getVocabularyWord(id: number): Promise<VocabularyWord | undefined>;
  markWordAsLearned(id: number, learned: boolean): Promise<VocabularyWord | undefined>;
  updateWordLastStudied(id: number): Promise<VocabularyWord | undefined>;
  updateWordLevel(id: number, isCorrect: boolean): Promise<VocabularyWord | undefined>;
  resetWordStudiedToday(): Promise<void>; // Đặt lại trạng thái studiedToday khi bắt đầu ngày mới
  
  // Stats operations
  getVocabularyStats(userId: number): Promise<{
    totalGroups: number;
    totalWords: number;
    learnedWords: number;
    daysStudied: number;
  }>;
  recordWordStudied(userId: number): Promise<UserStats>;
  recordWordLearned(userId: number): Promise<UserStats>;
}

export class PostgresStorage implements IStorage {
  constructor() {
    // Initialize with a default user for testing
    this.createDefaultUser();
  }

  private async createDefaultUser() {
    try {
      const existingUser = await this.getUserByUsername("demo");
      if (!existingUser) {
        await this.createUser({ username: "demo", password: "password" });
      }
    } catch (err) {
      console.error("Error creating default user:", err);
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.id, id));
      return result[0];
    } catch (err) {
      console.error("Error getting user:", err);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.username, username));
      return result[0];
    } catch (err) {
      console.error("Error getting user by username:", err);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const result = await db.insert(users).values({
        username: insertUser.username,
        password: insertUser.password,
        daysStudied: 0,
      }).returning();
      
      // Create initial stats for the user
      await db.insert(userStats).values({
        userId: result[0].id,
        wordsStudied: 0,
        wordsLearned: 0,
      });
      
      return result[0];
    } catch (err) {
      console.error("Error creating user:", err);
      throw err;
    }
  }
  
  async updateUserDaysStudied(userId: number): Promise<User> {
    try {
      const user = await this.getUser(userId);
      if (!user) {
        throw new Error("User not found");
      }
      
      // Lấy ngày hiện tại và đặt thời gian về 00:00:00
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Kiểm tra xem có bản ghi nào trong userStats cho ngày hôm nay
      const todayStatsResult = await db.select().from(userStats)
        .where(and(
          eq(userStats.userId, userId),
          sql`DATE(${userStats.createdAt}) = DATE(${today.toISOString()})`
        ));
      
      // Nếu không có bản ghi cho ngày hôm nay, thì tăng daysStudied và tạo bản ghi mới
      if (todayStatsResult.length === 0) {
        // Cập nhật số ngày học
        const result = await db.update(users)
          .set({ daysStudied: user.daysStudied + 1 })
          .where(eq(users.id, userId))
          .returning();
        
        // Tạo bản ghi thống kê cho ngày hôm nay
        await db.insert(userStats).values({
          userId,
          wordsStudied: 0,
          wordsLearned: 0,
        });
        
        return result[0];
      }
      
      // Nếu đã có bản ghi cho ngày hôm nay, trả về user mà không tăng daysStudied
      return user;
    } catch (err) {
      console.error("Error updating user days studied:", err);
      throw err;
    }
  }

  // Vocabulary Group operations
  async createVocabularyGroup(insertGroup: InsertVocabularyGroup): Promise<VocabularyGroup> {
    try {
      const result = await db.insert(vocabularyGroups).values({
        name: insertGroup.name,
        userId: insertGroup.userId,
      }).returning();
      
      return result[0];
    } catch (err) {
      console.error("Error creating vocabulary group:", err);
      throw err;
    }
  }

  async getVocabularyGroups(userId: number): Promise<VocabularyGroup[]> {
    try {
      const result = await db.select().from(vocabularyGroups)
        .where(eq(vocabularyGroups.userId, userId));
      
      return result;
    } catch (err) {
      console.error("Error getting vocabulary groups:", err);
      return [];
    }
  }

  async getVocabularyGroup(id: number): Promise<VocabularyGroup | undefined> {
    try {
      const result = await db.select().from(vocabularyGroups)
        .where(eq(vocabularyGroups.id, id));
      
      return result[0];
    } catch (err) {
      console.error("Error getting vocabulary group:", err);
      return undefined;
    }
  }

  async updateVocabularyGroup(id: number, name: string): Promise<VocabularyGroup | undefined> {
    try {
      const result = await db.update(vocabularyGroups)
        .set({ name })
        .where(eq(vocabularyGroups.id, id))
        .returning();
      
      return result[0];
    } catch (err) {
      console.error("Error updating vocabulary group:", err);
      return undefined;
    }
  }

  async deleteVocabularyGroup(id: number): Promise<boolean> {
    try {
      // Delete all words in this group
      await db.delete(vocabularyWords)
        .where(eq(vocabularyWords.groupId, id));
      
      // Delete the group
      const result = await db.delete(vocabularyGroups)
        .where(eq(vocabularyGroups.id, id))
        .returning();
      
      return result.length > 0;
    } catch (err) {
      console.error("Error deleting vocabulary group:", err);
      return false;
    }
  }

  // Vocabulary Word operations
  async createVocabularyWord(insertWord: InsertVocabularyWord): Promise<VocabularyWord> {
    try {
      const result = await db.insert(vocabularyWords).values({
        groupId: insertWord.groupId,
        word: insertWord.word,
        ipa: insertWord.ipa,
        partOfSpeech: insertWord.partOfSpeech,
        definition: insertWord.definition,
        meanings: insertWord.meanings,
        learned: false,
        level: 1,
      }).returning();
      
      return result[0];
    } catch (err) {
      console.error("Error creating vocabulary word:", err);
      throw err;
    }
  }

  async createVocabularyWords(insertWords: InsertVocabularyWord[]): Promise<VocabularyWord[]> {
    if (insertWords.length === 0) return [];
    
    try {
      const values = insertWords.map(word => ({
        groupId: word.groupId,
        word: word.word,
        ipa: word.ipa,
        partOfSpeech: word.partOfSpeech,
        definition: word.definition,
        meanings: word.meanings,
        learned: false,
        level: 1,
      }));
      
      const result = await db.insert(vocabularyWords)
        .values(values)
        .returning();
      
      return result;
    } catch (err) {
      console.error("Error creating vocabulary words:", err);
      throw err;
    }
  }

  async getVocabularyWords(
    groupId: number, 
    options?: { 
      levels?: number[],
      onlyDueToday?: boolean, 
      onlyStudiedToday?: boolean 
    }
  ): Promise<VocabularyWord[]> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Tạo một mảng các điều kiện WHERE
      const conditions = [eq(vocabularyWords.groupId, groupId)];
      
      // Lọc theo cấp độ nếu được chỉ định
      if (options?.levels && options.levels.length > 0) {
        conditions.push(inArray(vocabularyWords.level, options.levels));
      }
      
      // Lọc các từ đến hạn học hôm nay
      if (options?.onlyDueToday) {
        const dueCondition = or(
          // Cấp độ 1: học hàng ngày
          eq(vocabularyWords.level, 1),
          
          // Cấp độ 2: học sau 2 ngày
          and(
            eq(vocabularyWords.level, 2),
            or(
              isNull(vocabularyWords.lastStudiedDate),
              sql`${vocabularyWords.lastStudiedDate} <= ${new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()}`
            )
          ),
          
          // Cấp độ 3: học sau 3 ngày
          and(
            eq(vocabularyWords.level, 3),
            or(
              isNull(vocabularyWords.lastStudiedDate),
              sql`${vocabularyWords.lastStudiedDate} <= ${new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()}`
            )
          ),
          
          // Cấp độ 4: học sau 4 ngày
          and(
            eq(vocabularyWords.level, 4),
            or(
              isNull(vocabularyWords.lastStudiedDate),
              sql`${vocabularyWords.lastStudiedDate} <= ${new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString()}`
            )
          ),
          
          // Cấp độ 5: học ngẫu nhiên sau 7-14 ngày
          and(
            eq(vocabularyWords.level, 5),
            or(
              isNull(vocabularyWords.lastStudiedDate),
              sql`${vocabularyWords.lastStudiedDate} <= ${new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()}`
            )
          )
        );
        
        conditions.push(dueCondition);
      }
      
      // Lọc các từ đã học trong ngày hôm nay
      if (options?.onlyStudiedToday !== undefined) {
        conditions.push(eq(vocabularyWords.studiedToday, options.onlyStudiedToday));
      }
      
      // Thực hiện truy vấn với tất cả các điều kiện
      const result = await db.select().from(vocabularyWords)
        .where(and(...conditions));
      
      return result;
    } catch (err) {
      console.error("Error getting vocabulary words:", err);
      return [];
    }
  }

  async getVocabularyWord(id: number): Promise<VocabularyWord | undefined> {
    try {
      const result = await db.select().from(vocabularyWords)
        .where(eq(vocabularyWords.id, id));
      
      return result[0];
    } catch (err) {
      console.error("Error getting vocabulary word:", err);
      return undefined;
    }
  }

  async markWordAsLearned(id: number, learned: boolean): Promise<VocabularyWord | undefined> {
    try {
      const updateValues: Partial<VocabularyWord> = { learned };
      
      if (learned) {
        updateValues.lastStudied = new Date();
      }
      
      const result = await db.update(vocabularyWords)
        .set(updateValues)
        .where(eq(vocabularyWords.id, id))
        .returning();
      
      return result[0];
    } catch (err) {
      console.error("Error marking word as learned:", err);
      return undefined;
    }
  }

  async updateWordLastStudied(id: number): Promise<VocabularyWord | undefined> {
    try {
      const word = await this.getVocabularyWord(id);
      if (!word) return undefined;
      
      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      
      // Default values for update - sử dụng đối tượng Date trực tiếp
      const updateValues: Partial<VocabularyWord> = { 
        lastStudied: now, // Sử dụng đối tượng Date trực tiếp
      };
      
      // Nếu lastStudiedDate khác với ngày hiện tại, đặt studiedToday thành false
      if (!word.lastStudiedDate || 
          new Date(word.lastStudiedDate).getFullYear() !== today.getFullYear() ||
          new Date(word.lastStudiedDate).getMonth() !== today.getMonth() ||
          new Date(word.lastStudiedDate).getDate() !== today.getDate()) {
        updateValues.studiedToday = false;
        updateValues.lastStudiedDate = today; // Sử dụng đối tượng Date trực tiếp
      }
      
      const result = await db.update(vocabularyWords)
        .set(updateValues)
        .where(eq(vocabularyWords.id, id))
        .returning();
      
      return result[0];
    } catch (err) {
      console.error("Error updating word last studied:", err);
      return undefined;
    }
  }
  
  async updateWordLevel(id: number, isCorrect: boolean): Promise<VocabularyWord | undefined> {
    try {
      const word = await this.getVocabularyWord(id);
      if (!word) return undefined;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Chuẩn bị các giá trị cập nhật cơ bản (luôn cập nhật)
      const updateValues: Partial<VocabularyWord> = { 
        studiedToday: true,
        lastStudiedDate: today, // Sử dụng đối tượng Date trực tiếp
        lastStudied: new Date() // Cập nhật thời gian học gần nhất
      };
      
      // Chỉ cập nhật cấp độ từ khi từ chưa được học trong ngày hôm nay
      // Kiểm tra studiedToday để chỉ cập nhật cấp độ cho lần học đầu tiên trong ngày
      if (!word.studiedToday) {
        if (isCorrect) {
          // Tăng cấp độ nếu trả lời đúng, tối đa là 5
          updateValues.level = Math.min(5, word.level + 1);
          
          // Đánh dấu từ đã học cấp độ cao nhất (cấp 5)
          if (updateValues.level === 5) {
            updateValues.learned = true;
          }
        } else {
          // Đưa về cấp độ 1 nếu trả lời sai
          updateValues.level = 1;
          updateValues.learned = false;
        }
        
        console.log(`Updating level for word ${id} to ${updateValues.level} (first study today)`);
      } else {
        console.log(`Word ${id} already studied today, not updating level`);
      }
      
      const result = await db.update(vocabularyWords)
        .set(updateValues)
        .where(eq(vocabularyWords.id, id))
        .returning();
      
      return result[0];
    } catch (err) {
      console.error("Error updating word level:", err);
      return undefined;
    }
  }
  
  async resetWordStudiedToday(): Promise<void> {
    try {
      // 1. Lấy tất cả từ vựng đã được đánh dấu studiedToday=true
      const studiedWords = await db.select()
        .from(vocabularyWords)
        .where(eq(vocabularyWords.studiedToday, true));
      
      if (studiedWords.length > 0) {
        console.log(`Resetting studiedToday flag for ${studiedWords.length} words`);
      }
      
      // 2. Reset trạng thái studiedToday
      await db.update(vocabularyWords)
        .set({ studiedToday: false })
        .where(eq(vocabularyWords.studiedToday, true));
    } catch (err) {
      console.error("Error resetting words studied today:", err);
    }
  }
  
  async resetUnstudiedWordsLevel(): Promise<number> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Tìm các từ không được học trong ngày hôm đó
      // 1. lastStudiedDate < today (nghĩa là không học ngày hôm nay)
      // 2. studiedToday = false (đảm bảo không được học trong ngày)
      // 3. level > 1 (có cấp độ > 1 để có thể giảm xuống 1)
      const result = await db.update(vocabularyWords)
        .set({ 
          level: 1,
          learned: false 
        })
        .where(
          and(
            or(
              isNull(vocabularyWords.lastStudiedDate),
              lt(vocabularyWords.lastStudiedDate, today)
            ),
            eq(vocabularyWords.studiedToday, false),
            gt(vocabularyWords.level, 1)
          )
        )
        .returning();
      
      const resetCount = result.length;
      if (resetCount > 0) {
        console.log(`Reset ${resetCount} words to level 1 because they were not studied today`);
      }
      
      return resetCount;
    } catch (err) {
      console.error("Error resetting unstudied words level:", err);
      return 0;
    }
  }

  // Stats operations
  async getVocabularyStats(userId: number): Promise<{
    totalGroups: number;
    totalWords: number;
    learnedWords: number;
    daysStudied: number;
  }> {
    try {
      // Get user for days studied
      const user = await this.getUser(userId);
      
      // Count groups
      const groupsResult = await db.select({ count: sql<number>`count(*)` })
        .from(vocabularyGroups)
        .where(eq(vocabularyGroups.userId, userId));
      
      // Count total words and learned words
      let totalWords = 0;
      let learnedWords = 0;
      
      // Lấy tất cả từ vựng từ các nhóm của người dùng
      // Sử dụng join để tránh vấn đề với IN clause
      const wordsResult = await db.select({
        id: vocabularyWords.id,
        learned: vocabularyWords.learned
      })
      .from(vocabularyWords)
      .innerJoin(
        vocabularyGroups,
        eq(vocabularyWords.groupId, vocabularyGroups.id)
      )
      .where(eq(vocabularyGroups.userId, userId));
      
      totalWords = wordsResult.length;
      learnedWords = wordsResult.filter(word => word.learned).length;
      
      return {
        totalGroups: groupsResult[0]?.count || 0,
        totalWords,
        learnedWords,
        daysStudied: user?.daysStudied || 0
      };
    } catch (err) {
      console.error("Error getting vocabulary stats:", err);
      return {
        totalGroups: 0,
        totalWords: 0,
        learnedWords: 0,
        daysStudied: 0
      };
    }
  }

  async recordWordStudied(userId: number): Promise<UserStats> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Find today's stats
      const todayStatsResult = await db.select().from(userStats)
        .where(and(
          eq(userStats.userId, userId),
          sql`DATE(${userStats.date}) = DATE(${today.toISOString()})`
        ));
      
      let result;
      
      if (todayStatsResult.length > 0) {
        // Update existing stats
        result = await db.update(userStats)
          .set({ 
            wordsStudied: todayStatsResult[0].wordsStudied + 1 
          })
          .where(eq(userStats.id, todayStatsResult[0].id))
          .returning();
      } else {
        // Create new stats
        result = await db.insert(userStats).values({
          userId,
          wordsStudied: 1,
          wordsLearned: 0,
        }).returning();
      }
      
      return result[0];
    } catch (err) {
      console.error("Error recording word studied:", err);
      throw err;
    }
  }

  async recordWordLearned(userId: number): Promise<UserStats> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Find today's stats
      const todayStatsResult = await db.select().from(userStats)
        .where(and(
          eq(userStats.userId, userId),
          sql`DATE(${userStats.date}) = DATE(${today.toISOString()})`
        ));
      
      let result;
      
      if (todayStatsResult.length > 0) {
        // Update existing stats
        result = await db.update(userStats)
          .set({ 
            wordsLearned: todayStatsResult[0].wordsLearned + 1 
          })
          .where(eq(userStats.id, todayStatsResult[0].id))
          .returning();
      } else {
        // Create new stats
        result = await db.insert(userStats).values({
          userId,
          wordsStudied: 0,
          wordsLearned: 1,
        }).returning();
      }
      
      return result[0];
    } catch (err) {
      console.error("Error recording word learned:", err);
      throw err;
    }
  }
}

export const storage = new PostgresStorage();
