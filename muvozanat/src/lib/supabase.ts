// ═══════════════════════════════════════════
//  lib/supabase.ts
//  Supabase client + all DB helpers
// ═══════════════════════════════════════════
import { createClient } from '@supabase/supabase-js';
import type { Profile, Habit, HabitLog, Transaction, Goal, Note } from '../types';

// ── Config ─────────────────────────────────
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  || '';
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
export const isSupabaseReady = Boolean(SUPABASE_URL && SUPABASE_ANON);

// ── Auth ────────────────────────────────────
export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithTelegram(telegramId: number, hash: string) {
  // Custom JWT / magic-link approach for Telegram
  // In production: verify Telegram hash on edge function, return session
  const email    = `tg_${telegramId}@muvozanat.app`;
  const password = `tg_${telegramId}_${hash.slice(0, 8)}`;
  try {
    return await signInWithEmail(email, password);
  } catch {
    return await signUpWithEmail(email, password);
  }
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// ── Profiles ────────────────────────────────
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  return data;
}

export async function upsertProfile(profile: Profile): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ ...profile, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function addXP(userId: string, amount: number): Promise<number> {
  const { data } = await supabase
    .from('profiles')
    .select('xp')
    .eq('user_id', userId)
    .single();
  const newXP = (data?.xp || 0) + amount;
  await supabase.from('profiles').update({ xp: newXP }).eq('user_id', userId);
  return newXP;
}

// ── Habits ──────────────────────────────────
export async function getHabits(userId: string): Promise<Habit[]> {
  const { data } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .order('start_time');
  return data || [];
}

export async function createHabit(habit: Omit<Habit, 'id' | 'created_at'>): Promise<Habit> {
  const { data, error } = await supabase
    .from('habits')
    .insert(habit)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function logHabit(log: Omit<HabitLog, 'id'>): Promise<void> {
  await supabase.from('habit_logs').upsert(log);
}

// ── Transactions ────────────────────────────
export async function getTransactions(userId: string): Promise<Transaction[]> {
  const { data } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  return data || [];
}

export async function addTransaction(tx: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .insert(tx)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Goals ────────────────────────────────────
export async function getGoals(userId: string): Promise<Goal[]> {
  const { data } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at');
  return data || [];
}

export async function upsertGoal(goal: Partial<Goal> & { user_id: string }): Promise<Goal> {
  const { data, error } = await supabase
    .from('goals')
    .upsert(goal)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Notes ────────────────────────────────────
export async function getNotes(userId: string): Promise<Note[]> {
  const { data } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  return data || [];
}

export async function saveNote(note: Omit<Note, 'id' | 'created_at'>): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .insert(note)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Leaderboard ──────────────────────────────
export async function getLeaderboard() {
  const { data } = await supabase
    .from('profiles')
    .select('nickname, first_name, xp, badges, level')
    .order('xp', { ascending: false })
    .limit(20);
  return data || [];
}

// ── SQL Schema (run in Supabase SQL Editor) ──
export const SCHEMA_SQL = `
-- profiles
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     TEXT UNIQUE NOT NULL,
  telegram_id BIGINT,
  first_name  TEXT, last_name TEXT, nickname TEXT,
  age         INT,  nation TEXT, country TEXT, region TEXT,
  shior       TEXT, bilim TEXT, choqqi TEXT, tosiq TEXT, ideal_kun TEXT,
  xp          INT DEFAULT 50, streak INT DEFAULT 0, level INT DEFAULT 1,
  badges      TEXT[] DEFAULT ARRAY['Base Camp'],
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- habits
CREATE TABLE IF NOT EXISTS habits (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  icon            TEXT DEFAULT '⭐',
  start_time      TEXT DEFAULT '06:00',
  end_time        TEXT DEFAULT '07:00',
  streak          INT DEFAULT 0,
  completed_today BOOLEAN DEFAULT FALSE,
  color           TEXT DEFAULT '#7c3aed',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- habit_logs
CREATE TABLE IF NOT EXISTS habit_logs (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id   UUID REFERENCES habits(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL,
  date       DATE NOT NULL,
  completed  BOOLEAN DEFAULT FALSE,
  UNIQUE(habit_id, date)
);

-- transactions
CREATE TABLE IF NOT EXISTS transactions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     TEXT NOT NULL,
  type        TEXT CHECK(type IN ('income','expense')),
  amount      NUMERIC NOT NULL,
  description TEXT,
  category    TEXT DEFAULT 'other',
  date        DATE DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- goals
CREATE TABLE IF NOT EXISTS goals (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    TEXT NOT NULL,
  title      TEXT NOT NULL,
  type       TEXT CHECK(type IN ('5yr','1yr','daily')),
  progress   INT DEFAULT 0,
  completed  BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- notes
CREATE TABLE IF NOT EXISTS notes (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    TEXT NOT NULL,
  type       TEXT CHECK(type IN ('lesson','gratitude','free')),
  content    TEXT,
  date       DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits       ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes        ENABLE ROW LEVEL SECURITY;
`;
