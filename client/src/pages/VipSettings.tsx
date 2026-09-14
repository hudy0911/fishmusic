import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Crown, Save, ArrowLeft } from 'lucide-react';
import { fetchWithTimeout } from '../api/http';
import { useSiteFeaturesStore, type UserVipPersonalSettings } from '../stores/siteFeaturesStore';
import {
  BADGE_COLOR_PRESETS,
  VIP_CUSTOM_TEXT_MAX_LENGTH,
  WELCOME_TEMPLATE_PRESETS,
  buildWelcomeText,
  getMemberBadgeStyle,
  getMemberFrameStyle,
  normalizeWelcomeTemplateId,
} from '../lib/memberTierPresets';
import Tooltip from '../components/Tooltip';
import { useRoomStore } from '../stores/roomStore';

interface ServerVipSettingsResponse {
  isPermanentVip: boolean;
  currentTitleName: string;
  effectiveTitle: string;
  settings: UserVipPersonalSettings | null;
  defaults: {
    badgeColor: string;
    borderColor: string;
    welcomeEnabled: boolean;
    welcomeTemplateId: string;
    welcomeCustomText: string;
    confettiEnabled: boolean;
  };
}

export default function VipSettingsPage() {
  const navigate = useNavigate();
  const vip = useSiteFeaturesStore((s) => s.vip);
  const personal = useSiteFeaturesStore((s) => s.vipPersonal);
  const setPersonal = useSiteFeaturesStore((s) => s.setVipPersonalSettings);
  const nickname = useRoomStore((s) => s.nickname);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<UserVipPersonalSettings | null>(null);
  const [defaults, setDefaults] = useState<ServerVipSettingsResponse['defaults'] | null>(null);

  // 提前计算 derived 值（所有 hooks 必须无条件调用）
  const dirty = useMemo(() => {
    const badgeColor = draft?.badgeColor ?? null;
    const borderColor = draft?.borderColor ?? null;
    const welcomeEnabled = draft?.welcomeEnabled ?? null;
    const welcomeTemplateId = draft?.welcomeTemplateId ?? null;
    const welcomeCustomText = draft?.welcomeCustomText ?? '';
    const confettiEnabled = draft?.confettiEnabled ?? null;

    if (!personal) return JSON.stringify(draft) !== JSON.stringify(personal);
    return JSON.stringify({
      badgeColor, borderColor, welcomeEnabled, welcomeTemplateId,
      welcomeCustomText, confettiEnabled,
    }) !== JSON.stringify({
      badgeColor: personal.badgeColor,
      borderColor: personal.borderColor,
      welcomeEnabled: personal.welcomeEnabled,
      welcomeTemplateId: personal.welcomeTemplateId,
      welcomeCustomText: personal.welcomeCustomText,
      confettiEnabled: personal.confettiEnabled,
    });
  }, [draft, personal]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithTimeout('/api/me/vip-settings', { method: 'GET' }, 8000);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json() as ServerVipSettingsResponse;
        if (cancelled) return;
        setDefaults(data.defaults);
        setDraft(data.settings || {
          badgeColor: null,
          borderColor: null,
          welcomeEnabled: null,
          welcomeTemplateId: null,
          welcomeCustomText: '',
          confettiEnabled: null,
          updatedAt: 0,
        });
        setLoaded(true);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '加载失败');
          setLoaded(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!vip.isPermanentVip) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white px-6">
        <div className="max-w-md w-full text-center bg-white/[0.04] border border-white/10 rounded-2xl p-8">
          <Crown className="mx-auto h-10 w-10 text-amber-300" />
          <h1 className="mt-4 text-xl font-bold">仅摸鱼岛贵宾可访问</h1>
          <p className="mt-3 text-sm text-white/60 leading-6">
            VIP 设置是摸鱼岛全局贵宾的样式面板。只有在摸鱼岛后台被标记为永久贵宾的用户才能进入本页。
          </p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-6 inline-flex items-center justify-center px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-sm font-medium transition-colors"
          >
            返回大厅
          </button>
        </div>
      </div>
    );
  }

  if (!loaded || !draft || !defaults) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white">
        <div className="text-sm text-white/60">{error ? error : '加载中…'}</div>
      </div>
    );
  }

  const badgeColor = draft.badgeColor || defaults.badgeColor;
  const borderColor = draft.borderColor || defaults.borderColor;
  const welcomeEnabled = draft.welcomeEnabled === null ? defaults.welcomeEnabled : draft.welcomeEnabled;
  const welcomeTemplateId = draft.welcomeTemplateId || defaults.welcomeTemplateId;
  const welcomeCustomText = draft.welcomeCustomText || defaults.welcomeCustomText;
  const confettiEnabled = draft.confettiEnabled === null ? defaults.confettiEnabled : draft.confettiEnabled;
  // 只在「自定义模板 + 实际使用文本超长」时给出红字提示，非自定义模板即使 draft 中残留了旧文本也不打扰用户。
  const isCustomTemplate = welcomeTemplateId === 'custom';
  const welcomeCustomTextLen = (welcomeCustomText || '').length;
  const welcomeCustomTextOverLimit = isCustomTemplate && welcomeCustomTextLen > VIP_CUSTOM_TEXT_MAX_LENGTH;

  const previewBadge = vip.effectiveTitle || '贵宾';
  const previewText = welcomeEnabled ? buildWelcomeText(welcomeTemplateId, welcomeCustomText, previewBadge, nickname || '贵宾') : '';
  const badgeStyle = getMemberBadgeStyle(badgeColor);
  const frameStyle = getMemberFrameStyle(borderColor);

  const handleSubmit = async () => {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetchWithTimeout('/api/me/vip-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          badgeColor: draft.badgeColor,
          borderColor: draft.borderColor,
          welcomeEnabled: draft.welcomeEnabled,
          welcomeTemplateId: draft.welcomeTemplateId,
          welcomeCustomText: draft.welcomeCustomText,
          confettiEnabled: draft.confettiEnabled,
        }),
      }, 8000);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      const data = await res.json() as { settings: UserVipPersonalSettings };
      setPersonal(data.settings);
      setDraft(data.settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = () => {
    setDraft({
      badgeColor: null,
      borderColor: null,
      welcomeEnabled: null,
      welcomeTemplateId: null,
      welcomeCustomText: '',
      confettiEnabled: null,
      updatedAt: 0,
    });
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) navigate(-1);
            else navigate('/');
          }}
          className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white mb-4 px-2 py-1 rounded-md hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          返回
        </button>
        <div className="flex items-center gap-3 mb-6">
          <Crown className="h-7 w-7 text-amber-300" />
          <div>
            <h1 className="text-2xl font-bold">VIP 样式设置</h1>
            <p className="text-sm text-white/50 mt-1">
              角标名由摸鱼岛「{vip.currentTitleName || '未填写'}」决定（缺失时显示「贵宾」），颜色与欢迎语由你本人定制。
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">预览</h2>
              <p className="text-xs text-white/40 mt-1">进房后其他成员看到的样子</p>
            </div>
            <div className="flex flex-col items-center gap-4 py-6 rounded-xl bg-black/30 border border-white/5">
              <div
                className="rounded-2xl px-5 py-3 flex items-center gap-2"
                style={{ ...frameStyle, background: 'rgba(255,255,255,0.02)', border: '1px solid currentColor', borderColor: borderColor }}
              >
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={badgeStyle}>
                  「{previewBadge}」
                </span>
                <span className="text-sm text-white/80">{nickname || '你的昵称'}</span>
              </div>
              <div className="text-sm text-white/60 text-center max-w-xs">
                {welcomeEnabled ? previewText : '已关闭欢迎语'}
              </div>
              <div className="text-xs text-white/40">
                礼花 {confettiEnabled ? '开启' : '关闭'}
              </div>
            </div>
          </section>

          <section className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 space-y-5">
            <h2 className="text-lg font-semibold">自定义</h2>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">角标颜色</span>
                <span className="text-xs text-white/40">{draft.badgeColor === null ? '跟随后台默认' : draft.badgeColor}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {BADGE_COLOR_PRESETS.map((preset) => {
                  const selected = badgeColor === preset.color;
                  return (
                    <Tooltip key={preset.id} content={preset.name}>
                      <button
                        type="button"
                        onClick={() => setDraft((prev) => prev ? { ...prev, badgeColor: preset.color } : prev)}
                        className={`relative h-8 w-8 rounded-full border transition-transform ${selected ? 'ring-2 ring-white scale-110' : 'border-white/15 hover:scale-105'}`}
                        style={{ background: preset.color }}
                        aria-label={preset.name}
                      />
                    </Tooltip>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setDraft((prev) => prev ? { ...prev, badgeColor: null } : prev)}
                  className="text-xs px-2 py-1 rounded-md bg-white/10 hover:bg-white/20"
                >
                  默认
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">边框颜色</span>
                <span className="text-xs text-white/40">{draft.borderColor === null ? '跟随后台默认' : draft.borderColor}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {BADGE_COLOR_PRESETS.map((preset) => {
                  const selected = borderColor === preset.color;
                  return (
                    <Tooltip key={preset.id} content={preset.name}>
                      <button
                        type="button"
                        onClick={() => setDraft((prev) => prev ? { ...prev, borderColor: preset.color } : prev)}
                        className={`relative h-8 w-8 rounded-full border transition-transform ${selected ? 'ring-2 ring-white scale-110' : 'border-white/15 hover:scale-105'}`}
                        style={{ background: preset.color }}
                        aria-label={preset.name}
                      />
                    </Tooltip>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setDraft((prev) => prev ? { ...prev, borderColor: null } : prev)}
                  className="text-xs px-2 py-1 rounded-md bg-white/10 hover:bg-white/20"
                >
                  默认
                </button>
              </div>
            </div>

            <div>
              <label className="flex items-center justify-between text-sm font-medium mb-2">
                欢迎语
                <button
                  type="button"
                  onClick={() => setDraft((prev) => prev ? { ...prev, welcomeEnabled: welcomeEnabled ? false : true } : prev)}
                  className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${welcomeEnabled ? 'bg-emerald-500' : 'bg-white/15'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${welcomeEnabled ? 'translate-x-4' : ''}`} />
                </button>
              </label>
              <select
                value={welcomeTemplateId}
                onChange={(e) => setDraft((prev) => prev ? { ...prev, welcomeTemplateId: normalizeWelcomeTemplateId(e.target.value) } : prev)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
              >
                {WELCOME_TEMPLATE_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>{preset.name}</option>
                ))}
              </select>
              {isCustomTemplate && (
                <div className="mt-2">
                  {welcomeCustomTextOverLimit && (
                    <div className="mb-2 flex items-start gap-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
                      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div className="leading-5">
                        你的欢迎语超过 {VIP_CUSTOM_TEXT_MAX_LENGTH} 字上限（当前 {welcomeCustomTextLen} 字），保存时会被自动截断。
                        请精简文案后保存，以保证进房欢迎语完整可读。
                      </div>
                    </div>
                  )}
                  <textarea
                    rows={2}
                    maxLength={VIP_CUSTOM_TEXT_MAX_LENGTH}
                    value={welcomeCustomText}
                    onChange={(e) => setDraft((prev) => prev ? { ...prev, welcomeCustomText: e.target.value } : prev)}
                    placeholder="例：欢迎 {nickname} 大驾光临 {badge} 房间～  （{nickname}=进房人昵称，{badge}=VIP 称号）"
                    className={`w-full bg-black/40 border rounded-lg px-3 py-2 text-sm ${welcomeCustomTextOverLimit ? 'border-rose-500/50' : 'border-white/10'}`}
                  />
                  <div className={`mt-1 text-right text-xs ${welcomeCustomTextOverLimit ? 'text-rose-300' : 'text-white/40'}`}>
                    {welcomeCustomTextLen} / {VIP_CUSTOM_TEXT_MAX_LENGTH}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="flex items-center justify-between text-sm font-medium mb-2">
                进房礼花
                <button
                  type="button"
                  onClick={() => setDraft((prev) => prev ? { ...prev, confettiEnabled: confettiEnabled ? false : true } : prev)}
                  className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${confettiEnabled ? 'bg-emerald-500' : 'bg-white/15'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${confettiEnabled ? 'translate-x-4' : ''}`} />
                </button>
              </label>
            </div>
          </section>
        </div>

        {error && (
          <div className="mt-4 text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg px-4 py-2">{error}</div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={resetToDefault}
            className="text-sm text-white/60 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10"
          >
            全部恢复后台默认
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving || !dirty}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-netease-red hover:bg-netease-red/90 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            {saving ? '保存中…' : '保存设置'}
          </button>
        </div>
      </div>
    </div>
  );
}
