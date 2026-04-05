// ═══════════════════════════════════════════
//  lib/aiMentor.ts
//  AI Mentor — powered by Claude API
// ═══════════════════════════════════════════
import type { Profile, Habit } from '../types';

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

// In production: proxy through Supabase Edge Function to hide API key
const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_KEY || '';

// ── Motivational message types ───────────────
type MentorContext = {
  profile: Profile;
  habits: Habit[];
  completedCount: number;
  totalHabits: number;
  currentTime: string;
  dayOfWeek: string;
  streak: number;
};

// ── Build system prompt ──────────────────────
function buildSystemPrompt(ctx: MentorContext): string {
  const { profile, completedCount, totalHabits, streak } = ctx;
  return `Sen "Muvozanat" ilovasining AI Mentorisizn. 
Foydalanuvchi haqida ma'lumot:
- Ism: ${profile.first_name} ${profile.last_name} (@${profile.nickname})
- Shior: "${profile.shior}"
- O'rganayotgan soha: ${profile.bilim}
- 1 yillik maqsad: "${profile.choqqi}"
- Asosiy to'siq: "${profile.tosiq}"
- Ideal kun: "${profile.ideal_kun}"
- Joriy streak: ${streak} kun
- Bugun bajariлgan odatlar: ${completedCount} / ${totalHabits}

Xarakter:
- Qattiqqo'l lekin mehribon mentor
- O'zbek tilida, lekin professional
- Qisqa va lo'nda (max 3 jumla)
- Foydalanuvchining shaxsiy ma'lumotlaridan foydalanib, ANIQ va SHAXSIY gap qil
- Iltifotli emas, haqiqiy — chunki chinakam do'st shunday gapiradi
- Emoji ishlatma

Javobingni faqat motivatsiya matni sifatida ber, boshqa hech narsa yozma.`;
}

// ── Generate daily motivation ────────────────
export async function getDailyMotivation(ctx: MentorContext): Promise<string> {
  const { profile, completedCount, totalHabits, streak, currentTime } = ctx;
  
  const userPrompt = completedCount === totalHabits
    ? `Bugun barcha ${totalHabits} ta odat bajarildi. ${streak} kunlik streak. Maqsadiga mos eslatma ber.`
    : completedCount === 0
    ? `Vaqt ${currentTime}. Hali birorta odat bajarilmadi. Uning "${profile.tosiq}" to'sig'ini hisobga olib tanbeh ber.`
    : `${completedCount}/${totalHabits} odat bajarildi. Qolganlar uchun turtki ber.`;

  // Try Claude API
  if (ANTHROPIC_KEY) {
    try {
      const res = await fetch(ANTHROPIC_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 200,
          system: buildSystemPrompt(ctx),
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text;
      if (text) return text.trim();
    } catch (e) {
      console.warn('AI API error, using local fallback', e);
    }
  }

  // ── Local fallback messages ─────────────────
  return getLocalMentorMessage(ctx);
}

function getLocalMentorMessage(ctx: MentorContext): string {
  const { profile, completedCount, totalHabits, streak } = ctx;
  const name = profile.first_name;

  if (completedCount === totalHabits && totalHabits > 0) {
    return `${name}, bugun barcha odatlarni bajarding. "${profile.shior}" — bu so'zlar emas, harakat. ${streak} kunlik streak davom etmoqda.`;
  }
  if (completedCount === 0) {
    const hour = parseInt(ctx.currentTime.split(':')[0]);
    if (hour < 10) return `${name}, ertalab — eng qimmatli vaqt. "${profile.tosiq}" seni to'xtatmasidan oldin birinchi odatni boshlang.`;
    if (hour < 14) return `${name}, tush paytiga kelib hali birorta odat bajarilmadi. "${profile.choqqi}" — bu narsa o'z-o'zidan bo'lmaydi.`;
    return `${name}, kech bo'lmoqda. Lekin hali imkon bor. Bir odatni bajar — faqat bittasini.`;
  }
  if (completedCount < totalHabits / 2) {
    return `${name}, ${completedCount} ta bajarildi. "${profile.tosiq}" seni sekinlashtirmoqda — buni o'zing bilasan. Qolganlarini tugatish vaqti.`;
  }
  return `${name}, ${completedCount}/${totalHabits}. Deyarli tamom. "${profile.shior}" — bu faqat yaxshi kunlarda emas, har kuni amal qilinadigan narsa.`;
}

// ── Interactive AI chat ──────────────────────
export async function askMentor(
  question: string,
  ctx: MentorContext
): Promise<string> {
  if (ANTHROPIC_KEY) {
    try {
      const res = await fetch(ANTHROPIC_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          system: buildSystemPrompt(ctx),
          messages: [{ role: 'user', content: question }],
        }),
      });
      const data = await res.json();
      return data.content?.[0]?.text?.trim() || getFallbackAnswer(question, ctx);
    } catch {
      return getFallbackAnswer(question, ctx);
    }
  }
  return getFallbackAnswer(question, ctx);
}

function getFallbackAnswer(question: string, ctx: MentorContext): string {
  const { profile } = ctx;
  const q = question.toLowerCase();
  if (q.includes('motivat') || q.includes('ilhom'))
    return `${profile.first_name}, "${profile.shior}" — bu sening javobingdir. Bugun bitta kichik qadamni qo'y.`;
  if (q.includes('maqsad') || q.includes('goal'))
    return `Maqsad: "${profile.choqqi}". Bugun shu maqsadga 1% yaqinlash — ko'p emas, faqat 1%.`;
  if (q.includes('odat') || q.includes('habit'))
    return `Odat kuch talab etmaydi — u tizim talab etadi. Vaqt bloklaring to'g'ri sozlanganmi?`;
  return `${profile.first_name}, savol yaxshi. Lekin javob senda — "${profile.shior}" deb aytganding.`;
}

// ── Habit-specific reminder ──────────────────
export function getHabitReminder(habitName: string, profile: Profile, isOverdue: boolean): string {
  if (isOverdue) {
    return `"${habitName}" vaqti o'tdi. ${profile.first_name}, "${profile.tosiq}" sababini aytma — hozir qilgin.`;
  }
  return `"${habitName}" vaqti keldi. Bu ${profile.choqqi} maqsadingga to'g'ridan-to'g'ri bog'liq.`;
}
