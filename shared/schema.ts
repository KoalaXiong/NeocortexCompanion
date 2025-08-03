import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

export const conversations = sqliteTable("conversations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  conversationId: integer("conversation_id").notNull(),
  text: text("text").notNull(),
  title: text("title").default("").notNull(),
  originalLanguage: text("original_language"), // Language code for original messages, null for translations
  translatedFrom: integer("translated_from"), // Reference to original message ID if this is a translation
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const bubbles = sqliteTable("bubbles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  messageId: integer("message_id").notNull(),
  x: integer("x").default(0).notNull(),
  y: integer("y").default(0).notNull(),
  width: integer("width").default(280).notNull(),
  height: integer("height").default(120).notNull(),
  category: text("category").default("general").notNull(),
  color: text("color").default("blue").notNull(),
  title: text("title").default("").notNull(),
});

export const articles = sqliteTable("articles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  bubbleIds: text("bubble_ids", { mode: "json" }).$type<number[]>().default([]).notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
}).extend({
  createdAt: z.string().datetime().optional(),
});

export const insertBubbleSchema = createInsertSchema(bubbles).omit({
  id: true,
});

export const insertArticleSchema = createInsertSchema(articles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertBubble = z.infer<typeof insertBubbleSchema>;
export type InsertArticle = z.infer<typeof insertArticleSchema>;

export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Bubble = typeof bubbles.$inferSelect;
export type Article = typeof articles.$inferSelect;

export type ConversationWithStats = Conversation & {
  messageCount: number;
  wordCount: number;
  lastMessage?: string;
};

export type MessageWithBubble = Message & {
  bubble?: Bubble;
};

export type BubbleWithMessage = Bubble & {
  message: Message;
};

// Relations
export const conversationsRelations = relations(conversations, ({ many }) => ({
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  bubbles: many(bubbles),
}));

export const bubblesRelations = relations(bubbles, ({ one }) => ({
  message: one(messages, {
    fields: [bubbles.messageId],
    references: [messages.id],
  }),
}));
