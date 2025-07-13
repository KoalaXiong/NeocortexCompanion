import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertConversationSchema, insertMessageSchema, insertBubbleSchema, insertArticleSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Conversations
  app.get("/api/conversations", async (req, res) => {
    try {
      const conversations = await storage.getConversations();
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await storage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      res.json(conversation);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  app.post("/api/conversations", async (req, res) => {
    try {
      const conversationData = insertConversationSchema.parse(req.body);
      const conversation = await storage.createConversation(conversationData);
      res.status(201).json(conversation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid conversation data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  app.patch("/api/conversations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertConversationSchema.partial().parse(req.body);
      const conversation = await storage.updateConversation(id, updates);
      res.json(conversation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid conversation data", errors: error.errors });
      }
      if (error instanceof Error && error.message === "Conversation not found") {
        return res.status(404).json({ message: "Conversation not found" });
      }
      res.status(500).json({ message: "Failed to update conversation" });
    }
  });

  app.delete("/api/conversations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteConversation(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete conversation" });
    }
  });

  // Messages
  app.get("/api/conversations/:conversationId/messages", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.conversationId);
      const messages = await storage.getMessagesByConversation(conversationId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid message data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  app.delete("/api/messages/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteMessage(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete message" });
    }
  });

  // Bubbles
  app.get("/api/conversations/:conversationId/bubbles", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.conversationId);
      const bubbles = await storage.getBubblesByConversation(conversationId);
      res.json(bubbles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bubbles" });
    }
  });

  app.post("/api/bubbles", async (req, res) => {
    try {
      const bubbleData = insertBubbleSchema.parse(req.body);
      const bubble = await storage.createBubble(bubbleData);
      res.status(201).json(bubble);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid bubble data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create bubble" });
    }
  });

  app.patch("/api/bubbles/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertBubbleSchema.partial().parse(req.body);
      const bubble = await storage.updateBubble(id, updates);
      res.json(bubble);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid bubble data", errors: error.errors });
      }
      if (error instanceof Error && error.message === "Bubble not found") {
        return res.status(404).json({ message: "Bubble not found" });
      }
      res.status(500).json({ message: "Failed to update bubble" });
    }
  });

  app.delete("/api/bubbles/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteBubble(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete bubble" });
    }
  });

  // Articles
  app.get("/api/articles", async (req, res) => {
    try {
      const articles = await storage.getArticles();
      res.json(articles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch articles" });
    }
  });

  app.get("/api/articles/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const article = await storage.getArticle(id);
      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }
      res.json(article);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch article" });
    }
  });

  app.post("/api/articles", async (req, res) => {
    try {
      const articleData = insertArticleSchema.parse(req.body);
      const article = await storage.createArticle(articleData);
      res.status(201).json(article);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid article data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create article" });
    }
  });

  app.patch("/api/articles/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertArticleSchema.partial().parse(req.body);
      const article = await storage.updateArticle(id, updates);
      res.json(article);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid article data", errors: error.errors });
      }
      if (error instanceof Error && error.message === "Article not found") {
        return res.status(404).json({ message: "Article not found" });
      }
      res.status(500).json({ message: "Failed to update article" });
    }
  });

  app.delete("/api/articles/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteArticle(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete article" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
