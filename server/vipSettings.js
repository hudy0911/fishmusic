// VIP 个人设置：颜色 / 欢迎语 / 礼花，全部存 Redis（userId -> 记录）。
// 与房间无关；缺省回退由 runtimeConfig.vipGlobalDefaults 决定；冷却时间仅后台可配。

import { getRedisClient, isRedisEnabled } from './roomStorage.js';

const VIP_SETTINGS_PREFIX = 'openmusic:vip:settings:';
const MAX_COLOR_LENGTH = 16;
const MAX_TEMPLATE_ID_LENGTH = 32;
const MAX_CUSTOM_TEXT_LENGTH = 200;

const ALLOWED_TEMPLATE_IDS = new Set([
  'none',
  'royal',
  'sparkle',
  'vip-lounge',
  'spotlight',
  'wave',
  'custom',
]);

function settingsKey(userId) {
  return `${VIP_SETTINGS_PREFIX}${userId}`;
}

function clampString(value, max) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function normalizeNullableColor(value) {
  const raw = clampString(value, MAX_COLOR_LENGTH);
  if (!raw) return null;
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw;
  return null;
}

function normalizeNullableTemplateId(value) {
  const raw = clampString(value, MAX_TEMPLATE_ID_LENGTH);
  if (!raw) return null;
  return ALLOWED_TEMPLATE_IDS.has(raw) ? raw : null;
}

function normalizeNullableBoolean(value) {
  if (value === true) return true;
  if (value === false) return false;
  return null;
}

export function normalizeVipPersonalSettings(input) {
  if (!input || typeof input !== 'object') {
    return {
      badgeColor: null,
      borderColor: null,
      welcomeEnabled: null,
      welcomeTemplateId: null,
      welcomeCustomText: '',
      confettiEnabled: null,
      updatedAt: 0,
    };
  }
  return {
    badgeColor: normalizeNullableColor(input.badgeColor),
    borderColor: normalizeNullableColor(input.borderColor),
    welcomeEnabled: normalizeNullableBoolean(input.welcomeEnabled),
    welcomeTemplateId: normalizeNullableTemplateId(input.welcomeTemplateId),
    welcomeCustomText: clampString(input.welcomeCustomText, MAX_CUSTOM_TEXT_LENGTH),
    confettiEnabled: normalizeNullableBoolean(input.confettiEnabled),
    updatedAt: Number(input.updatedAt) || Date.now(),
  };
}

export async function getVipPersonalSettings(userId) {
  const id = String(userId || '').trim();
  if (!id) return null;
  const client = getRedisClient();
  if (!isRedisEnabled() || !client) return null;
  try {
    const raw = await client.get(settingsKey(id));
    if (!raw) return null;
    return normalizeVipPersonalSettings(JSON.parse(raw));
  } catch (err) {
    console.error('VIP 个人设置读取失败:', err?.message || err);
    return null;
  }
}

export async function saveVipPersonalSettings(userId, payload) {
  const id = String(userId || '').trim();
  if (!id) return { success: false, error: 'userId 不能为空' };
  const next = normalizeVipPersonalSettings({ ...payload, updatedAt: Date.now() });
  const client = getRedisClient();
  if (!isRedisEnabled() || !client) return { success: false, error: 'Redis 不可用，VIP 设置未持久化' };
  try {
    await client.set(settingsKey(id), JSON.stringify(next));
    return { success: true, settings: next };
  } catch (err) {
    console.error('VIP 个人设置写入失败:', err?.message || err);
    return { success: false, error: 'VIP 个人设置写入失败' };
  }
}
