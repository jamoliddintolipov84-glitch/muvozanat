// ═══════════════════════════════════════════
//  components/TimeBlockCalendar.tsx
//  24-hour vertical timeline with habit blocks
// ═══════════════════════════════════════════
import React, { useState, useRef, useEffect } from 'react';
import type { Habit } from '../types';

interface Props {
  habits: Habit[];
  onToggleHabit: (habitId: string) => void;
  onEditHabit: (habit: Habit) => void;
  onXP: (amount: number) => void;
}

// Convert "HH:MM" → minutes from midnight
const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const toTime = (min: number) => {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
};

// Hours to show (3am → midnight)
const HOUR_LABELS = Array.from({ length: 22 }, (_, i) => i + 3);
const PX_PER_MIN  = 1.5;  // 1.5px per minute → 1 hour = 90px

const HABIT_COLORS = [
  '#7c3aed','#1d9e75','#2563eb','#d97706','#dc2626',
  '#7c3aed','#0891b2','#65a30d','#9333ea',
];

export const TimeBlockCalendar: React.FC<Props> = ({
  habits, onToggleHabit, onEditHabit, onXP
}) => {
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowPx  = (nowMin - 3 * 60) * PX_PER_MIN; // offset by 3am

  // Auto-scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current) {
      const offset = Math.max(0, nowPx - 120);
      scrollRef.current.scrollTop = offset;
    }
  }, []);

  const totalPx = 21 * 60 * PX_PER_MIN; // 3am → midnight = 21 hours

  return (
    <div>
      {/* ── Legend ── */}
      <div style={{
        display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap',
      }}>
        {habits.map((h, i) => (
          <div key={h.id} style={{
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
            color: 'rgba(255,255,255,0.6)',
          }}>
            <div style={{
              width: 10, height: 10, borderRadius: 3,
              background: HABIT_COLORS[i % HABIT_COLORS.length],
              opacity: h.completed_today ? 1 : 0.5,
            }} />
            {h.icon} {h.name}
          </div>
        ))}
      </div>

      {/* ── Timeline ── */}
      <div
        ref={scrollRef}
        style={{
          height: 500, overflowY: 'auto',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.06)',
          position: 'relative',
        }}
      >
        <div style={{ position: 'relative', height: totalPx + 40 }}>

          {/* Hour lines */}
          {HOUR_LABELS.map(hour => {
            const px = (hour - 3) * 60 * PX_PER_MIN;
            const isNow = now.getHours() === hour;
            return (
              <div key={hour} style={{
                position: 'absolute', top: px, left: 0, right: 0,
                display: 'flex', alignItems: 'center', gap: 0,
                zIndex: 1,
              }}>
                <div style={{
                  width: 44, textAlign: 'right', paddingRight: 10,
                  fontSize: 11, color: isNow ? '#7c3aed' : 'rgba(255,255,255,0.2)',
                  fontWeight: isNow ? 600 : 400, flexShrink: 0,
                }}>
                  {hour.toString().padStart(2,'0')}:00
                </div>
                <div style={{
                  flex: 1, height: 1,
                  background: isNow ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.05)',
                }} />
              </div>
            );
          })}

          {/* Habit blocks */}
          {habits.map((habit, i) => {
            const startMin = toMin(habit.start_time || '06:00');
            const endMin   = toMin(habit.end_time   || '07:00');
            const duration = Math.max(endMin - startMin, 15);
            const top      = (startMin - 3 * 60) * PX_PER_MIN;
            const height   = duration * PX_PER_MIN;
            const color    = HABIT_COLORS[i % HABIT_COLORS.length];
            const isPast   = nowMin > endMin;
            const isCurrent = nowMin >= startMin && nowMin <= endMin;
            const isOverdue = isPast && !habit.completed_today;

            return (
              <div
                key={habit.id}
                onClick={() => {
                  if (!habit.completed_today) {
                    onToggleHabit(habit.id);
                    onXP(15);
                  }
                }}
                style={{
                  position: 'absolute',
                  top: top + 1, left: 52,
                  right: 8,
                  height: Math.max(height - 2, 28),
                  background: habit.completed_today
                    ? `rgba(${hexToRgb(color)},0.25)`
                    : isOverdue
                    ? 'rgba(239,68,68,0.1)'
                    : isCurrent
                    ? `rgba(${hexToRgb(color)},0.2)`
                    : `rgba(${hexToRgb(color)},0.1)`,
                  border: `1px solid ${
                    habit.completed_today ? color :
                    isOverdue ? 'rgba(239,68,68,0.4)' :
                    isCurrent ? `${color}88` :
                    `rgba(${hexToRgb(color)},0.25)`
                  }`,
                  borderRadius: 10,
                  cursor: habit.completed_today ? 'default' : 'pointer',
                  transition: 'all 0.2s',
                  overflow: 'hidden',
                  display: 'flex', flexDirection: 'column',
                  justifyContent: 'center',
                  padding: '4px 10px',
                  zIndex: 2,
                }}
              >
                {/* Current time indicator */}
                {isCurrent && (
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0,
                    height: 2, background: color, borderRadius: 2,
                  }} />
                )}

                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{ fontSize: Math.min(height / 3, 18) }}>{habit.icon}</span>
                  {height > 30 && (
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: 12, fontWeight: 600,
                        color: habit.completed_today ? color : isOverdue ? '#f87171' : '#fff',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{habit.name}</div>
                      {height > 50 && (
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                          {habit.start_time} – {habit.end_time}
                        </div>
                      )}
                    </div>
                  )}
                  {habit.completed_today && (
                    <div style={{
                      marginLeft: 'auto', width: 18, height: 18, borderRadius: '50%',
                      background: color, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 10, flexShrink: 0,
                    }}>✓</div>
                  )}
                  {isOverdue && !habit.completed_today && (
                    <div style={{
                      marginLeft: 'auto', fontSize: 10,
                      color: '#f87171', flexShrink: 0,
                    }}>kechikdi</div>
                  )}
                  {isCurrent && !habit.completed_today && (
                    <div style={{
                      marginLeft: 'auto', fontSize: 10,
                      color: color, flexShrink: 0, fontWeight: 600,
                      animation: 'pulse 2s infinite',
                    }}>hozir</div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Current time line */}
          {nowMin >= 3 * 60 && nowMin <= 24 * 60 && (
            <div style={{
              position: 'absolute',
              top: nowPx, left: 44, right: 0,
              display: 'flex', alignItems: 'center', gap: 0,
              zIndex: 10, pointerEvents: 'none',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#ef4444', flexShrink: 0,
              }} />
              <div style={{
                flex: 1, height: 1.5,
                background: 'rgba(239,68,68,0.6)',
              }} />
            </div>
          )}
        </div>
      </div>

      {/* ── Edit modal ── */}
      {editingHabit && (
        <HabitTimeEditor
          habit={editingHabit}
          onSave={updated => { onEditHabit(updated); setEditingHabit(null); }}
          onClose={() => setEditingHabit(null)}
        />
      )}

      {/* ── Habits edit list ── */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
          Vaqtlarni sozlash
        </div>
        {habits.map(h => (
          <div key={h.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', borderRadius: 12, marginBottom: 8,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <span style={{ fontSize: 20 }}>{h.icon}</span>
            <div style={{ flex: 1, fontSize: 13 }}>{h.name}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
              {h.start_time} – {h.end_time}
            </div>
            <button
              onClick={() => setEditingHabit(h)}
              style={{
                padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)',
                fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >✏️</button>
          </div>
        ))}
      </div>

      <style>{`@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }`}</style>
    </div>
  );
};

// ── Habit time editor modal ─────────────────
const HabitTimeEditor: React.FC<{
  habit: Habit;
  onSave: (h: Habit) => void;
  onClose: () => void;
}> = ({ habit, onSave, onClose }) => {
  const [start, setStart] = useState(habit.start_time || '06:00');
  const [end,   setEnd]   = useState(habit.end_time   || '07:00');

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      zIndex: 100, backdropFilter: 'blur(8px)',
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#111118', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px 20px 0 0', padding: 24, width: '100%', maxWidth: 480,
          animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 28 }}>{habit.icon}</span>
          <div style={{ fontWeight: 600, marginTop: 6 }}>{habit.name}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Vaqtni sozlash</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Boshlanish</div>
            <input type="time" value={start} onChange={e => setStart(e.target.value)}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
                padding: '10px 12px', color: '#fff', fontSize: 16, outline: 'none',
                fontFamily: 'inherit',
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Tugash</div>
            <input type="time" value={end} onChange={e => setEnd(e.target.value)}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
                padding: '10px 12px', color: '#fff', fontSize: 16, outline: 'none',
                fontFamily: 'inherit',
              }}
            />
          </div>
        </div>
        <button
          onClick={() => onSave({ ...habit, start_time: start, end_time: end })}
          style={{
            width: '100%', padding: 13, borderRadius: 13, border: 'none',
            background: 'linear-gradient(135deg,#7c3aed,#5b21b6)',
            color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >Saqlash</button>
      </div>
      <style>{`@keyframes slideUp { from { transform:translateY(100%); } to { transform:translateY(0); } }`}</style>
    </div>
  );
};

// ── Hex → RGB helper ────────────────────────
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '124,58,237';
  return `${parseInt(result[1],16)},${parseInt(result[2],16)},${parseInt(result[3],16)}`;
}
