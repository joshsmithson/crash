import { useCallback, useRef, useEffect } from "react";

/**
 * Sound effect identifiers used across the platform.
 */
export type SoundName =
  | "bet_place"
  | "cashout"
  | "crash"
  | "win"
  | "lose"
  | "tick"
  | "coin_flip"
  | "case_open"
  | "case_reveal"
  | "spinner_tick"
  | "plinko_peg"
  | "plinko_land"
  | "roulette_spin"
  | "roulette_tick"
  | "button_click"
  | "notification"
  | "chat_message";

/**
 * Maps sound names to their file paths in /sounds/.
 */
const SOUND_PATHS: Record<SoundName, string> = {
  bet_place: "/sounds/bet-place.mp3",
  cashout: "/sounds/cashout.mp3",
  crash: "/sounds/crash.mp3",
  win: "/sounds/win.mp3",
  lose: "/sounds/lose.mp3",
  tick: "/sounds/tick.mp3",
  coin_flip: "/sounds/coin-flip.mp3",
  case_open: "/sounds/case-open.mp3",
  case_reveal: "/sounds/case-reveal.mp3",
  spinner_tick: "/sounds/spinner-tick.mp3",
  plinko_peg: "/sounds/plinko-peg.mp3",
  plinko_land: "/sounds/plinko-land.mp3",
  roulette_spin: "/sounds/roulette-spin.mp3",
  roulette_tick: "/sounds/roulette-tick.mp3",
  button_click: "/sounds/button-click.mp3",
  notification: "/sounds/notification.mp3",
  chat_message: "/sounds/chat-message.mp3",
};

interface UseGameSoundOptions {
  /** Master volume 0-1, default 0.5 */
  volume?: number;
  /** Whether sounds are enabled, default true */
  enabled?: boolean;
}

interface UseGameSoundReturn {
  /** Play a sound effect by name */
  play: (name: SoundName, options?: { volume?: number }) => void;
  /** Stop all currently playing sounds */
  stopAll: () => void;
  /** Set the master volume (0-1) */
  setVolume: (volume: number) => void;
  /** Toggle sound on/off */
  toggle: () => void;
  /** Whether sound is currently enabled */
  enabled: boolean;
}

/**
 * Hook for managing game sound effects.
 *
 * Uses the Web Audio API under the hood. In production, this could be
 * backed by Howler.js for better cross-browser support and sprite sheets.
 *
 * Usage:
 *   const { play } = useGameSound();
 *   play("cashout");
 *   play("win", { volume: 0.8 });
 */
export function useGameSound(options: UseGameSoundOptions = {}): UseGameSoundReturn {
  const { volume: initialVolume = 0.5, enabled: initialEnabled = true } = options;

  const volumeRef = useRef(initialVolume);
  const enabledRef = useRef(initialEnabled);
  const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Preload audio elements
  useEffect(() => {
    if (typeof window === "undefined") return;

    Object.entries(SOUND_PATHS).forEach(([name, path]) => {
      try {
        const audio = new Audio();
        audio.preload = "auto";
        audio.src = path;
        audioCache.current.set(name, audio);
      } catch {
        // Audio file may not exist in dev mode; fail silently
      }
    });

    return () => {
      audioCache.current.forEach((audio) => {
        audio.pause();
        audio.src = "";
      });
      audioCache.current.clear();
    };
  }, []);

  const play = useCallback((name: SoundName, opts?: { volume?: number }) => {
    if (!enabledRef.current) return;

    try {
      const cached = audioCache.current.get(name);
      if (cached) {
        // Clone the audio element so multiple instances can play simultaneously
        const clone = cached.cloneNode(true) as HTMLAudioElement;
        clone.volume = Math.min(1, Math.max(0, (opts?.volume ?? 1) * volumeRef.current));
        clone.play().catch(() => {
          // Autoplay may be blocked; silently ignore
        });
      }
    } catch {
      // Fail silently in development
    }
  }, []);

  const stopAll = useCallback(() => {
    audioCache.current.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
  }, []);

  const setVolume = useCallback((v: number) => {
    volumeRef.current = Math.min(1, Math.max(0, v));
  }, []);

  const toggle = useCallback(() => {
    enabledRef.current = !enabledRef.current;
  }, []);

  return {
    play,
    stopAll,
    setVolume,
    toggle,
    enabled: enabledRef.current,
  };
}
