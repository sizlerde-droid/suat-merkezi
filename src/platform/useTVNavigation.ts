import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { TabType, AppSettings } from '../types';

/**
 * Key detection helpers for standard keyboards and Android TV D-Pad remotes
 */
export const isDpadUp = (e: KeyboardEvent): boolean =>
  e.key === 'ArrowUp' || e.key === 'Up' || e.keyCode === 38 || e.keyCode === 19;

export const isDpadDown = (e: KeyboardEvent): boolean =>
  e.key === 'ArrowDown' || e.key === 'Down' || e.keyCode === 40 || e.keyCode === 20;

export const isDpadLeft = (e: KeyboardEvent): boolean =>
  e.key === 'ArrowLeft' || e.key === 'Left' || e.keyCode === 37 || e.keyCode === 21;

export const isDpadRight = (e: KeyboardEvent): boolean =>
  e.key === 'ArrowRight' || e.key === 'Right' || e.keyCode === 39 || e.keyCode === 22;

export const isDpadSelect = (e: KeyboardEvent): boolean =>
  e.key === 'Enter' ||
  e.key === 'Select' ||
  e.key === 'Ok' ||
  e.keyCode === 13 ||
  e.keyCode === 23 ||
  e.keyCode === 66;

export const isBackKey = (e: KeyboardEvent): boolean =>
  e.key === 'Escape' ||
  e.key === 'Back' ||
  e.key === 'BrowserBack' ||
  e.keyCode === 27 ||
  e.keyCode === 4;

interface TVGlobalBackOptions {
  currentTab: TabType;
  onBackHome: () => void;
  settings?: AppSettings;
}

/**
 * Hook 1: Global Back/Escape Handler
 * - If inside a sub-module (iptv, muzik, muhasebe, sifre, dosyalar, ayarlar):
 *   Pressing Back / Escape safely returns to the Suat Merkezi home screen.
 * - If already on the home screen:
 *   Does NOT intercept Back / Escape, allowing the platform / browser to exit naturally.
 */
export function useTVGlobalBack({ currentTab, onBackHome }: TVGlobalBackOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isBackKey(e)) return;

      // When already on home, do not block default system behavior
      if (currentTab === 'home') {
        return;
      }

      // If user is currently typing in an input/textarea, blur it first
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        (activeEl as HTMLElement).blur();
        e.preventDefault();
        return;
      }

      // Navigate back to home menu
      e.preventDefault();
      onBackHome();
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });

    // Capacitor Native Android Hardware Back Button listener
    let removeCapacitorListener: (() => void) | null = null;
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener('backButton', () => {
        if (currentTab !== 'home') {
          onBackHome();
        } else {
          // Allow normal Android exit behavior on home screen
          CapApp.exitApp();
        }
      }).then((handle) => {
        removeCapacitorListener = () => handle.remove();
      });
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      if (removeCapacitorListener) {
        removeCapacitorListener();
      }
    };
  }, [currentTab, onBackHome]);
}

interface TVHomeGridNavigationOptions {
  itemCount: number;
  isActive: boolean;
  onSelect: (index: number) => void;
  initialIndex?: number;
}

/**
 * Hook 2: 2D Spatial Focus Navigation for Home Grid
 * Supports:
 * - Arrow Up / Down / Left / Right
 * - Android TV D-Pad Navigation
 * - OK / Enter selection
 * - Automatic dynamic column calculation (1 col mobile, 2 cols tablet, 3 cols desktop/TV)
 * - Coexists completely with mouse hover and touch tap
 */
export function useTVHomeGridNavigation({
  itemCount,
  isActive,
  onSelect,
  initialIndex = 0,
}: TVHomeGridNavigationOptions) {
  const [focusedIndex, setFocusedIndex] = useState<number>(initialIndex);
  const [isRemoteActive, setIsRemoteActive] = useState<boolean>(false);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Calculate grid columns based on viewport
  const getColumnCount = useCallback((): number => {
    if (typeof window === 'undefined') return 3;
    const width = window.innerWidth;
    if (width >= 1024) return 3; // lg:grid-cols-3 (TV & large desktop)
    if (width >= 768) return 2;  // md:grid-cols-2 (Tablet)
    return 1;                    // grid-cols-1 (Mobile)
  }, []);

  // Set reference for an item
  const setItemRef = useCallback((index: number, el: HTMLButtonElement | null) => {
    itemRefs.current[index] = el;
  }, []);

  // Keep focused item in view
  useEffect(() => {
    if (!isActive || !isRemoteActive) return;
    const target = itemRefs.current[focusedIndex];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      target.focus({ preventScroll: true });
    }
  }, [focusedIndex, isActive, isRemoteActive]);

  // Keyboard and remote D-pad listener
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if an input is focused
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        return;
      }

      const cols = getColumnCount();

      if (isDpadRight(e)) {
        e.preventDefault();
        setIsRemoteActive(true);
        setFocusedIndex((prev) => (prev + 1 < itemCount ? prev + 1 : prev));
      } else if (isDpadLeft(e)) {
        e.preventDefault();
        setIsRemoteActive(true);
        setFocusedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : prev));
      } else if (isDpadDown(e)) {
        e.preventDefault();
        setIsRemoteActive(true);
        setFocusedIndex((prev) => {
          const next = prev + cols;
          if (next < itemCount) return next;
          // If on the row above and last row has fewer items, select the last item
          if (prev < itemCount - 1) return itemCount - 1;
          return prev;
        });
      } else if (isDpadUp(e)) {
        e.preventDefault();
        setIsRemoteActive(true);
        setFocusedIndex((prev) => {
          const next = prev - cols;
          return next >= 0 ? next : prev;
        });
      } else if (isDpadSelect(e)) {
        e.preventDefault();
        setIsRemoteActive(true);
        onSelect(focusedIndex);
      }
    };

    // If mouse moves or clicks, allow peaceful coexistence
    const handlePointerActivity = () => {
      // Keeps remote active state gentle without jarring layout
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerdown', handlePointerActivity);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handlePointerActivity);
    };
  }, [isActive, itemCount, focusedIndex, onSelect, getColumnCount]);

  return {
    focusedIndex,
    setFocusedIndex,
    isRemoteActive,
    setIsRemoteActive,
    setItemRef,
  };
}
