import { type User, type BurnerProfile, type Post, type InviteCode } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

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
  createInviteCode(code: Omit<InviteCode, "id" | "createdAt" | "usedAt">): Promise<InviteCode>;
  useInviteCode(code: string, userId: number): Promise<void>;

  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private burnerProfiles: Map<number, BurnerProfile>;
  private posts: Map<number, Post>;
  private inviteCodes: Map<string, InviteCode>;
  private currentId: number;
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.burnerProfiles = new Map();
    this.posts = new Map();
    this.inviteCodes = new Map();
    this.currentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(user: Omit<User, "id">): Promise<User> {
    const id = this.currentId++;
    const newUser = { ...user, id };
    this.users.set(id, newUser);
    return newUser;
  }

  async getBurnerProfiles(userId: number): Promise<BurnerProfile[]> {
    return Array.from(this.burnerProfiles.values()).filter(
      (profile) => profile.userId === userId,
    );
  }

  async createBurnerProfile(profile: Omit<BurnerProfile, "id">): Promise<BurnerProfile> {
    const id = this.currentId++;
    const newProfile = { ...profile, id };
    this.burnerProfiles.set(id, newProfile);
    return newProfile;
  }

  async deactivateBurnerProfile(id: number): Promise<void> {
    const profile = this.burnerProfiles.get(id);
    if (profile) {
      this.burnerProfiles.set(id, { ...profile, isActive: false });
    }
  }

  async getPosts(filters?: { burnerIds?: number[], showAIOnly?: boolean }): Promise<Post[]> {
    let posts = Array.from(this.posts.values());

    if (filters?.burnerIds?.length) {
      posts = posts.filter(post => filters.burnerIds!.includes(post.burnerId));
    }

    if (filters?.showAIOnly !== undefined) {
      const aiProfiles = new Set(
        Array.from(this.burnerProfiles.values())
          .filter(p => p.isAI === filters.showAIOnly)
          .map(p => p.id)
      );
      posts = posts.filter(post => post.burnerId && aiProfiles.has(post.burnerId));
    }

    return posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createPost(post: Omit<Post, "id" | "createdAt">): Promise<Post> {
    const id = this.currentId++;
    const newPost = { ...post, id, createdAt: new Date() };
    this.posts.set(id, newPost);
    return newPost;
  }

  async getInviteCode(code: string): Promise<InviteCode | undefined> {
    return this.inviteCodes.get(code);
  }

  async createInviteCode(code: Omit<InviteCode, "id" | "createdAt" | "usedAt">): Promise<InviteCode> {
    const id = this.currentId++;
    const newCode = { 
      ...code,
      id,
      createdAt: new Date(),
      usedAt: null,
      usedById: null,
    };
    this.inviteCodes.set(code.code, newCode);
    return newCode;
  }

  async useInviteCode(code: string, userId: number): Promise<void> {
    const inviteCode = this.inviteCodes.get(code);
    if (inviteCode && !inviteCode.usedById) {
      this.inviteCodes.set(code, {
        ...inviteCode,
        usedById: userId,
        usedAt: new Date(),
      });
    }
  }
}

export const storage = new MemStorage();