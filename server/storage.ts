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
import { eq, desc } from "drizzle-orm";

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
    const conversationList = await db.select().from(conversations);
    
    const conversationStats = await Promise.all(
      conversationList.map(async (conv) => {
        const conversationMessages = await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, conv.id));
        
        const messageCount = conversationMessages.length;
        const wordCount = conversationMessages.reduce((total, msg) => total + msg.text.split(' ').length, 0);
        const lastMessage = conversationMessages.length > 0 
          ? conversationMessages[conversationMessages.length - 1].text.substring(0, 100) + '...'
          : undefined;

        return {
          ...conv,
          messageCount,
          wordCount,
          lastMessage
        };
      })
    );

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
    const conversationMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);

    const messagesWithBubbles = await Promise.all(
      conversationMessages.map(async (message) => {
        const [bubble] = await db
          .select()
          .from(bubbles)
          .where(eq(bubbles.messageId, message.id));
        return { ...message, bubble: bubble || undefined };
      })
    );

    return messagesWithBubbles;
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
    console.log("Creating message with data:", messageData);
    
    const [newMessage] = await db
      .insert(messages)
      .values(messageData)
      .returning();
    
    console.log("Created message:", newMessage);

    // Update conversation's updatedAt
    await db
      .update(conversations)
      .set({ updatedAt: new Date().toISOString() })
      .where(eq(conversations.id, message.conversationId));

    return newMessage;
  }

  async updateMessage(id: number, updates: Partial<InsertMessage>): Promise<Message> {
    const [updated] = await db
      .update(messages)
      .set(updates)
      .where(eq(messages.id, id))
      .returning();
    
    if (!updated) throw new Error('Message not found');
    return updated;
  }

  async deleteMessage(id: number): Promise<void> {
    // Delete associated bubble first
    await db.delete(bubbles).where(eq(bubbles.messageId, id));
    await db.delete(messages).where(eq(messages.id, id));
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