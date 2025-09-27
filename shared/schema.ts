import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from 'drizzle-orm';
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").unique(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default('user'), // 'admin' or 'user'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Podcast status enum
export const podcastStatusEnum = pgEnum('podcast_status', ['draft', 'scheduled', 'live', 'completed', 'cancelled']);

// Podcasts table
export const podcasts = pgTable("podcasts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  hostId: varchar("host_id").notNull().references(() => users.id),
  scheduledAt: timestamp("scheduled_at"),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  status: podcastStatusEnum("status").notNull().default('draft'),
  imageUrl: text("image_url"),
  recordingUrl: text("recording_url"),
  listenerCount: varchar("listener_count").default('0'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Podcast guests table (many-to-many relationship)
export const podcastGuests = pgTable("podcast_guests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  podcastId: varchar("podcast_id").notNull().references(() => podcasts.id, { onDelete: 'cascade' }),
  guestId: varchar("guest_id").notNull().references(() => users.id),
  role: varchar("role").notNull().default('guest'), // 'host', 'guest', 'co-host'
  createdAt: timestamp("created_at").defaultNow(),
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  hostedPodcasts: many(podcasts),
  guestAppearances: many(podcastGuests),
}));

export const podcastsRelations = relations(podcasts, ({ one, many }) => ({
  host: one(users, {
    fields: [podcasts.hostId],
    references: [users.id],
  }),
  guests: many(podcastGuests),
}));

export const podcastGuestsRelations = relations(podcastGuests, ({ one }) => ({
  podcast: one(podcasts, {
    fields: [podcastGuests.podcastId],
    references: [podcasts.id],
  }),
  guest: one(users, {
    fields: [podcastGuests.guestId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  role: true,
});

export const insertPodcastSchema = createInsertSchema(podcasts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  startedAt: true,
  endedAt: true,
  listenerCount: true,
});

export const updatePodcastSchema = createInsertSchema(podcasts).omit({
  id: true,
  createdAt: true,
}).partial();

export const insertPodcastGuestSchema = createInsertSchema(podcastGuests).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Podcast = typeof podcasts.$inferSelect;
export type InsertPodcast = z.infer<typeof insertPodcastSchema>;
export type UpdatePodcast = z.infer<typeof updatePodcastSchema>;
export type PodcastGuest = typeof podcastGuests.$inferSelect;
export type InsertPodcastGuest = z.infer<typeof insertPodcastGuestSchema>;

// Extended types with relations
export type PodcastWithHost = Podcast & {
  host: User;
  guests?: (PodcastGuest & { guest: User })[];
};
