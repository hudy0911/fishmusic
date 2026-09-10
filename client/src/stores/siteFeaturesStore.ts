import { create } from 'zustand';

export interface UserVipIdentity {
  isPermanentVip: boolean;
  currentTitleName: string;
  effectiveTitle: string;
  refreshedAt: number;
}

export interface UserVipPersonalSettings {
  badgeColor: string | null;
  borderColor: string | null;
  welcomeEnabled: boolean | null;
  welcomeTemplateId: string | null;
  welcomeCustomText: string;
  confettiEnabled: boolean | null;
  updatedAt: number;
}

interface SiteFeaturesStore {
  /** 管理端是否开放全站共享会员入口 */
  sharedMembershipEnabled: boolean;
  /** 管理端是否开放 SVIP 音质选项 */
  svipQualityEnabled: Record<'netease' | 'tencent' | 'kugou' | 'qishui', boolean>;
  /** 各平台实际可用的高级会员能力，不能用全局开关代替。 */
  neteaseSvip: boolean;
  tencentSvip: boolean;
  qishuiVip: boolean;
  qishuiSvip: boolean;
  musicSourcesEnabled: Record<'netease' | 'tencent' | 'kugou' | 'qishui', boolean>;
  hydrated: boolean;
  /** 摸鱼岛 OAuth 给出的全局贵宾身份（来自 bootstrap /api/session/bootstrap） */
  vip: UserVipIdentity;
  /** 用户在「VIP 设置」中保存的个人样式（颜色 / 欢迎语 / 礼花 / 冷却） */
  vipPersonal: UserVipPersonalSettings | null;
  setSvipQualityEnabled: (enabled: boolean) => void;
  setPlatformCapabilities: (features: PlatformCapabilities) => void;
  setVipIdentity: (vip: UserVipIdentity | null | undefined) => void;
  setVipPersonalSettings: (settings: UserVipPersonalSettings | null) => void;
}

export interface PlatformCapabilities {
  sharedMembershipEnabled?: boolean;
  svipQualityEnabled?: boolean | Partial<Record<'netease' | 'tencent' | 'kugou' | 'qishui', boolean>>;
  neteaseSvip?: boolean;
  tencentSvip?: boolean;
  qishuiVip?: boolean;
  qishuiSvip?: boolean;
  musicSourcesEnabled?: Partial<Record<'netease' | 'tencent' | 'kugou' | 'qishui', boolean>>;
}

export const useSiteFeaturesStore = create<SiteFeaturesStore>((set) => ({
  sharedMembershipEnabled: true,
  svipQualityEnabled: { netease: false, tencent: false, kugou: false, qishui: false },
  neteaseSvip: false,
  tencentSvip: false,
  qishuiVip: false,
  qishuiSvip: false,
  musicSourcesEnabled: { netease: true, tencent: true, kugou: true, qishui: true },
  hydrated: false,
  vip: { isPermanentVip: false, currentTitleName: '', effectiveTitle: '', refreshedAt: 0 },
  vipPersonal: null,
  setSvipQualityEnabled: (svipQualityEnabled) => set({
    svipQualityEnabled: { netease: Boolean(svipQualityEnabled), tencent: Boolean(svipQualityEnabled), kugou: Boolean(svipQualityEnabled), qishui: Boolean(svipQualityEnabled) },
    hydrated: true,
  }),
  setPlatformCapabilities: (features) => set((state) => ({
    sharedMembershipEnabled: features.sharedMembershipEnabled === undefined
      ? state.sharedMembershipEnabled
      : Boolean(features.sharedMembershipEnabled),
    svipQualityEnabled: features.svipQualityEnabled === undefined
      ? state.svipQualityEnabled
      : typeof features.svipQualityEnabled === 'object'
        ? { ...state.svipQualityEnabled, ...Object.fromEntries(Object.entries(features.svipQualityEnabled).map(([key, value]) => [key, Boolean(value)])) } as typeof state.svipQualityEnabled
        : { netease: Boolean(features.svipQualityEnabled), tencent: Boolean(features.svipQualityEnabled), kugou: Boolean(features.svipQualityEnabled), qishui: Boolean(features.svipQualityEnabled) },
    neteaseSvip: features.neteaseSvip === undefined ? state.neteaseSvip : Boolean(features.neteaseSvip),
    tencentSvip: features.tencentSvip === undefined ? state.tencentSvip : Boolean(features.tencentSvip),
    qishuiVip: features.qishuiVip === undefined ? state.qishuiVip : Boolean(features.qishuiVip),
    qishuiSvip: features.qishuiSvip === undefined ? state.qishuiSvip : Boolean(features.qishuiSvip),
    musicSourcesEnabled: features.musicSourcesEnabled
      ? { ...state.musicSourcesEnabled, ...Object.fromEntries(Object.entries(features.musicSourcesEnabled).map(([key, value]) => [key, Boolean(value)])) } as typeof state.musicSourcesEnabled
      : state.musicSourcesEnabled,
    hydrated: true,
  })),
  setVipIdentity: (vip) => set(() => ({
    vip: vip ? {
      isPermanentVip: Boolean(vip.isPermanentVip),
      currentTitleName: String(vip.currentTitleName || ''),
      effectiveTitle: String(vip.effectiveTitle || (vip.isPermanentVip ? '贵宾' : '')),
      refreshedAt: Number(vip.refreshedAt || 0),
    } : { isPermanentVip: false, currentTitleName: '', effectiveTitle: '', refreshedAt: 0 },
  })),
  setVipPersonalSettings: (settings) => set(() => ({
    vipPersonal: settings ? { ...settings } : null,
  })),
}));

export function applySiteFeatures(features: PlatformCapabilities | null | undefined) {
  if (!features || typeof features !== 'object') return;
  useSiteFeaturesStore.getState().setPlatformCapabilities(features);
}

export function isQishuiVipAvailable(): boolean {
  return useSiteFeaturesStore.getState().qishuiVip;
}

export function isQishuiSvipAvailable(): boolean {
  return useSiteFeaturesStore.getState().qishuiSvip;
}

export function isSvipQualityEnabled(): boolean {
  return Object.values(useSiteFeaturesStore.getState().svipQualityEnabled).some(Boolean);
}

export function isPlatformSvipQualityEnabled(source: 'netease' | 'tencent' | 'kugou' | 'qishui'): boolean {
  const state = useSiteFeaturesStore.getState();
  return Boolean(state.svipQualityEnabled[source]);
}

export function isPermanentVip(): boolean {
  return useSiteFeaturesStore.getState().vip.isPermanentVip;
}
