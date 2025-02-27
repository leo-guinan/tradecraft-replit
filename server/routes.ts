import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertBurnerProfileSchema, insertPostSchema } from "@shared/schema";
import { ZodError } from "zod";
import { customAlphabet } from "nanoid";
import { transformMessage } from "./openai";
import { getAccountId, createBurnerFromArchive, importTweetsForBurner } from './archive';
import { getTweetsPaginated } from './archive';

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
      const showAIOnly = req.query.showAIOnly === "true";
      const posts = await storage.getPosts({ showAIOnly });
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
      const { postId, username } = req.body;

      if (!postId || !username) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Find user by username
      const guessedUser = await storage.getUserByUsername(username);
      if (!guessedUser) {
        return res.status(400).json({ message: "User not found" });
      }

      const guess = await storage.createIdentityGuess({
        postId,
        guesserId: req.user!.id,
        guessedUserId: guessedUser.id,
      });

      // Don't reveal if the guess was correct
      const { isCorrect, ...guessWithoutResult } = guess;
      res.json(guessWithoutResult);
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

  // Added archive routes
  app.post("/api/admin/archive/import", requireAdmin, async (req, res) => {
    try {
      const { username } = req.body;
      if (!username) {
        return res.status(400).json({ message: "Username is required" });
      }

      // Create burner profile
      const result = await createBurnerFromArchive(req.user!.id, username);
      if (result.error) {
        return res.status(400).json({ message: result.error });
      }

      // Get account ID
      const accountId = await getAccountId(username);
      if (!accountId) {
        return res.status(400).json({ message: "Account not found" });
      }

      // Import tweets
      const importResult = await importTweetsForBurner(result.burnerProfile!.id, accountId);
      if (importResult.error) {
        return res.status(400).json({ message: importResult.error });
      }

      res.json({
        burnerProfile: result.burnerProfile,
        tweetsImported: importResult.count,
      });
    } catch (error) {
      console.error("Failed to import archive:", error);
      res.status(500).json({ message: "Failed to import archive" });
    }
  });

  app.get("/api/admin/archive/preview/:username", requireAdmin, async (req, res) => {
    try {
      const { username } = req.params;
      const accountId = await getAccountId(username);

      if (!accountId) {
        return res.status(404).json({ message: "Account not found" });
      }

      const tweets = await getTweetsPaginated(accountId);
      if ('error' in tweets) {
        return res.status(500).json({ message: tweets.error });
      }

      // Log the first tweet to see its structure
      console.log("Sample tweet structure:", tweets[0]);

      res.json({
        accountId,
        tweetCount: tweets.length,
        sampleTweets: tweets.slice(0, 5).map(tweet => ({
          text: tweet.full_text || tweet.text, // Try both possible text fields
          created_at: tweet.created_at
        })),
      });
    } catch (error) {
      console.error("Failed to preview archive:", error);
      res.status(500).json({ message: "Failed to preview archive" });
    }
  });

  // Add routes for managing archive ingestion and burner creation
  app.post("/api/admin/archive/ingest", requireAdmin, async (req, res) => {
    try {
      const { username, rateLimit } = req.body;
      if (!username) {
        return res.status(400).json({ message: "Username is required" });
      }

      // Get account ID
      const accountId = await getAccountId(username);
      if (!accountId) {
        return res.status(400).json({ message: "Account not found" });
      }

      // Start tweet ingestion with rate limiting
      const tweets = await getTweetsPaginated(accountId);
      if ('error' in tweets) {
        return res.status(500).json({ message: tweets.error });
      }

      res.json({
        accountId,
        tweetsIngested: tweets.length,
        status: "completed"
      });
    } catch (error) {
      console.error("Failed to start tweet ingestion:", error);
      res.status(500).json({ message: "Failed to start tweet ingestion" });
    }
  });

  app.post("/api/admin/archive/create-burner", requireAdmin, async (req, res) => {
    try {
      const { username, selectedTweets, postFrequency, duration } = req.body;

      // Create burner profile
      const result = await createBurnerFromArchive(req.user!.id, username);
      if (result.error) {
        return res.status(400).json({ message: result.error });
      }

      // Schedule posts based on frequency and duration
      const burnerId = result.burnerProfile!.id;
      const importResult = await importTweetsForBurner(burnerId, selectedTweets);

      if (importResult.error) {
        return res.status(400).json({ message: importResult.error });
      }

      res.json({
        burnerProfile: result.burnerProfile,
        tweetsImported: importResult.count,
        postFrequency,
        duration
      });
    } catch (error) {
      console.error("Failed to create burner from archive:", error);
      res.status(500).json({ message: "Failed to create burner from archive" });
    }
  });

  app.get("/api/admin/archive/tweets/:username", requireAdmin, async (req, res) => {
    try {
      const { username } = req.params;
      const accountId = await getAccountId(username);

      if (!accountId) {
        return res.status(404).json({ message: "Account not found" });
      }

      // Get all tweets for this account
      const tweets = await getTweetsPaginated(accountId);
      if ('error' in tweets) {
        return res.status(500).json({ message: tweets.error });
      }

      res.json({
        tweets: tweets.map(tweet => ({
          id: tweet.id,
          text: tweet.full_text || tweet.text,
          created_at: tweet.created_at
        })),
        totalTweets: tweets.length,
        username,
      });
    } catch (error) {
      console.error("Failed to fetch archive tweets:", error);
      res.status(500).json({ message: "Failed to fetch archive tweets" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}