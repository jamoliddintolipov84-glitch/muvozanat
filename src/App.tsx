// ═══════════════════════════════════════════
//  App.tsx — Muvozanat Life Navigator v3
// ═══════════════════════════════════════════
import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Profile, Habit, Transaction, Goal, Note, AIMessage, Screen, TelegramUser } from './types';

import AIMentorWidget      from './AIMentorWidget'; 
import TimeBlockCalendar   from './TimeBlockCalendar';
import OnboardingScreen    from './OnboardingScreen';
import { useAppStore }     from './useLocalStore';

import {
  initTelegramApp, getTelegramUser, isTelegramApp, haptic,
} from './telegram';

import {
  isSupabaseReady, getProfile, upsertProfile, getHabits,
  createHabit, getTransactions, addTransaction as dbAddTransaction,
  getGoals, upsertGoal, getNotes, saveNote as dbSaveNote,
  getLeaderboard, logHabit, addXP as dbAddXP,
  signInWithEmail, signUpWithEmail, signInWithTelegram,
  getSession,
} from './supabase';

// ── Helpers ──────────────────────────────────
const today = () => new Date().toISOString().split('T')[0];
const uid = () => Math.random().toString(36).slice(2, 10);
const getLevel = (xp: number) => {
  if (xp < 200)  return { num: 1, title: 'Beginner' };
  if (xp < 500)  return { num: 2, title: 'Starter' };
  if (xp < 1000) return { num: 3, title: 'Runner' };
  if (xp < 2000) return { num: 4, title: 'Climber' };
  if (xp < 3500) return { num: 5, title: 'Alpinist' };
  if (xp < 6000) return { num: 6, title: 'Master' };
  return { num: 7, title: 'Legend' };
};

const HABIT_COLORS = ['#7c3aed','#1d9e75','#2563eb','#d97706','#dc2626','#0891b2'];

// ── Global styles ────────────────────────────
const globalCSS = `
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
    background: #0a0a0f; color: #fff; min-height:100vh; overflow-x:hidden;
  }
  ::-webkit-scrollbar { width: 0; }
  input, textarea, select, button { font-family: inherit; }
  @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
  @keyframes fadeUp   { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes scaleIn  { from{opacity:0;transform:scale(0.92)} to{opacity:1;transform:scale(1)} }
  @keyframes flicker  { 0%,100%{transform:scale(1) rotate(-1deg)} 50%{transform:scale(1.05) rotate(1deg)} }
  @keyframes pulse2   { 0%,100%{opacity:1} 50%{opacity:0.5} }
  @keyframes spin     { to{transform:rotate(360deg)} }
`;

// ── Shared UI primitives ─────────────────────
export const Inp: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input {...props} style={{
    width:'100%', background:'rgba(255,255,255,0.06)',
    border:'1px solid rgba(255,255,255,0.1)', borderRadius:12,
    padding:'12px 16px', color:'#fff', fontSize:14,
    outline:'none', marginBottom:10, boxSizing:'border-box',
    transition:'border-color 0.2s',
    ...(props.style||{}),
  }} />
);

const BtnPrimary: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { gradient?: string }> = ({
  gradient, children, ...rest
}) => (
  <button {...rest} style={{
    width:'100%', padding:'13px 16px', borderRadius:14, border:'none',
    background: gradient || 'linear-gradient(135deg,#7c3aed,#5b21b6)',
    color:'#fff', fontSize:15, fontWeight:600, cursor:'pointer',
    transition:'all 0.2s', ...(rest.style||{}),
  }}>{children}</button>
);

const Glass: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{
    background:'rgba(255,255,255,0.05)',
    border:'1px solid rgba(255,255,255,0.1)',
    borderRadius:20, backdropFilter:'blur(20px)',
    ...(style||{}),
  }}>{children}</div>
);

const SectionCard: React.FC<{ title?: string; children: React.ReactNode; style?: React.CSSProperties }> = ({ title, children, style }) => (
  <div style={{
    background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)',
    borderRadius:18, padding:16, marginBottom:14, ...(style||{}),
  }}>
    {title && <div style={{ fontSize:14, fontWeight:600, marginBottom:12, color:'rgba(255,255,255,0.9)' }}>{title}</div>}
    {children}
  </div>
);

// ── Toast ─────────────────────────────────────
const Toast: React.FC<{ msg: string; show: boolean }> = ({ msg, show }) => (
  <div style={{
    position:'fixed', bottom:40, left:'50%', transform:`translateX(-50%) translateY(${show ? -4 : 8}px)`,
    background:'rgba(10,10,15,0.95)', border:'1px solid rgba(251,191,36,0.4)',
    padding:'10px 24px', borderRadius:24, fontSize:13, fontWeight:600,
    color:'#fbbf24', zIndex:9999, transition:'all 0.3s cubic-bezier(0.16,1,0.3,1)',
    pointerEvents:'none', whiteSpace:'nowrap', backdropFilter:'blur(20px)',
    opacity: show ? 1 : 0,
  }}>{msg}</div>
);

