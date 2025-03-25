import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertVocabularyGroupSchema, 
  insertVocabularyWordSchema, 
  dictionarySchema,
  wordSchema
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // API prefix
  const apiPrefix = "/api";

  // Error handling middleware
  const handleError = (res: any, error: any) => {
    console.error("API Error:", error);
    
    if (error instanceof ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ message: validationError.message });
    }
    
    return res.status(500).json({ message: error.message || "An unexpected error occurred" });
  };

  // Get vocabulary stats
  app.get(`${apiPrefix}/stats/:userId`, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const stats = await storage.getVocabularyStats(userId);
      res.json(stats);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Vocabulary Group Routes
  app.get(`${apiPrefix}/groups/:userId`, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const groups = await storage.getVocabularyGroups(userId);
      
      // Add additional stats for each group
      const groupsWithStats = await Promise.all(groups.map(async (group) => {
        const words = await storage.getVocabularyWords(group.id);
        const learnedWords = words.filter(word => word.learned).length;
        
        return {
          ...group,
          wordsCount: words.length,
          learnedWords
        };
      }));
      
      res.json(groupsWithStats);
    } catch (error) {
      handleError(res, error);
    }
  });

  app.post(`${apiPrefix}/groups`, async (req, res) => {
    try {
      const validatedData = insertVocabularyGroupSchema.parse(req.body);
      const newGroup = await storage.createVocabularyGroup(validatedData);
      res.status(201).json(newGroup);
    } catch (error) {
      handleError(res, error);
    }
  });

  app.put(`${apiPrefix}/groups/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name } = req.body;
      
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ message: "Name is required" });
      }
      
      const updatedGroup = await storage.updateVocabularyGroup(id, name);
      
      if (!updatedGroup) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      res.json(updatedGroup);
    } catch (error) {
      handleError(res, error);
    }
  });

  app.delete(`${apiPrefix}/groups/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteVocabularyGroup(id);
      
      if (!success) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      handleError(res, error);
    }
  });

  // Vocabulary Word Routes
  app.get(`${apiPrefix}/words/:groupId`, async (req, res) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const mode = req.query.mode as string; // 'slideshow' or 'input'
      const isFirstSession = req.query.isFirstSession === 'true';
      const levelsParam = req.query.levels;
      
      let options: { 
        levels?: number[],
        onlyDueToday?: boolean, 
        onlyStudiedToday?: boolean 
      } = {};
      
      // Xử lý tham số levels nếu được truyền vào (cho chức năng chọn từ theo cấp độ)
      if (levelsParam) {
        if (Array.isArray(levelsParam)) {
          options.levels = levelsParam.map(level => parseInt(level as string)).filter(level => !isNaN(level));
        } else {
          const level = parseInt(levelsParam as string);
          if (!isNaN(level)) {
            options.levels = [level];
          }
        }
      }
      // Nếu không có tham số levels và có chế độ...
      else if (mode === 'slideshow') {
        // Yêu cầu 1.1: Chỉ hiển thị các từ cấp độ 1 và 2 trong chế độ slideshow
        options.levels = [1, 2];
      } else if (mode === 'input') {
        if (isFirstSession) {
          // Yêu cầu 2.1: Lần đầu tiên học trong ngày - chỉ hiển thị các từ đến hạn học hôm nay
          options.onlyDueToday = true;
        } else {
          // Yêu cầu 2.2: Từ lần học thứ 2 trở đi - chỉ hiển thị từ cấp độ 1 và 2
          options.levels = [1, 2];
        }
      }
      
      const words = await storage.getVocabularyWords(groupId, options);
      res.json(words);
    } catch (error) {
      handleError(res, error);
    }
  });

  app.post(`${apiPrefix}/words`, async (req, res) => {
    try {
      const validatedData = insertVocabularyWordSchema.parse(req.body);
      const newWord = await storage.createVocabularyWord(validatedData);
      res.status(201).json(newWord);
    } catch (error) {
      handleError(res, error);
    }
  });

  app.post(`${apiPrefix}/words/batch`, async (req, res) => {
    try {
      const { groupId, words } = req.body;
      
      if (!groupId || !Array.isArray(words)) {
        return res.status(400).json({ message: "Invalid request format" });
      }
      
      // Validate that the group exists
      const group = await storage.getVocabularyGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      // Process and validate each word
      const wordsToAdd = [];
      
      for (const wordData of words) {
        try {
          // Validate the word format
          const validatedWord = wordSchema.parse(wordData);
          
          // Check if this word already exists in the group
          const existingWords = await storage.getVocabularyWords(groupId);
          const wordExists = existingWords.some(w => 
            w.word.toLowerCase() === validatedWord.word.toLowerCase()
          );
          
          // Skip if the word already exists
          if (wordExists) continue;
          
          // Add the word
          wordsToAdd.push({
            groupId,
            word: validatedWord.word,
            ipa: validatedWord.IPA,
            partOfSpeech: validatedWord.part_of_speech,
            definition: validatedWord.definition,
            meanings: validatedWord.meanings
          });
        } catch (error) {
          // Skip invalid words
          console.error("Invalid word:", error);
        }
      }
      
      // Add all validated words
      const addedWords = await storage.createVocabularyWords(wordsToAdd);
      
      res.status(201).json({
        added: addedWords.length,
        total: words.length,
        words: addedWords
      });
    } catch (error) {
      handleError(res, error);
    }
  });

  app.post(`${apiPrefix}/words/import`, async (req, res) => {
    try {
      const { groupId, dictionary } = req.body;
      
      if (!groupId) {
        return res.status(400).json({ message: "Group ID is required" });
      }
      
      // Validate that the group exists
      const group = await storage.getVocabularyGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      // Validate the dictionary format
      let validatedDictionary;
      try {
        validatedDictionary = dictionarySchema.parse({ dictionary });
      } catch (error) {
        return res.status(400).json({ 
          message: "Invalid dictionary format", 
          details: error instanceof ZodError 
            ? fromZodError(error).message 
            : String(error)
        });
      }
      
      // Process the words
      const wordsToAdd = [];
      const existingWords = await storage.getVocabularyWords(groupId);
      
      for (const wordData of validatedDictionary.dictionary) {
        // Check if this word already exists in the group
        const wordExists = existingWords.some(w => 
          w.word.toLowerCase() === wordData.word.toLowerCase()
        );
        
        // Skip if the word already exists
        if (wordExists) continue;
        
        // Add the word
        wordsToAdd.push({
          groupId,
          word: wordData.word,
          ipa: wordData.IPA,
          partOfSpeech: wordData.part_of_speech,
          definition: wordData.definition,
          meanings: wordData.meanings
        });
      }
      
      // Add all validated words
      const addedWords = await storage.createVocabularyWords(wordsToAdd);
      
      res.status(201).json({
        added: addedWords.length,
        total: validatedDictionary.dictionary.length,
        words: addedWords
      });
    } catch (error) {
      handleError(res, error);
    }
  });

  app.put(`${apiPrefix}/words/:id/learned`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { learned } = req.body;
      
      if (typeof learned !== 'boolean') {
        return res.status(400).json({ message: "Learned status must be a boolean" });
      }
      
      const updatedWord = await storage.markWordAsLearned(id, learned);
      
      if (!updatedWord) {
        return res.status(404).json({ message: "Word not found" });
      }
      
      // Record learning progress in stats
      if (updatedWord.learned) {
        // Get the group to find the user ID
        const group = await storage.getVocabularyGroup(updatedWord.groupId);
        if (group && group.userId) {
          await storage.recordWordLearned(group.userId as number);
        }
      }
      
      res.json(updatedWord);
    } catch (error) {
      handleError(res, error);
    }
  });

  app.put(`${apiPrefix}/words/:id/studied`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const updatedWord = await storage.updateWordLastStudied(id);
      
      if (!updatedWord) {
        return res.status(404).json({ message: "Word not found" });
      }
      
      // Get the group to find the user ID
      const group = await storage.getVocabularyGroup(updatedWord.groupId);
      if (group && group.userId) {
        await storage.recordWordStudied(group.userId as number);
      }
      
      res.json(updatedWord);
    } catch (error) {
      handleError(res, error);
    }
  });
  
  // Cập nhật cấp độ từ
  app.put(`${apiPrefix}/words/:id/level`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { isCorrect } = req.body;
      
      if (typeof isCorrect !== 'boolean') {
        return res.status(400).json({ message: "isCorrect must be a boolean" });
      }
      
      const updatedWord = await storage.updateWordLevel(id, isCorrect);
      
      if (!updatedWord) {
        return res.status(404).json({ message: "Word not found" });
      }
      
      // Record learning progress in stats if từ đã đạt cấp độ 5
      if (updatedWord.level === 5) {
        // Get the group to find the user ID
        const group = await storage.getVocabularyGroup(updatedWord.groupId);
        if (group && group.userId) {
          await storage.recordWordLearned(group.userId as number);
        }
      }
      
      res.json(updatedWord);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Update user days studied
  app.put(`${apiPrefix}/users/:id/days-studied`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedUser = await storage.updateUserDaysStudied(id);
      res.json(updatedUser);
    } catch (error) {
      handleError(res, error);
    }
  });

  return httpServer;
}
