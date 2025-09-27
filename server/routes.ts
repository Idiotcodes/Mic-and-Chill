import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertPodcastSchema, insertPodcastGuestSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { parse as parseUrl } from "url";

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

// Authorization helper function
function checkPodcastPermissions(user: any, podcast: any, requiredRoles: string[] = []) {
  if (!user || !podcast) return false;
  
  const isHost = podcast.hostId === user.id;
  const isGuest = podcast.guests?.some((g: any) => g.guestId === user.id);
  const isAdmin = user.role === 'admin';
  
  if (isAdmin) return true; // Admins can do everything
  if (requiredRoles.includes('host') && isHost) return true;
  if (requiredRoles.includes('guest') && isGuest) return true;
  if (requiredRoles.includes('participant') && (isHost || isGuest)) return true;
  
  return false;
}

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
      res.json(updatedPodcast);
    } catch (error) {
      console.error("Error fetching podcast:", error);
      res.status(500).json({ message: "Failed to fetch podcast" });
    }
  });

  app.post('/api/podcasts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Allow both admins and regular users to create podcasts
      if (!user) {
        return res.status(403).json({ message: "Authentication required" });
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
      const podcast = await storage.getPodcast(req.params.id);
      
      if (!user || !podcast) {
        return res.status(404).json({ message: "User or podcast not found" });
      }
      
      // Check if user has permission to edit this podcast
      if (!checkPodcastPermissions(user, podcast, ['host'])) {
        return res.status(403).json({ message: "Only hosts and admins can edit podcasts" });
      }

      const updates = insertPodcastSchema.partial().parse(req.body);
      const updatedPodcast = await storage.updatePodcast(req.params.id, updates);
      res.json(updatedPodcast);
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
      const podcast = await storage.getPodcast(req.params.id);
      
      if (!user || !podcast) {
        return res.status(404).json({ message: "User or podcast not found" });
      }
      
      // Check if user has permission to delete this podcast
      if (!checkPodcastPermissions(user, podcast, ['host'])) {
        return res.status(403).json({ message: "Only hosts and admins can delete podcasts" });
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

  // Get all users (for admin)
  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Update user role (for admin)
  app.patch('/api/users/:id/role', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { role } = req.body;
      if (!['admin', 'user'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const updatedUser = await storage.updateUserRole(req.params.id, role);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
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

  // Add username search endpoint
  app.get('/api/users/search', isAuthenticated, async (req, res) => {
    try {
      const { username } = req.query;
      if (!username || typeof username !== 'string') {
        return res.status(400).json({ message: 'Username query required' });
      }
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json(user);
    } catch (error) {
      console.error('Error searching user:', error);
      res.status(500).json({ message: 'Failed to search user' });
    }
  });

  // Update podcast status (go live, end, etc.)
  app.patch('/api/podcasts/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const podcast = await storage.getPodcast(req.params.id);
      
      if (!podcast) {
        return res.status(404).json({ message: 'Podcast not found' });
      }
      
      // Check if user is host, guest, or admin
      const isHost = podcast.hostId === userId;
      const isGuest = podcast.guests?.some(g => g.guestId === userId);
      const isAdmin = user?.role === 'admin';
      
      if (!isHost && !isGuest && !isAdmin) {
        return res.status(403).json({ message: 'Only hosts, guests, or admins can control podcast status' });
      }
      
      const { status } = req.body;
      const updates: any = { status };
      
      if (status === 'live') {
        updates.startedAt = new Date();
      } else if (status === 'completed') {
        updates.endedAt = new Date();
      }
      
      const updatedPodcast = await storage.updatePodcast(req.params.id, updates);
      res.json(updatedPodcast);
    } catch (error) {
      console.error('Error updating podcast status:', error);
      res.status(500).json({ message: 'Failed to update podcast status' });
    }
  });

  // Serve uploaded files
  app.use('/uploads', express.static('uploads'));

  const httpServer = createServer(app);
  
  // WebSocket server for real-time audio signaling
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store active podcast rooms and user connections
  const podcastRooms = new Map<string, Map<string, { ws: WebSocket; userId: string; role: 'host' | 'guest' | 'listener'; userInfo: any }>>();
  const userToRoom = new Map<string, string>();
  
  console.log('WebSocket server initialized on /ws');
  
  wss.on('connection', (ws: WebSocket, req) => {
    console.log('WebSocket connection established from:', req.socket.remoteAddress);
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('WebSocket message received:', message.type, { podcastId: message.podcastId, userId: message.userId });
        
        const { type, podcastId, userId, role, offer, answer, candidate, targetUserId, userInfo } = message;
        
        switch (type) {
          case 'join-podcast':
            // Validate podcast exists
            const podcast = await storage.getPodcast(podcastId);
            if (!podcast) {
              ws.send(JSON.stringify({ type: 'error', message: 'Podcast not found' }));
              return;
            }
            
            // Create room if it doesn't exist
            if (!podcastRooms.has(podcastId)) {
              podcastRooms.set(podcastId, new Map());
            }
            
            // Add user to room
            const room = podcastRooms.get(podcastId)!;
            room.set(userId, { ws, userId, role, userInfo });
            userToRoom.set(userId, podcastId);
            
            // Send current room members to new user
            const roomMembers = Array.from(room.values()).map(member => ({
              userId: member.userId,
              role: member.role,
              userInfo: member.userInfo
            }));
            
            ws.send(JSON.stringify({
              type: 'room-joined',
              members: roomMembers,
              podcastId
            }));
            
            // Notify other users about new member
            broadcast(podcastId, {
              type: 'user-joined',
              userId,
              role,
              userInfo
            }, userId);
            
            // Update listener count
            const listenerCount = Array.from(room.values()).filter((m: any) => m.role === 'listener').length;
            await storage.updatePodcast(podcastId, { 
              listenerCount: listenerCount.toString() 
            });
            
            console.log(`User ${userId} joined podcast ${podcastId} as ${role}`);
            break;
            
          case 'webrtc-offer':
            // Forward WebRTC offer to specific target user
            if (targetUserId) {
              sendToUser(podcastId, targetUserId, {
                type: 'webrtc-offer',
                offer,
                fromUserId: userId
              });
            } else {
              // Broadcast to all other users if no target specified
              broadcast(podcastId, {
                type: 'webrtc-offer',
                offer,
                fromUserId: userId
              }, userId);
            }
            break;
            
          case 'webrtc-answer':
            // Forward WebRTC answer to specific user
            if (targetUserId) {
              sendToUser(podcastId, targetUserId, {
                type: 'webrtc-answer',
                answer,
                fromUserId: userId
              });
            }
            break;
            
          case 'webrtc-candidate':
            // Forward ICE candidate to specific user
            if (targetUserId) {
              sendToUser(podcastId, targetUserId, {
                type: 'webrtc-candidate',
                candidate,
                fromUserId: userId
              });
            }
            break;
            
          case 'mute-audio':
          case 'unmute-audio':
            // Only hosts and guests can mute/unmute
            if (role === 'host' || role === 'guest') {
              broadcast(podcastId, {
                type,
                userId,
                muted: type === 'mute-audio'
              }, userId);
            }
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      // Find and remove user from rooms
      let userIdToRemove = null;
      let roomToUpdate = null;
      
      for (const [podcastId, room] of Array.from(podcastRooms.entries())) {
        for (const [userId, userInfo] of Array.from(room.entries())) {
          if (userInfo.ws === ws) {
            userIdToRemove = userId;
            roomToUpdate = podcastId;
            room.delete(userId);
            userToRoom.delete(userId);
            
            // Notify other users
            broadcast(podcastId, {
              type: 'user-left',
              userId
            }, userId);
            
            // Update listener count
            const listenerCount = Array.from(room.values()).filter((m: any) => m.role === 'listener').length;
            storage.updatePodcast(podcastId, { 
              listenerCount: listenerCount.toString() 
            }).catch(console.error);
            
            console.log(`User ${userId} left podcast ${podcastId}`);
            break;
          }
        }
        if (userIdToRemove) break;
      }
    });
  });
  
  function broadcast(podcastId: string, message: any, excludeUserId?: string) {
    const room = podcastRooms.get(podcastId);
    if (!room) return;
    
    const data = JSON.stringify(message);
    for (const [userId, userInfo] of Array.from(room.entries())) {
      if (userId !== excludeUserId && userInfo.ws.readyState === WebSocket.OPEN) {
        userInfo.ws.send(data);
      }
    }
  }
  
  function sendToUser(podcastId: string, targetUserId: string, message: any) {
    const room = podcastRooms.get(podcastId);
    if (!room) return;
    
    const targetUser = room.get(targetUserId);
    if (targetUser && targetUser.ws.readyState === WebSocket.OPEN) {
      targetUser.ws.send(JSON.stringify(message));
    }
  }

  return httpServer;
}
