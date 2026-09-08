import { getRuntimeConfig, isYucoderConfigured } from './runtimeConfig.js';
import { createOAuthProvider, fetchWithTimeout, sanitizeReturnPath } from './oauthProvider.js';

const AUTHORIZE_URL = 'https://yucoder.cn/oauth2/authorize';
const TOKEN_URL = 'https://api.yucoder.cn/api/oauth2/token';
const USERINFO_URL = 'https://api.yucoder.cn/api/oauth2/userinfo';
const BIND_PREFIX = 'openmusic:yucoder:bind:';
const PROFILE_PREFIX = 'openmusic:yucoder:profile:';

export { isYucoderConfigured, sanitizeReturnPath };

export function buildYucoderAuthorizeUrl(state) {
  const config = getRuntimeConfig();
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set('client_id', config.yucoderClientId);
  url.searchParams.set('redirect_uri', config.yucoderRedirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', config.yucoderScope || 'read');
  url.searchParams.set('state', state);
  return url.toString();
}

export async function exchangeYucoderCode(code) {
  const config = getRuntimeConfig();
  const body = new URLSearchParams({ grant_type: 'authorization_code', client_id: config.yucoderClientId, client_secret: config.yucoderClientSecret, code: String(code || ''), redirect_uri: config.yucoderRedirectUri });
  const response = await fetchWithTimeout(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: body.toString() });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.code && data.code !== 0) throw new Error(`摸鱼岛令牌接口返回 ${response.status}`);
  const token = String(data?.data?.access_token || data?.access_token || '').trim();
  if (!token) throw new Error('摸鱼岛未返回 access_token');
  return token;
}

export async function fetchYucoderProfile(accessToken) {
  const response = await fetchWithTimeout(USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.code && payload.code !== 0) throw new Error(`摸鱼岛用户信息接口返回 ${response.status}`);
  const data = payload?.data || payload;
  const id = String(data?.id ?? data?.sub ?? '').trim();
  if (!id) throw new Error('摸鱼岛用户信息缺少 id');
  // OpenMusic 的 nickname 对应摸鱼岛展示昵称 name；缺失时回退到账户名 username。
  return { id, username: String(data?.name ?? data?.username ?? '').trim(), avatarUrl: String(data?.avatar ?? data?.avatar_url ?? '').trim() };
}

const provider = createOAuthProvider({ idField: 'yucoderId', bindPrefix: BIND_PREFIX, profilePrefix: PROFILE_PREFIX, buildAuthorizeUrl: buildYucoderAuthorizeUrl, exchangeCode: exchangeYucoderCode, fetchProfile: fetchYucoderProfile });
export const signYucoderState = provider.signState;
export const verifyYucoderState = provider.verifyState;
export const bindYucoderToUser = provider.bindToUser;
export const getUserIdForYucoder = provider.getUserIdFor;
export const getYucoderProfileForUser = provider.getProfileForUser;
export const unbindYucoderForUser = provider.unbindForUser;
export const clearYucoderBindingsForRoom = provider.clearBindingsForRoom;
// 兼容现有内部调用名；路由与前端逐步迁移期间保持协议稳定
export const isLinuxdoConfigured = isYucoderConfigured;
export const sanitizeLinuxdoReturnPath = sanitizeReturnPath;
export const buildLinuxdoAuthorizeUrl = buildYucoderAuthorizeUrl;
export const exchangeLinuxdoCode = exchangeYucoderCode;
export const fetchLinuxdoProfile = fetchYucoderProfile;
export const signLinuxdoState = signYucoderState;
export const verifyLinuxdoState = verifyYucoderState;
export const bindLinuxdoToUser = bindYucoderToUser;
export const getUserIdForLinuxdo = getUserIdForYucoder;
export const getLinuxdoProfileForUser = getYucoderProfileForUser;
export const unbindLinuxdoForUser = unbindYucoderForUser;
export const clearLinuxdoBindingsForRoom = clearYucoderBindingsForRoom;
