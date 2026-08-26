'use client';

import { useSyncExternalStore } from 'react';
import { WalkSession } from '@/types';

const STORAGE_PREFIX = 'walkestate:session:';
const key = (routeId: string) => `${STORAGE_PREFIX}${routeId}`;

/** getSnapshot은 참조가 안정적이어야 하므로 원본 문자열 기준으로 캐싱한다. */
const cache = new Map<string, { raw: string | null; value: WalkSession | null }>();
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

const readRaw = (routeId: string): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key(routeId));
  } catch {
    return null;
  }
};

export const loadWalkSession = (routeId: string): WalkSession | null => {
  const raw = readRaw(routeId);
  const cached = cache.get(routeId);
  if (cached && cached.raw === raw) return cached.value;

  let value: WalkSession | null = null;
  try {
    value = raw ? (JSON.parse(raw) as WalkSession) : null;
  } catch {
    value = null;
  }
  cache.set(routeId, { raw, value });
  return value;
};

export const saveWalkSession = (session: WalkSession): void => {
  if (typeof window === 'undefined') return;
  const raw = JSON.stringify(session);
  try {
    window.localStorage.setItem(key(session.routeId), raw);
    cache.set(session.routeId, { raw, value: session });
  } catch {
    // 저장 공간이 부족해도(사진 누적 등) 임장 진행은 계속되어야 한다.
    cache.set(session.routeId, { raw: readRaw(session.routeId), value: session });
    console.warn('임장 기록을 저장하지 못했습니다. 저장 공간을 확인해주세요.');
  }
  notify();
};

export const clearWalkSession = (routeId: string): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(key(routeId));
  cache.delete(routeId);
  notify();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
};

/** localStorage에 저장된 임장 세션을 구독한다. 서버 렌더 시에는 항상 null. */
export const useWalkSession = (routeId: string): WalkSession | null =>
  useSyncExternalStore(
    subscribe,
    () => loadWalkSession(routeId),
    () => null
  );

const noopSubscribe = () => () => {};

/** 하이드레이션 완료 여부 — localStorage를 읽기 전에 빈 상태를 보여주지 않기 위해 사용 */
export const useIsHydrated = (): boolean =>
  useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );

/**
 * 현장 사진을 긴 변 480px JPEG로 축소해 dataURL로 변환한다.
 * (localStorage 용량 한계 때문에 원본을 그대로 저장하지 않는다.)
 */
export const compressImageFile = (file: File, maxSize = 480): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('사진을 읽지 못했습니다.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('사진을 불러오지 못했습니다.'));
      image.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);

        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('사진을 변환하지 못했습니다.'));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      image.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
