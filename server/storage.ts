import { 
  users, burnerProfiles, posts, inviteCodes, identityGuesses,
  type User, type BurnerProfile, type Post, type InviteCode,
  type AdminStats, type UserDetails, type IdentityGuess
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPgSimple(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: Omit<User, "id">): Promise<User>;
  updateUserAccess(id: number, hasPostAccess: boolean): Promise<User>;

  getBurnerProfiles(userId: number): Promise<BurnerProfile[]>;
  createBurnerProfile(profile: Omit<BurnerProfile, "id" | "postCount" | "lastPostAt" | "createdAt">): Promise<BurnerProfile>;
  deactivateBurnerProfile(id: number): Promise<void>;

  getPosts(filters?: { burnerIds?: number[], showAIOnly?: boolean }): Promise<Post[]>;
  createPost(post: Omit<Post, "id" | "createdAt">): Promise<Post>;

  getInviteCode(code: string): Promise<InviteCode | undefined>;
  getInviteCodes(): Promise<InviteCode[]>;
  createInviteCode(code: Omit<InviteCode, "id" | "createdAt" | "usedAt">): Promise<InviteCode>;
  useInviteCode(code: string, userId: number): Promise<void>;

  getIdentityGuesses(postId: number): Promise<IdentityGuess[]>;
  createIdentityGuess(guess: Omit<IdentityGuess, "id" | "createdAt" | "isCorrect">): Promise<IdentityGuess>;

  sessionStore: session.Store;

  getAdminStats(): Promise<AdminStats>;
  getAllUsers(): Promise<User[]>;
  getUserDetails(id: number): Promise<UserDetails | undefined>;
  updateUserRole(id: number, isAdmin: boolean): Promise<User>;
  getAdminCount(): Promise<number>;
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

  async updateUserAccess(id: number, hasPostAccess: boolean): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ hasPostAccess })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getBurnerProfiles(userId: number): Promise<BurnerProfile[]> {
    return await db
      .select()
      .from(burnerProfiles)
      .where(eq(burnerProfiles.userId, userId));
  }

  async createBurnerProfile(profile: Omit<BurnerProfile, "id" | "postCount" | "lastPostAt" | "createdAt">): Promise<BurnerProfile> {
    // Check for case-insensitive duplicates first
    const existingProfiles = await db
      .select()
      .from(burnerProfiles)
      .where(sql`LOWER(${burnerProfiles.codename}) = LOWER(${profile.codename})`);

    if (existingProfiles.length > 0) {
      throw new Error("This codename is already in use. Please choose another.");
    }

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
      .select({
        posts: posts,
        burnerProfile: burnerProfiles,
      })
      .from(posts)
      .leftJoin(burnerProfiles, eq(posts.burnerId, burnerProfiles.id));

    if (filters?.burnerIds?.length) {
      query = query.where(eq(posts.burnerId, filters.burnerIds[0]));
    }

    if (filters?.showAIOnly !== undefined) {
      query = query.where(eq(burnerProfiles.isAI, filters.showAIOnly));
    }

    const results = await query.orderBy(desc(posts.createdAt));
    return results.map(r => ({
      ...r.posts,
      burnerProfile: r.burnerProfile,
    }));
  }

  async createPost(post: Omit<Post, "id" | "createdAt">): Promise<Post> {
    const [newPost] = await db.insert(posts).values(post).returning();
    return newPost;
  }

  async getIdentityGuesses(postId: number): Promise<IdentityGuess[]> {
    return await db
      .select()
      .from(identityGuesses)
      .where(eq(identityGuesses.postId, postId))
      .orderBy(desc(identityGuesses.createdAt));
  }

  async createIdentityGuess(guess: Omit<IdentityGuess, "id" | "createdAt" | "isCorrect">): Promise<IdentityGuess> {
    // Check if the guess is correct by comparing with the actual post author
    const [post] = await db
      .select({
        post: posts,
        burnerProfile: burnerProfiles,
      })
      .from(posts)
      .leftJoin(burnerProfiles, eq(posts.burnerId, burnerProfiles.id))
      .where(eq(posts.id, guess.postId));

    const isCorrect = post.burnerProfile.userId === guess.guessedUserId;

    const [newGuess] = await db
      .insert(identityGuesses)
      .values({ ...guess, isCorrect })
      .returning();

    return newGuess;
  }

  async getAdminStats(): Promise<AdminStats> {
    const [result] = await db.select({
      totalUsers: sql<number>`count(distinct ${users.id})::integer`,
      activeUsers: sql<number>`count(distinct case when ${posts.id} is not null then ${users.id} end)::integer`,
      totalPosts: sql<number>`count(distinct ${posts.id})::integer`,
      totalBurnerProfiles: sql<number>`count(distinct ${burnerProfiles.id})::integer`,
      averagePostsPerUser: sql<number>`COALESCE(count(distinct ${posts.id})::float / nullif(count(distinct ${users.id}), 0), 0)`,
    }).from(users)
    .leftJoin(burnerProfiles, eq(users.id, burnerProfiles.userId))
    .leftJoin(posts, eq(burnerProfiles.id, posts.burnerId));

    const activeUsersQuery = await db
      .select({
        username: users.username,
        postCount: sql<number>`count(distinct ${posts.id})::integer`,
      })
      .from(users)
      .leftJoin(burnerProfiles, eq(users.id, burnerProfiles.userId))
      .leftJoin(posts, eq(burnerProfiles.id, posts.burnerId))
      .groupBy(users.username)
      .having(sql`count(distinct ${posts.id}) > 0`)
      .orderBy(sql`count(distinct ${posts.id}) desc`)
      .limit(5);

    return {
      ...result,
      mostActiveUsers: activeUsersQuery.map(u => ({
        username: u.username,
        postCount: Number(u.postCount) || 0,
      })),
    };
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUserDetails(id: number): Promise<UserDetails | undefined> {
    // First check if user exists
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) return undefined;

    // Get all burner profiles for this user
    const profiles = await db
      .select()
      .from(burnerProfiles)
      .where(eq(burnerProfiles.userId, id));

    // Get stats with proper null handling
    const [stats] = await db
      .select({
        postCount: sql<number>`count(distinct ${posts.id})::integer`,
        lastActive: sql<Date | null>`max(${posts.createdAt})`,
      })
      .from(burnerProfiles)
      .leftJoin(posts, eq(burnerProfiles.id, posts.burnerId))
      .where(eq(burnerProfiles.userId, id))
      .groupBy(burnerProfiles.userId);

    return {
      ...user,
      burnerProfiles: profiles,
      postCount: Number(stats?.postCount || 0),
      lastActive: stats?.lastActive || null,
    };
  }

  async updateUserRole(id: number, isAdmin: boolean): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ isAdmin })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAdminCount(): Promise<number> {
    const [result] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(users)
      .where(eq(users.isAdmin, true));
    return Number(result.count);
  }

  async getInviteCode(code: string): Promise<InviteCode | undefined> {
    const [inviteCode] = await db
      .select()
      .from(inviteCodes)
      .where(eq(inviteCodes.code, code));
    return inviteCode;
  }

  async getInviteCodes(): Promise<InviteCode[]> {
    return await db
      .select()
      .from(inviteCodes)
      .orderBy(desc(inviteCodes.createdAt));
  }

  async createInviteCode(code: Omit<InviteCode, "id" | "createdAt" | "usedAt">): Promise<InviteCode> {
    const [inviteCode] = await db
      .insert(inviteCodes)
      .values(code)
      .returning();
    return inviteCode;
  }

  async useInviteCode(code: string, userId: number): Promise<void> {
    await db
      .update(inviteCodes)
      .set({ 
        usedById: userId,
        usedAt: new Date()
      })
      .where(eq(inviteCodes.code, code));
  }
}

export const storage = new DatabaseStorage();