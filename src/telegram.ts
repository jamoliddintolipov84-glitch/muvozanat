// ═══════════════════════════════════════════
//  lib/telegram.ts
//  Telegram Mini App WebApp integration
// ═══════════════════════════════════════════
import type { TelegramUser } from './types';

// Telegram Bot Token is ONLY used server-side (Supabase Edge Function).
// Never expose it in frontend code.
// Use: VITE_TG_BOT_TOKEN in .env → only for reference / edge fn calls

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready(): void;
        expand(): void;
        close(): void;
        initData: string;
        initDataUnsafe: {
          user?: TelegramUser;
          hash: string;
          auth_date: number;
        };
        colorScheme: 'light' | 'dark';
        themeParams: Record<string, string>;
        MainButton: {
          text: string;
          show(): void;
          hide(): void;
          onClick(fn: () => void): void;
        };
        BackButton: {
          show(): void;
          hide(): void;
          onClick(fn: () => void): void;
        };
        HapticFeedback: {
          impactOccurred(style: 'light' | 'medium' | 'heavy'): void;
          notificationOccurred(type: 'error' | 'success' | 'warning'): void;
          selectionChanged(): void;
        };
        showAlert(message: string, callback?: () => void): void;
        showConfirm(message: string, callback: (confirmed: boolean) => void): void;
        setHeaderColor(color: string): void;
        setBackgroundColor(color: string): void;
      };
    };
  }
}

export const twa = () => window.Telegram?.WebApp;
export const isTelegramApp = () => Boolean(window.Telegram?.WebApp?.initData);

export function initTelegramApp() {
  const wa = twa();
  if (!wa) return null;
  wa.ready();
  wa.expand();
  try {
    wa.setHeaderColor('#0a0a0f');
    wa.setBackgroundColor('#0a0a0f');
  } catch { /* older SDK versions */ }
  return wa;
}

export function getTelegramUser(): TelegramUser | null {
  const wa = twa();
  if (!wa?.initDataUnsafe?.user) return null;
  return wa.initDataUnsafe.user;
}

export function getTelegramInitData(): string {
  return twa()?.initData || '';
}

export function haptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'light') {
  const wa = twa();
  if (!wa) return;
  if (type === 'success' || type === 'error') {
    wa.HapticFeedback.notificationOccurred(type);
  } else {
    wa.HapticFeedback.impactOccurred(type);
  }
}

export function showTelegramAlert(msg: string) {
  const wa = twa();
  if (wa) wa.showAlert(msg);
  else alert(msg);
}

// ── Verify Telegram hash (call from Supabase Edge Function) ──
// This is the server-side verification logic for reference:
export const VERIFY_EDGE_FN_EXAMPLE = `
// supabase/functions/verify-telegram/index.ts
import { createHmac } from 'crypto';

Deno.serve(async (req) => {
  const { initData } = await req.json();
  const BOT_TOKEN = Deno.env.get('TG_BOT_TOKEN');   // set in Supabase dashboard
  
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  params.delete('hash');
  
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => k + '=' + v)
    .join('\\n');
  
  const secretKey = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const computedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  
  if (computedHash !== hash) {
    return new Response(JSON.stringify({ error: 'Invalid hash' }), { status: 401 });
  }
  
  return new Response(JSON.stringify({ valid: true }), { status: 200 });
});
`;
