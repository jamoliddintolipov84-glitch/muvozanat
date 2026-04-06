// ═══════════════════════════════════════════
//  components/AIMentorWidget.tsx
// ═══════════════════════════════════════════
import React, { useState, useEffect, useRef } from 'react';
import type { Profile, Habit, AIMessage } from '../types';
import { getDailyMotivation, askMentor } from '../lib/aiMentor';

interface Props {
  profile: Profile;
  habits: Habit[];
  aiLog: AIMessage[];
  onUpdateLog: (msgs: AIMessage[]) => void;
  onXP: (amount: number) => void;
}

export const AIMentorWidget: React.FC<Props> = ({
  profile, habits, aiLog, onUpdateLog, onXP
}) => {
  const [expanded, setExpanded]   = useState(false);
  const [thinking, setThinking]   = useState(false);
  const [input, setInput]         = useState('');
  const [dailyMsg, setDailyMsg]   = useState('');
  const [msgLoading, setMsgLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const completedCount = habits.filter(h => h.completed_today).length;
  const totalHabits    = habits.length;
  const now = new Date();
  const ctx = {
    profile, habits, completedCount, totalHabits,
    streak: profile.streak || 0,
    currentTime: `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`,
    dayOfWeek: now.toLocaleDateString('uz-UZ', { weekday: 'long' }),
  };

  // Load daily message on mount / habit change
  useEffect(() => {
    let cancelled = false;
    setMsgLoading(true);
    getDailyMotivation(ctx).then(msg => {
      if (!cancelled) { setDailyMsg(msg); setMsgLoading(false); }
    });
    return () => { cancelled = true; };
  }, [completedCount, profile.id]);

  // Scroll to bottom of chat
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiLog]);

  const send = async () => {
    if (!input.trim() || thinking) return;
    const userMsg: AIMessage = {
      role: 'user',
      text: input.trim(),
      timestamp: new Date().toISOString(),
    };
    const newLog = [...aiLog, userMsg];
    onUpdateLog(newLog);
    setInput('');
    setThinking(true);
    try {
      const answer = await askMentor(input.trim(), ctx);
      const mentorMsg: AIMessage = {
        role: 'mentor',
        text: answer,
        timestamp: new Date().toISOString(),
      };
      onUpdateLog([...newLog, mentorMsg]);
      onXP(5);
    } catch {
      onUpdateLog([...newLog, {
        role: 'mentor',
        text: 'Hozircha javob bera olmayman. Lekin maqsad aniq: oldinga!',
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setThinking(false);
    }
  };

  const pct = totalHabits > 0 ? Math.round(completedCount / totalHabits * 100) : 0;

  return (
    <div style={{
      background: 'rgba(124,58,237,0.08)',
      border: '1px solid rgba(124,58,237,0.25)',
      borderRadius: 20,
      marginBottom: 16,
      overflow: 'hidden',
      transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
    }}>
      {/* ── Header ── */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px', cursor: 'pointer',
        }}
      >
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'linear-gradient(135deg,#7c3aed,#1d9e75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0,
          boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
        }}>🤖</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>
            AI Mentor • {now.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div style={{
            fontSize: 13, color: 'rgba(255,255,255,0.85)',
            lineHeight: 1.4,
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {msgLoading ? (
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>Tahlil qilinmoqda...</span>
            ) : dailyMsg}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 700,
            color: pct === 100 ? '#1d9e75' : pct > 50 ? '#fbbf24' : '#f87171',
          }}>{pct}%</div>
          <div style={{ fontSize: 20, transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }}>
            ›
          </div>
        </div>
      </div>

      {/* ── Habit mini-tracker ── */}
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{
          height: 4, background: 'rgba(255,255,255,0.08)',
          borderRadius: 2, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: 2,
            background: pct === 100
              ? 'linear-gradient(90deg,#0f6e56,#1d9e75)'
              : 'linear-gradient(90deg,#7c3aed,#a78bfa)',
            width: pct + '%',
            transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
          }} />
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          {habits.slice(0, 6).map(h => (
            <div key={h.id} title={h.name} style={{
              width: 28, height: 28, borderRadius: 8,
              background: h.completed_today
                ? 'rgba(29,158,117,0.25)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${h.completed_today ? 'rgba(29,158,117,0.4)' : 'rgba(255,255,255,0.1)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, transition: 'all 0.2s',
              filter: h.completed_today ? 'none' : 'grayscale(0.7) opacity(0.5)',
            }}>{h.icon}</div>
          ))}
          {habits.length > 6 && (
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'rgba(255,255,255,0.04)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, color: 'rgba(255,255,255,0.3)',
            }}>+{habits.length - 6}</div>
          )}
        </div>
      </div>

      {/* ── Expanded chat ── */}
      {expanded && (
        <div style={{ borderTop: '1px solid rgba(124,58,237,0.15)' }}>
          {/* Chat log */}
          <div style={{
            maxHeight: 240, overflowY: 'auto', padding: '12px 16px',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {aiLog.length === 0 && (
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '20px 0' }}>
                Mentor bilan suhbatlashing...
              </div>
            )}
            {aiLog.map((msg, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '82%',
                  padding: '8px 12px',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: msg.role === 'user'
                    ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.07)',
                  border: `1px solid ${msg.role === 'user' ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  fontSize: 13, lineHeight: 1.5,
                  color: msg.role === 'user' ? '#e9d5ff' : 'rgba(255,255,255,0.85)',
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {thinking && (
              <div style={{ display: 'flex', gap: 4, padding: '4px 0' }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: 'rgba(167,139,250,0.6)',
                    animation: `bounce 0.9s ease ${i * 0.15}s infinite`,
                  }} />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            display: 'flex', gap: 8, padding: '10px 16px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Savol bering..."
              style={{
                flex: 1, background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12, padding: '9px 14px',
                color: '#fff', fontSize: 13, outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            <button
              onClick={send}
              disabled={thinking || !input.trim()}
              style={{
                width: 38, height: 38, borderRadius: 12, border: 'none',
                background: thinking ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.7)',
                color: '#fff', fontSize: 16, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s', flexShrink: 0,
              }}
            >↑</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%,100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
