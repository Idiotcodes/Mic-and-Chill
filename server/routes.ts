import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertPodcastSchema, insertPodcastGuestSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";

// Setup multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/mp4'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Create uploads directory if it doesn't exist
  if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
  }

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Podcast routes
  app.get('/api/podcasts', async (req, res) => {
    try {
      const podcasts = await storage.getAllPodcasts();
      res.json(podcasts);
    } catch (error) {
      console.error("Error fetching podcasts:", error);
      res.status(500).json({ message: "Failed to fetch podcasts" });
    }
  });

  app.get('/api/podcasts/live', async (req, res) => {
    try {
      const livePodcasts = await storage.getLivePodcasts();
      res.json(livePodcasts);
    } catch (error) {
      console.error("Error fetching live podcasts:", error);
      res.status(500).json({ message: "Failed to fetch live podcasts" });
    }
  });

  app.get('/api/podcasts/upcoming', async (req, res) => {
    try {
      const upcomingPodcasts = await storage.getUpcomingPodcasts();
      res.json(upcomingPodcasts);
    } catch (error) {
      console.error("Error fetching upcoming podcasts:", error);
      res.status(500).json({ message: "Failed to fetch upcoming podcasts" });
    }
  });

  app.get('/api/podcasts/:id', async (req, res) => {
    try {
      const podcast = await storage.getPodcast(req.params.id);
      if (!podcast) {
        return res.status(404).json({ message: "Podcast not found" });
      }
      res.json(podcast);
    } catch (error) {
      console.error("Error fetching podcast:", error);
      res.status(500).json({ message: "Failed to fetch podcast" });
    }
  });

  app.post('/api/podcasts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validatedData = insertPodcastSchema.parse({
        ...req.body,
        hostId: req.body.hostId || userId, // Default to current user as host
      });

      const podcast = await storage.createPodcast(validatedData);
      res.status(201).json(podcast);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error creating podcast:", error);
      res.status(500).json({ message: "Failed to create podcast" });
    }
  });

  app.patch('/api/podcasts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const updates = insertPodcastSchema.partial().parse(req.body);
      const podcast = await storage.updatePodcast(req.params.id, updates);
      res.json(podcast);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error updating podcast:", error);
      res.status(500).json({ message: "Failed to update podcast" });
    }
  });

  app.delete('/api/podcasts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      await storage.deletePodcast(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting podcast:", error);
      res.status(500).json({ message: "Failed to delete podcast" });
    }
  });

  // Upload recording
  app.post('/api/podcasts/:id/upload', isAuthenticated, upload.single('recording'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // In production, you would upload to S3 or similar
      // For MVP, we'll just store the local file path
      const recordingUrl = `/uploads/${req.file.filename}`;
      
      const podcast = await storage.updatePodcast(req.params.id, {
        recordingUrl,
      });

      res.json({ message: "Recording uploaded successfully", podcast });
    } catch (error) {
      console.error("Error uploading recording:", error);
      res.status(500).json({ message: "Failed to upload recording" });
    }
  });

  // Podcast guest management
  app.post('/api/podcasts/:id/guests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validatedData = insertPodcastGuestSchema.parse({
        ...req.body,
        podcastId: req.params.id,
      });

      const guest = await storage.addPodcastGuest(validatedData);
      res.status(201).json(guest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error adding guest:", error);
      res.status(500).json({ message: "Failed to add guest" });
    }
  });

  app.delete('/api/podcasts/:id/guests/:guestId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      await storage.removePodcastGuest(req.params.id, req.params.guestId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing guest:", error);
      res.status(500).json({ message: "Failed to remove guest" });
    }
  });

  // Admin stats
  app.get('/api/admin/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  // Serve uploaded files
  app.use('/uploads', express.static('uploads'));

  const httpServer = createServer(app);
  return httpServer;
}
