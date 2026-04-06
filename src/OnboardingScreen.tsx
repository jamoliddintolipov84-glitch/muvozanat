import React, { useState } from 'react';
import type { Profile, TelegramUser } from './types';

interface Props {
  telegramUser: TelegramUser | null;
  onComplete: (profile: Omit<Profile, 'id' | 'created_at' | 'updated_at'>) => void;
}

const REGIONS = [
  { value: 'tashkent-city', label: 'Toshkent shahri' },
  { value: 'tashkent',      label: 'Toshkent viloyati' },
  { value: 'samarkand',     label: 'Samarqand' },
  { value: 'bukhara',       label: 'Buxoro' },
  { value: 'andijan',       label: 'Andijon' },
  { value: 'fergana',       label: "Farg'ona" },
  { value: 'namangan',      label: 'Namangan' },
  { value: 'kashkadarya',   label: 'Qashqadaryo' },
  { value: 'surxandarya',   label: 'Surxondaryo' },
  { value: 'jizzakh',       label: 'Jizzax' },
  { value: 'sirdarya',      label: 'Sirdaryo' },
  { value: 'khorezm',       label: 'Xorazm' },
  { value: 'navoi',         label: 'Navoiy' },
  { value: 'karakalpak',    label: "Qoraqalpog'iston" },
];

const BILIM_OPTIONS = [
  { val: 'Dasturlash / IT',             icon: '💻' },
  { val: 'Biznes / Tadbirkorlik',       icon: '📊' },
  { val: 'Tillar (Ingliz, Arab…)',      icon: '🗣️' },
  { val: "Tibbiyot / Sog'liq",          icon: '🏥' }, 
  { val: 'Muhandislik / Arxitektura',   icon: '🏗️' },
  { val: "Ijodiyot / San'at / Design",  icon: '🎨' }, 
];

const TOSIQ_OPTIONS = [
  { val: 'Telefon va ijtimoiy tarmoqlar',      icon: '📱' },
  { val: "Ertalab uyg'onish qiyinligi",        icon: '😴' }, 
  { val: "Motivatsiya yo'qligi",               icon: '😶' }, 
  { val: "Atrofdagilar ta'siri",               icon: '👥' }, 
  { val: 'Rejasizlik',                         icon: '🗺️' },
];

const SHIOR_OPTIONS = [
  "Har kun o'sish — maqsadim",
  "Intizom — muvaffaqiyat kaliti",
  "Qattiq ishlasam, xohlagan narsam bo'ladi",
  "Hozirgi lahza — yagona haqiqat",
];

const TOTAL = 8;

function Inp(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: '100%', background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
        padding: '13px 16px', color: '#fff', fontSize: 15,
        outline: 'none', fontFamily: 'inherit', marginBottom: 10,
        boxSizing: 'border-box',
        ...(props.style || {}),
      }}
    />
  );
}

function Sel(props: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <select
      {...props}
      style={{
        width: '100%', background: 'rgba(20,20,32,0.95)',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
        padding: '13px 16px', color: '#fff', fontSize: 15,
        outline: 'none', fontFamily: 'inherit', marginBottom: 10,
        cursor: 'pointer', boxSizing: 'border-box',
      }}
    >{props.children}</select>
  );
}

