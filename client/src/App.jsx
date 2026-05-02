import React, { useState, useEffect, useRef, useCallback } from 'react';

const ACCENT = '#534AB7';
const ACCENT_DARK = '#3f38a0';
const LANGUAGES = ['English', 'Hindi', 'Bengali'];
const DOC_TYPES = [
  'Medical report', 'Legal notice', 'Bank document',
  'Govt letter', 'Prescription', 'Contract', 'Other',
];
const PLACEHOLDERS = [
  'Paste your medical report here...',
  'Paste a legal notice here...',
  'Paste a bank letter here...',
  'Paste a government document here...',
];
const EXAMPLES = [
  'Haemoglobin 9.2 g/dL, below normal range 12-16',
  'Legal notice: vacate premises within 30 days',
  'EMI bounced, NACH mandate rejected by bank',
];

function getTodayKey() { return 'decode_count_' + new Date().toISOString().slice(0, 10); }
function getUsageCount() { return parseInt(localStorage.getItem(getTodayKey()) || '0', 10); }
function incrementUsage() {
  const key = getTodayKey();
  const next = getUsageCount() + 1;
  localStorage.setItem(key, String(next));
  return next;
}
function getIsPaid() { return localStorage.getItem('decode_is_paid') === 'true'; }
function getBonus() { return parseInt(localStorage.getItem('decode_bonus') || '0', 10); }
function addBonus() { localStorage.setItem('decode_bonus', String(getBonus() + 1)); }
function getDailyLimit() { return 3 + getBonus(); }

function getHistory() {
  try { return JSON.parse(localStorage.getItem('decode_history') || '[]'); } catch { return []; }
}
function saveToHistory(entry) {
  const history = getHistory();
  history.unshift(entry);
  localStorage.setItem('decode_history', JSON.stringify(history.slice(0, 200)));
}
function clearHistory() { localStorage.removeItem('decode_history'); }

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + ' min ago';
  if (diff < 86400) return Math.floor(diff / 3600) + ' hours ago';
  return Math.floor(diff / 86400) + ' days ago';
}

const CARD_COLORS = {
  what_is_this: '#3B82F6',
  what_it_means_for_you: '#10B981',
  what_to_do_next: '#534AB7',
};

const globalStyles = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.7; }
  }
  @keyframes slideUp {
    from { transform: translateY(100%); opacity: 0; }
    to   { transform: translateY(0); opacity: 1; }
  }
  @keyframes shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
  @keyframes ringPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(83,74,183,0.5); }
    50%       { box-shadow: 0 0 0 8px rgba(83,74,183,0); }
  }
  .shimmer-line {
    background: linear-gradient(90deg, #f0eeff 25%, #e0dcfa 50%, #f0eeff 75%);
    background-size: 400px 100%;
    animation: shimmer 1.4s ease-in-out infinite;
    border-radius: 6px;
  }
  * { box-sizing: border-box; }
`;

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (document.getElementById('razorpay-script')) { resolve(true); return; }
    const script = document.createElement('script');
    script.id = 'razorpay-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/* ─── Loading Skeleton ─── */
function LoadingSkeleton() {
  const cardTitles = ['WHAT IS THIS?', 'WHAT IT MEANS FOR YOU', 'WHAT TO DO NEXT'];
  const borderColors = [CARD_COLORS.what_is_this, CARD_COLORS.what_it_means_for_you, CARD_COLORS.what_to_do_next];
  return (
    <div>
      {cardTitles.map((title, i) => (
        <div key={i} style={{
          backgroundColor: '#fff', borderRadius: 16, padding: '20px 22px', marginBottom: 14,
          boxShadow: '0 2px 16px rgba(83,74,183,0.07)', borderLeft: `4px solid ${borderColors[i]}`,
          animation: `fadeInUp 0.25s ease ${i * 60}ms both`,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: borderColors[i], letterSpacing: '1.2px', marginBottom: 12 }}>{title}</div>
          <div className="shimmer-line" style={{ height: 14, width: '90%', marginBottom: 8 }} />
          <div className="shimmer-line" style={{ height: 14, width: '75%', marginBottom: 8 }} />
          {i === 2 && <div className="shimmer-line" style={{ height: 14, width: '60%' }} />}
        </div>
      ))}
      <div style={{ textAlign: 'center', fontSize: 14, color: '#aaa', marginTop: 8, animation: 'pulse 1.4s ease-in-out infinite' }}>
        AI is reading your document...
      </div>
    </div>
  );
}

/* ─── Onboarding Tooltip ─── */
function OnboardingTooltip({ step, onNext, onSkip }) {
  const steps = [
    {
      target: 'examples',
      title: 'Try an example',
      body: 'Tap any chip below to load a sample document and see how Decode works.',
      icon: '💡',
    },
    {
      target: 'language',
      title: 'Choose your language',
      body: 'Select English, Hindi, or Bengali — Decode explains in whichever you prefer.',
      icon: '🌐',
    },
    {
      target: 'button',
      title: 'Click Decode',
      body: 'Hit the Decode button to get a plain language explanation in seconds.',
      icon: '✨',
    },
  ];

  const current = steps[step];

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      width: 'min(480px, calc(100vw - 32px))',
      backgroundColor: '#fff', borderRadius: 16,
      boxShadow: '0 8px 40px rgba(83,74,183,0.25)',
      padding: '20px 22px', zIndex: 3000,
      animation: 'slideUp 0.3s ease both',
      border: `2px solid ${ACCENT}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {steps.map((_, i) => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: i === step ? ACCENT : '#e0ddf5' }} />
          ))}
        </div>
        <button onClick={onSkip} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: 13, cursor: 'pointer' }}>Skip</button>
      </div>
      <div style={{ fontSize: 22, marginBottom: 8 }}>{current.icon}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e', marginBottom: 6 }}>{current.title}</div>
      <p style={{ margin: '0 0 16px', fontSize: 14, color: '#666', lineHeight: 1.5 }}>{current.body}</p>
      <button
        onClick={onNext}
        style={{
          width: '100%', padding: '12px 0', backgroundColor: ACCENT,
          color: '#fff', border: 'none', borderRadius: 10,
          fontSize: 15, fontWeight: 700, cursor: 'pointer', minHeight: 48,
        }}
      >
        {step < steps.length - 1 ? 'Next →' : 'Got it!'}
      </button>
    </div>
  );
}

