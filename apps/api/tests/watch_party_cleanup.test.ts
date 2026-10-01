import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WatchPartyCleanupJob } from '../src/jobs/watchPartyCleanup';
import { IWatchPartyRepository, WatchPartyRoomWithHost } from '../src/services/watchPartyRepository';
import { IJellyfinSyncPlayService } from '../src/services/jellyfinSyncPlay';

describe('WatchPartyCleanupJob (#206)', () => {
  let mockRepo: IWatchPartyRepository;
  let mockSyncPlay: IJellyfinSyncPlayService;
  let fetchMock: ReturnType<typeof vi.fn>;
  let activeRooms: WatchPartyRoomWithHost[];

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    activeRooms = [];

    mockRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findByIdWithHost: vi.fn(),
      findActive: vi.fn().mockImplementation(() => activeRooms),
      findActiveByJellyfinGroupId: vi.fn(),
      update: vi.fn().mockImplementation((id, fields) => {
        const room = activeRooms.find((r) => r.id === id);
        if (room) Object.assign(room, fields);
      }),
      delete: vi.fn(),
    };

    mockSyncPlay = {
      createSyncPlayGroup: vi.fn(),
      getSyncPlayGroup: vi.fn(),
      listSyncPlayGroups: vi.fn(),
      setSyncPlayItem: vi.fn(),
      leaveSyncPlayGroup: vi.fn().mockResolvedValue(undefined),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('skips rooms newer than 30 minutes', async () => {
    activeRooms = [
      {
        id: 'room-recent',
        hostUserId: 'u1',
        hostUsername: 'alice',
        jellyfinGroupId: 'g1',
        jellyfinGroupName: '🎉 Room',
        mediaType: 'movie',
        metadataId: null,
        jellyfinItemId: 'item-1',
        title: 'Fresh Movie',
        year: 2024,
        seasonNumber: null,
        episodeNumber: null,
        posterUrl: null,
        controlMode: 'everyone',
        status: 'active',
        discordMessageId: null,
        discordChannelId: null,
        historyJson: '[]',
        createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 mins ago
        updatedAt: new Date().toISOString(),
        endedAt: null,
      },
    ];

    const job = new WatchPartyCleanupJob({
      watchPartyRepo: mockRepo,
      syncPlay: mockSyncPlay,
    });

    const cleaned = await job.runOnce();
    expect(cleaned).toBe(0);
    expect(mockRepo.update).not.toHaveBeenCalled();
  });

  it('ends rooms older than 12 hours regardless of participants', async () => {
    activeRooms = [
      {
        id: 'room-ancient',
        hostUserId: 'u1',
        hostUsername: 'alice',
        jellyfinGroupId: 'g1',
        jellyfinGroupName: '🎉 Ancient Room',
        mediaType: 'movie',
        metadataId: null,
        jellyfinItemId: 'item-1',
        title: 'Marathon Movie',
        year: 2024,
        seasonNumber: null,
        episodeNumber: null,
        posterUrl: null,
        controlMode: 'everyone',
        status: 'active',
        discordMessageId: null,
        discordChannelId: null,
        historyJson: '[]',
        createdAt: new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString(), // 13h ago
        updatedAt: new Date().toISOString(),
        endedAt: null,
      },
    ];

    const job = new WatchPartyCleanupJob({
      watchPartyRepo: mockRepo,
      syncPlay: mockSyncPlay,
    });

    const cleaned = await job.runOnce();
    expect(cleaned).toBe(1);
    expect(mockRepo.update).toHaveBeenCalledWith(
      'room-ancient',
      expect.objectContaining({ status: 'ended' })
    );
    expect(mockSyncPlay.leaveSyncPlayGroup).toHaveBeenCalledWith('g1');
  });

  it('ends rooms older than 30m when Jellyfin participants is 0', async () => {
    activeRooms = [
      {
        id: 'room-abandoned',
        hostUserId: 'u1',
        hostUsername: 'alice',
        jellyfinGroupId: 'g-empty',
        jellyfinGroupName: '🎉 Abandoned Room',
        mediaType: 'movie',
        metadataId: null,
        jellyfinItemId: 'item-1',
        title: 'Empty Movie',
        year: 2024,
        seasonNumber: null,
        episodeNumber: null,
        posterUrl: null,
        controlMode: 'everyone',
        status: 'active',
        discordMessageId: 'msg-123',
        discordChannelId: null,
        historyJson: '[]',
        createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(), // 40m ago
        updatedAt: new Date().toISOString(),
        endedAt: null,
      },
    ];

    // Jellyfin reports 0 participants
    vi.mocked(mockSyncPlay.getSyncPlayGroup).mockResolvedValueOnce({
      groupId: 'g-empty',
      groupName: '🎉 Abandoned Room',
      participants: [],
    });

    const job = new WatchPartyCleanupJob({
      watchPartyRepo: mockRepo,
      syncPlay: mockSyncPlay,
    });

    const cleaned = await job.runOnce();
    expect(cleaned).toBe(1);
    expect(mockRepo.update).toHaveBeenCalledWith(
      'room-abandoned',
      expect.objectContaining({ status: 'ended' })
    );
  });

  it('keeps rooms active when Jellyfin participants > 0', async () => {
    activeRooms = [
      {
        id: 'room-active',
        hostUserId: 'u1',
        hostUsername: 'alice',
        jellyfinGroupId: 'g-populated',
        jellyfinGroupName: '🎉 Active Room',
        mediaType: 'movie',
        metadataId: null,
        jellyfinItemId: 'item-1',
        title: 'Active Movie',
        year: 2024,
        seasonNumber: null,
        episodeNumber: null,
        posterUrl: null,
        controlMode: 'everyone',
        status: 'active',
        discordMessageId: null,
        discordChannelId: null,
        historyJson: '[]',
        createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45m ago
        updatedAt: new Date().toISOString(),
        endedAt: null,
      },
    ];

    // Jellyfin reports 2 participants still watching
    vi.mocked(mockSyncPlay.getSyncPlayGroup).mockResolvedValueOnce({
      groupId: 'g-populated',
      groupName: '🎉 Active Room',
      participants: ['alice', 'bob'],
    });

    const job = new WatchPartyCleanupJob({
      watchPartyRepo: mockRepo,
      syncPlay: mockSyncPlay,
    });

    const cleaned = await job.runOnce();
    expect(cleaned).toBe(0);
    expect(mockRepo.update).not.toHaveBeenCalled();
  });
});
