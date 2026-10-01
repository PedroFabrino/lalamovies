import { desc, eq } from 'drizzle-orm';
import { AppDatabase } from '../db';
import {
  watchPartyRooms,
  WatchPartyRoom,
  NewWatchPartyRoom,
  users,
} from '../db/schema';

export interface WatchPartyRoomWithHost extends WatchPartyRoom {
  hostUsername: string;
}

export interface IWatchPartyRepository {
  create(data: NewWatchPartyRoom): WatchPartyRoom;
  findById(id: string): WatchPartyRoom | undefined;
  findByIdWithHost(id: string): WatchPartyRoomWithHost | undefined;
  findActive(): WatchPartyRoomWithHost[];
  findActiveByJellyfinGroupId(groupId: string): WatchPartyRoom | undefined;
  update(id: string, fields: Partial<WatchPartyRoom>): void;
  delete(id: string): void;
}

export class WatchPartyRepository implements IWatchPartyRepository {
  constructor(private db: AppDatabase) {}

  create(data: NewWatchPartyRoom): WatchPartyRoom {
    this.db.insert(watchPartyRooms).values(data).run();
    const created = this.findById(data.id);
    if (!created) {
      throw new Error(`Failed to retrieve watch party room after insert: ${data.id}`);
    }
    return created;
  }

  findById(id: string): WatchPartyRoom | undefined {
    return this.db
      .select()
      .from(watchPartyRooms)
      .where(eq(watchPartyRooms.id, id))
      .get();
  }

  findByIdWithHost(id: string): WatchPartyRoomWithHost | undefined {
    const row = this.db
      .select({
        room: watchPartyRooms,
        hostUsername: users.username,
      })
      .from(watchPartyRooms)
      .innerJoin(users, eq(watchPartyRooms.hostUserId, users.id))
      .where(eq(watchPartyRooms.id, id))
      .get();

    if (!row) return undefined;
    return {
      ...row.room,
      hostUsername: row.hostUsername,
    };
  }

  findActive(): WatchPartyRoomWithHost[] {
    const rows = this.db
      .select({
        room: watchPartyRooms,
        hostUsername: users.username,
      })
      .from(watchPartyRooms)
      .innerJoin(users, eq(watchPartyRooms.hostUserId, users.id))
      .where(eq(watchPartyRooms.status, 'active'))
      .orderBy(desc(watchPartyRooms.createdAt))
      .all();

    return rows.map((r) => ({
      ...r.room,
      hostUsername: r.hostUsername,
    }));
  }

  findActiveByJellyfinGroupId(groupId: string): WatchPartyRoom | undefined {
    return this.db
      .select()
      .from(watchPartyRooms)
      .where(eq(watchPartyRooms.jellyfinGroupId, groupId))
      .get();
  }

  update(id: string, fields: Partial<WatchPartyRoom>): void {
    this.db
      .update(watchPartyRooms)
      .set({
        ...fields,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(watchPartyRooms.id, id))
      .run();
  }

  delete(id: string): void {
    this.db
      .delete(watchPartyRooms)
      .where(eq(watchPartyRooms.id, id))
      .run();
  }
}
