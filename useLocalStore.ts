// ═══════════════════════════════════════════
//  hooks/useLocalStore.ts
//  LocalStorage persistence (demo mode)
// ═══════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react';

export function useLocalStore<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const set = useCallback((newValue: T | ((prev: T) => T)) => {
    setValue(prev => {
      const next = typeof newValue === 'function'
        ? (newValue as (p: T) => T)(prev)
        : newValue;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [key]);

  const clear = useCallback(() => {
    localStorage.removeItem(key);
    setValue(defaultValue);
  }, [key, defaultValue]);

  return [value, set, clear] as const;
}

// ── Composite app store ──────────────────────
import type { Profile, Habit, Transaction, Goal, Note, AIMessage } from '../types';

export function useAppStore() {
  const [profile, setProfile, clearProfile] = useLocalStore<Profile | null>('mvz_profile', null);
  const [habits,  setHabits]               = useLocalStore<Habit[]>('mvz_habits', []);
  const [transactions, setTransactions]    = useLocalStore<Transaction[]>('mvz_tx', []);
  const [goals,   setGoals]                = useLocalStore<Goal[]>('mvz_goals', []);
  const [notes,   setNotes]                = useLocalStore<Note[]>('mvz_notes', []);
  const [aiLog,   setAiLog]                = useLocalStore<AIMessage[]>('mvz_ai', []);

  const updateXP = useCallback((amount: number) => {
    setProfile(p => p ? { ...p, xp: (p.xp || 0) + amount } : p);
  }, [setProfile]);

  const addBadge = useCallback((badge: string) => {
    setProfile(p => {
      if (!p) return p;
      if (p.badges?.includes(badge)) return p;
      return { ...p, badges: [...(p.badges || []), badge] };
    });
  }, [setProfile]);

  const resetDaily = useCallback(() => {
    setHabits(hs => hs.map(h => ({ ...h, completed_today: false })));
  }, [setHabits]);

  return {
    profile, setProfile, clearProfile,
    habits,  setHabits,
    transactions, setTransactions,
    goals,   setGoals,
    notes,   setNotes,
    aiLog,   setAiLog,
    updateXP, addBadge, resetDaily,
  };
}
