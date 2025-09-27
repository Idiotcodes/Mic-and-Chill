import {
  users,
  podcasts,
  podcastGuests,
  type User,
  type UpsertUser,
  type Podcast,
  type InsertPodcast,
  type UpdatePodcast,
  type PodcastGuest,
  type InsertPodcastGuest,
  type PodcastWithHost,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserRole(id: string, role: string): Promise<User>;
  
  // Podcast operations
  getAllPodcasts(): Promise<PodcastWithHost[]>;
  getLivePodcasts(): Promise<PodcastWithHost[]>;
  getUpcomingPodcasts(): Promise<PodcastWithHost[]>;
  getPodcast(id: string): Promise<PodcastWithHost | undefined>;
  createPodcast(podcast: InsertPodcast): Promise<Podcast>;
  updatePodcast(id: string, updates: Partial<UpdatePodcast>): Promise<Podcast>;
  deletePodcast(id: string): Promise<void>;
  
  // Podcast guest operations
  addPodcastGuest(guest: InsertPodcastGuest): Promise<PodcastGuest>;
  removePodcastGuest(podcastId: string, guestId: string): Promise<void>;
  getPodcastGuests(podcastId: string): Promise<(PodcastGuest & { guest: User })[]>;
  
  // Admin operations
  getAdminStats(): Promise<{
    totalPodcasts: number;
    liveNow: number;
    totalListeners: number;
    thisMonth: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Generate username if not provided
    if (!userData.username && userData.email) {
      userData.username = userData.email.split('@')[0];
    } else if (!userData.username && userData.firstName) {
      userData.username = userData.firstName.toLowerCase().replace(/\s+/g, '');
    }
    
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async updateUserRole(id: string, role: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Podcast operations
  async getAllPodcasts(): Promise<PodcastWithHost[]> {
    const result = await db
      .select({
        podcast: podcasts,
        host: users,
      })
      .from(podcasts)
      .leftJoin(users, eq(podcasts.hostId, users.id))
      .orderBy(desc(podcasts.createdAt));

    const podcastsWithHosts = result.map(({ podcast, host }) => ({
      ...podcast,
      host: host!,
      guests: [] as (PodcastGuest & { guest: User })[]
    }));

    // Fetch guests for each podcast
    for (const podcast of podcastsWithHosts) {
      podcast.guests = await this.getPodcastGuests(podcast.id);
    }

    return podcastsWithHosts;
  }

  async getLivePodcasts(): Promise<PodcastWithHost[]> {
    const result = await db
      .select({
        podcast: podcasts,
        host: users,
      })
      .from(podcasts)
      .leftJoin(users, eq(podcasts.hostId, users.id))
      .where(eq(podcasts.status, 'live'))
      .orderBy(desc(podcasts.startedAt));

    const podcastsWithHosts = result.map(({ podcast, host }) => ({
      ...podcast,
      host: host!,
      guests: [] as (PodcastGuest & { guest: User })[]
    }));

    // Fetch guests for each podcast
    for (const podcast of podcastsWithHosts) {
      podcast.guests = await this.getPodcastGuests(podcast.id);
    }

    return podcastsWithHosts;
  }

  async getUpcomingPodcasts(): Promise<PodcastWithHost[]> {
    const result = await db
      .select({
        podcast: podcasts,
        host: users,
      })
      .from(podcasts)
      .leftJoin(users, eq(podcasts.hostId, users.id))
      .where(eq(podcasts.status, 'scheduled'))
      .orderBy(asc(podcasts.scheduledAt));

    const podcastsWithHosts = result.map(({ podcast, host }) => ({
      ...podcast,
      host: host!,
      guests: [] as (PodcastGuest & { guest: User })[]
    }));

    // Fetch guests for each podcast
    for (const podcast of podcastsWithHosts) {
      podcast.guests = await this.getPodcastGuests(podcast.id);
    }

    return podcastsWithHosts;
  }

  async getPodcast(id: string): Promise<PodcastWithHost | undefined> {
    const [result] = await db
      .select({
        podcast: podcasts,
        host: users,
      })
      .from(podcasts)
      .leftJoin(users, eq(podcasts.hostId, users.id))
      .where(eq(podcasts.id, id));

    if (!result) return undefined;

    const guests = await this.getPodcastGuests(id);

    return {
      ...result.podcast,
      host: result.host!,
      guests,
    };
  }

  async createPodcast(podcast: InsertPodcast): Promise<Podcast> {
    const [newPodcast] = await db
      .insert(podcasts)
      .values(podcast)
      .returning();
    return newPodcast;
  }

  async updatePodcast(id: string, updates: Partial<UpdatePodcast>): Promise<Podcast> {
    const [updatedPodcast] = await db
      .update(podcasts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(podcasts.id, id))
      .returning();
    return updatedPodcast;
  }

  async deletePodcast(id: string): Promise<void> {
    await db.delete(podcasts).where(eq(podcasts.id, id));
  }

  // Podcast guest operations
  async addPodcastGuest(guest: InsertPodcastGuest): Promise<PodcastGuest> {
    const [newGuest] = await db
      .insert(podcastGuests)
      .values(guest)
      .returning();
    return newGuest;
  }

  async removePodcastGuest(podcastId: string, guestId: string): Promise<void> {
    await db
      .delete(podcastGuests)
      .where(
        and(
          eq(podcastGuests.podcastId, podcastId),
          eq(podcastGuests.guestId, guestId)
        )
      );
  }

  async getPodcastGuests(podcastId: string): Promise<(PodcastGuest & { guest: User })[]> {
    const result = await db
      .select({
        podcastGuest: podcastGuests,
        guest: users,
      })
      .from(podcastGuests)
      .leftJoin(users, eq(podcastGuests.guestId, users.id))
      .where(eq(podcastGuests.podcastId, podcastId));

    return result.map(({ podcastGuest, guest }) => ({
      ...podcastGuest,
      guest: guest!,
    }));
  }

  // Admin operations
  async getAdminStats(): Promise<{
    totalPodcasts: number;
    liveNow: number;
    totalListeners: number;
    thisMonth: number;
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalPodcastsResult] = await db
      .select({ count: sql`count(*)` })
      .from(podcasts);

    const [liveNowResult] = await db
      .select({ count: sql`count(*)` })
      .from(podcasts)
      .where(eq(podcasts.status, 'live'));

    const [thisMonthResult] = await db
      .select({ count: sql`count(*)` })
      .from(podcasts)
      .where(sql`${podcasts.createdAt} >= ${startOfMonth}`);

    const livePodcasts = await db
      .select({ listenerCount: podcasts.listenerCount })
      .from(podcasts)
      .where(eq(podcasts.status, 'live'));

    const totalListeners = livePodcasts.reduce((sum, podcast) => {
      return sum + parseInt(podcast.listenerCount || '0');
    }, 0);

    return {
      totalPodcasts: parseInt(totalPodcastsResult.count as string),
      liveNow: parseInt(liveNowResult.count as string),
      totalListeners,
      thisMonth: parseInt(thisMonthResult.count as string),
    };
  }
}

export const storage = new DatabaseStorage();
