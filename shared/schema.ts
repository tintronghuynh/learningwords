import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User Table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  daysStudied: integer("days_studied").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Vocabulary Group Table
export const vocabularyGroups = pgTable("vocabulary_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertVocabularyGroupSchema = createInsertSchema(vocabularyGroups).pick({
  name: true,
  userId: true,
});

// Example Schema
export const exampleSchema = z.object({
  en: z.string(),
  vi: z.string(),
});

// Meaning Schema
export const meaningSchema = z.object({
  meaning: z.string(),
  examples: z.array(exampleSchema),
});

// Word Schema - Complex structure for vocabulary items
export const wordSchema = z.object({
  word: z.string(),
  IPA: z.string(),
  part_of_speech: z.string(),
  definition: z.string(),
  meanings: z.array(meaningSchema),
});

// Vocabulary Dictionary Schema for imports
export const dictionarySchema = z.object({
  dictionary: z.array(wordSchema),
});

// Vocabulary Words Table
export const vocabularyWords = pgTable("vocabulary_words", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").references(() => vocabularyGroups.id, { onDelete: "cascade" }),
  word: text("word").notNull(),
  ipa: text("ipa").notNull(),
  partOfSpeech: text("part_of_speech").notNull(),
  definition: text("definition").notNull(),
  meanings: jsonb("meanings").notNull().$type<z.infer<typeof meaningSchema>[]>(),
  learned: boolean("learned").default(false).notNull(),
  level: integer("level").default(1).notNull(), // Cấp độ từ vựng từ 1-5
  lastStudied: timestamp("last_studied"),
  studiedToday: boolean("studied_today").default(false).notNull(), // Đánh dấu từ đã học trong ngày
  lastStudiedDate: timestamp("last_studied_date"), // Ngày học cuối cùng để kiểm tra
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertVocabularyWordSchema = createInsertSchema(vocabularyWords).pick({
  groupId: true,
  word: true,
  ipa: true,
  partOfSpeech: true,
  definition: true,
  meanings: true,
});

// User Stats Table
export const userStats = pgTable("user_stats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  date: timestamp("date").defaultNow().notNull(),
  wordsStudied: integer("words_studied").default(0).notNull(),
  wordsLearned: integer("words_learned").default(0).notNull(),
});

export const insertUserStatsSchema = createInsertSchema(userStats).pick({
  userId: true,
  wordsStudied: true,
  wordsLearned: true,
});

// Define Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type VocabularyGroup = typeof vocabularyGroups.$inferSelect;
export type InsertVocabularyGroup = z.infer<typeof insertVocabularyGroupSchema>;

export type VocabularyWord = typeof vocabularyWords.$inferSelect;
export type InsertVocabularyWord = z.infer<typeof insertVocabularyWordSchema>;

export type UserStats = typeof userStats.$inferSelect;
export type InsertUserStats = z.infer<typeof insertUserStatsSchema>;

export type Example = z.infer<typeof exampleSchema>;
export type Meaning = z.infer<typeof meaningSchema>;
export type Word = z.infer<typeof wordSchema>;
export type Dictionary = z.infer<typeof dictionarySchema>;