/* ─── Admin Page ─── */
function AdminPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchStats() {
    try {
      const res = await fetch('/api/admin/stats');
      const json = await res.json();
      setData(json);
    } catch { /* ignore */ }
    setLoading(false);
  }

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const cardStyle = { backgroundColor: '#1e1e2e', borderRadius: 16, padding: '24px 28px', flex: 1, minWidth: 140 };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#13131f', fontFamily: "'Segoe UI', system-ui, sans-serif", color: '#fff', padding: 24 }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>🔍 Decode Admin</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>Auto-refreshes every 30 seconds</p>
          </div>
          <button onClick={fetchStats} style={{ backgroundColor: ACCENT, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 48 }}>Refresh now</button>
        </div>
        {loading ? <p style={{ color: '#888' }}>Loading stats...</p> : !data ? <p style={{ color: '#ff6b6b' }}>Could not load stats.</p> : (
          <>
            <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
              {[
                { label: 'Decodes Today', value: data.decodesToday, color: '#3B82F6' },
                { label: 'Follow-ups Today', value: data.followupsToday, color: '#10B981' },
                { label: 'Waitlist Signups', value: data.waitlistCount, color: '#F59E0B' },
              ].map(({ label, value, color }) => (
                <div key={label} style={cardStyle}>
                  <div style={{ fontSize: 42, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
                  <div style={{ fontSize: 14, color: '#aaa', marginTop: 8 }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ backgroundColor: '#1e1e2e', borderRadius: 16, padding: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#aaa', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '1px' }}>Last 10 Decodes</div>
              {data.lastDecodes.length === 0 ? <p style={{ color: '#555', fontSize: 14 }}>No decodes yet today.</p> : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>{['Time', 'Document Type', 'Language'].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 12, color: '#666', fontWeight: 600, paddingBottom: 12, borderBottom: '1px solid #2a2a3e' }}>{h}</th>
                  ))}</tr></thead>
                  <tbody>{data.lastDecodes.map((d, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #1a1a2e' }}>
                      <td style={{ padding: '12px 0', fontSize: 13, color: '#888' }}>{new Date(d.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td style={{ padding: '12px 8px', fontSize: 13, color: '#ddd' }}><span style={{ backgroundColor: '#2a2a4e', padding: '3px 10px', borderRadius: 20, fontSize: 12 }}>{d.docType}</span></td>
                      <td style={{ padding: '12px 0', fontSize: 13, color: '#ddd' }}>{d.language}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Upgrade Screen ─── */
function UpgradeScreen({ onBack }) {
  const [phone, setPhone] = useState('');
  const [paying, setPaying] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  async function handleUpgrade() {
    if (!phone.trim() || phone.trim().length < 10) { setPhoneError('Please enter a valid 10-digit mobile number.'); return; }
    setPhoneError('');
    setPaying(true);
    let keyId;
    try {
      const res = await fetch('/api/payment/razorpay-key');
      const data = await res.json();
      keyId = data.key_id;
    } catch { alert('Could not reach payment server. Please try again.'); setPaying(false); return; }
    if (!keyId) { alert('Payment is not configured yet.'); setPaying(false); return; }
    const loaded = await loadRazorpayScript();
    if (!loaded) { alert('Could not load payment gateway.'); setPaying(false); return; }
    const options = {
      key: keyId, amount: 19900, currency: 'INR', name: 'Decode',
      description: 'Pro Monthly - Unlimited Decodes', theme: { color: ACCENT },
      prefill: { contact: phone },
      handler: async function (response) {
        try { await fetch('/api/payment/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, razorpay_payment_id: response.razorpay_payment_id }) }); } catch { /* best-effort */ }
        localStorage.setItem('decode_is_paid', 'true');
        localStorage.setItem('decode_count', '0');
        alert('Welcome to Decode Pro! Unlimited decodes unlocked.');
        window.location.reload();
      },
      modal: { ondismiss: () => setPaying(false) },
    };
    const rzp = new window.Razorpay(options);
    rzp.open();
    setPaying(false);
  }

  const freeFeatures = ['3 decodes per day', 'English, Hindi, Bengali', 'Image upload', '—'];
  const proFeatures = ['Unlimited decodes', 'All languages', 'Image upload', 'Full decode history', 'Follow-up questions', 'Read aloud'];

  return (
    <div style={{ backgroundColor: '#fff', borderRadius: 20, padding: '28px 24px', boxShadow: '0 2px 20px rgba(83,74,183,0.1)' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>🔓</div>
        <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: '#1a1a2e' }}>Unlock Decode Pro</h2>
        <p style={{ margin: '0 0 10px', fontSize: 14, color: '#666' }}>Join thousands of Indians who understand their documents</p>
        <div style={{ fontSize: 14, color: '#F59E0B', fontWeight: 600 }}>★★★★★ Trusted by patients, tenants &amp; families</div>
      </div>

      {/* Pricing cards — always stacked vertically for mobile */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        <div style={{ border: '2px solid #e8e6f0', borderRadius: 14, padding: '16px 18px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#444' }}>Free — ₹0/month</div>
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {freeFeatures.map((f, i) => (
                <span key={i} style={{ fontSize: 13, color: f === '—' ? '#ccc' : '#555', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: f === '—' ? '#ddd' : '#10B981' }}>{f === '—' ? '✗' : '✓'}</span>
                  {f === '—' ? 'No history' : f}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div style={{ border: `2px solid ${ACCENT}`, borderRadius: 14, padding: '16px 18px', backgroundColor: '#faf9ff', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 10, right: -20, backgroundColor: ACCENT, color: '#fff', fontSize: 10, fontWeight: 800, padding: '3px 26px', transform: 'rotate(35deg)' }}>POPULAR</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: ACCENT }}>Pro — ₹199/month</div>
          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {proFeatures.map((f, i) => (
              <span key={i} style={{ fontSize: 13, color: '#333', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: '#10B981' }}>✓</span> {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 14, fontWeight: 600, color: '#444', display: 'block', marginBottom: 8 }}>Mobile number (for your account)</label>
        <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit mobile number"
          style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: `2px solid ${phoneError ? '#ffd0d0' : '#e8e6f0'}`, fontSize: 16, color: '#1a1a2e', outline: 'none', fontFamily: 'inherit', minHeight: 48 }} />
        {phoneError && <p style={{ margin: '6px 0 0', fontSize: 14, color: '#cc3333' }}>{phoneError}</p>}
      </div>

      <button onClick={handleUpgrade} disabled={paying} style={{ width: '100%', padding: '15px 0', backgroundColor: paying ? '#9992d4' : ACCENT, color: '#fff', border: 'none', borderRadius: 12, fontSize: 17, fontWeight: 700, cursor: paying ? 'not-allowed' : 'pointer', marginBottom: 14, minHeight: 56 }}>
        {paying ? 'Opening payment...' : 'Upgrade to Pro — ₹199/month'}
      </button>
      <div style={{ textAlign: 'center' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#999', fontSize: 14, cursor: 'pointer', textDecoration: 'underline', minHeight: 44, padding: '8px 0' }}>Back to free version</button>
      </div>
    </div>
  );
}

/* ─── History Screen ─── */
function HistoryScreen({ isPaid, onBack }) {
  const [history, setHistory] = useState(getHistory());
  const [selected, setSelected] = useState(null);
  const visible = isPaid ? history : history.slice(0, 5);

  function handleClear() {
    if (window.confirm('Clear all decode history?')) { clearHistory(); setHistory([]); }
  }

  if (selected) {
    return (
      <div>
        <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: ACCENT, fontSize: 15, fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', display: 'flex', alignItems: 'center', gap: 6, minHeight: 48 }}>← Back to history</button>
        <div style={{ fontSize: 13, color: '#aaa', marginBottom: 4 }}>{selected.docType} · {timeAgo(selected.id)}</div>
        <div style={{ fontSize: 14, color: '#666', marginBottom: 20, fontStyle: 'italic' }}>{selected.preview}</div>
        {[
          { key: 'what_is_this', label: 'WHAT IS THIS?', color: CARD_COLORS.what_is_this },
          { key: 'what_it_means_for_you', label: 'WHAT IT MEANS FOR YOU', color: CARD_COLORS.what_it_means_for_you },
          { key: 'what_to_do_next', label: 'WHAT TO DO NEXT', color: CARD_COLORS.what_to_do_next },
        ].map(({ key, label, color }) => (
          <div key={key} style={{ backgroundColor: '#fff', borderRadius: 16, padding: '20px 22px', marginBottom: 14, boxShadow: '0 2px 16px rgba(83,74,183,0.07)', borderLeft: `4px solid ${color}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: '1.2px', marginBottom: 10 }}>{label}</div>
            {key === 'what_to_do_next' ? (
              <ol style={{ margin: 0, padding: '0 0 0 20px' }}>
                {(selected.result.what_to_do_next || []).map((step, i) => <li key={i} style={{ fontSize: 15, color: '#1a1a2e', lineHeight: 1.65, marginBottom: 8 }}>{step}</li>)}
              </ol>
            ) : <p style={{ margin: 0, fontSize: 15, color: '#1a1a2e', lineHeight: 1.65 }}>{selected.result[key]}</p>}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: ACCENT, fontSize: 15, fontWeight: 600, cursor: 'pointer', padding: 0, minHeight: 48, display: 'flex', alignItems: 'center' }}>← Back</button>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e' }}>Decode History</div>
        <div style={{ width: 60 }} />
      </div>
      {!isPaid && history.length > 5 && (
        <div style={{ backgroundColor: '#fff8e6', border: '1px solid #ffe08a', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 14, color: '#92650a' }}>
          Showing last 5. Upgrade to Pro to see all {history.length}.
        </div>
      )}
      {visible.length === 0 ? (
        <div style={{ backgroundColor: '#fff', borderRadius: 16, padding: '40px 24px', textAlign: 'center', boxShadow: '0 2px 16px rgba(83,74,183,0.07)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
          <p style={{ margin: 0, fontSize: 15, color: '#999' }}>No decodes yet. Decode your first document!</p>
        </div>
      ) : (
        <div>
          {visible.map((item) => (
            <div key={item.id} onClick={() => setSelected(item)} style={{ backgroundColor: '#fff', borderRadius: 14, padding: '16px 18px', marginBottom: 12, boxShadow: '0 2px 12px rgba(83,74,183,0.06)', cursor: 'pointer', borderLeft: `3px solid ${ACCENT}` }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(83,74,183,0.15)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(83,74,183,0.06)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ backgroundColor: '#f0eeff', color: ACCENT, fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>{item.docType}</span>
                <span style={{ fontSize: 13, color: '#aaa' }}>{timeAgo(item.id)}</span>
              </div>
              <p style={{ margin: 0, fontSize: 14, color: '#444', lineHeight: 1.5 }}>{item.preview}</p>
            </div>
          ))}
          {visible.length > 0 && (
            <button onClick={handleClear} style={{ width: '100%', padding: '14px 0', marginTop: 8, backgroundColor: 'transparent', color: '#cc3333', border: '1px solid #ffd0d0', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 48 }}>
              Clear history
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Waitlist Bar ─── */
function WaitlistBar({ onDismiss }) {
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!phone || phone.length < 10) return;
    setSubmitting(true);
    try {
      await fetch('/api/waitlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }) });
      const nums = JSON.parse(localStorage.getItem('waitlist_numbers') || '[]');
      if (!nums.includes(phone)) { nums.push(phone); localStorage.setItem('waitlist_numbers', JSON.stringify(nums)); }
    } catch { /* best-effort */ }
    setSubmitted(true);
    setSubmitting(false);
  }

  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: ACCENT, color: '#fff', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', boxShadow: '0 -4px 20px rgba(83,74,183,0.3)', animation: 'slideUp 0.4s ease both', zIndex: 1000 }}>
      {submitted ? (
        <div style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>Thanks! We'll keep you updated 🙏</div>
      ) : (
        <>
          <div style={{ flex: 1, fontSize: 14, fontWeight: 600, minWidth: 160 }}>Love Decode? Get notified about new features</div>
          <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="Mobile number" style={{ padding: '10px 12px', borderRadius: 8, border: 'none', fontSize: 16, color: '#1a1a2e', outline: 'none', width: 160, flexShrink: 0, minHeight: 44 }} />
          <button onClick={handleSubmit} disabled={submitting || phone.length < 10} style={{ backgroundColor: '#fff', color: ACCENT, border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 14, fontWeight: 700, cursor: phone.length < 10 ? 'default' : 'pointer', flexShrink: 0, opacity: phone.length < 10 ? 0.6 : 1, minHeight: 44 }}>
            {submitting ? '...' : 'Notify me'}
          </button>
        </>
      )}
      <button onClick={onDismiss} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 20, cursor: 'pointer', padding: '0 4px', flexShrink: 0, lineHeight: 1, minHeight: 44, display: 'flex', alignItems: 'center' }}>✕</button>
    </div>
  );
}

/* ─── Main App ─── */
export default function App() {
  if (window.location.pathname === '/admin') return <AdminPage />;

  const [language, setLanguage] = useState('English');
  const [docType, setDocType] = useState('Medical report');
  const [text, setText] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [slowWarning, setSlowWarning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [failCount, setFailCount] = useState(0);
  const [usageCount, setUsageCount] = useState(getUsageCount());
  const [limitReached, setLimitReached] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isPaid, setIsPaid] = useState(getIsPaid());
  const [followups, setFollowups] = useState([]);
  const [followupQ, setFollowupQ] = useState('');
  const [followupLoading, setFollowupLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [referralToast, setReferralToast] = useState(false);
  const [referralLink, setReferralLink] = useState('');
  const [referralCopied, setReferralCopied] = useState(false);
  const [resultCopied, setResultCopied] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(null);
  const fileInputRef = useRef(null);
  const slowTimerRef = useRef(null);

  useEffect(() => {
    const count = getUsageCount();
    setUsageCount(count);
    const paid = getIsPaid();
    setIsPaid(paid);
    if (count >= getDailyLimit() && !paid) setLimitReached(true);

    const dismissed = localStorage.getItem('waitlist_dismissed') === 'true';
    if (!dismissed) {
      const hasDecoded = count > 0 || getHistory().length > 0;
      if (hasDecoded) setShowWaitlist(true);
    }

    if (!localStorage.getItem('seen_onboarding')) {
      setOnboardingStep(0);
    }

    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      try {
        const usedRefs = JSON.parse(localStorage.getItem('used_refs') || '[]');
        if (!usedRefs.includes(ref)) {
          addBonus();
          usedRefs.push(ref);
          localStorage.setItem('used_refs', JSON.stringify(usedRefs));
          setReferralToast(true);
          setTimeout(() => setReferralToast(false), 5000);
        }
      } catch { /* ignore */ }
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (result || text) return;
    const timer = setInterval(() => setPlaceholderIdx(i => (i + 1) % PLACEHOLDERS.length), 3000);
    return () => clearInterval(timer);
  }, [result, text]);

  useEffect(() => {
    if (result) {
      document.title = `✓ Decoded — ${docType} | Decode`;
    } else {
      document.title = 'Decode — Understand Any Document in Hindi, Bengali & English';
    }
  }, [result, docType]);

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setImagePreview(dataUrl);
      setImageBase64(dataUrl.split(',')[1]);
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveImage() {
    setImageBase64(''); setImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleDecode() {
    if (!imageBase64 && !text.trim()) { setError('Please paste text or upload a document image.'); return; }

    if (!navigator.onLine) {
      setError('No internet connection. Please check your connection and try again.');
      return;
    }

    const currentCount = getUsageCount();
    const limit = getDailyLimit();
    if (currentCount >= limit && !isPaid) { setLimitReached(true); setShowUpgrade(true); return; }

    setLoading(true); setError(''); setResult(null); setSlowWarning(false);

    slowTimerRef.current = setTimeout(() => setSlowWarning(true), 15000);

    try {
      const res = await fetch('/api/decode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-usage-count': String(currentCount), 'x-is-paid': String(isPaid), 'x-bonus': String(getBonus()) },
        body: JSON.stringify({ text, imageBase64, language, docType }),
      });
      clearTimeout(slowTimerRef.current);

      if (res.status === 402) { setLimitReached(true); setShowUpgrade(true); setLoading(false); return; }
      const data = await res.json();
      if (!data.success) {
        const newFail = failCount + 1;
        setFailCount(newFail);
        if (newFail >= 3) {
          setError('Our AI is busy right now. Try again in a few minutes.');
        } else {
          setError(data.error || 'Something went wrong. Please try again.');
        }
        setLoading(false); return;
      }
      setFailCount(0);
      if (!isPaid) {
        const newCount = incrementUsage();
        setUsageCount(newCount);
        if (newCount >= getDailyLimit()) setLimitReached(true);
      }
      const preview = text.trim().slice(0, 60) + (text.trim().length > 60 ? '...' : '');
      saveToHistory({ id: Date.now(), docType, language, preview: preview || `[Image] ${docType}`, result: data.result });
      setResult(data.result);
      setReferralLink(window.location.origin + '?ref=' + btoa(String(Date.now())));
      const dismissed = localStorage.getItem('waitlist_dismissed') === 'true';
      if (!dismissed) setShowWaitlist(true);
    } catch (err) {
      clearTimeout(slowTimerRef.current);
      if (!navigator.onLine) {
        setError('No internet connection. Please check your connection and try again.');
      } else {
        const newFail = failCount + 1;
        setFailCount(newFail);
        setError(newFail >= 3 ? 'Our AI is busy right now. Try again in a few minutes.' : 'Could not connect to server. Please try again.');
      }
    }
    setLoading(false);
  }

  function handleReset() {
    clearTimeout(slowTimerRef.current);
    setResult(null); setError(''); setText('');
    setImageBase64(''); setImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    const paid = getIsPaid();
    setIsPaid(paid);
    setLimitReached(getUsageCount() >= getDailyLimit() && !paid);
    setShowUpgrade(false);
    setFollowups([]); setFollowupQ('');
    setReferralCopied(false); setReferralLink('');
    setResultCopied(false); setSlowWarning(false);
    window.speechSynthesis && window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  async function handleFollowup() {
    if (!followupQ.trim()) return;
    const q = followupQ.trim();
    setFollowupQ('');
    setFollowupLoading(true);
    try {
      const res = await fetch('/api/decode/followup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: q, originalText: text, language }) });
      const data = await res.json();
      setFollowups(prev => [...prev, { q, a: data.success ? data.answer : data.error }]);
    } catch {
      setFollowups(prev => [...prev, { q, a: 'Could not get an answer. Please try again.' }]);
    }
    setFollowupLoading(false);
  }

  function handleReadAloud() {
    if (!window.speechSynthesis) return;
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const langMap = { Hindi: 'hi-IN', Bengali: 'bn-IN', English: 'en-IN' };
    const fullText = [`What is this? ${result.what_is_this}`, `What it means for you. ${result.what_it_means_for_you}`, `What to do next. ${(result.what_to_do_next || []).join('. ')}`].join('. ');
    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.lang = langMap[language] || 'en-IN';
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  function handleWhatsAppShare() {
    const msg = `I just decoded a confusing document in seconds using Decode! 🔍\n\nIt explained everything in simple ${language}.\n\nTry it free: ${window.location.origin}`;
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
  }

  function handleCopyResult() {
    const steps = (result.what_to_do_next || []).map((s, i) => `${i + 1}. ${s}`).join('\n');
    const txt = `WHAT IS THIS?\n${result.what_is_this}\n\nWHAT IT MEANS FOR YOU:\n${result.what_it_means_for_you}\n\nWHAT TO DO NEXT:\n${steps}\n\nDecoded by Decode — decode.app`;
    navigator.clipboard.writeText(txt).then(() => {
      setResultCopied(true);
      setTimeout(() => setResultCopied(false), 2500);
    });
  }

  function handleCopyReferral() {
    navigator.clipboard.writeText(referralLink).then(() => {
      setReferralCopied(true);
      setTimeout(() => setReferralCopied(false), 2500);
    });
  }

  function dismissWaitlist() {
    localStorage.setItem('waitlist_dismissed', 'true');
    setShowWaitlist(false);
  }

  function advanceOnboarding() {
    if (onboardingStep >= 2) {
      localStorage.setItem('seen_onboarding', 'true');
      setOnboardingStep(null);
    } else {
      setOnboardingStep(s => s + 1);
    }
  }

  function skipOnboarding() {
    localStorage.setItem('seen_onboarding', 'true');
    setOnboardingStep(null);
  }

  const remaining = getDailyLimit() - usageCount;

  const ringStyle = (target) => {
    if (onboardingStep === null) return {};
    const map = { 0: 'examples', 1: 'language', 2: 'button' };
    if (map[onboardingStep] !== target) return {};
    return { animation: 'ringPulse 1.2s ease-in-out infinite', borderRadius: 12 };
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f7f6fb', fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", paddingBottom: showWaitlist ? 88 : 0 }}>
      <style>{globalStyles}</style>

      {/* Referral toast */}
      {referralToast && (
        <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', backgroundColor: '#10B981', color: '#fff', padding: '12px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600, zIndex: 2000, boxShadow: '0 4px 20px rgba(16,185,129,0.3)', whiteSpace: 'nowrap', animation: 'fadeInUp 0.3s ease both' }}>
          🎁 You got 1 bonus decode from a friend!
        </div>
      )}

      {/* Onboarding */}
      {onboardingStep !== null && !result && !loading && (
        <OnboardingTooltip step={onboardingStep} onNext={advanceOnboarding} onSkip={skipOnboarding} />
      )}

      {/* Header */}
      <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #ede9f8', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 22 }}>🔍</span>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', lineHeight: 1.2 }}>Decode</div>
          <div style={{ fontSize: 13, color: '#999', marginTop: 1 }}>Understand any document in plain language</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {isPaid && <div style={{ backgroundColor: '#f0eeff', color: ACCENT, fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20 }}>PRO</div>}
          <button onClick={() => { setShowHistory(true); setShowUpgrade(false); setResult(null); }} style={{ backgroundColor: 'transparent', color: ACCENT, border: `1.5px solid ${ACCENT}`, borderRadius: 20, fontSize: 14, fontWeight: 600, padding: '8px 16px', cursor: 'pointer', minHeight: 44 }}>History</button>
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px 48px' }}>

        {showHistory ? (
          <HistoryScreen isPaid={isPaid} onBack={() => setShowHistory(false)} />
        ) : showUpgrade ? (
          <UpgradeScreen onBack={() => setShowUpgrade(false)} />
        ) : loading ? (
          <LoadingSkeleton />
        ) : !result ? (
          <div style={{ backgroundColor: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 2px 20px rgba(83,74,183,0.08)' }}>

            {/* Language selector */}
            <div style={{ marginBottom: 20, ...ringStyle('language') }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: '#444', display: 'block', marginBottom: 10 }}>Explain in</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {LANGUAGES.map(lang => (
                  <button key={lang} onClick={() => setLanguage(lang)} style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: language === lang ? `2px solid ${ACCENT}` : '2px solid #e8e6f0', backgroundColor: language === lang ? '#eeecf9' : '#fff', color: language === lang ? ACCENT : '#666', fontWeight: language === lang ? 700 : 500, fontSize: 14, cursor: 'pointer', transition: 'all 0.15s', minHeight: 48 }}>{lang}</button>
                ))}
              </div>
            </div>

            {/* Document type */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: '#444', display: 'block', marginBottom: 10 }}>Document type</label>
              <select value={docType} onChange={e => setDocType(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '2px solid #e8e6f0', backgroundColor: '#fff', fontSize: 15, color: '#1a1a2e', outline: 'none', cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23999' stroke-width='2' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: 36, minHeight: 48 }}>
                {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Image upload */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: '#444', display: 'block', marginBottom: 10 }}>Upload document image</label>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageChange} style={{ display: 'none' }} />
              {!imagePreview ? (
                <div onClick={() => fileInputRef.current && fileInputRef.current.click()} style={{ border: '2px dashed #c9c4e8', borderRadius: 12, padding: '22px 16px', textAlign: 'center', cursor: 'pointer', backgroundColor: '#faf9ff', transition: 'all 0.15s', minHeight: 80 }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.backgroundColor = '#f0eeff'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#c9c4e8'; e.currentTarget.style.backgroundColor = '#faf9ff'; }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📷</div>
                  <p style={{ margin: 0, fontSize: 14, color: '#666' }}>Take a photo or upload document image</p>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#aaa' }}>JPG, PNG, HEIC — any image format</p>
                </div>
              ) : (
                <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: `2px solid ${ACCENT}` }}>
                  <img src={imagePreview} alt="Document" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }} />
                  <button onClick={handleRemoveImage} style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: 20, padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer', minHeight: 36 }}>✕ Remove</button>
                </div>
              )}
            </div>

            {/* Textarea */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: '#444', display: 'block', marginBottom: 10 }}>
                Document text{imageBase64 && <span style={{ fontWeight: 400, color: '#aaa' }}> (optional if image uploaded)</span>}
              </label>
              <textarea value={text} onChange={e => setText(e.target.value)} placeholder={PLACEHOLDERS[placeholderIdx]} rows={5}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '2px solid #e8e6f0', fontSize: 15, color: '#1a1a2e', lineHeight: 1.6, resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor = ACCENT}
                onBlur={e => e.target.style.borderColor = '#e8e6f0'}
              />
              {/* Example chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10, ...ringStyle('examples') }}>
                {EXAMPLES.map((ex, i) => (
                  <button key={i} onClick={() => setText(ex)} style={{ fontSize: 13, padding: '7px 14px', borderRadius: 20, border: '1px solid #ddd9f5', backgroundColor: '#f5f3ff', color: ACCENT, cursor: 'pointer', lineHeight: 1.4, transition: 'background-color 0.15s', minHeight: 36 }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#eeecf9'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f5f3ff'}
                  >{ex.length > 38 ? ex.slice(0, 38) + '…' : ex}</button>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ backgroundColor: '#fff3f3', border: '1px solid #ffd0d0', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                <p style={{ margin: '0 0 10px', fontSize: 14, color: '#cc3333', lineHeight: 1.5 }}>{error}</p>
                <button onClick={handleDecode} style={{ backgroundColor: ACCENT, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer', minHeight: 44 }}>
                  Try again
                </button>
              </div>
            )}

            {/* Freemium gate or decode button */}
            {limitReached && !isPaid ? (
              <button onClick={() => setShowUpgrade(true)} style={{ width: '100%', padding: '15px 0', backgroundColor: ACCENT, color: '#fff', border: 'none', borderRadius: 12, fontSize: 17, fontWeight: 700, cursor: 'pointer', minHeight: 56 }}>
                🔒 Upgrade for Unlimited Decodes
              </button>
            ) : (
              <>
                {!isPaid && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <span style={{ fontSize: 14, fontWeight: remaining === 1 ? 600 : 400, color: remaining === 1 ? '#F59E0B' : '#999' }}>
                      {remaining === 1 ? '⚠️ ' : ''}{remaining} free decode{remaining !== 1 ? 's' : ''} remaining today
                      {getBonus() > 0 && <span style={{ color: '#10B981', fontSize: 13 }}> (+{getBonus()} bonus)</span>}
                    </span>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {Array.from({ length: getDailyLimit() }).map((_, i) => (
                        <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: i < usageCount ? '#e0ddf5' : '#22C55E' }} />
                      ))}
                    </div>
                  </div>
                )}
                <div style={ringStyle('button')}>
                  <button onClick={handleDecode} style={{ width: '100%', padding: '15px 0', backgroundColor: ACCENT, color: '#fff', border: 'none', borderRadius: 12, fontSize: 17, fontWeight: 700, cursor: 'pointer', transition: 'background-color 0.15s', minHeight: 56 }}
                    onMouseEnter={e => e.target.style.backgroundColor = ACCENT_DARK}
                    onMouseLeave={e => e.target.style.backgroundColor = ACCENT}
                  >Decode it</button>
                </div>
              </>
            )}

            {/* Trust badges */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18, flexWrap: 'wrap' }}>
              {['🔒 Private & secure', '⚡ Results in 10 seconds', '🇮🇳 Made for India'].map((badge, i, arr) => (
                <span key={i} style={{ fontSize: 13, color: '#999', padding: '0 10px', borderRight: i < arr.length - 1 ? '1px solid #ddd' : 'none' }}>{badge}</span>
              ))}
            </div>

            {/* How it works */}
            <div style={{ marginTop: 28, paddingTop: 24, borderTop: '1px solid #f0eeff' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#aaa', textAlign: 'center', marginBottom: 18, letterSpacing: '0.5px', textTransform: 'uppercase' }}>How it works</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { icon: '📋', step: '1', title: 'Paste or upload', desc: 'Your document' },
                  { icon: '🌐', step: '2', title: 'Choose language', desc: 'English, Hindi, Bengali' },
                  { icon: '✨', step: '3', title: 'Get explanation', desc: 'In plain language' },
                ].map(({ icon, step, title, desc }) => (
                  <div key={step} style={{ flex: 1, textAlign: 'center', padding: '14px 8px', backgroundColor: '#faf9ff', borderRadius: 12 }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: ACCENT, marginBottom: 4 }}>Step {step}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 2 }}>{title}</div>
                    <div style={{ fontSize: 12, color: '#aaa' }}>{desc}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ) : (
          /* Result section */
          <div>
            {/* Result cards */}
            {[
              { key: 'what_is_this', label: 'WHAT IS THIS?', color: CARD_COLORS.what_is_this, delay: '0ms' },
              { key: 'what_it_means_for_you', label: 'WHAT IT MEANS FOR YOU', color: CARD_COLORS.what_it_means_for_you, delay: '80ms' },
              { key: 'what_to_do_next', label: 'WHAT TO DO NEXT', color: CARD_COLORS.what_to_do_next, delay: '160ms' },
            ].map(({ key, label, color, delay }) => (
              <div key={key} style={{ backgroundColor: '#fff', borderRadius: 16, padding: '20px 22px', marginBottom: 14, boxShadow: '0 2px 16px rgba(83,74,183,0.07)', borderLeft: `4px solid ${color}`, animation: 'fadeInUp 0.35s ease both', animationDelay: delay }}>
                <div style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: '1.2px', marginBottom: 10 }}>{label}</div>
                {key === 'what_to_do_next' ? (
                  <ol style={{ margin: 0, padding: '0 0 0 20px' }}>
                    {(result.what_to_do_next || []).map((step, i) => <li key={i} style={{ fontSize: 15, color: '#1a1a2e', lineHeight: 1.65, marginBottom: i < result.what_to_do_next.length - 1 ? 10 : 0 }}>{step}</li>)}
                  </ol>
                ) : <p style={{ margin: 0, fontSize: 15, color: '#1a1a2e', lineHeight: 1.65 }}>{result[key]}</p>}
              </div>
            ))}

            {/* Action row: Copy + Read aloud */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 12, animation: 'fadeInUp 0.35s ease 200ms both' }}>
              <button onClick={handleCopyResult} style={{ flex: 1, height: 48, backgroundColor: '#fff', color: ACCENT, border: `2px solid ${ACCENT}`, borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'background-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0eeff'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fff'}>
                {resultCopied ? '✓ Copied!' : '📋 Copy result'}
              </button>
              <button onClick={handleReadAloud} style={{ flex: 1, height: 48, backgroundColor: '#fff', color: ACCENT, border: `2px solid ${ACCENT}`, borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'background-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0eeff'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fff'}>
                {speaking ? '⏹ Stop' : '🔊 Read aloud'}
              </button>
            </div>

            {/* Referral card */}
            <div style={{ backgroundColor: '#fff', borderRadius: 16, padding: '18px 22px', marginBottom: 14, boxShadow: '0 2px 16px rgba(83,74,183,0.07)', animation: 'fadeInUp 0.35s ease 240ms both', border: '1px dashed #c9c4e8' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', marginBottom: 6 }}>🎁 Give a friend 1 free extra decode</div>
              <p style={{ margin: '0 0 14px', fontSize: 14, color: '#777', lineHeight: 1.5 }}>Share your link — they get 1 bonus decode automatically.</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, backgroundColor: '#f7f6fb', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{referralLink}</div>
                <button onClick={handleCopyReferral} style={{ flexShrink: 0, padding: '10px 16px', backgroundColor: referralCopied ? '#10B981' : ACCENT, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'background-color 0.2s', minHeight: 44 }}>
                  {referralCopied ? '✓ Copied!' : 'Copy link'}
                </button>
              </div>
            </div>

            {/* WhatsApp share */}
            <button onClick={handleWhatsAppShare} style={{ width: '100%', height: 52, backgroundColor: '#25D366', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 12, animation: 'fadeInUp 0.35s ease 300ms both' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1fb855'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#25D366'}>
              📤 Share on WhatsApp
            </button>

            {/* Follow-up chat */}
            <div style={{ backgroundColor: '#fff', borderRadius: 16, padding: '20px 22px', marginBottom: 14, boxShadow: '0 2px 16px rgba(83,74,183,0.07)', animation: 'fadeInUp 0.35s ease 360ms both' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#444', marginBottom: 14 }}>Have a question about this document?</div>
              {followups.map((item, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ backgroundColor: '#f0eeff', borderRadius: '12px 12px 4px 12px', padding: '10px 14px', fontSize: 14, color: ACCENT, fontWeight: 500, marginBottom: 8 }}>{item.q}</div>
                  <div style={{ backgroundColor: '#f7f6fb', borderRadius: '4px 12px 12px 12px', padding: '10px 14px', fontSize: 14, color: '#1a1a2e', lineHeight: 1.6 }}>{item.a}</div>
                </div>
              ))}
              {followupLoading && <div style={{ fontSize: 14, color: '#aaa', marginBottom: 12, animation: 'pulse 1.4s ease-in-out infinite' }}>Thinking...</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={followupQ} onChange={e => setFollowupQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && !followupLoading && handleFollowup()} placeholder="Ask anything... e.g. Is this serious?"
                  style={{ flex: 1, padding: '12px 14px', borderRadius: 10, border: '2px solid #e8e6f0', fontSize: 16, color: '#1a1a2e', outline: 'none', fontFamily: 'inherit', minHeight: 48 }}
                  onFocus={e => e.target.style.borderColor = ACCENT}
                  onBlur={e => e.target.style.borderColor = '#e8e6f0'}
                />
                <button onClick={handleFollowup} disabled={followupLoading || !followupQ.trim()} style={{ padding: '12px 18px', backgroundColor: followupLoading ? '#9992d4' : ACCENT, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: followupLoading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', flexShrink: 0, minHeight: 48 }}>Ask</button>
              </div>
            </div>

            <button onClick={handleReset} style={{ width: '100%', padding: '15px 0', backgroundColor: ACCENT, color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer', animation: 'fadeInUp 0.35s ease 420ms both', minHeight: 56 }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = ACCENT_DARK}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = ACCENT}>
              Decode another document
            </button>
          </div>
        )}

        {/* Slow warning */}
        {slowWarning && loading && (
          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: '#999', animation: 'fadeInUp 0.3s ease both' }}>
            ⏳ Taking longer than usual... please wait
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: 13, color: '#ccc', marginTop: 32 }}>Decode — making documents simple for everyone</p>
      </div>

      {/* Waitlist sticky bar */}
      {showWaitlist && !showHistory && !showUpgrade && !loading && (
        <WaitlistBar onDismiss={dismissWaitlist} />
      )}
    </div>
  );
}
