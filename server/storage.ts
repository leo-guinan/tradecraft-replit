import { 
  users, burnerProfiles, posts, inviteCodes,
  type User, type BurnerProfile, type Post, type InviteCode 
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPgSimple(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: Omit<User, "id">): Promise<User>;

  getBurnerProfiles(userId: number): Promise<BurnerProfile[]>;
  createBurnerProfile(profile: Omit<BurnerProfile, "id">): Promise<BurnerProfile>;
  deactivateBurnerProfile(id: number): Promise<void>;

  getPosts(filters?: { burnerIds?: number[], showAIOnly?: boolean }): Promise<Post[]>;
  createPost(post: Omit<Post, "id" | "createdAt">): Promise<Post>;

  getInviteCode(code: string): Promise<InviteCode | undefined>;
  getInviteCodes(): Promise<InviteCode[]>;
  createInviteCode(code: Omit<InviteCode, "id" | "createdAt" | "usedAt">): Promise<InviteCode>;
  useInviteCode(code: string, userId: number): Promise<void>;

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: Omit<User, "id">): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async getBurnerProfiles(userId: number): Promise<BurnerProfile[]> {
    return await db
      .select()
      .from(burnerProfiles)
      .where(eq(burnerProfiles.userId, userId));
  }

  async createBurnerProfile(profile: Omit<BurnerProfile, "id">): Promise<BurnerProfile> {
    const [newProfile] = await db
      .insert(burnerProfiles)
      .values(profile)
      .returning();
    return newProfile;
  }

  async deactivateBurnerProfile(id: number): Promise<void> {
    await db
      .update(burnerProfiles)
      .set({ isActive: false })
      .where(eq(burnerProfiles.id, id));
  }

  async getPosts(filters?: { burnerIds?: number[], showAIOnly?: boolean }): Promise<Post[]> {
    let query = db
      .select()
      .from(posts)
      .leftJoin(burnerProfiles, eq(posts.burnerId, burnerProfiles.id));

    if (filters?.burnerIds?.length) {
      query = query.where(
        eq(posts.burnerId, filters.burnerIds[0])
      );
    }

    if (filters?.showAIOnly !== undefined) {
      query = query.where(
        eq(burnerProfiles.isAI, filters.showAIOnly)
      );
    }

    const results = await query.orderBy(desc(posts.createdAt));
    return results.map(r => ({
      id: r.posts.id,
      burnerId: r.posts.burnerId,
      originalContent: r.posts.originalContent,
      transformedContent: r.posts.transformedContent,
      createdAt: r.posts.createdAt
    }));
  }

  async createPost(post: Omit<Post, "id" | "createdAt">): Promise<Post> {
    const [newPost] = await db.insert(posts).values(post).returning();
    return newPost;
  }

  async getInviteCode(code: string): Promise<InviteCode | undefined> {
    const [inviteCode] = await db
      .select()
      .from(inviteCodes)
      .where(eq(inviteCodes.code, code));
    return inviteCode;
  }

  async getInviteCodes(): Promise<InviteCode[]> {
    return await db.select().from(inviteCodes).orderBy(desc(inviteCodes.createdAt));
  }

  async createInviteCode(code: Omit<InviteCode, "id" | "createdAt" | "usedAt">): Promise<InviteCode> {
    const [newCode] = await db.insert(inviteCodes).values(code).returning();
    return newCode;
  }

  async useInviteCode(code: string, userId: number): Promise<void> {
    await db
      .update(inviteCodes)
      .set({ 
        usedById: userId,
        usedAt: new Date()
      })
      .where(
        and(
          eq(inviteCodes.code, code),
          eq(inviteCodes.usedById, null)
        )
      );
  }
}

export const storage = new DatabaseStorage();