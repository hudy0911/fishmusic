// VIP 入房迎宾：合并全局默认 + 个人设置；返回最终生效的欢迎参数。
// 角标名来自摸鱼岛 OAuth currentTitleName，颜色/欢迎语/礼花来自个人 → 全局默认。

import { getVipGlobalDefaults } from './runtimeConfig.js';
import { resolveEffectiveVipTitle } from './vipProfile.js';

const TEMPLATE_IDS = new Set([
  'none',
  'royal',
  'sparkle',
  'vip-lounge',
  'spotlight',
  'wave',
  'custom',
]);

const TEMPLATES = {
  none: '',
  royal: '👑 欢迎尊贵 {badge} {nickname} 驾临本房，请享受专属视听盛宴 👑',
  sparkle: '✨ {badge} {nickname} 闪耀登场，音乐殿堂因你而亮 ✨',
  'vip-lounge': '🥂 贵宾 {badge} {nickname} 已就位，专属 lounge 体验开启 🥂',
  spotlight: '💫 聚光灯亮起 —— 欢迎 {badge} {nickname} 加入同步听歌 💫',
  wave: '🎵 {badge} {nickname} 来了！队列已为你预留排面，一起嗨 🎵',
  custom: '{badge} {nickname} 欢迎回来',
};

const MAX_WELCOME_LENGTH = 500;
const MAX_CUSTOM_TEXT_LENGTH = 200;

function pick(value, fallback) {
  return value === null || value === undefined ? fallback : value;
}

function normalizeTemplateId(id, fallback) {
  const raw = String(id || '').trim();
  return TEMPLATE_IDS.has(raw) ? raw : fallback;
}

function normalizeColor(color, fallback) {
  const raw = String(color || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw;
  return fallback;
}

function mergeDefaults(defaults, personal) {
  if (!personal || typeof personal !== 'object') {
    return { ...defaults };
  }
  return {
    badgeColor: normalizeColor(personal.badgeColor, defaults.badgeColor),
    borderColor: normalizeColor(personal.borderColor, defaults.borderColor),
    welcomeEnabled: pick(personal.welcomeEnabled, defaults.welcomeEnabled),
    welcomeTemplateId: normalizeTemplateId(personal.welcomeTemplateId, defaults.welcomeTemplateId),
    welcomeCustomText: String(personal.welcomeCustomText != null ? personal.welcomeCustomText : (defaults.welcomeCustomText || '')).slice(0, MAX_CUSTOM_TEXT_LENGTH),
    confettiEnabled: pick(personal.confettiEnabled, defaults.confettiEnabled),
  };
}

/** 解析某 userId 在当前房间的迎宾配置；不是 VIP 时返回 null。 */
export function resolveVipWelcomeForUser({ profile, personal, defaults }) {
  if (!profile?.isPermanentVip) return null;
  const effectiveTitle = resolveEffectiveVipTitle(profile);
  const baseDefaults = defaults || getVipGlobalDefaults();
  const merged = mergeDefaults(baseDefaults, personal);
  const templateId = normalizeTemplateId(merged.welcomeTemplateId, 'royal');
  const welcomeOn = templateId !== 'none' && Boolean(merged.welcomeEnabled);
  const confettiOn = Boolean(merged.confettiEnabled);
  return {
    effectiveTitle,
    badgeColor: merged.badgeColor,
    borderColor: merged.borderColor,
    welcomeEnabled: welcomeOn,
    confettiEnabled: confettiOn,
    welcomeTemplateId: templateId,
    welcomeCustomText: String(merged.welcomeCustomText || '').slice(0, MAX_CUSTOM_TEXT_LENGTH),
  };
}

/**
 * 解析全局 VIP 用于房间级 memberTier 的最小信息。
 * 返回 null 表示该用户不是永久 VIP，不应写入房间 memberTiers。
 */
export function resolveVipTierForUser({ profile, personal, defaults }) {
  if (!profile?.isPermanentVip) return null;
  const effectiveTitle = resolveEffectiveVipTitle(profile);
  const baseDefaults = defaults || getVipGlobalDefaults();
  const merged = mergeDefaults(baseDefaults, personal);
  return {
    badgeLabel: effectiveTitle,
    badgeColor: merged.badgeColor,
    borderStyleId: 'solid',
    borderColor: merged.borderColor,
  };
}

export function buildWelcomeText(settings, badgeLabel, nickname) {
  if (!settings) return '';
  const templateId = normalizeTemplateId(settings.welcomeTemplateId, 'royal');
  if (templateId === 'none') return '';
  const template = templateId === 'custom'
    ? (String(settings.welcomeCustomText || '').trim() || TEMPLATES.custom)
    : (TEMPLATES[templateId] || TEMPLATES.royal);
  const badge = String(badgeLabel || '贵宾').trim() || '贵宾';
  const name = String(nickname || '贵宾').trim() || '贵宾';
  return template
    .replaceAll('{badge}', `「${badge}」`)
    .replaceAll('{nickname}', name)
    .slice(0, MAX_WELCOME_LENGTH);
}
