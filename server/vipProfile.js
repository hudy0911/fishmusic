// VIP 概要持久化：摸鱼岛 OAuth 返回的 isPermanentVip / currentTitleName / donationAmount
// 写入 Redis，作为全局贵宾的唯一权威来源；与摸鱼岛 OAuth 解耦，业务模块只读这一层。

import { getRedisClient, isRedisEnabled } from './roomStorage.js';

const VIP_PROFILE_PREFIX = 'openmusic:vip:profile:';
const VIP_INDEX_KEY = 'openmusic:vip:index';

function profileKey(userId) {
  return `${VIP_PROFILE_PREFIX}${userId}`;
}

/** 将摸鱼岛 OAuth 返回值规整为内部 VIP 概要；非贵宾也保留记录，方便按 userId 查询。 */
export function normalizeVipProfile(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const isPermanentVip = Boolean(raw.isPermanentVip);
  const currentTitleName = String(raw.currentTitleName || '').trim().slice(0, 32);
  const donationAmountRaw = raw.donationAmount;
  let donationAmount = '';
  if (typeof donationAmountRaw === 'number' && Number.isFinite(donationAmountRaw)) {
    donationAmount = String(donationAmountRaw);
  } else if (typeof donationAmountRaw === 'string') {
    donationAmountRaw.trim().slice(0, 32);
  }
  return {
    isPermanentVip,
    currentTitleName,
    donationAmount,
    refreshedAt: Number(raw.refreshedAt) || Date.now(),
  };
}

/** 写入 VIP 概要；返回成功状态，Redis 不可用时降级为内存语义失败。 */
export async function saveVipProfile(userId, profile) {
  const id = String(userId || '').trim();
  if (!id) return { success: false, error: 'userId 不能为空' };
  const normalized = normalizeVipProfile(profile);
  if (!normalized) return { success: false, error: 'profile 不合法' };
  const client = getRedisClient();
  if (!isRedisEnabled() || !client) return { success: false, error: 'Redis 不可用，VIP 概要未持久化' };
  try {
    await client.set(profileKey(id), JSON.stringify(normalized));
    // 仅永久会员入索引，方便后台列表查询
    if (normalized.isPermanentVip) {
      await client.sAdd(VIP_INDEX_KEY, id);
    } else {
      await client.sRem(VIP_INDEX_KEY, id);
    }
    return { success: true, profile: normalized };
  } catch (err) {
    console.error('VIP 概要写入失败:', err?.message || err);
    return { success: false, error: 'VIP 概要写入失败' };
  }
}

export async function getVipProfile(userId) {
  const id = String(userId || '').trim();
  if (!id) return null;
  const client = getRedisClient();
  if (!isRedisEnabled() || !client) return null;
  try {
    const raw = await client.get(profileKey(id));
    if (!raw) return null;
    return normalizeVipProfile(JSON.parse(raw));
  } catch (err) {
    console.error('VIP 概要读取失败:', err?.message || err);
    return null;
  }
}

export async function clearVipProfile(userId) {
  const id = String(userId || '').trim();
  if (!id) return false;
  const client = getRedisClient();
  if (!isRedisEnabled() || !client) return false;
  try {
    await client.del(profileKey(id));
    await client.sRem(VIP_INDEX_KEY, id);
    return true;
  } catch (err) {
    console.error('VIP 概要清理失败:', err?.message || err);
    return false;
  }
}

/** 后台 VIP 列表分页 + 搜索 */
export async function listVipProfiles({ offset = 0, limit = 20, q = '' } = {}) {
  const client = getRedisClient();
  if (!isRedisEnabled() || !client) return { items: [], total: 0 };
  const keyword = String(q || '').trim().toLowerCase();
  try {
    const allIds = await client.sMembers(VIP_INDEX_KEY);
    const items = [];
    for (const id of allIds) {
      const profile = await getVipProfile(id);
      if (!profile) {
        // 索引条目已过期（概要被清），从索引里移除
        await client.sRem(VIP_INDEX_KEY, id);
        continue;
      }
      if (keyword && !String(id).toLowerCase().includes(keyword) && !profile.currentTitleName.toLowerCase().includes(keyword)) {
        continue;
      }
      items.push({ userId: id, ...profile });
    }
    items.sort((a, b) => (b.refreshedAt || 0) - (a.refreshedAt || 0));
    const total = items.length;
    const pageItems = items.slice(Math.max(0, offset), Math.max(0, offset) + Math.max(1, limit));
    return { items: pageItems, total };
  } catch (err) {
    console.error('VIP 列表查询失败:', err?.message || err);
    return { items: [], total: 0 };
  }
}

/** 用于会话 bootstrap 阶段快速决定角标名 */
export function resolveEffectiveVipTitle(profile) {
  if (!profile?.isPermanentVip) return '';
  const title = String(profile.currentTitleName || '').trim();
  return title || '【贵宾】';
}
