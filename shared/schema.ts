import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const burnerProfiles = pgTable("burner_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  codename: text("codename").notNull().unique(),
  personality: text("personality").notNull(),
  avatar: text("avatar").notNull(),
  background: text("background").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  isAI: boolean("is_ai").notNull().default(false),
  postCount: integer("post_count").notNull().default(0),
  lastPostAt: timestamp("last_post_at"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  burnerId: integer("burner_id").references(() => burnerProfiles.id),
  originalContent: text("original_content").notNull(),
  transformedContent: text("transformed_content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const inviteCodes = pgTable("invite_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  createdById: integer("created_by_id").references(() => users.id),
  usedById: integer("used_by_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  usedAt: timestamp("used_at"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertBurnerProfileSchema = createInsertSchema(burnerProfiles).pick({
  codename: true,
  personality: true,
  avatar: true,
  background: true,
});

export const insertPostSchema = createInsertSchema(posts).pick({
  originalContent: true,
}).extend({
  burnerId: z.number()
});

export const insertInviteCodeSchema = createInsertSchema(inviteCodes).pick({
  code: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type BurnerProfile = typeof burnerProfiles.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type InviteCode = typeof inviteCodes.$inferSelect;

export type AdminStats = {
  totalUsers: number;
  activeUsers: number;
  totalPosts: number;
  totalBurnerProfiles: number;
  averagePostsPerUser: number;
  mostActiveUsers: Array<{
    username: string;
    postCount: number;
  }>;
};

export type UserDetails = typeof users.$inferSelect & {
  burnerProfiles: Array<typeof burnerProfiles.$inferSelect>;
  postCount: number;
  lastActive: Date | null;
};