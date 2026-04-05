// ═══════════════════════════════════════════
//  MUVOZANAT — Global TypeScript Types
// ═══════════════════════════════════════════

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
}

export interface Profile {
  id?: string;
  user_id: string;
  telegram_id?: number;
  first_name: string;
  last_name: string;
  nickname: string;
  age: number;
  nation: string;
  country: string;
  region: string;
  // Personality analysis
  shior: string;        // motto
  bilim: string;        // learning field
  choqqi: string;       // 1-year goal
  tosiq: string;        // weakness/obstacle
  ideal_kun: string;    // ideal day
  // Stats
  xp: number;
  streak: number;
  badges: string[];
  level: number;
  created_at?: string;
  updated_at?: string;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  start_time: string;   // "HH:MM"
  end_time: string;     // "HH:MM"
  streak: number;
  completed_today: boolean;
  color: string;
  created_at?: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  date: string;         // "YYYY-MM-DD"
  completed: boolean;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  date: string;
  created_at?: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  type: '5yr' | '1yr' | 'daily';
  progress: number;     // 0-100
  completed: boolean;
  created_at?: string;
}

export interface Note {
  id: string;
  user_id: string;
  type: 'lesson' | 'gratitude' | 'free';
  content: string;
  date: string;
  created_at?: string;
}

export interface AIMessage {
  role: 'mentor' | 'user';
  text: string;
  timestamp: string;
}

export interface TimeBlock {
  habit_id: string;
  habit_name: string;
  icon: string;
  color: string;
  start_time: string;
  end_time: string;
  completed: boolean;
}

export type Screen =
  | 'loading'
  | 'auth'
  | 'onboarding'
  | 'ob-success'
  | 'home'
  | 'goals'
  | 'finance'
  | 'habits'
  | 'calendar'
  | 'notes'
  | 'leaderboard'
  | 'profile';

export interface AppState {
  screen: Screen;
  user: TelegramUser | null;
  profile: Profile | null;
  habits: Habit[];
  transactions: Transaction[];
  goals: Goal[];
  notes: Note[];
  aiMessages: AIMessage[];
  todayXP: number;
}