// ── Main App Component ───────────────────────
export default function App() {
  const store = useAppStore();
  const [screen, setScreen] = useState<Screen>('loading');
  const [tgUser, setTgUser] = useState<TelegramUser | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPass,  setAuthPass]  = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [toast, setToast]   = useState({ msg: '', show: false });
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [noteTab, setNoteTab] = useState<'lesson'|'gratitude'|'free'>('lesson');
  const [lessonText, setLessonText] = useState('');
  const [gratitude, setGratitude] = useState(['','','']);
  const [freeNote,  setFreeNote]  = useState('');
  const [newGoal5,  setNewGoal5]  = useState('');
  const [newGoal1,  setNewGoal1]  = useState('');
  const [newTask,   setNewTask]   = useState('');
  const [finAmt,    setFinAmt]    = useState('');
  const [finDesc,   setFinDesc]   = useState('');
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitIcon, setNewHabitIcon] = useState('');
  const [newHabitStart, setNewHabitStart] = useState('06:00');
  const [newHabitEnd,   setNewHabitEnd]   = useState('07:00');
  const [sgName, setSgName] = useState('');
  const [sgAmt,  setSgAmt]  = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  // ── Toast helper ─────────────────────────────
  const showToast = useCallback((msg: string, xp = 0) => {
    setToast({ msg, show: true });
    if (xp > 0) {
      store.updateXP(xp);
      if (isSupabaseReady && store.profile?.user_id) {
        dbAddXP(store.profile.user_id, xp).catch(() => {});
      }
    }
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, show: false })), 2400);
    haptic('light');
  }, [store]);

  // ── Navigate ──────────────────────────────────
  const go = useCallback((s: Screen) => {
    if (!store.profile && !['auth','onboarding','ob-success','loading'].includes(s)) {
      setScreen('auth'); return;
    }
    setScreen(s);
    window.scrollTo(0, 0);
    if (s === 'leaderboard') loadLeaderboard();
  }, [store.profile]);

  // ── Load leaderboard ──────────────────────────
  const loadLeaderboard = async () => {
    if (isSupabaseReady) {
      const data = await getLeaderboard();
      setLeaderboard(data);
    } else {
      setLeaderboard([
        { nickname:'Jahongir B.', xp:4200, badges:['Master'] },
        { nickname:'Sarvar M.',   xp:3800, badges:['Alpinist'] },
        { nickname:'Zafar Q.',    xp:3100, badges:['Runner'] },
      ]);
    }
  };

  // ── Init ──────────────────────────────────────
  useEffect(() => {
    // Inject global CSS
    const style = document.createElement('style');
    style.textContent = globalCSS;
    document.head.appendChild(style);

    // Init Telegram
    const wa = initTelegramApp();
    const tg = getTelegramUser();
    if (tg) setTgUser(tg);

    // Auth check
    const init = async () => {
      if (isSupabaseReady) {
        const session = await getSession();
        if (session?.user) {
          const profile = await getProfile(session.user.id);
          if (profile) {
            store.setProfile(profile);
            const habits = await getHabits(profile.user_id);
            store.setHabits(habits);
            setScreen('home'); return;
          } else {
            setScreen('onboarding'); return;
          }
        }
        // Telegram auto-login
        if (tg) {
          try {
            await signInWithTelegram(tg.id, 'demo');
            const session2 = await getSession();
            if (session2?.user) {
              const profile = await getProfile(session2.user.id);
              if (profile) { store.setProfile(profile); setScreen('home'); return; }
            }
          } catch {}
          setScreen('onboarding'); return;
        }
      }
      // Demo mode: check localStorage
      if (store.profile) { setScreen('home'); }
      else if (tg)       { setScreen('onboarding'); }
      else               { setScreen('auth'); }
    };

    setTimeout(() => init(), 600);
  }, []);

  // ── Email Auth ────────────────────────────────
  const handleEmailAuth = async () => {
    if (!authEmail.trim()) { setAuthError('Email kiriting'); return; }
    setAuthLoading(true); setAuthError('');
    try {
      if (isSupabaseReady) {
        let session;
        try { session = await signInWithEmail(authEmail, authPass); }
        catch { session = await signUpWithEmail(authEmail, authPass); }
        if (session?.user) {
          const profile = await getProfile(session.user.id);
          if (profile) { store.setProfile(profile); go('home'); }
          else go('onboarding');
        }
      } else {
        // Demo
        if (store.profile) go('home');
        else go('onboarding');
      }
    } catch (e: any) {
      setAuthError(e.message || 'Xato yuz berdi');
    } finally {
      setAuthLoading(false);
    }
  };

  // ── Onboarding complete ───────────────────────
  const handleOnboardingComplete = async (profileData: Omit<Profile,'id'|'created_at'|'updated_at'>) => {
    let saved = profileData;
    if (isSupabaseReady) {
      try { saved = (await upsertProfile(profileData)) || profileData; } catch {}
    }
    store.setProfile(saved as Profile);
    // Seed default habits
    const defaultHabits: Omit<Habit,'id'|'created_at'>[] = [
      { user_id:saved.user_id, name:"Uyg'onish",     icon:'🌅', start_time:'03:00', end_time:'03:30', streak:0, completed_today:false, color:HABIT_COLORS[0] },
      { user_id:saved.user_id, name:'Meditatsiya',   icon:'🧘', start_time:'03:30', end_time:'04:00', streak:0, completed_today:false, color:HABIT_COLORS[1] },
      { user_id:saved.user_id, name:'Sport',         icon:'💪', start_time:'06:00', end_time:'07:00', streak:0, completed_today:false, color:HABIT_COLORS[2] },
      { user_id:saved.user_id, name:'Kitob o\'qish', icon:'📚', start_time:'20:00', end_time:'21:00', streak:0, completed_today:false, color:HABIT_COLORS[3] },
      { user_id:saved.user_id, name:'Ingliz tili',   icon:'🗣️', start_time:'07:00', end_time:'08:00', streak:0, completed_today:false, color:HABIT_COLORS[4] },
    ];
    if (isSupabaseReady) {
      const created = await Promise.all(defaultHabits.map(h => createHabit(h).catch(() => null)));
      store.setHabits(created.filter(Boolean) as Habit[]);
    } else {
      store.setHabits(defaultHabits.map(h => ({ ...h, id: uid() })));
    }
    store.addBadge('Base Camp');
    setScreen('ob-success');
  };

  // ── Habit toggle ──────────────────────────────
  const toggleHabit = useCallback((habitId: string) => {
    store.setHabits(hs => hs.map(h => {
      if (h.id !== habitId) return h;
      const done = !h.completed_today;
      if (isSupabaseReady && done) {
        logHabit({ habit_id:h.id, user_id:h.user_id, date:today(), completed:true }).catch(()=>{});
      }
      return { ...h, completed_today: done, streak: done ? h.streak + 1 : Math.max(0, h.streak - 1) };
    }));
    showToast('+15 XP! Odat bajarildi 🔥', 15);
    haptic('success');
  }, [store, showToast]);

  const editHabit = useCallback((updated: Habit) => {
    store.setHabits(hs => hs.map(h => h.id === updated.id ? updated : h));
    showToast('Vaqt saqlandi ✓', 0);
  }, [store, showToast]);

  // ── Finance ───────────────────────────────────
  const addTransaction = async (type: 'income'|'expense') => {
    const amount = parseFloat(finAmt);
    if (!amount || isNaN(amount)) return;
    const tx: Transaction = {
      id: uid(), user_id: store.profile!.user_id, type, amount,
      description: finDesc || (type==='income'?'Daromad':'Xarajat'),
      category: 'other', date: today(),
    };
    if (isSupabaseReady) {
      try { const saved = await dbAddTransaction(tx); store.setTransactions(txs => [saved, ...txs]); }
      catch { store.setTransactions(txs => [tx, ...txs]); }
    } else {
      store.setTransactions(txs => [tx, ...txs]);
    }
    setFinAmt(''); setFinDesc('');
    showToast('+5 XP! Moliya yangilandi 💰', 5);
  };

  // ── Goals ─────────────────────────────────────
  const addGoal = async (type: '5yr'|'1yr', title: string) => {
    if (!title.trim() || !store.profile) return;
    const goal: Goal = { id:uid(), user_id:store.profile.user_id, title, type, progress:0, completed:false };
    if (isSupabaseReady) {
      try { const saved = await upsertGoal(goal); store.setGoals(gs => [...gs, saved]); }
      catch { store.setGoals(gs => [...gs, goal]); }
    } else {
      store.setGoals(gs => [...gs, goal]);
    }
    showToast('+20 XP! Maqsad qo\'shildi 🎯', 20);
  };

  // ── Add Habit ─────────────────────────────────
  const addHabit = async () => {
    if (!newHabitName.trim() || !store.profile) return;
    const h: Habit = {
      id: uid(), user_id: store.profile.user_id,
      name: newHabitName.trim(), icon: newHabitIcon || '⭐',
      start_time: newHabitStart, end_time: newHabitEnd,
      streak:0, completed_today:false,
      color: HABIT_COLORS[store.habits.length % HABIT_COLORS.length],
    };
    if (isSupabaseReady) {
      try { const saved = await createHabit(h); store.setHabits(hs => [...hs, saved]); }
      catch { store.setHabits(hs => [...hs, h]); }
    } else {
      store.setHabits(hs => [...hs, h]);
    }
    setNewHabitName(''); setNewHabitIcon(''); setNewHabitStart('06:00'); setNewHabitEnd('07:00');
    showToast('+10 XP! Yangi odat qo\'shildi 🛡️', 10);
  };

  // ── Save Note ─────────────────────────────────
  const saveCurrentNote = async () => {
    if (!store.profile) return;
    const content = noteTab==='lesson' ? lessonText : noteTab==='gratitude' ? gratitude.join('\n') : freeNote;
    if (!content.trim()) return;
    const note: Note = { id:uid(), user_id:store.profile.user_id, type:noteTab, content, date:today() };
    if (isSupabaseReady) {
      try { const saved = await dbSaveNote(note); store.setNotes(ns => [saved, ...ns]); }
      catch { store.setNotes(ns => [note, ...ns]); }
    } else {
      store.setNotes(ns => [note, ...ns]);
    }
    showToast('+10 XP! Qayd saqlandi 📝', 10);
  };

  // ── Computed values ───────────────────────────
  const profile  = store.profile;
  const xp       = profile?.xp ?? 0;
  const level    = getLevel(xp);
  const initials = profile ? ((profile.first_name||'A')[0] + (profile.last_name||'')[0]).toUpperCase() : 'A';
  const streak   = profile?.streak ?? 0;
  const totalInc = store.transactions.filter(t=>t.type==='income').reduce((a,b)=>a+b.amount,0);
  const totalExp = store.transactions.filter(t=>t.type==='expense').reduce((a,b)=>a+b.amount,0);
  const completedH = store.habits.filter(h=>h.completed_today).length;
  const goals5yr   = store.goals.filter(g=>g.type==='5yr');
  const goals1yr   = store.goals.filter(g=>g.type==='1yr');

  const myLeaderRank = (() => {
    if (!profile) return '—';
    const sorted = [...leaderboard, { nickname:profile.nickname, xp }].sort((a,b)=>b.xp-a.xp);
    const idx = sorted.findIndex(e => e.nickname === profile.nickname);
    return idx >= 0 ? `#${idx+1}` : '—';
  })();

  // ══════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════

  // ── Loading ───────────────────────────────────
  if (screen === 'loading') return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
      <div style={{ width:40, height:40, borderRadius:'50%', border:'3px solid rgba(124,58,237,0.2)', borderTopColor:'#7c3aed', animation:'spin 0.8s linear infinite' }} />
      <p style={{ fontSize:14, color:'rgba(255,255,255,0.4)' }}>Yuklanmoqda...</p>
    </div>
  );

  // ── Onboarding ────────────────────────────────
  if (screen === 'onboarding') return (
    <>
      <BgOrbs />
      <OnboardingScreen telegramUser={tgUser} onComplete={handleOnboardingComplete} />
      <Toast msg={toast.msg} show={toast.show} />
    </>
  );

  // ── Onboarding Success ────────────────────────
  if (screen === 'ob-success') return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:24, textAlign:'center' }}>
      <BgOrbs />
      <div style={{ maxWidth:360, animation:'scaleIn 0.5s cubic-bezier(0.16,1,0.3,1)' }}>
        <div style={{ fontSize:72, marginBottom:20, animation:'pulse2 1s ease-in-out 3' }}>🏕️</div>
        <h2 style={{ fontSize:28, fontWeight:700, letterSpacing:-0.5, marginBottom:8 }}>
          Xush kelibsiz, {profile?.first_name || 'Do\'stim'}!
        </h2>
        <p style={{ fontSize:15, color:'rgba(255,255,255,0.5)', lineHeight:1.6, marginBottom:24 }}>
          Profilingiz muvaffaqiyatli yaratildi. Hayotingizni boshqarish vaqti!
        </p>
        <div style={{ background:'rgba(251,191,36,0.1)', border:'1px solid rgba(251,191,36,0.25)', borderRadius:16, padding:16, marginBottom:16, display:'flex', alignItems:'center', justifyContent:'center', gap:12 }}>
          <div style={{ fontSize:36, fontWeight:800, color:'#fbbf24' }}>+50</div>
          <div style={{ textAlign:'left' }}>
            <strong style={{ display:'block', fontSize:15 }}>XP Mukofoti</strong>
            <span style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>Ro'yxatdan o'tganlik uchun</span>
          </div>
        </div>
        <div style={{ background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.2)', borderRadius:14, padding:14, marginBottom:24, display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ fontSize:32 }}>⛺</div>
          <div style={{ textAlign:'left' }}>
            <strong style={{ display:'block', fontSize:15, color:'#fbbf24' }}>Base Camp</strong>
            <span style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>Birinchi nishon — Sayohat boshlandi!</span>
          </div>
        </div>
        <BtnPrimary style={{ fontSize:16, padding:16 }} onClick={() => { haptic('success'); go('home'); }}>
          Dashboardga o'tish →
        </BtnPrimary>
      </div>
    </div>
  );

  // ── Auth ──────────────────────────────────────
  if (screen === 'auth') return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <BgOrbs />
      <div style={{ width:'100%', maxWidth:400, animation:'scaleIn 0.5s cubic-bezier(0.16,1,0.3,1)' }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ width:80, height:80, borderRadius:24, background:'linear-gradient(135deg,#7c3aed,#1d9e75)', margin:'0 auto 16px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, boxShadow:'0 20px 60px rgba(124,58,237,0.3)' }}>⚖️</div>
          <h1 style={{ fontSize:26, fontWeight:700, letterSpacing:-0.5 }}>Muvozanat</h1>
          <p style={{ fontSize:14, color:'rgba(255,255,255,0.4)', marginTop:6 }}>Life Navigator — Hayotingizni boshqaring</p>
        </div>
        <Glass style={{ padding:24 }}>
          {isTelegramApp() && tgUser && (
            <button onClick={() => { haptic('medium'); go('onboarding'); }} style={{
              width:'100%', padding:14, borderRadius:14, border:'none',
              background:'linear-gradient(135deg,#0088cc,#006699)',
              color:'#fff', fontSize:15, fontWeight:600, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:16,
            }}>
              <TgIcon /> {tgUser.first_name} sifatida kirish
            </button>
          )}
          {authError && (
            <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:10, padding:'10px 14px', marginBottom:12, fontSize:13, color:'#f87171' }}>{authError}</div>
          )}
          <Inp type="email"    value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="Email manzil" />
          <Inp type="password" value={authPass}  onChange={e=>setAuthPass(e.target.value)}  placeholder="Parol" style={{ marginBottom:12 }}
            onKeyDown={e=>e.key==='Enter' && handleEmailAuth()} />
          <BtnPrimary onClick={handleEmailAuth} disabled={authLoading}>
            {authLoading ? 'Kirish...' : 'Kirish / Ro\'yxatdan o\'tish'}
          </BtnPrimary>
          <div style={{ textAlign:'center', fontSize:12, color:'rgba(255,255,255,0.3)', marginTop:14, lineHeight:1.5 }}>
            Demo uchun istalgan email/parol kiriting.<br/>
            Supabase ulanganda real auth ishlaydi.
          </div>
        </Glass>
      </div>
      <Toast msg={toast.msg} show={toast.show} />
    </div>
  );

  // ── TOP BAR (shared) ──────────────────────────
  const TopBar = ({ title, onBack }: { title: string; onBack: () => void }) => (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'16px 20px', position:'sticky', top:0, zIndex:10,
      background:'rgba(10,10,15,0.85)', backdropFilter:'blur(20px)',
      borderBottom:'1px solid rgba(255,255,255,0.06)',
    }}>
      <button onClick={() => { haptic('light'); onBack(); }} style={{ background:'rgba(255,255,255,0.08)', border:'none', color:'#fff', padding:'6px 14px', borderRadius:20, cursor:'pointer', fontSize:13 }}>← Orqaga</button>
      <span style={{ fontSize:17, fontWeight:600, letterSpacing:-0.3 }}>{title}</span>
      <div style={{ fontSize:12, color:'#fbbf24', fontWeight:600 }}>{xp.toLocaleString()} XP</div>
    </div>
  );

  const pageStyle: React.CSSProperties = { minHeight:'100vh', animation:'fadeIn 0.3s ease' };
  const contentStyle: React.CSSProperties = { padding:'20px 20px 100px', maxWidth:480, margin:'0 auto', position:'relative', zIndex:1 };

  // ── HOME ──────────────────────────────────────
  if (screen === 'home') return (
    <div style={pageStyle}>
      <BgOrbs />
      <div style={contentStyle}>
        {/* Header */}
        <div style={{ textAlign:'center', padding:'32px 0 24px' }}>
          <div style={{ fontSize:14, color:'rgba(255,255,255,0.5)', marginBottom:4 }}>Assalomu alaykum,</div>
          <h1 style={{ fontSize:28, fontWeight:700, letterSpacing:-0.5 }}>{profile?.nickname || profile?.first_name || 'Alpinist'}</h1>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginTop:4 }}>
            {new Date().toLocaleDateString('uz-UZ',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
          </div>
        </div>

        {/* Profile card */}
        <Glass style={{ padding:16, marginBottom:20, textAlign:'center' }}>
          <div style={{ width:72, height:72, borderRadius:'50%', background:'linear-gradient(135deg,#7c3aed,#1d9e75)', margin:'0 auto 12px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, fontWeight:700, border:'2px solid rgba(255,255,255,0.2)' }}>{initials}</div>
          <div style={{ fontSize:18, fontWeight:600 }}>{profile?.first_name} {profile?.last_name}</div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.5)', marginTop:2 }}>{level.title} • Level {level.num}</div>
          <div style={{ display:'flex', gap:8, justifyContent:'center', margin:'12px 0', flexWrap:'wrap' }}>
            {(profile?.badges||['Base Camp']).map(b => (
              <span key={b} style={{ padding:'4px 12px', borderRadius:20, fontSize:11, fontWeight:600, background:'rgba(251,191,36,0.15)', color:'#fbbf24', border:'1px solid rgba(251,191,36,0.3)' }}>⛺ {b}</span>
            ))}
            <span style={{ padding:'4px 12px', borderRadius:20, fontSize:11, fontWeight:600, background:'rgba(167,139,250,0.15)', color:'#a78bfa', border:'1px solid rgba(167,139,250,0.3)' }}>🔥 {streak} kun</span>
          </div>
          <div style={{ marginTop:8 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:6 }}>
              <span>XP: {xp.toLocaleString()}</span>
              <span>Keyingi: {((Math.floor(xp/500)+1)*500).toLocaleString()}</span>
            </div>
            <div style={{ height:6, background:'rgba(255,255,255,0.1)', borderRadius:3, overflow:'hidden' }}>
              <div style={{ height:'100%', background:'linear-gradient(90deg,#7c3aed,#fbbf24)', borderRadius:3, width:`${Math.min(100,(xp%500)/500*100)}%`, transition:'width 0.6s' }} />
            </div>
          </div>
        </Glass>

        {/* AI Mentor */}
        {profile && (
          <AIMentorWidget
            profile={profile}
            habits={store.habits}
            aiLog={store.aiLog}
            onUpdateLog={store.setAiLog}
            onXP={amt => showToast(`+${amt} XP!`, amt)}
          />
        )}

        {/* Today status */}
        <div style={{ background:'rgba(0,0,0,0.4)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:16, marginBottom:20 }}>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>Bugungi holat</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[
              { label:'Daromad',  val:totalInc.toLocaleString(), color:'#1d9e75' },
              { label:'Xarajat',  val:totalExp.toLocaleString(), color:'#f87171' },
              { label:'Odatlar',  val:`${completedH}/${store.habits.length}`, color:'#fbbf24' },
              { label:'Maqsad %', val:'68%', color:'#60a5fa' },
            ].map(c => (
              <div key={c.label} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:12 }}>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:4 }}>{c.label}</div>
                <div style={{ fontSize:20, fontWeight:700, color:c.color }}>{c.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Nav grid */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:24 }}>
          {[
            { icon:'🎯', title:'Maqsadlar',   sub:'Goals & Tasks', screen:'goals'  as Screen, color:'124,58,237' },
            { icon:'💸', title:'Xarajatlar',  sub:'Finance',       screen:'finance' as Screen, color:'29,158,117' },
            { icon:'🛡️', title:'Odatlar',     sub:'Daily Habits',  screen:'habits' as Screen, color:'251,191,36' },
            { icon:'📅', title:'Kalendar',    sub:'Time Blocks',   screen:'calendar' as Screen, color:'96,165,250' },
          ].map(n => (
            <button key={n.screen} onClick={() => { haptic('light'); go(n.screen); }} style={{
              padding:'20px 16px', borderRadius:20, cursor:'pointer', textAlign:'left', border:'none', display:'block', width:'100%',
              background:`linear-gradient(135deg,rgba(${n.color},0.3),rgba(${n.color},0.1))`,
              borderTop:`1px solid rgba(${n.color},0.3)`,
              borderLeft:`1px solid rgba(${n.color},0.3)`,
              borderRight:`1px solid rgba(${n.color},0.15)`,
              borderBottom:`1px solid rgba(${n.color},0.15)`,
              transition:'all 0.2s',
            }}>
              <span style={{ fontSize:28, display:'block', marginBottom:8 }}>{n.icon}</span>
              <span style={{ fontSize:15, fontWeight:600, color:'#fff', display:'block', marginBottom:2 }}>{n.title}</span>
              <span style={{ fontSize:11, opacity:0.6, color:'#fff', display:'block' }}>{n.sub}</span>
            </button>
          ))}
        </div>

        {/* Notes + Leaderboard quick access */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:24 }}>
          <button onClick={() => go('notes')} style={{ padding:'16px', borderRadius:18, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.04)', cursor:'pointer', textAlign:'left' }}>
            <span style={{ fontSize:24, display:'block', marginBottom:6 }}>📝</span>
            <span style={{ fontSize:14, fontWeight:600, color:'#fff', display:'block' }}>Notion Space</span>
            <span style={{ fontSize:11, color:'rgba(255,255,255,0.5)' }}>Notes & Soul</span>
          </button>
          <button onClick={() => go('leaderboard')} style={{ padding:'16px', borderRadius:18, border:'1px solid rgba(251,191,36,0.2)', background:'rgba(251,191,36,0.05)', cursor:'pointer', textAlign:'left' }}>
            <span style={{ fontSize:24, display:'block', marginBottom:6 }}>🏆</span>
            <span style={{ fontSize:14, fontWeight:600, color:'#fbbf24', display:'block' }}>Leaderboard</span>
            <span style={{ fontSize:11, color:'rgba(255,255,255,0.5)' }}>Reyting: {myLeaderRank}</span>
          </button>
        </div>
      </div>
      <Toast msg={toast.msg} show={toast.show} />
    </div>
  );

  // ── GOALS ─────────────────────────────────────
  if (screen === 'goals') return (
    <div style={pageStyle}>
      <BgOrbs />
      <TopBar title="🎯 Maqsadlar" onBack={() => go('home')} />
      <div style={contentStyle}>
        <SectionCard title="5 Yillik Maqsadlar">
          {goals5yr.map(g => (
            <div key={g.id} style={{ marginBottom:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'rgba(255,255,255,0.7)', marginBottom:6 }}>
                <span>{g.title}</span>
                <span style={{ color:'#7c3aed', fontWeight:600 }}>{g.progress}%</span>
              </div>
              <div style={{ height:8, background:'rgba(255,255,255,0.08)', borderRadius:4, overflow:'hidden' }}>
                <div style={{ height:'100%', borderRadius:4, background:'linear-gradient(90deg,#7c3aed,#a78bfa)', width:`${g.progress}%`, transition:'width 0.5s' }} />
              </div>
            </div>
          ))}
          <div style={{ display:'flex', gap:8 }}>
            <Inp value={newGoal5} onChange={e=>setNewGoal5(e.target.value)} placeholder="Yangi 5 yillik maqsad..." style={{ margin:0, flex:1 }} />
            <button onClick={() => { addGoal('5yr', newGoal5); setNewGoal5(''); }} style={{ padding:'12px 16px', borderRadius:12, border:'1px solid rgba(124,58,237,0.3)', background:'rgba(124,58,237,0.2)', color:'#a78bfa', cursor:'pointer' }}>+</button>
          </div>
        </SectionCard>

        <SectionCard title="1 Yillik Maqsadlar">
          {goals1yr.map(g => (
            <div key={g.id} style={{ marginBottom:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'rgba(255,255,255,0.7)', marginBottom:6 }}>
                <span>{g.title}</span>
                <span style={{ color:'#1d9e75', fontWeight:600 }}>{g.progress}%</span>
              </div>
              <div style={{ height:8, background:'rgba(255,255,255,0.08)', borderRadius:4, overflow:'hidden' }}>
                <div style={{ height:'100%', borderRadius:4, background:'linear-gradient(90deg,#0f6e56,#1d9e75)', width:`${g.progress}%`, transition:'width 0.5s' }} />
              </div>
            </div>
          ))}
          <div style={{ display:'flex', gap:8 }}>
            <Inp value={newGoal1} onChange={e=>setNewGoal1(e.target.value)} placeholder="Yangi 1 yillik maqsad..." style={{ margin:0, flex:1 }} />
            <button onClick={() => { addGoal('1yr', newGoal1); setNewGoal1(''); }} style={{ padding:'12px 16px', borderRadius:12, border:'1px solid rgba(29,158,117,0.3)', background:'rgba(29,158,117,0.2)', color:'#34d399', cursor:'pointer' }}>+</button>
          </div>
        </SectionCard>

        {/* Choqqi from onboarding */}
        {profile?.choqqi && (
          <div style={{ background:'rgba(124,58,237,0.06)', border:'1px solid rgba(124,58,237,0.2)', borderRadius:14, padding:14, marginBottom:14 }}>
            <div style={{ fontSize:11, color:'rgba(124,58,237,0.8)', marginBottom:6, textTransform:'uppercase', letterSpacing:1 }}>Onboarding maqsadi</div>
            <div style={{ fontSize:14, color:'rgba(255,255,255,0.8)', lineHeight:1.5 }}>{profile.choqqi}</div>
          </div>
        )}
      </div>
      <Toast msg={toast.msg} show={toast.show} />
    </div>
  );

  // ── FINANCE ───────────────────────────────────
  if (screen === 'finance') return (
    <div style={pageStyle}>
      <BgOrbs />
      <TopBar title="💸 Moliya" onBack={() => go('home')} />
      <div style={contentStyle}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:16 }}>
          {[
            { label:'Daromad', val:totalInc, color:'rgba(29,158,117,0.2)', border:'rgba(29,158,117,0.3)', tc:'#1d9e75' },
            { label:'Xarajat', val:totalExp, color:'rgba(239,68,68,0.1)',  border:'rgba(239,68,68,0.2)',  tc:'#f87171' },
            { label:'Qoldiq',  val:totalInc-totalExp, color:'rgba(96,165,250,0.1)', border:'rgba(96,165,250,0.2)', tc:'#60a5fa' },
          ].map(c => (
            <div key={c.label} style={{ padding:12, borderRadius:14, textAlign:'center', background:c.color, border:`1px solid ${c.border}` }}>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', marginBottom:4 }}>{c.label}</div>
              <div style={{ fontSize:18, fontWeight:700, color:c.tc }}>{c.val.toLocaleString()}</div>
            </div>
          ))}
        </div>

        <SectionCard title="Kirim / Chiqim">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
            <Inp type="number" value={finAmt}  onChange={e=>setFinAmt(e.target.value)}  placeholder="Miqdor" style={{ margin:0 }} />
            <Inp            value={finDesc} onChange={e=>setFinDesc(e.target.value)} placeholder="Izoh..." style={{ margin:0 }} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <BtnPrimary gradient="linear-gradient(135deg,#0f6e56,#1d9e75)" onClick={() => addTransaction('income')}>+ Daromad</BtnPrimary>
            <BtnPrimary gradient="linear-gradient(135deg,#991b1b,#ef4444)" onClick={() => addTransaction('expense')}>− Xarajat</BtnPrimary>
          </div>
          <div style={{ marginTop:12, maxHeight:160, overflowY:'auto' }}>
            {store.transactions.slice(0,20).map(tx => (
              <div key={tx.id} style={{ display:'flex', justifyContent:'space-between', padding:'6px 10px', borderRadius:8, background:'rgba(255,255,255,0.03)', marginBottom:4, fontSize:12 }}>
                <span style={{ color:'rgba(255,255,255,0.6)' }}>{tx.description}</span>
                <span style={{ color:tx.type==='income'?'#1d9e75':'#ef4444', fontWeight:600 }}>{tx.type==='income'?'+':'−'}{tx.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Jamg'arma maqsadlari">
          <div style={{ display:'flex', gap:8, marginBottom:12 }}>
            <Inp value={sgName} onChange={e=>setSgName(e.target.value)} placeholder="Maqsad nomi..." style={{ margin:0, flex:2 }} />
            <Inp type="number" value={sgAmt}  onChange={e=>setSgAmt(e.target.value)}  placeholder="Summa" style={{ margin:0, flex:1 }} />
            <button onClick={() => { if(sgName.trim()) showToast('+10 XP! Jamg\'arma qo\'shildi 💎', 10); setSgName(''); setSgAmt(''); }}
              style={{ padding:'12px 14px', borderRadius:12, border:'1px solid rgba(96,165,250,0.3)', background:'rgba(96,165,250,0.1)', color:'#60a5fa', cursor:'pointer' }}>+</button>
          </div>
        </SectionCard>
      </div>
      <Toast msg={toast.msg} show={toast.show} />
    </div>
  );

  // ── HABITS ────────────────────────────────────
  if (screen === 'habits') return (
    <div style={pageStyle}>
      <BgOrbs />
      <TopBar title="🛡️ Odatlar" onBack={() => go('home')} />
      <div style={contentStyle}>
        {/* Streak */}
        <Glass style={{ padding:'20px 16px', textAlign:'center', marginBottom:16 }}>
          <div style={{ fontSize:56, lineHeight:1, marginBottom:8, animation:'flicker 2s ease-in-out infinite' }}>🔥</div>
          <div style={{ fontSize:36, fontWeight:800, letterSpacing:-1 }}>{streak}</div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginTop:4 }}>kun ketma-ket streak!</div>
        </Glass>

        <SectionCard title="Bugungi Odatlar">
          {store.habits.map(h => {
            const now2 = new Date();
            const nowM = now2.getHours()*60 + now2.getMinutes();
            const startM = parseInt(h.start_time)*60 + parseInt(h.start_time.split(':')[1]||'0');
            const endM   = parseInt(h.end_time)  *60 + parseInt(h.end_time.split(':')[1]  ||'0');
            const isCurrent = nowM >= startM && nowM <= endM;
            return (
              <div key={h.id} onClick={() => { haptic('light'); toggleHabit(h.id); }} style={{
                display:'flex', alignItems:'center', gap:12, padding:'14px 16px',
                borderRadius:14, marginBottom:8, cursor:'pointer', transition:'all 0.2s',
                background: h.completed_today ? 'rgba(29,158,117,0.08)' : isCurrent ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.04)',
                border:`1px solid ${h.completed_today ? 'rgba(29,158,117,0.25)' : isCurrent ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.07)'}`,
              }}>
                <div style={{ fontSize:22, width:40, textAlign:'center' }}>{h.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:500 }}>{h.name}</div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:2 }}>
                    {h.start_time} – {h.end_time}
                    {isCurrent && !h.completed_today && <span style={{ color:'#7c3aed', fontWeight:600, marginLeft:6 }}>● Hozir</span>}
                  </div>
                </div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginRight:8 }}>🔥 {h.streak}</div>
                <div style={{
                  width:26, height:26, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.15)',
                  display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s', flexShrink:0,
                  background:h.completed_today?'#1d9e75':'transparent', borderColor:h.completed_today?'#1d9e75':'rgba(255,255,255,0.15)',
                }}>{h.completed_today && '✓'}</div>
              </div>
            );
          })}

          {/* Add habit */}
          <div style={{ marginTop:12, background:'rgba(255,255,255,0.02)', borderRadius:12, padding:12, border:'1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginBottom:8 }}>Yangi odat qo'shish</div>
            <div style={{ display:'flex', gap:8, marginBottom:8 }}>
              <Inp value={newHabitName} onChange={e=>setNewHabitName(e.target.value)} placeholder="Odat nomi..." style={{ margin:0, flex:1 }} />
              <Inp value={newHabitIcon} onChange={e=>setNewHabitIcon(e.target.value)} placeholder="😊" style={{ margin:0, width:56 }} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
              <div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginBottom:4 }}>Boshlanish</div>
                <input type="time" value={newHabitStart} onChange={e=>setNewHabitStart(e.target.value)} style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'10px 12px', color:'#fff', fontSize:14, outline:'none' }} />
              </div>
              <div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginBottom:4 }}>Tugash</div>
                <input type="time" value={newHabitEnd} onChange={e=>setNewHabitEnd(e.target.value)} style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'10px 12px', color:'#fff', fontSize:14, outline:'none' }} />
              </div>
            </div>
            <BtnPrimary onClick={addHabit}>+ Qo'shish</BtnPrimary>
          </div>
        </SectionCard>

        {/* AI mentor reminder */}
        <div style={{ padding:'14px 16px', borderRadius:14, background:'rgba(251,191,36,0.05)', border:'1px solid rgba(251,191,36,0.2)' }}>
          <div style={{ fontSize:11, color:'#fbbf24', textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>🤖 AI Mentor</div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.7)', lineHeight:1.5 }}>
            {completedH === store.habits.length && store.habits.length > 0
              ? `${profile?.first_name}, barcha odatlar bajarildi! Streak davom etmoqda.`
              : `${profile?.first_name}, "${profile?.tosiq}" sababini ko'rsatma — hozir qilgin. ${completedH}/${store.habits.length} bajarildi.`}
          </div>
        </div>
      </div>
      <Toast msg={toast.msg} show={toast.show} />
    </div>
  );

  // ── CALENDAR ──────────────────────────────────
  if (screen === 'calendar') return (
    <div style={pageStyle}>
      <BgOrbs />
      <TopBar title="📅 Time Blocks" onBack={() => go('home')} />
      <div style={contentStyle}>
        <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginBottom:16, lineHeight:1.5 }}>
          Bugungi kun uchun 24 soatlik jadval. Odatlarni bosib bajarilgan deb belgilang.
        </div>
        <TimeBlockCalendar habits={store.habits} onToggleHabit={id => { toggleHabit(id); }} onEditHabit={editHabit} onXP={amt => showToast(`+${amt} XP!`, amt)} />
      </div>
      <Toast msg={toast.msg} show={toast.show} />
    </div>
  );

  // ── NOTES ─────────────────────────────────────
  if (screen === 'notes') return (
    <div style={pageStyle}>
      <BgOrbs />
      <TopBar title="📝 Notion Space" onBack={() => go('home')} />
      <div style={contentStyle}>
        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          {(['lesson','gratitude','free'] as const).map(t => (
            <button key={t} onClick={() => setNoteTab(t)} style={{
              padding:'8px 16px', borderRadius:20, fontSize:13, fontWeight:500, cursor:'pointer',
              border:`1px solid ${noteTab===t?'rgba(96,165,250,0.3)':'rgba(255,255,255,0.08)'}`,
              background:noteTab===t?'rgba(96,165,250,0.15)':'rgba(255,255,255,0.03)',
              color:noteTab===t?'#60a5fa':'rgba(255,255,255,0.5)',
            }}>{t==='lesson'?'Xulosalar':t==='gratitude'?'Shukrona':'Erkin'}</button>
          ))}
        </div>

        {noteTab === 'lesson' && (
          <SectionCard title="Kun Xulosasi">
            <textarea value={lessonText} onChange={e=>setLessonText(e.target.value)}
              placeholder="Bugun nima o'rgandim? Qanday saboq oldim?..."
              style={{ width:'100%', minHeight:140, resize:'none', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:'12px 16px', color:'#fff', fontSize:14, outline:'none', lineHeight:1.6, boxSizing:'border-box', marginBottom:12 }}
            />
            <BtnPrimary onClick={saveCurrentNote}>Saqlash (+10 XP)</BtnPrimary>
          </SectionCard>
        )}

        {noteTab === 'gratitude' && (
          <SectionCard title="3 Shukrona">
            {[0,1,2].map(i => (
              <div key={i} style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
                <div style={{ width:24, height:24, borderRadius:'50%', background:'rgba(96,165,250,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, color:'#60a5fa', flexShrink:0 }}>{i+1}</div>
                <Inp value={gratitude[i]} onChange={e=>setGratitude(g=>{const n=[...g];n[i]=e.target.value;return n;})} placeholder={`${i+1}-shukronam...`} style={{ margin:0, flex:1 }} />
              </div>
            ))}
            <BtnPrimary style={{ marginTop:8 }} onClick={saveCurrentNote}>Saqlash (+10 XP)</BtnPrimary>
          </SectionCard>
        )}

        {noteTab === 'free' && (
          <SectionCard title="Erkin Qaydlar">
            <textarea value={freeNote} onChange={e=>setFreeNote(e.target.value)}
              placeholder="Fikrlaringizni erkin yozing..."
              style={{ width:'100%', minHeight:200, resize:'none', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:'12px 16px', color:'#fff', fontSize:14, outline:'none', lineHeight:1.7, boxSizing:'border-box', marginBottom:12 }}
            />
            <BtnPrimary onClick={saveCurrentNote}>Saqlash (+10 XP)</BtnPrimary>
          </SectionCard>
        )}

        {/* Recent notes */}
        {store.notes.length > 0 && (
          <SectionCard title="So'ngi qaydlar">
            {store.notes.slice(0,5).map(n => (
              <div key={n.id} style={{ padding:'10px 12px', borderRadius:10, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)', marginBottom:8 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:11, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:0.5 }}>{n.type}</span>
                  <span style={{ fontSize:11, color:'rgba(255,255,255,0.25)' }}>{n.date}</span>
                </div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,0.7)', lineHeight:1.4 }}>{n.content.substring(0,120)}{n.content.length>120?'…':''}</div>
              </div>
            ))}
          </SectionCard>
        )}
      </div>
      <Toast msg={toast.msg} show={toast.show} />
    </div>
  );

  // ── LEADERBOARD ───────────────────────────────
  if (screen === 'leaderboard') return (
    <div style={pageStyle}>
      <BgOrbs />
      <TopBar title="🏆 Leaderboard" onBack={() => go('home')} />
      <div style={contentStyle}>
        <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:18, padding:'20px 16px', textAlign:'center', marginBottom:16 }}>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>Sening o'rning</div>
          <div style={{ fontSize:48, fontWeight:800, color:'#fbbf24' }}>{myLeaderRank}</div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.5)' }}>{xp.toLocaleString()} XP • {level.title}</div>
        </div>

        {[...leaderboard].sort((a,b)=>b.xp-a.xp).slice(0,10).map((entry, i) => {
          const isMe = profile && entry.nickname === profile.nickname;
          const rankColors: Record<number,string> = { 0:'#fbbf24', 1:'#94a3b8', 2:'#cd7c2f' };
          return (
            <div key={i} style={{
              display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderRadius:14, marginBottom:8,
              background: isMe ? 'rgba(124,58,237,0.07)' : i<3 ? `rgba(${i===0?'251,191,36':i===1?'148,163,184':'205,124,47'},0.07)` : 'rgba(255,255,255,0.03)',
              border:`1px solid ${isMe?'rgba(124,58,237,0.4)':i<3?`rgba(${i===0?'251,191,36':i===1?'148,163,184':'205,124,47'},0.25)`:'rgba(255,255,255,0.06)'}`,
            }}>
              <div style={{ fontSize:16, fontWeight:800, width:28, textAlign:'center', color:rankColors[i]||'rgba(255,255,255,0.4)' }}>
                {i+1}
              </div>
              <div style={{ width:36, height:36, borderRadius:'50%', background:isMe?'rgba(124,58,237,0.2)':'rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, flexShrink:0, color:isMe?'#a78bfa':rankColors[i]||'rgba(255,255,255,0.5)' }}>
                {(entry.nickname||entry.first_name||'?')[0].toUpperCase()}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:500 }}>{entry.nickname || entry.first_name} {isMe && '(Sen)'}</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:1 }}>{(entry.badges||['Base Camp'])[0]}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:16, fontWeight:700, color:isMe?'#a78bfa':rankColors[i]||'rgba(255,255,255,0.6)' }}>{(entry.xp||0).toLocaleString()}</div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>XP</div>
              </div>
            </div>
          );
        })}
      </div>
      <Toast msg={toast.msg} show={toast.show} />
    </div>
  );

  return null;
}

// ── Background orbs component ────────────────
const BgOrbs = () => (
  <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0 }}>
    <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', background:'#7c3aed', top:-100, left:-100, filter:'blur(80px)', opacity:0.15 }} />
    <div style={{ position:'absolute', width:300, height:300, borderRadius:'50%', background:'#1d9e75', bottom:100, right:-50, filter:'blur(80px)', opacity:0.15 }} />
    <div style={{ position:'absolute', width:200, height:200, borderRadius:'50%', background:'#c026d3', top:'50%', left:'60%', filter:'blur(80px)', opacity:0.12 }} />
  </div>
);

const TgIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.012 9.483c-.148.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.26 14.6l-2.95-.924c-.641-.2-.654-.641.136-.953l11.5-4.435c.535-.194 1.003.131.616.96z"/>
  </svg>
);
