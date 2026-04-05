# ⚖️ Muvozanat: Life Navigator v3

> Apple-style minimalist, Dark Mode, Glassmorphism  
> React 18 + TypeScript + Supabase + Telegram Mini App

---

## Loyiha tuzilmasi

```
muvozanat/
├── src/
│   ├── App.tsx                    ← Asosiy komponent (routing + state)
│   ├── main.tsx                   ← Entry point
│   ├── types/index.ts             ← Barcha TypeScript types
│   ├── lib/
│   │   ├── supabase.ts            ← DB client + barcha CRUD helpers
│   │   ├── telegram.ts            ← Telegram WebApp integration
│   │   └── aiMentor.ts            ← Claude AI Mentor logic
│   ├── hooks/
│   │   └── useLocalStore.ts       ← localStorage persistence (demo mode)
│   ├── components/
│   │   ├── AIMentorWidget.tsx     ← Dashboard AI Mentor vidjet
│   │   └── TimeBlockCalendar.tsx  ← 24-soatlik vertikal timeline
│   └── screens/
│       └── OnboardingScreen.tsx   ← 8-bosqichli onboarding
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
└── .env.example
```

---

## Boshlash

### 1. O'rnatish
```bash
cd muvozanat
npm install
```

### 2. .env sozlash
```bash
cp .env.example .env
# .env faylini to'ldiring
```

### 3. Supabase sozlash
1. [supabase.com](https://supabase.com) da yangi loyiha oching
2. `src/lib/supabase.ts` oxiridagi `SCHEMA_SQL` ni Supabase SQL Editor'ga joylashtiring
3. Project URL va anon key ni `.env` ga qo'shing

### 4. Telegram Bot sozlash
```
1. @BotFather'da /newbot
2. Bot tokenini Supabase Dashboard > Edge Functions > Secrets'ga qo'ying:
   TG_BOT_TOKEN=8710801366:...
3. Bot Web App URL'ini o'z domeningizga sozlang
```

### 5. Ishga tushirish
```bash
npm run dev      # Development
npm run build    # Production build
```

---

## Asosiy funksiyalar

### 🔐 Auth tizimi
- **Telegram Mini App**: `window.Telegram.WebApp` orqali auto-login
- **Email/Password**: Supabase Auth orqali
- **Protected Route**: `profile` bo'lmasa → Auth ekraniga yo'naltirish
- **Demo mode**: Supabase bo'lmasa `localStorage` da ishlaydi

### 📋 8-bosqichli Onboarding
| Bosqich | Nima yig'iladi |
|---------|---------------|
| 1 | Ism, Familiya, Nickname |
| 2 | Yosh, Millat, Davlat, Viloyat (14 ta) |
| 3 | Hayotiy shior (4 variant + custom) |
| 4 | O'rganish sohasi (6 variant) |
| 5 | 1 yillik maqsad (erkin matn) |
| 6 | Asosiy to'siq (5 variant) |
| 7 | Ideal kun (erkin matn) |
| 8 | Tasdiq va saqlash |

**Natija**: `+50 XP` + `Base Camp` nishoni + `profiles` jadvalga yozish

### 🤖 AI Mentor Widget
- Dashboard yuqori qismida minimal doim ko'rinadi
- **Kontekst**: `shior`, `choqqi`, `tosiq` va bugungi odat holati
- **Claude API** orqali shaxsiy motivatsiya
- **Interactive chat**: foydalanuvchi savol bera oladi
- **Fallback**: API bo'lmasa local mantiq ishlaydi
- Har odat bajarilib/bajarilmasa avtomatik yangilanadi

### 📅 Time-Blocking Calendar
- **Vertikal 24-soatlik timeline** (3:00 → 00:00)
- Odatlar aniq **vaqt bloki** sifatida ko'rsatiladi
- **Hozirgi vaqt** qizil chiziq bilan belgilanadi
- `● Hozir` belgisi joriy vaqtdagi odatni ko'rsatadi
- `kechikdi` belgisi o'tib ketgan va bajarilmagan odatlar uchun
- **Vaqt tahrirlash** modal orqali

### 🛡️ Odatlar
- `start_time` va `end_time` bilan bog'langan
- Streak hisoblash
- AI Mentor shaxsiy tanbeh beradi

### 💸 Moliya
- Daromad/Xarajat qo'shish
- Jami va qoldiq hisoblash
- Jamg'arma maqsadlari

### 🏆 Leaderboard
- Real-time Supabase orqali
- Neon gold/silver dizayn
- Foydalanuvchining o'z o'rni

---

## Supabase Edge Function (Telegram Auth)

```typescript
// supabase/functions/verify-telegram/index.ts
import { createHmac } from 'crypto';

Deno.serve(async (req) => {
  const { initData } = await req.json();
  const BOT_TOKEN = Deno.env.get('TG_BOT_TOKEN');
  
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  params.delete('hash');
  
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  
  const secretKey = createHmac('sha256', 'WebAppData')
    .update(BOT_TOKEN!).digest();
  const computed = createHmac('sha256', secretKey)
    .update(dataCheckString).digest('hex');
  
  if (computed !== hash) {
    return new Response(JSON.stringify({ error: 'Invalid' }), { status: 401 });
  }
  return new Response(JSON.stringify({ valid: true }));
});
```

---

## XP Tizimi

| Harakat | XP |
|---------|-----|
| Ro'yxatdan o'tish | +50 |
| Odat bajarish | +15 |
| Vazifa bajarish | +10 |
| Qayd saqlash | +10 |
| Maqsad qo'shish | +20 |
| Moliya yangilash | +5 |
| AI bilan suhbat | +5 |

| XP | Daraja |
|----|--------|
| 0–199 | Beginner |
| 200–499 | Starter |
| 500–999 | Runner |
| 1000–1999 | Climber |
| 2000–3499 | Alpinist |
| 3500–5999 | Master |
| 6000+ | Legend |

---

## Xavfsizlik eslatmasi

> **Bot Token (`TG_BOT_TOKEN`) hech qachon frontend kodida bo'lmasin!**  
> Uni faqat Supabase Edge Functions'da `Deno.env.get('TG_BOT_TOKEN')` orqali oling.
> 
> **Anthropic API Key** ham server-side bo'lishi kerak.  
> Production'da Supabase Edge Function orqali proxy qiling.