export const OnboardingScreen: React.FC<Props> = ({ telegramUser, onComplete }) => {
  const [step, setStep] = useState(1);
  const [err, setErr]   = useState('');

  const [firstName, setFirstName] = useState(telegramUser?.first_name || '');
  const [lastName,  setLastName]  = useState(telegramUser?.last_name  || '');
  const [nickname,  setNickname]  = useState(telegramUser?.username   || '');
  const [age,        setAge]       = useState('');
  const [nation,    setNation]    = useState('');
  const [country,   setCountry]   = useState('uz');
  const [region,    setRegion]    = useState('');
  const [shior,      setShior]     = useState('');
  const [shiorCustom, setShiorCustom] = useState('');
  const [bilim,      setBilim]     = useState('');
  const [choqqi,    setChoqqi]    = useState('');
  const [tosiq,      setTosiq]     = useState('');
  const [ideal,      setIdeal]     = useState('');

  const pct = ((step - 1) / TOTAL) * 100;

  const validate = () => {
    if (step === 1 && (!firstName.trim() || !nickname.trim())) {
      setErr('Ism va Nickname kiritilishi shart'); return false;
    }
    if (step === 2 && !age) {
      setErr('Yoshingizni kiriting'); return false;
    }
    if (step === 5 && !choqqi.trim()) {
      setErr('Maqsadingizni yozing'); return false;
    }
    if (step === 7 && !ideal.trim()) {
      setErr('Ideal kuningizni tasvirlab bering'); return false;
    }
    setErr(''); return true;
  };

  const next = () => {
    if (!validate()) return;
    if (step < TOTAL) setStep(s => s + 1);
    else finish();
  };

  const finish = () => {
    const finalShior = shiorCustom.trim() || shior;
    onComplete({
      user_id: telegramUser ? `tg_${telegramUser.id}` : `email_${Date.now()}`,
      telegram_id: telegramUser?.id,
      first_name: firstName.trim(),
      last_name:  lastName.trim(),
      nickname:   nickname.trim(),
      age:        parseInt(age) || 0,
      nation:     nation.trim(),
      country, region,
      shior:   finalShior,
      bilim, choqqi: choqqi.trim(),
      tosiq, ideal_kun: ideal.trim(),
      xp: 50, streak: 0, level: 1,
      badges: ['Base Camp'],
    });
  };

  const phaseLabel = step <= 2 ? "Shaxsiy ma'lumotlar" : step <= 7 ? "Shaxsiyat tahlili" : "Tasdiq";

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fff' }}>
      <div style={{
        padding: '20px 24px 16px',
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(10,10,15,0.92)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
          <span style={{ color: 'rgba(255,255,255,0.35)' }}>{step} / {TOTAL}</span>
          <span style={{ color: 'rgba(255,255,255,0.35)' }}>{phaseLabel}</span>
        </div>
        <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 2,
            background: 'linear-gradient(90deg,#7c3aed,#1d9e75)',
            width: pct + '%', transition: 'width 0.5s cubic-bezier(0.16,1,0.3,1)',
          }} />
        </div>
      </div>

      <div style={{ padding: '24px 24px 80px', maxWidth: 480, margin: '0 auto' }}>
        {err && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 12, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#f87171',
          }}>{err}</div>
        )}

        {step === 1 && (
          <Step icon="👋" title="Ismingiz va Familiyangiz" hint="Profilingizda ko'rsatiladigan ma'lumotlar">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <Inp value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Ismingiz" style={{ margin: 0 }} />
              <Inp value={lastName}  onChange={e => setLastName(e.target.value)}  placeholder="Familiyangiz" style={{ margin: 0 }} />
            </div>
            <Inp value={nickname} onChange={e => setNickname(e.target.value)} placeholder="Nickname (reyting uchun)" />
          </Step>
        )}

        {step === 2 && (
          <Step icon="🌍" title="Demografik ma'lumotlar" hint="Statistika va maqsad tahlili uchun">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Inp type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="Yoshingiz" style={{ margin: 0 }} />
              <Inp value={nation} onChange={e => setNation(e.target.value)} placeholder="Millatingiz" style={{ margin: 0 }} />
            </div>
            <Sel value={country} onChange={e => setCountry(e.target.value)}>
              <option value="uz">🇺🇿 O'zbekiston</option>
              <option value="kz">🇰🇿 Qozog'iston</option>
              <option value="ru">🇷🇺 Rossiya</option>
              <option value="de">🇩🇪 Germaniya</option>
              <option value="us">🇺🇸 AQSh</option>
              <option value="other">Boshqa</option>
            </Sel>
            <Sel value={region} onChange={e => setRegion(e.target.value)}>
              <option value="">Viloyatni tanlang</option>
              {REGIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </Sel>
          </Step>
        )}

        {step === 3 && (
          <Step icon="⚡" title="Hayotiy tamoyilingiz nima?" hint="Sizni oldinga haydaydigan asosiy g'oya">
            {SHIOR_OPTIONS.map(opt => (
              <button key={opt} onClick={() => setShior(opt)} style={optBtn(shior === opt)}>
                {shior === opt ? '✓ ' : ''}{opt}
              </button>
            ))}
            <Inp value={shiorCustom} onChange={e => setShiorCustom(e.target.value)} placeholder="Yoki o'z shioringizni yozing..." />
          </Step>
        )}

        {step === 4 && (
          <Step icon="📚" title="Qaysi sohani o'rganmoqdasiz?" hint="Asosiy o'rganish yo'nalishingiz">
            {BILIM_OPTIONS.map(o => (
              <button key={o.val} onClick={() => setBilim(o.val)} style={optBtn(bilim === o.val)}>
                <span style={{ fontSize: 20, marginRight: 10 }}>{o.icon}</span>{bilim === o.val ? '✓ ' : ''}{o.val}
              </button>
            ))}
          </Step>
        )}

        {step === 5 && (
          <Step icon="🏔️" title="1 yillik eng katta maqsadingiz?" hint="Aniq, o'lchanadigan va real maqsad yozing">
            <textarea
              value={choqqi}
              onChange={e => setChoqqi(e.target.value)}
              placeholder="Masalan: 2026 yil oxirigacha o'z startapimni ochib..."
              style={{
                width: '100%', minHeight: 130, resize: 'none',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 14, padding: '14px 16px', color: '#fff', fontSize: 15,
                outline: 'none', fontFamily: 'inherit', lineHeight: 1.6, marginBottom: 10,
                boxSizing: 'border-box',
              }}
            />
          </Step>
        )}

        {step === 6 && (
          <Step icon="🚧" title="Intizomingizga nima xalaqit beradi?" hint="Asosiy to'siqni aniqlasak, yechim topamiz">
            {TOSIQ_OPTIONS.map(o => (
              <button key={o.val} onClick={() => setTosiq(o.val)} style={optBtn(tosiq === o.val)}>
                <span style={{ fontSize: 20, marginRight: 10 }}>{o.icon}</span>{tosiq === o.val ? '✓ ' : ''}{o.val}
              </button>
            ))}
          </Step>
        )}

        {step === 7 && (
          <Step icon="🌅" title="Sen uchun ideal kun qanday?" hint="Erkin, o'z so'zlaringiz bilan tasvirlab bering">
            <textarea
              value={ideal}
              onChange={e => setIdeal(e.target.value)}
              placeholder="Masalan: 3:00 da uyg'onaman..."
              style={{
                width: '100%', minHeight: 140, resize: 'none',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 14, padding: '14px 16px', color: '#fff', fontSize: 15,
                outline: 'none', fontFamily: 'inherit', lineHeight: 1.6, marginBottom: 10,
                boxSizing: 'border-box',
              }}
            />
          </Step>
        )}

        {step === 8 && (
          <Step icon="🛡️" title="Tayyor! Ma'lumotlaringizni tekshiring" hint="Hammasi to'g'ri bo'lsa, saqlang">
            <div style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16, overflow: 'hidden', marginBottom: 16,
            }}>
              {[
                ['👤 Ism',       `${firstName} ${lastName} (@${nickname})`],
                ['🎂 Yosh',      `${age} yosh • ${nation || '—'}`],
                ['📍 Viloyat',    REGIONS.find(r => r.value === region)?.label || region || '—'],
                ['⚡ Shior',     shiorCustom || shior || '—'],
                ['📚 Soha',      bilim || '—'],
                ['🏔️ Maqsad',    choqqi.substring(0, 70) + (choqqi.length > 70 ? '…' : '')],
                ['🚧 To\'siq',   tosiq || '—'],
              ].map(([k, v], i) => (
                <div key={i} style={{
                  display: 'flex', gap: 10, padding: '10px 16px',
                  borderBottom: i < 6 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  fontSize: 13, alignItems: 'flex-start',
                }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)', minWidth: 110, flexShrink: 0 }}>{k}</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </Step>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          {step > 1 && (
            <button onClick={() => { setErr(''); setStep(s => s - 1); }} style={{
              padding: '14px 20px', borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)',
              fontSize: 15, cursor: 'pointer', fontFamily: 'inherit',
            }}>←</button>
          )}
          <button onClick={next} style={{
            flex: 1, padding: 14, borderRadius: 14, border: 'none',
            background: 'linear-gradient(135deg,#7c3aed,#5b21b6)',
            color: '#fff', fontSize: 15, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {step === TOTAL ? '🚀 Saqlash va Boshlash' : 'Davom etish →'}
          </button>
        </div>
      </div>
    </div>
  );
};

const Step: React.FC<{
  icon: string; title: string; hint: string; children: React.ReactNode;
}> = ({ icon, title, hint, children }) => (
  <div style={{ animation: 'fadeUp 0.4s cubic-bezier(0.16,1,0.3,1)' }}>
    <div style={{ fontSize: 48, marginBottom: 14 }}>{icon}</div>
    <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5, lineHeight: 1.25, marginBottom: 8 }}>{title}</div>
    <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 28, lineHeight: 1.5 }}>{hint}</div>
    {children}
    <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }`}</style>
  </div>
);

const optBtn = (selected: boolean): React.CSSProperties => ({
  width: '100%', textAlign: 'left', padding: '13px 16px',
  background: selected ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)',
  border: `1px solid ${selected ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.08)'}`,
  borderRadius: 14, color: '#fff', fontSize: 14, cursor: 'pointer',
  display: 'flex', alignItems: 'center', marginBottom: 10,
  fontFamily: 'inherit', transition: 'all 0.2s',
});
