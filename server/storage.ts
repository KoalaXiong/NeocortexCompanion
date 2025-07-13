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

export class MemStorage implements IStorage {
  private conversations: Map<number, Conversation>;
  private messages: Map<number, Message>;
  private bubbles: Map<number, Bubble>;
  private articles: Map<number, Article>;
  private currentIds: { conversation: number; message: number; bubble: number; article: number };

  constructor() {
    this.conversations = new Map();
    this.messages = new Map();
    this.bubbles = new Map();
    this.articles = new Map();
    this.currentIds = { conversation: 1, message: 1, bubble: 1, article: 1 };
  }

  // Conversations
  async getConversations(): Promise<ConversationWithStats[]> {
    const conversationStats = Array.from(this.conversations.values()).map(conv => {
      const conversationMessages = Array.from(this.messages.values()).filter(
        msg => msg.conversationId === conv.id
      );
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
    });

    return conversationStats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const id = this.currentIds.conversation++;
    const now = new Date();
    const newConversation: Conversation = {
      ...conversation,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.conversations.set(id, newConversation);
    return newConversation;
  }

  async updateConversation(id: number, updates: Partial<InsertConversation>): Promise<Conversation> {
    const existing = this.conversations.get(id);
    if (!existing) throw new Error('Conversation not found');
    
    const updated: Conversation = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.conversations.set(id, updated);
    return updated;
  }

  async deleteConversation(id: number): Promise<void> {
    // Delete associated messages and bubbles
    const conversationMessages = Array.from(this.messages.values())
      .filter(msg => msg.conversationId === id);
    
    for (const message of conversationMessages) {
      const messageBubbles = Array.from(this.bubbles.values())
        .filter(bubble => bubble.messageId === message.id);
      messageBubbles.forEach(bubble => this.bubbles.delete(bubble.id));
      this.messages.delete(message.id);
    }
    
    this.conversations.delete(id);
  }

  // Messages
  async getMessagesByConversation(conversationId: number): Promise<MessageWithBubble[]> {
    const conversationMessages = Array.from(this.messages.values())
      .filter(msg => msg.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return conversationMessages.map(message => {
      const bubble = Array.from(this.bubbles.values()).find(b => b.messageId === message.id);
      return { ...message, bubble };
    });
  }

  async getMessage(id: number): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const id = this.currentIds.message++;
    const newMessage: Message = {
      ...message,
      id,
      createdAt: new Date(),
    };
    this.messages.set(id, newMessage);

    // Update conversation's updatedAt
    const conversation = this.conversations.get(message.conversationId);
    if (conversation) {
      this.conversations.set(conversation.id, {
        ...conversation,
        updatedAt: new Date(),
      });
    }

    return newMessage;
  }

  async deleteMessage(id: number): Promise<void> {
    // Delete associated bubble
    const messageBubbles = Array.from(this.bubbles.values())
      .filter(bubble => bubble.messageId === id);
    messageBubbles.forEach(bubble => this.bubbles.delete(bubble.id));
    
    this.messages.delete(id);
  }

  // Bubbles
  async getBubblesByConversation(conversationId: number): Promise<BubbleWithMessage[]> {
    const conversationMessages = Array.from(this.messages.values())
      .filter(msg => msg.conversationId === conversationId);
    
    const bubblesWithMessages: BubbleWithMessage[] = [];
    
    for (const message of conversationMessages) {
      const bubble = Array.from(this.bubbles.values()).find(b => b.messageId === message.id);
      if (bubble) {
        bubblesWithMessages.push({ ...bubble, message });
      }
    }
    
    return bubblesWithMessages;
  }

  async getBubble(id: number): Promise<Bubble | undefined> {
    return this.bubbles.get(id);
  }

  async createBubble(bubble: InsertBubble): Promise<Bubble> {
    const id = this.currentIds.bubble++;
    const newBubble: Bubble = {
      messageId: bubble.messageId,
      x: bubble.x ?? 0,
      y: bubble.y ?? 0,
      width: bubble.width ?? 280,
      height: bubble.height ?? 120,
      category: bubble.category ?? "general",
      color: bubble.color ?? "blue",
      id,
    };
    this.bubbles.set(id, newBubble);
    return newBubble;
  }

  async updateBubble(id: number, updates: Partial<InsertBubble>): Promise<Bubble> {
    const existing = this.bubbles.get(id);
    if (!existing) throw new Error('Bubble not found');
    
    const updated: Bubble = { ...existing, ...updates };
    this.bubbles.set(id, updated);
    return updated;
  }

  async deleteBubble(id: number): Promise<void> {
    this.bubbles.delete(id);
  }

  // Articles
  async getArticles(): Promise<Article[]> {
    return Array.from(this.articles.values())
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async getArticle(id: number): Promise<Article | undefined> {
    return this.articles.get(id);
  }

  async createArticle(article: InsertArticle): Promise<Article> {
    const id = this.currentIds.article++;
    const now = new Date();
    const newArticle: Article = {
      title: article.title,
      content: article.content,
      bubbleIds: Array.isArray(article.bubbleIds) ? article.bubbleIds : [],
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.articles.set(id, newArticle);
    return newArticle;
  }

  async updateArticle(id: number, updates: Partial<InsertArticle>): Promise<Article> {
    const existing = this.articles.get(id);
    if (!existing) throw new Error('Article not found');
    
    const updated: Article = {
      title: updates.title ?? existing.title,
      content: updates.content ?? existing.content,
      bubbleIds: Array.isArray(updates.bubbleIds) ? updates.bubbleIds : existing.bubbleIds,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };
    this.articles.set(id, updated);
    return updated;
  }

  async deleteArticle(id: number): Promise<void> {
    this.articles.delete(id);
  }
}

export const storage = new MemStorage();
