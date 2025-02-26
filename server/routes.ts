import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertBurnerProfileSchema, insertPostSchema } from "@shared/schema";
import { ZodError } from "zod";
import { customAlphabet } from "nanoid";
import { transformMessage } from "./openai";

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
      const burnerId = parseInt(req.body.burnerId);

      // Get the burner profile for context
      const burnerProfiles = await storage.getBurnerProfiles(req.user!.id);
      const profile = burnerProfiles.find(p => p.id === burnerId);

      if (!profile) {
        return res.status(400).json({ message: "Invalid burner profile" });
      }

      // Transform the message using OpenAI
      const transformedContent = await transformMessage(
        postData.originalContent,
        profile
      );

      const post = await storage.createPost({
        burnerId,
        originalContent: postData.originalContent,
        transformedContent,
      });

      res.status(201).json(post);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json(error.errors);
      } else {
        console.error("Failed to create post:", error);
        res.status(500).json({ message: "Failed to create post" });
      }
    }
  });


  // Public feed routes
  app.get("/api/posts", async (req, res) => {
    try {
      const posts = await storage.getPosts();
      res.json(posts);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });

  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/identity-guesses", requireAuth, async (req, res) => {
    try {
      const { postId, guessedUserId } = req.body;

      if (!postId || !guessedUserId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const guess = await storage.createIdentityGuess({
        postId,
        guesserId: req.user!.id,
        guessedUserId,
      });

      res.json(guess);
    } catch (error) {
      console.error("Failed to create identity guess:", error);
      res.status(500).json({ message: "Failed to submit guess" });
    }
  });

  app.get("/api/identity-guesses/:postId", requireAuth, async (req, res) => {
    try {
      const guesses = await storage.getIdentityGuesses(parseInt(req.params.postId));
      res.json(guesses);
    } catch (error) {
      console.error("Failed to fetch identity guesses:", error);
      res.status(500).json({ message: "Failed to fetch guesses" });
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
    const inviteCodes = await storage.getInviteCodes();
    res.json(inviteCodes);
  });

  // New Admin Analytics Routes
  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Failed to fetch admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin statistics" });
    }
  });

  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const user = await storage.getUserDetails(parseInt(req.params.id));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Failed to fetch user details:", error);
      res.status(500).json({ message: "Failed to fetch user details" });
    }
  });

  app.patch("/api/admin/users/:id/role", requireAdmin, async (req, res) => {
    try {
      const { isAdmin } = req.body;
      if (typeof isAdmin !== "boolean") {
        return res.status(400).json({ message: "Invalid role update" });
      }

      // Prevent removing the last admin
      if (!isAdmin) {
        const adminCount = await storage.getAdminCount();
        if (adminCount <= 1) {
          return res.status(400).json({ message: "Cannot remove the last admin" });
        }
      }

      const user = await storage.updateUserRole(parseInt(req.params.id), isAdmin);
      res.json(user);
    } catch (error) {
      console.error("Failed to update user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.post("/api/burner-profiles/check-codename", requireAuth, async (req, res) => {
    try {
      const { codename } = req.body;
      if (!codename) {
        return res.status(400).json({ message: "Codename is required" });
      }

      const profiles = await storage.getBurnerProfiles(req.user!.id);
      const exists = profiles.some(p =>
        p.codename.toLowerCase() === codename.toLowerCase()
      );

      if (exists) {
        return res.status(400).json({ message: "Codename already exists" });
      }

      res.json({ available: true });
    } catch (error) {
      console.error("Failed to check codename:", error);
      res.status(500).json({ message: "Failed to check codename availability" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}