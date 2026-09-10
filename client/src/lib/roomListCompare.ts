import type { RoomSummary } from '../types';

/** 无密码上锁：他人无法进入，大厅卡片不可点 */
export function isLobbyHardLocked(room: Pick<RoomSummary, 'isLocked' | 'hasPassword'>): boolean {
  return Boolean(room.isLocked && !room.hasPassword);
}

/** 需密码或已上锁，均视为「非开放」 */
export function isLobbyLocked(room: Pick<RoomSummary, 'isLocked' | 'hasPassword'>): boolean {
  return Boolean(room.isLocked || room.hasPassword);
}

/**
 * 大厅类型优先级（越小越靠前）：
 * 0 开放且播放中
 * 1 开放但暂停
 * 2 密码锁/可进上锁 且播放中
 * 3 密码锁/可进上锁 且暂停
 * 4 房间内上锁、不允许进入（一律最后）
 */
export function lobbyRoomTypeRank(
  room: Pick<RoomSummary, 'isLocked' | 'hasPassword' | 'isPlaying'>,
): number {
  if (isLobbyHardLocked(room)) return 4;
  const locked = isLobbyLocked(room) ? 1 : 0;
  const paused = room.isPlaying ? 0 : 1;
  return locked * 2 + paused;
}

/** 大厅排序：置顶优先，再按类型（开放播放 → … → 上锁暂停），同类型再按人数 */
export function sortLobbyRooms<T extends Pick<RoomSummary, 'userCount' | 'isLocked' | 'hasPassword' | 'isPlaying' | 'createdAt' | 'pinnedAt'>>(
  rooms: T[],
): T[] {
  return [...rooms].sort((a, b) => {
    // 1. 置顶优先
    const pinnedDiff = (b.pinnedAt || 0) - (a.pinnedAt || 0);
    if (pinnedDiff !== 0) return pinnedDiff;
    // 2. 房间类型
    const typeDiff = lobbyRoomTypeRank(a) - lobbyRoomTypeRank(b);
    if (typeDiff !== 0) return typeDiff;
    // 3. 人数 & 创建时间
    return b.userCount - a.userCount || b.createdAt - a.createdAt;
  });
}

function roomSummarySignature(room: RoomSummary): string {
  const song = room.currentSong;
  return [
    room.id,
    room.name,
    room.isOwner ?? false,
    room.isAdmin ?? false,
    room.userCount,
    room.hasPassword,
    room.isLocked ?? false,
    room.isPlaying,
    room.customCoverUrl ?? '',
    song?.name ?? '',
    song?.artist ?? '',
    song?.pic ?? '',
    room.queueLength,
    room.createdAt,
    room.pinnedAt ?? 0,
  ].join('\0');
}

export function areRoomListsEqual(a: RoomSummary[], b: RoomSummary[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (roomSummarySignature(a[i]) !== roomSummarySignature(b[i])) return false;
  }
  return true;
}
