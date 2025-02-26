import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertBurnerProfileSchema, insertPostSchema } from "@shared/schema";
import { ZodError } from "zod";
import { customAlphabet } from "nanoid";

const generateInviteCode = customAlphabet("123456789ABCDEFGHJKLMNPQRSTUVWXYZ", 8);

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Admin only middleware
  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).send("Admin access required");
    }
    next();
  };

  // Require authentication middleware
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Authentication required");
    }
    next();
  };

  // Burner profile routes
  app.get("/api/burner-profiles", requireAuth, async (req, res) => {
    const profiles = await storage.getBurnerProfiles(req.user!.id);
    res.json(profiles);
  });

  app.post("/api/burner-profiles", requireAuth, async (req, res) => {
    try {
      const profileData = insertBurnerProfileSchema.parse(req.body);
      const profile = await storage.createBurnerProfile({
        ...profileData,
        userId: req.user!.id,
        isAI: false,
        isActive: true,
      });
      res.status(201).json(profile);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json(error.errors);
      } else {
        res.status(500).json({ message: "Failed to create burner profile" });
      }
    }
  });

  app.delete("/api/burner-profiles/:id", requireAuth, async (req, res) => {
    await storage.deactivateBurnerProfile(parseInt(req.params.id));
    res.status(200).send("Profile deactivated");
  });

  // Post routes
  app.get("/api/posts", requireAuth, async (req, res) => {
    const showAIOnly = req.query.showAIOnly === "true";
    const posts = await storage.getPosts({ showAIOnly });
    res.json(posts);
  });

  app.post("/api/posts", requireAuth, async (req, res) => {
    try {
      const postData = insertPostSchema.parse(req.body);
      const post = await storage.createPost({
        burnerId: parseInt(req.body.burnerId),
        originalContent: postData.originalContent,
        transformedContent: postData.originalContent, // TODO: Transform with AI
      });
      res.status(201).json(post);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json(error.errors);
      } else {
        res.status(500).json({ message: "Failed to create post" });
      }
    }
  });

  // Admin routes
  app.post("/api/invite-codes", requireAdmin, async (req, res) => {
    const code = generateInviteCode();
    const inviteCode = await storage.createInviteCode({
      code,
      createdById: req.user!.id,
      usedById: null,
    });
    res.status(201).json(inviteCode);
  });

  app.get("/api/invite-codes", requireAdmin, async (req, res) => {
    // This would need to be added to the storage interface
    // For now, return empty array
    res.json([]);
  });

  const httpServer = createServer(app);
  return httpServer;
}