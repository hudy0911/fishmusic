import { useEffect, useState } from 'react';
import { measureCoverLuminance, tuneCoverBackdrop, type CoverBackdropTuning } from '../lib/coverBackdrop';
import { getCoverPixelSize } from '../lib/coverUrl';
import { useSignedApiUrl } from '../lib/signedApiUrl';
import { loadSharedCoverResource } from '../lib/sharedCoverResource';

interface Props {
  coverUrl: string;
  className?: string;
}

type LoadStage = 'primary' | 'proxy';

export default function AmbientCoverLayers({ coverUrl, className = 'absolute inset-0' }: Props) {
  const [stageFor, setStageFor] = useState<{ id: string; stage: LoadStage } | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [resourceUrl, setResourceUrl] = useState('');
  const [tuning, setTuning] = useState<CoverBackdropTuning>(() => tuneCoverBackdrop(null));

  const stage: LoadStage = stageFor?.id === coverUrl ? stageFor.stage : 'primary';

  useEffect(() => {
    setStageFor(null);
    setLoadedFor(null);
    setResourceUrl('');
    setTuning(tuneCoverBackdrop(null));
  }, [coverUrl]);

  const pixelSize = getCoverPixelSize('medium');
  // 与 SongCover 一致：先直链，失败再走 media-proxy（避免代理限流导致背景偶发空白）
  const proxyUrl = /^https?:\/\//i.test(coverUrl)
    ? `/api/media-proxy?url=${encodeURIComponent(coverUrl)}${pixelSize ? `&size=${pixelSize}` : ''}`
    : null;
  const target = stage === 'proxy' && proxyUrl ? proxyUrl : coverUrl;
  const signedCover = useSignedApiUrl(target);
  const displayUrl = signedCover || '';
  const loaded = Boolean(resourceUrl) && loadedFor === resourceUrl;

  useEffect(() => {
    if (!displayUrl) return undefined;
    let cancelled = false;
    void loadSharedCoverResource(displayUrl)
      .then((sharedUrl) => {
        if (!cancelled) setResourceUrl(sharedUrl);
      })
      .catch(() => {
        if (!cancelled) setResourceUrl('');
      });
    return () => {
      cancelled = true;
    };
  }, [displayUrl]);

  return (
    <div className={`${className} ambient-cover overflow-hidden`} aria-hidden>
      <div className="absolute inset-0 bg-surface-canvas" />

      {resourceUrl ? (
        <div className="ambient-cover-image-layer absolute inset-0 transition-opacity duration-700">
          <img
            key={resourceUrl}
            src={resourceUrl}
            alt=""
            referrerPolicy="no-referrer"
            decoding="async"
            className="ambient-cover-image absolute inset-0 h-full w-full object-cover transition-[opacity,filter] duration-700"
            style={{
              opacity: loaded ? tuning.coverOpacity : 0,
              '--ambient-cover-brightness': tuning.imgBrightness,
              transform: 'scale(1.14)',
            } as React.CSSProperties}
            ref={(img) => {
              // 缓存命中时浏览器可能不再触发 onLoad，需主动检测 complete
              if (img?.complete && img.naturalWidth > 0 && loadedFor !== resourceUrl) {
                queueMicrotask(() => setLoadedFor(resourceUrl));
              }
            }}
            onLoad={(event) => {
              setLoadedFor(resourceUrl);
              setTuning(tuneCoverBackdrop(measureCoverLuminance(event.currentTarget)));
            }}
            onError={() => {
              if (stage === 'primary' && proxyUrl) {
                setStageFor({ id: coverUrl, stage: 'proxy' });
                return;
              }
              setLoadedFor(null);
            }}
          />
        </div>
      ) : null}

      <div
        className="ambient-cover-base absolute inset-0 transition-[background-color] duration-700"
        style={{ '--ambient-cover-base-opacity': tuning.baseOverlay } as React.CSSProperties}
      />

      <div
        className="ambient-cover-gradient absolute inset-0 transition-[background] duration-700"
        style={{
          '--ambient-cover-gradient-top': tuning.gradientTop,
          '--ambient-cover-gradient-bottom': tuning.gradientBottom,
        } as React.CSSProperties}
      />

      <div className="ambient-cover-vignette absolute inset-0" />
      <div className="ambient-cover-finish absolute inset-0" />
    </div>
  );
}
