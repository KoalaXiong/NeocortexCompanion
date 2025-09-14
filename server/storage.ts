import { 
  conversations, 
  messages, 
  bubbles, 
  articles,
  type Conversation, 
  type Message, 
  type Bubble, 
  type Article,
  type InsertConversation, 
  type InsertMessage, 
  type InsertBubble, 
  type InsertArticle,
  type ConversationWithStats,
  type MessageWithBubble,
  type BubbleWithMessage
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // Conversations
  getConversations(): Promise<ConversationWithStats[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: number, updates: Partial<InsertConversation>): Promise<Conversation>;
  deleteConversation(id: number): Promise<void>;

  // Messages
  getMessagesByConversation(conversationId: number): Promise<MessageWithBubble[]>;
  getMessage(id: number): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: number, updates: Partial<InsertMessage>): Promise<Message>;
  deleteMessage(id: number): Promise<void>;

  // Bubbles
  getBubblesByConversation(conversationId: number): Promise<BubbleWithMessage[]>;
  getBubble(id: number): Promise<Bubble | undefined>;
  createBubble(bubble: InsertBubble): Promise<Bubble>;
  updateBubble(id: number, updates: Partial<InsertBubble>): Promise<Bubble>;
  deleteBubble(id: number): Promise<void>;

  // Articles
  getArticles(): Promise<Article[]>;
  getArticle(id: number): Promise<Article | undefined>;
  createArticle(article: InsertArticle): Promise<Article>;
  updateArticle(id: number, updates: Partial<InsertArticle>): Promise<Article>;
  deleteArticle(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {

  // Conversations
  async getConversations(): Promise<ConversationWithStats[]> {
    // Single query to get all conversations with their message data
    const conversationsWithMessages = await db
      .select({
        id: conversations.id,
        name: conversations.name,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
        messageId: messages.id,
        messageText: messages.text,
        messageCreatedAt: messages.createdAt,
      })
      .from(conversations)
      .leftJoin(messages, eq(conversations.id, messages.conversationId))
      .orderBy(conversations.updatedAt, messages.createdAt);

    // Group messages by conversation efficiently
    const conversationMap = new Map<number, {
      conversation: Conversation;
      messages: { id: number; text: string; createdAt: string }[];
    }>();

    for (const row of conversationsWithMessages) {
      const convId = row.id;

      if (!conversationMap.has(convId)) {
        conversationMap.set(convId, {
          conversation: {
            id: row.id,
            name: row.name,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          },
          messages: []
        });
      }

      // Add message if it exists (leftJoin may return null)
      if (row.messageId) {
        conversationMap.get(convId)!.messages.push({
          id: row.messageId,
          text: row.messageText,
          createdAt: row.messageCreatedAt,
        });
      }
    }

    // Calculate stats efficiently
    const conversationStats: ConversationWithStats[] = Array.from(conversationMap.values()).map(({ conversation, messages }) => {
      const messageCount = messages.length;
      const wordCount = messages.reduce((total, msg) => total + msg.text.split(' ').length, 0);
      const lastMessage = messages.length > 0 
        ? messages[messages.length - 1].text.substring(0, 100) + (messages[messages.length - 1].text.length > 100 ? '...' : '')
        : undefined;

      return {
        ...conversation,
        messageCount,
        wordCount,
        lastMessage
      };
    });

    return conversationStats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation || undefined;
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const now = new Date().toISOString();
    const [newConversation] = await db
      .insert(conversations)
      .values({
        ...conversation,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return newConversation;
  }

  async updateConversation(id: number, updates: Partial<InsertConversation>): Promise<Conversation> {
    const updatedAt = new Date().toISOString();
    const [updated] = await db
      .update(conversations)
      .set({ ...updates, updatedAt })
      .where(eq(conversations.id, id))
      .returning();

    if (!updated) throw new Error('Conversation not found');
    return updated;
  }

  async deleteConversation(id: number): Promise<void> {
    // Delete associated messages and bubbles
    const conversationMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id));

    for (const message of conversationMessages) {
      await db.delete(bubbles).where(eq(bubbles.messageId, message.id));
    }

    await db.delete(messages).where(eq(messages.conversationId, id));
    await db.delete(conversations).where(eq(conversations.id, id));
  }

  // Messages
  async getMessagesByConversation(conversationId: number): Promise<MessageWithBubble[]> {
    // Single query with LEFT JOIN to get messages and their bubbles
    const messagesWithBubbles = await db
      .select({
        // Message fields
        id: messages.id,
        conversationId: messages.conversationId,
        text: messages.text,
        title: messages.title,
        originalLanguage: messages.originalLanguage,
        translatedFrom: messages.translatedFrom,
        createdAt: messages.createdAt,
        // Bubble fields (nullable)
        bubbleId: bubbles.id,
        bubbleX: bubbles.x,
        bubbleY: bubbles.y,
        bubbleWidth: bubbles.width,
        bubbleHeight: bubbles.height,
        bubbleCategory: bubbles.category,
        bubbleColor: bubbles.color,
        bubbleTitle: bubbles.title,
      })
      .from(messages)
      .leftJoin(bubbles, eq(messages.id, bubbles.messageId))
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);

    // Transform the flat result into the expected structure
    return messagesWithBubbles.map(row => ({
      id: row.id,
      conversationId: row.conversationId,
      text: row.text,
      title: row.title,
      originalLanguage: row.originalLanguage,
      translatedFrom: row.translatedFrom,
      createdAt: row.createdAt,
      bubble: row.bubbleId ? {
        id: row.bubbleId,
        messageId: row.id,
        x: row.bubbleX!,
        y: row.bubbleY!,
        width: row.bubbleWidth!,
        height: row.bubbleHeight!,
        category: row.bubbleCategory!,
        color: row.bubbleColor!,
        title: row.bubbleTitle!,
      } : undefined
    }));
  }

  async getMessage(id: number): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message || undefined;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const createdAt = message.createdAt || new Date().toISOString();
    const messageData = {
      ...message,
      createdAt,
    };

    // Use transaction for atomic operations
    const result = await db.transaction(async (tx) => {
      // Insert message
      const [newMessage] = await tx
        .insert(messages)
        .values(messageData)
        .returning();

      // Update conversation's updatedAt in same transaction
      await tx
        .update(conversations)
        .set({ updatedAt: createdAt })
        .where(eq(conversations.id, message.conversationId));

      return newMessage;
    });

    return result;
  }

  async updateMessage(id: number, updates: Partial<InsertMessage>): Promise<Message> {
    // Use transaction for consistency
    const result = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(messages)
        .set(updates)
        .where(eq(messages.id, id))
        .returning();

      if (!updated) throw new Error('Message not found');

      // Update conversation's updatedAt timestamp
      await tx
        .update(conversations)
        .set({ updatedAt: new Date().toISOString() })
        .where(eq(conversations.id, updated.conversationId));

      return updated;
    });

    return result;
  }

  // Add bulk delete operation for better performance
  async deleteMultipleMessages(messageIds: number[]): Promise<void> {
    if (messageIds.length === 0) return;

    await db.transaction(async (tx) => {
      // Delete all associated bubbles
      for (const messageId of messageIds) {
        await tx.delete(bubbles).where(eq(bubbles.messageId, messageId));
      }

      // Delete all messages
      for (const messageId of messageIds) {
        await tx.delete(messages).where(eq(messages.id, messageId));
      }
    });
  }

  async deleteMessage(id: number): Promise<void> {
    try {
      // Use transaction for atomic deletion
      await db.transaction(async (tx) => {
        // First delete any associated bubbles
        await tx.delete(bubbles).where(eq(bubbles.messageId, id));
        
        // Delete any translations that reference this message
        await tx.delete(messages).where(eq(messages.translatedFrom, id));

        // Then delete the message itself
        const result = await tx.delete(messages).where(eq(messages.id, id));
        
        console.log(`Deleted message ${id}, affected rows:`, result);
      });
    } catch (error) {
      console.error(`Error deleting message ${id}:`, error);
      throw new Error(`Failed to delete message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Bubbles
  async getBubblesByConversation(conversationId: number): Promise<BubbleWithMessage[]> {
    const conversationMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId));

    const bubblesWithMessages: BubbleWithMessage[] = [];

    for (const message of conversationMessages) {
      const [bubble] = await db
        .select()
        .from(bubbles)
        .where(eq(bubbles.messageId, message.id));

      if (bubble) {
        bubblesWithMessages.push({ ...bubble, message });
      }
    }

    return bubblesWithMessages;
  }

  async getBubble(id: number): Promise<Bubble | undefined> {
    const [bubble] = await db.select().from(bubbles).where(eq(bubbles.id, id));
    return bubble || undefined;
  }

  async createBubble(bubble: InsertBubble): Promise<Bubble> {
    const [newBubble] = await db
      .insert(bubbles)
      .values(bubble)
      .returning();
    return newBubble;
  }

  async updateBubble(id: number, updates: Partial<InsertBubble>): Promise<Bubble> {
    const [updated] = await db
      .update(bubbles)
      .set(updates)
      .where(eq(bubbles.id, id))
      .returning();

    if (!updated) throw new Error('Bubble not found');
    return updated;
  }

  async deleteBubble(id: number): Promise<void> {
    await db.delete(bubbles).where(eq(bubbles.id, id));
  }

  // Articles
  async getArticles(): Promise<Article[]> {
    return await db.select().from(articles).orderBy(desc(articles.createdAt));
  }

  async getArticle(id: number): Promise<Article | undefined> {
    const [article] = await db.select().from(articles).where(eq(articles.id, id));
    return article || undefined;
  }

  async createArticle(article: InsertArticle): Promise<Article> {
    const now = new Date().toISOString();
    const [newArticle] = await db
      .insert(articles)
      .values({
        ...article,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return newArticle;
  }

  async updateArticle(id: number, updates: Partial<InsertArticle>): Promise<Article> {
    const updatedAt = new Date().toISOString();
    const [updated] = await db
      .update(articles)
      .set({ ...updates, updatedAt })
      .where(eq(articles.id, id))
      .returning();

    if (!updated) throw new Error('Article not found');
    return updated;
  }

  async deleteArticle(id: number): Promise<void> {
    await db.delete(articles).where(eq(articles.id, id));
  }
}

export const storage = new DatabaseStorage();