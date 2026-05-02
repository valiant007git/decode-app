import React, { useState, useEffect, useRef, useCallback } from 'react';

/* ─── Design Tokens ─── */
const C = {
  primary: '#534AB7',
  primaryDark: '#3D3589',
  primaryGlow: 'rgba(83,74,183,0.12)',
  primaryShadow: 'rgba(83,74,183,0.35)',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  bg: '#F8F7FF',
  surface: '#FFFFFF',
  surface2: '#F3F2FF',
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E8E6FF',
  shadow: '0 2px 20px rgba(83,74,183,0.08)',
};
const GRAD = `linear-gradient(135deg, ${C.primary}, #6C63D5)`;
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const R = { card: 16, input: 12, pill: 50 };
const IS_DEV = new URLSearchParams(window.location.search).get('dev') === 'true';
const API_BASE = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  ? 'https://decode-app-5ko9.onrender.com'
  : '';

/* ─── Constants ─── */
const LANGUAGES = ['English', 'Hindi', 'Bengali'];
const DOC_TYPES = ['Medical report','Legal notice','Bank document','Govt letter','Prescription','Contract','Other'];
const PLACEHOLDERS = ['Paste your medical report here...','Paste a legal notice here...','Paste a bank letter here...','Paste a government document here...'];
const EXAMPLES = ['Haemoglobin 9.2 g/dL, below normal range 12-16','Legal notice: vacate premises within 30 days','EMI bounced, NACH mandate rejected by bank','Government notice: appear before officer within 7 days'];
const CARD_COLORS = { what_is_this: '#3B82F6', what_it_means_for_you: C.success, what_to_do_next: C.primary };

/* ─── Helpers ─── */
function getTodayKey() { return 'decode_count_' + new Date().toISOString().slice(0, 10); }
function getUsageCount() { return parseInt(localStorage.getItem(getTodayKey()) || '0', 10); }
function incrementUsage() { const k = getTodayKey(), n = getUsageCount() + 1; localStorage.setItem(k, String(n)); return n; }
function getIsPaid() { return localStorage.getItem('decode_is_paid') === 'true'; }
function getBonus() { return parseInt(localStorage.getItem('decode_bonus') || '0', 10); }
function addBonus() { localStorage.setItem('decode_bonus', String(getBonus() + 1)); }
function getDailyLimit() { return 3 + getBonus(); }
function getHistory() { try { return JSON.parse(localStorage.getItem('decode_history') || '[]'); } catch { return []; } }
function saveToHistory(e) { const h = getHistory(); h.unshift(e); localStorage.setItem('decode_history', JSON.stringify(h.slice(0, 200))); }
function clearHistory() { localStorage.removeItem('decode_history'); }
function timeAgo(ts) { const d = Math.floor((Date.now() - ts) / 1000); if (d < 60) return 'just now'; if (d < 3600) return Math.floor(d/60) + 'm ago'; if (d < 86400) return Math.floor(d/3600) + 'h ago'; return Math.floor(d/86400) + 'd ago'; }

function loadRazorpayScript() {
  return new Promise(resolve => {
    if (document.getElementById('rzp-script')) { resolve(true); return; }
    const s = document.createElement('script'); s.id = 'rzp-script';
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true); s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const DOC_TYPE_COLORS = {
  'Medical report': '#3B82F6', 'Legal notice': '#EF4444', 'Bank document': '#F59E0B',
  'Govt letter': '#8B5CF6', 'Prescription': '#06B6D4', 'Contract': '#EC4899', 'Other': '#6B7280',
};

/* ─── Global CSS ─── */
const globalStyles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${C.bg}; }
  @keyframes fadeInUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  @keyframes slideInRight { from { transform:translateX(100%); } to { transform:translateX(0); } }
  @keyframes slideUp { from { transform:translateY(100%); opacity:0; } to { transform:translateY(0); opacity:1; } }
  @keyframes spin { to { transform:rotate(360deg); } }
  @keyframes shimmer { 0% { background-position:-600px 0; } 100% { background-position:600px 0; } }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.55; } }
  @keyframes ringPulse { 0%,100% { box-shadow:0 0 0 0 rgba(83,74,183,0.5); } 50% { box-shadow:0 0 0 10px rgba(83,74,183,0); } }
  @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
  @keyframes greenPop { 0%{transform:scale(1)} 50%{transform:scale(1.06)} 100%{transform:scale(1)} }
  .shimmer { background:linear-gradient(90deg,#f0eeff 25%,#e4e0f8 50%,#f0eeff 75%); background-size:600px 100%; animation:shimmer 1.5s ease-in-out infinite; border-radius:6px; }
  .btn-press:active { transform:scale(0.97) !important; }
  .chip:hover { border-color:${C.primary} !important; color:${C.primary} !important; background:${C.surface2} !important; }
  .card-hover:hover { transform:translateY(-2px); box-shadow:0 6px 28px rgba(83,74,183,0.13) !important; }
  input, textarea, select { font-family:${FONT}; }
  ::-webkit-scrollbar { width:0; height:0; }
  .chips-scroll { display:flex; gap:8px; overflow-x:auto; padding-bottom:2px; scrollbar-width:none; -ms-overflow-style:none; }
`;

/* ─── Spinner ─── */
const Spinner = ({ size = 18, color = '#fff' }) => (
  <span style={{ display:'inline-block', width:size, height:size, border:`2px solid ${color}33`, borderTop:`2px solid ${color}`, borderRadius:'50%', animation:'spin 0.7s linear infinite', flexShrink:0 }} />
);

/* ─── Loading Skeleton ─── */
function LoadingSkeleton() {
  const labels = [['WHAT IS THIS?','#3B82F6'],['WHAT IT MEANS FOR YOU','#10B981'],['WHAT TO DO NEXT','#534AB7']];
  return (
    <div>
      {labels.map(([label, color], i) => (
        <div key={i} style={{ background:C.surface, borderRadius:R.card, padding:20, marginBottom:12, boxShadow:C.shadow, borderTop:`3px solid ${color}`, animation:`fadeInUp 0.25s ease ${i*80}ms both` }}>
          <div style={{ fontSize:11, fontWeight:700, color, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:12 }}>{label}</div>
          <div className="shimmer" style={{ height:13, width:'88%', marginBottom:9 }} />
          <div className="shimmer" style={{ height:13, width:'72%', marginBottom:9 }} />
          {i === 2 && <div className="shimmer" style={{ height:13, width:'55%' }} />}
        </div>
      ))}
      <p style={{ textAlign:'center', fontSize:14, color:C.textMuted, marginTop:16, animation:'pulse 1.4s ease-in-out infinite' }}>
        AI is reading your document...
      </p>
    </div>
  );
}

/* ─── Onboarding Tooltip ─── */
function OnboardingTooltip({ step, onNext, onSkip }) {
  const steps = [
    { icon:'💡', title:'Try an example', body:'Tap any chip to load a sample document and see how Decode works.' },
    { icon:'🌐', title:'Choose your language', body:'Select English, Hindi, or Bengali — Decode explains in whichever you prefer.' },
    { icon:'✨', title:'Click Decode', body:'Hit the Decode button to get a plain language explanation in seconds.' },
  ];
  const s = steps[step];
  return (
    <div style={{ position:'fixed', bottom:80, left:'50%', transform:'translateX(-50%)', width:'min(440px,calc(100vw - 32px))', background:C.text, borderRadius:R.card, padding:'20px 22px', zIndex:3000, animation:'slideUp 0.3s ease both', boxShadow:'0 12px 40px rgba(26,26,46,0.4)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <div style={{ display:'flex', gap:6 }}>
          {steps.map((_,i) => <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:i===step?C.primary:'rgba(255,255,255,0.3)', transition:'background 0.2s' }} />)}
        </div>
        <button onClick={onSkip} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.5)', fontSize:13, cursor:'pointer' }}>Skip</button>
      </div>
      <div style={{ fontSize:24, marginBottom:10 }}>{s.icon}</div>
      <div style={{ fontSize:16, fontWeight:700, color:'#fff', marginBottom:6 }}>{s.title}</div>
      <p style={{ fontSize:14, color:'rgba(255,255,255,0.7)', lineHeight:1.55, marginBottom:18 }}>{s.body}</p>
      <button className="btn-press" onClick={onNext} style={{ width:'100%', height:48, background:GRAD, color:'#fff', border:'none', borderRadius:12, fontSize:15, fontWeight:600, cursor:'pointer' }}>
        {step < 2 ? 'Next →' : 'Got it!'}
      </button>
    </div>
  );
}

/* ─── Dev Toolbar ─── */
function DevToolbar({ onRefreshState, onShowUpgrade, onSetText, onSetLanguage }) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState('');

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  }

  function devBtn(label, color, action) {
    return (
      <button className="btn-press" onClick={() => { action(); setOpen(false); }}
        style={{ width:'100%', padding:'10px 14px', background:color, color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', textAlign:'left', fontFamily:FONT }}>
        {label}
      </button>
    );
  }

  const actions = {
    resetCount() {
      localStorage.setItem(getTodayKey(), '0');
      onRefreshState();
      showToast('Count reset!');
    },
    setPaid() {
      localStorage.setItem('decode_is_paid', 'true');
      onRefreshState();
      showToast('Pro unlocked!');
    },
    setFree() {
      localStorage.setItem('decode_is_paid', 'false');
      localStorage.setItem(getTodayKey(), '0');
      onRefreshState();
      showToast('Reset to free!');
    },
    clearAll() {
      localStorage.clear();
      onRefreshState();
      showToast('All cleared!');
    },
    fillTest() {
      onSetText('Your haemoglobin is 9.2 g/dL. Normal range is 12-16 g/dL. Suggests mild anaemia.');
      onSetLanguage('Hindi');
      showToast('Test text filled!');
    },
    addHistory() {
      const fake = [
        { id: Date.now() - 1000, docType: 'Medical report', language: 'Hindi', preview: 'Haemoglobin 9.2 g/dL, below normal range...', result: { what_is_this: 'A blood test result showing low haemoglobin levels.', what_it_means_for_you: 'You may have mild anaemia. This can cause tiredness.', what_to_do_next: ['See a doctor soon', 'Eat iron-rich foods like spinach', 'Get a follow-up test in 4 weeks'] } },
        { id: Date.now() - 60000, docType: 'Legal notice', language: 'English', preview: 'You are required to vacate the premises within 30 days...', result: { what_is_this: 'A legal eviction notice from your landlord.', what_it_means_for_you: 'You have 30 days to leave or respond legally.', what_to_do_next: ['Consult a lawyer immediately', 'Do not ignore this notice', 'Reply in writing within 15 days'] } },
        { id: Date.now() - 3600000, docType: 'Bank document', language: 'Bengali', preview: 'EMI bounced, NACH mandate rejected by bank...', result: { what_is_this: 'A bank notice about a failed automatic payment.', what_it_means_for_you: 'Your loan EMI was not deducted. A penalty may apply.', what_to_do_next: ['Call your bank today', 'Ensure your account has enough balance', 'Re-register the NACH mandate'] } },
      ];
      const existing = getHistory();
      localStorage.setItem('decode_history', JSON.stringify([...fake, ...existing].slice(0, 200)));
      onRefreshState();
      showToast('3 fake entries added!');
    },
    showUpgrade() {
      onShowUpgrade();
      showToast('Upgrade shown!');
    },
  };

  return (
    <>
      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', bottom: open ? 230 : 72, left:16, background:'#1A1A2E', color:'#fff', padding:'10px 16px', borderRadius:10, fontSize:13, fontWeight:600, zIndex:9999, boxShadow:'0 4px 20px rgba(0,0,0,0.35)', animation:'fadeInUp 0.25s ease both', transition:'bottom 0.2s', whiteSpace:'nowrap' }}>
          ✓ {toast}
        </div>
      )}

      {/* Expanded panel */}
      {open && (
        <div style={{ position:'fixed', bottom:60, left:16, width:220, background:'#1A1A2E', borderRadius:16, padding:14, zIndex:9998, boxShadow:'0 8px 40px rgba(0,0,0,0.5)', animation:'fadeInUp 0.2s ease both', display:'flex', flexDirection:'column', gap:7 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Dev Tools</div>
          {devBtn('↺ Reset Count', '#EA580C', actions.resetCount)}
          {devBtn('✓ Set Paid (Pro)', '#16A34A', actions.setPaid)}
          {devBtn('✕ Set Free', '#DC2626', actions.setFree)}
          {devBtn('⚡ Fill Test Text', '#2563EB', actions.fillTest)}
          {devBtn('＋ Add History', '#7C3AED', actions.addHistory)}
          {devBtn('👑 Show Upgrade', '#D97706', actions.showUpgrade)}
          {devBtn('🗑 Clear All localStorage', '#DC2626', actions.clearAll)}
        </div>
      )}

      {/* Pill trigger */}
      <button className="btn-press" onClick={() => setOpen(o => !o)}
        style={{ position:'fixed', bottom:16, left:16, background:'#1A1A2E', color:'#fff', border:'2px solid #DC2626', borderRadius:R.pill, padding:'8px 14px', fontSize:13, fontWeight:700, cursor:'pointer', zIndex:9998, boxShadow:'0 4px 20px rgba(0,0,0,0.4)', fontFamily:FONT, display:'flex', alignItems:'center', gap:6, letterSpacing:'0.02em' }}>
        🛠 Dev {open ? '▲' : '▼'}
      </button>
    </>
  );
}

/* ─── Admin Page ─── */
function AdminPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  async function fetchStats() { try { const r = await fetch(`${API_BASE}/api/admin/stats`); setData(await r.json()); } catch {} setLoading(false); }
  useEffect(() => { fetchStats(); const t = setInterval(fetchStats, 30000); return () => clearInterval(t); }, []);
  return (
    <div style={{ minHeight:'100vh', background:'#0f0f1a', fontFamily:FONT, color:'#fff', padding:24 }}>
      <div style={{ maxWidth:800, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:32 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, color:'#fff' }}>🔍 Decode Admin</h1>
            <p style={{ fontSize:13, color:'#555', marginTop:4 }}>Auto-refreshes every 30 seconds</p>
          </div>
          <button className="btn-press" onClick={() => { setLoading(true); fetchStats(); }} style={{ background:C.primary, color:'#fff', border:'none', borderRadius:10, padding:'10px 20px', fontSize:14, fontWeight:600, cursor:'pointer', minHeight:44 }}>Refresh</button>
        </div>
        {loading ? <p style={{ color:'#555' }}>Loading...</p> : !data ? <p style={{ color:'#f66' }}>Could not load stats.</p> : (
          <>
            <div style={{ display:'flex', gap:14, marginBottom:24, flexWrap:'wrap' }}>
              {[['Decodes Today', data.decodesToday, C.primary],['Follow-ups Today', data.followupsToday, C.success],['Waitlist Signups', data.waitlistCount, C.warning]].map(([lbl, val, col]) => (
                <div key={lbl} style={{ flex:1, minWidth:140, background:'#1a1a2e', borderRadius:14, padding:'22px 24px' }}>
                  <div style={{ fontSize:40, fontWeight:800, color:col, lineHeight:1, fontVariantNumeric:'tabular-nums' }}>{val}</div>
                  <div style={{ fontSize:13, color:'#666', marginTop:8 }}>{lbl}</div>
                </div>
              ))}
            </div>
            <div style={{ background:'#1a1a2e', borderRadius:14, padding:24 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#444', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:16 }}>Last 10 Decodes</div>
              {data.lastDecodes.length === 0 ? <p style={{ color:'#444', fontSize:14 }}>No decodes yet today.</p> : (
                <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'monospace' }}>
                  <thead><tr>{['Time','Type','Language'].map(h => <th key={h} style={{ textAlign:'left', fontSize:11, color:'#444', fontWeight:600, paddingBottom:10, borderBottom:'1px solid #222' }}>{h}</th>)}</tr></thead>
                  <tbody>{data.lastDecodes.map((d,i) => (
                    <tr key={i} style={{ borderBottom:'1px solid #151520' }}>
                      <td style={{ padding:'10px 0', fontSize:12, color:'#666' }}>{new Date(d.timestamp).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</td>
                      <td style={{ padding:'10px 8px' }}><span style={{ background:'#252540', color:'#aaa', padding:'3px 10px', borderRadius:20, fontSize:11 }}>{d.docType}</span></td>
                      <td style={{ padding:'10px 0', fontSize:12, color:'#aaa' }}>{d.language}</td>
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

/* ─── Upgrade Overlay ─── */
function UpgradeScreen({ onBack }) {
  const [phone, setPhone] = useState('');
  const [paying, setPaying] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  async function handleUpgrade() {
    if (!phone.trim() || phone.trim().length < 10) { setPhoneError('Please enter a valid 10-digit mobile number.'); return; }
    setPhoneError(''); setPaying(true);
    let keyId;
    try { const r = await fetch(`${API_BASE}/api/payment/razorpay-key`); keyId = (await r.json()).key_id; } catch { alert('Could not reach payment server.'); setPaying(false); return; }
    if (!keyId) { alert('Payment not configured.'); setPaying(false); return; }
    if (!await loadRazorpayScript()) { alert('Could not load payment gateway.'); setPaying(false); return; }
    new window.Razorpay({
      key:keyId, amount:19900, currency:'INR', name:'Decode', description:'Pro Monthly',
      theme:{color:C.primary}, prefill:{contact:phone},
      handler: async (resp) => {
        try { await fetch(`${API_BASE}/api/payment/verify`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone,razorpay_payment_id:resp.razorpay_payment_id})}); } catch {}
        localStorage.setItem('decode_is_paid','true'); localStorage.setItem('decode_count','0');
        alert('Welcome to Decode Pro!'); window.location.reload();
      },
      modal:{ondismiss:()=>setPaying(false)},
    }).open();
    setPaying(false);
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(26,26,46,0.7)', backdropFilter:'blur(8px)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:16, animation:'fadeIn 0.2s ease' }}>
      <div style={{ background:C.surface, borderRadius:20, width:'min(480px,100%)', padding:'28px 24px', boxShadow:'0 20px 60px rgba(0,0,0,0.3)', maxHeight:'90vh', overflowY:'auto', position:'relative' }}>
        <button className="btn-press" onClick={onBack} style={{ position:'absolute', top:16, right:16, background:'none', border:'none', fontSize:20, cursor:'pointer', color:C.textMuted, lineHeight:1, width:32, height:32 }}>✕</button>

        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🔓</div>
          <h2 style={{ fontSize:22, fontWeight:800, color:C.text, marginBottom:8 }}>Unlock Decode Pro</h2>
          <p style={{ fontSize:14, color:C.textSecondary, marginBottom:10 }}>Join thousands of Indians who understand their documents</p>
          <div style={{ fontSize:13, color:C.warning, fontWeight:600 }}>★★★★★ Trusted by patients, tenants &amp; families</div>
        </div>

        {/* Cards */}
        <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:24 }}>
          {/* Free */}
          <div style={{ border:`1.5px solid ${C.border}`, borderRadius:14, padding:'14px 18px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <span style={{ fontSize:16, fontWeight:700, color:C.textSecondary }}>Free</span>
              <span style={{ fontSize:20, fontWeight:800, color:C.text }}>₹0<span style={{ fontSize:13, fontWeight:400, color:C.textMuted }}>/mo</span></span>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {['3 decodes/day','3 languages','Image upload'].map(f=>(
                <span key={f} style={{ fontSize:12, color:C.textSecondary, display:'flex', alignItems:'center', gap:4 }}>
                  <span style={{ color:C.success }}>✓</span>{f}
                </span>
              ))}
              <span style={{ fontSize:12, color:'#ddd', display:'flex', alignItems:'center', gap:4 }}><span style={{ color:'#ddd' }}>✗</span>No history</span>
            </div>
          </div>
          {/* Pro */}
          <div style={{ border:`2px solid ${C.primary}`, borderRadius:14, padding:'14px 18px', background:C.surface2, position:'relative', overflow:'hidden', boxShadow:`0 4px 20px rgba(83,74,183,0.15)` }}>
            <div style={{ position:'absolute', top:10, right:-22, background:C.primary, color:'#fff', fontSize:9, fontWeight:800, padding:'4px 28px', transform:'rotate(35deg)', letterSpacing:'0.5px' }}>POPULAR</div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <span style={{ fontSize:16, fontWeight:700, color:C.primary }}>Pro</span>
              <span style={{ fontSize:20, fontWeight:800, color:C.text }}>₹199<span style={{ fontSize:13, fontWeight:400, color:C.textMuted }}>/mo</span></span>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {['Unlimited decodes','All languages','Image upload','Decode history','Follow-up chat','Read aloud'].map(f=>(
                <span key={f} style={{ fontSize:12, color:C.text, display:'flex', alignItems:'center', gap:4 }}>
                  <span style={{ color:C.success }}>✓</span>{f}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:13, fontWeight:600, color:C.text, display:'block', marginBottom:8 }}>Mobile number (for your account)</label>
          <input type="tel" value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,'').slice(0,10))} placeholder="10-digit mobile number"
            style={{ width:'100%', height:48, padding:'0 14px', borderRadius:R.input, border:`1.5px solid ${phoneError?C.danger:C.border}`, fontSize:16, color:C.text, outline:'none', background:C.surface }} />
          {phoneError && <p style={{ marginTop:6, fontSize:13, color:C.danger }}>{phoneError}</p>}
        </div>

        <button className="btn-press" onClick={handleUpgrade} disabled={paying}
          style={{ width:'100%', height:52, background:paying?'#9992d4':GRAD, color:'#fff', border:'none', borderRadius:14, fontSize:16, fontWeight:700, cursor:paying?'not-allowed':'pointer', boxShadow:`0 4px 20px ${C.primaryShadow}`, marginBottom:12, display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
          {paying ? <><Spinner />Opening payment...</> : '🔒 Upgrade to Pro — ₹199/month'}
        </button>
        <p style={{ textAlign:'center', fontSize:12, color:C.textMuted }}>Cancel anytime • Secure via Razorpay</p>
      </div>
    </div>
  );
}

/* ─── History Panel ─── */
function HistoryPanel({ isPaid, onClose }) {
  const [history, setHistory] = useState(getHistory());
  const [selected, setSelected] = useState(null);
  const visible = isPaid ? history : history.slice(0, 5);

  function handleClear() {
    if (window.confirm('Clear all decode history?')) { clearHistory(); setHistory([]); }
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1500, display:'flex', justifyContent:'flex-end' }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(26,26,46,0.4)', animation:'fadeIn 0.2s ease' }} />
      <div style={{ position:'relative', width:'min(460px,100%)', background:C.surface, height:'100%', overflowY:'auto', animation:'slideInRight 0.3s ease', padding:'24px 20px', display:'flex', flexDirection:'column' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
          <h2 style={{ fontSize:18, fontWeight:700, color:C.text }}>
            {selected ? '← Result' : 'Decode History'}
          </h2>
          <button className="btn-press" onClick={selected?()=>setSelected(null):onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:C.textMuted, width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center' }}>
            {selected ? '←' : '✕'}
          </button>
        </div>

        {selected ? (
          <div>
            <div style={{ fontSize:12, color:C.textMuted, marginBottom:4 }}>{selected.docType} · {timeAgo(selected.id)}</div>
            <p style={{ fontSize:14, color:C.textSecondary, marginBottom:20, fontStyle:'italic', lineHeight:1.5 }}>{selected.preview}</p>
            {[
              {key:'what_is_this',label:'WHAT IS THIS?',color:CARD_COLORS.what_is_this},
              {key:'what_it_means_for_you',label:'WHAT IT MEANS FOR YOU',color:CARD_COLORS.what_it_means_for_you},
              {key:'what_to_do_next',label:'WHAT TO DO NEXT',color:CARD_COLORS.what_to_do_next},
            ].map(({key,label,color})=>(
              <div key={key} style={{ background:C.surface, border:`1px solid ${C.border}`, borderTop:`3px solid ${color}`, borderRadius:R.card, padding:18, marginBottom:12 }}>
                <div style={{ fontSize:11, fontWeight:700, color, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:10 }}>{label}</div>
                {key==='what_to_do_next' ? (
                  <ol style={{ paddingLeft:20 }}>{(selected.result.what_to_do_next||[]).map((s,i)=><li key={i} style={{ fontSize:15,color:C.text,lineHeight:1.7,marginBottom:6 }}>{s}</li>)}</ol>
                ) : <p style={{ fontSize:15,color:C.text,lineHeight:1.7 }}>{selected.result[key]}</p>}
              </div>
            ))}
          </div>
        ) : (
          <>
            {!isPaid && history.length > 5 && (
              <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#92400e' }}>
                Showing last 5. Upgrade to Pro to see all {history.length}.
              </div>
            )}
            {visible.length === 0 ? (
              <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' }}>
                <div style={{ fontSize:48, marginBottom:16 }}>📄</div>
                <p style={{ fontSize:15, color:C.textMuted, lineHeight:1.6 }}>No decodes yet.<br/>Decode your first document!</p>
              </div>
            ) : (
              <div style={{ flex:1 }}>
                {visible.map(item => {
                  const docColor = DOC_TYPE_COLORS[item.docType] || C.textMuted;
                  return (
                    <div key={item.id} className="card-hover" onClick={()=>setSelected(item)}
                      style={{ background:C.surface, border:`1px solid ${C.border}`, borderLeft:`3px solid ${docColor}`, borderRadius:R.card, padding:'14px 16px', marginBottom:10, cursor:'pointer', transition:'all 0.2s' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                        <span style={{ background:`${docColor}18`, color:docColor, fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:R.pill }}>{item.docType}</span>
                        <span style={{ fontSize:12, color:C.textMuted }}>{timeAgo(item.id)}</span>
                      </div>
                      <p style={{ fontSize:13, color:C.textSecondary, lineHeight:1.5 }}>{item.preview}</p>
                    </div>
                  );
                })}
                {visible.length > 0 && (
                  <button className="btn-press" onClick={handleClear} style={{ width:'100%', padding:'12px 0', background:'transparent', color:C.danger, border:`1px solid ${C.danger}33`, borderRadius:12, fontSize:14, fontWeight:600, cursor:'pointer', marginTop:8, minHeight:48 }}>
                    Clear history
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Waitlist Bar ─── */
function WaitlistBar({ onDismiss }) {
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (phone.length < 10) return;
    setSubmitting(true);
    try {
      await fetch(`${API_BASE}/api/waitlist`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone})});
      const n=JSON.parse(localStorage.getItem('waitlist_numbers')||'[]'); if(!n.includes(phone)){n.push(phone);localStorage.setItem('waitlist_numbers',JSON.stringify(n));}
    } catch {}
    setSubmitted(true); setSubmitting(false);
  }

  return (
    <div style={{ position:'fixed', bottom:0, left:0, right:0, background:GRAD, color:'#fff', padding:'14px 20px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', boxShadow:'0 -4px 24px rgba(83,74,183,0.4)', animation:'slideUp 0.4s ease both', zIndex:1000 }}>
      {submitted ? (
        <div style={{ flex:1, fontSize:15, fontWeight:600 }}>Thanks! We'll keep you updated 🙏</div>
      ) : (
        <>
          <div style={{ flex:1, fontSize:14, fontWeight:600, minWidth:160 }}>Love Decode? Get notified about new features</div>
          <input value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,'').slice(0,10))} placeholder="Mobile number"
            style={{ height:44, padding:'0 14px', borderRadius:10, border:'1.5px solid rgba(255,255,255,0.4)', fontSize:16, color:C.text, outline:'none', width:160, flexShrink:0, background:'rgba(255,255,255,0.95)' }} />
          <button className="btn-press" onClick={handleSubmit} disabled={submitting||phone.length<10}
            style={{ height:44, padding:'0 18px', background:'rgba(255,255,255,0.95)', color:C.primary, border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:phone.length<10?'default':'pointer', flexShrink:0, opacity:phone.length<10?0.6:1 }}>
            {submitting?'...':'Notify me'}
          </button>
        </>
      )}
      <button onClick={onDismiss} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.6)', fontSize:20, cursor:'pointer', lineHeight:1, minWidth:28, height:44, display:'flex', alignItems:'center' }}>✕</button>
    </div>
  );
}

/* ─── Main App ─── */
export default function App() {
  if (window.location.pathname === '/admin') return <AdminPage />;

  const [serverConnecting, setServerConnecting] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/health`).catch(() => {});
    const t = setTimeout(() => setServerConnecting(false), 30000);
    return () => clearTimeout(t);
  }, []);

  const [language, setLanguage] = useState('English');
  const [docType, setDocType] = useState('Medical report');
  const [text, setText] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [imageFileName, setImageFileName] = useState('');
  const [pdfBase64, setPdfBase64] = useState('');
  const [pdfFileName, setPdfFileName] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [complexity, setComplexity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [slowWarning, setSlowWarning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [errorShake, setErrorShake] = useState(false);
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
  const [activeTab, setActiveTab] = useState('home');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const fileInputRef = useRef(null);
  const pdfFileRef = useRef(null);
  const slowTimerRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    const count = getUsageCount(); setUsageCount(count);
    const paid = getIsPaid(); setIsPaid(paid);
    if (count >= getDailyLimit() && !paid) setLimitReached(true);
    if (!localStorage.getItem('waitlist_dismissed') && (count > 0 || getHistory().length > 0)) setShowWaitlist(true);
    if (!localStorage.getItem('seen_onboarding')) setOnboardingStep(0);
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref) {
      try {
        const used = JSON.parse(localStorage.getItem('used_refs')||'[]');
        if (!used.includes(ref)) { addBonus(); used.push(ref); localStorage.setItem('used_refs',JSON.stringify(used)); setReferralToast(true); setTimeout(()=>setReferralToast(false),5000); }
      } catch {}
      window.history.replaceState({},'' ,window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (result || text) return;
    const t = setInterval(()=>setPlaceholderIdx(i=>(i+1)%PLACEHOLDERS.length),3000);
    return ()=>clearInterval(t);
  }, [result, text]);

  useEffect(() => {
    document.title = result ? `✓ Decoded — ${docType} | Decode` : 'Decode — Understand Any Document in Hindi, Bengali & English';
  }, [result, docType]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({behavior:'smooth'}); }, [followups]);

  function handleImageChange(e) {
    const file = e.target.files[0]; if (!file) return;
    setImageFileName(file.name);
    const reader = new FileReader();
    reader.onload = ev => { const d = ev.target.result; setImagePreview(d); setImageBase64(d.split(',')[1]); };
    reader.readAsDataURL(file);
  }

  function handleRemoveImage() {
    setImageBase64(''); setImagePreview(''); setImageFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handlePdfChange(e) {
    const file = e.target.files[0]; if (!file) return;
    setPdfFileName(file.name);
    const reader = new FileReader();
    reader.onload = ev => setPdfBase64(ev.target.result.split(',')[1]);
    reader.readAsDataURL(file);
  }

  function handleRemovePdf() {
    setPdfBase64(''); setPdfFileName('');
    if (pdfFileRef.current) pdfFileRef.current.value = '';
  }

  async function handleDecode() {
    if (!imageBase64 && !pdfBase64 && !text.trim()) { triggerError('Please paste text, upload an image, or upload a PDF.'); return; }
    if (!navigator.onLine) { triggerError('No internet connection. Please check your connection and try again.'); return; }
    const count = getUsageCount();
    if (count >= getDailyLimit() && !isPaid) { setLimitReached(true); setShowUpgrade(true); return; }
    setLoading(true); setError(''); setResult(null); setSlowWarning(false); setComplexity(null);
    slowTimerRef.current = setTimeout(()=>setSlowWarning(true), 15000);
    try {
      const isPdf = !!pdfBase64;
      const endpoint = isPdf ? `${API_BASE}/api/decode/pdf` : `${API_BASE}/api/decode`;
      const body = isPdf
        ? JSON.stringify({ pdfBase64, language, docType })
        : JSON.stringify({ text, imageBase64, language, docType });
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'x-usage-count':String(count), 'x-is-paid':String(isPaid), 'x-bonus':String(getBonus()) },
        body,
      });
      clearTimeout(slowTimerRef.current);
      if (res.status===402) { setLimitReached(true); setShowUpgrade(true); setLoading(false); return; }
      const data = await res.json();
      if (!data.success) { const nf=failCount+1; setFailCount(nf); triggerError(nf>=3?'Our AI is busy right now. Try again in a few minutes.':(data.error||'Something went wrong.')); setLoading(false); return; }
      setFailCount(0);
      if (!isPaid) { const nc=incrementUsage(); setUsageCount(nc); if(nc>=getDailyLimit()) setLimitReached(true); }
      const preview = text.trim().slice(0,60)+(text.trim().length>60?'...':'') || (pdfBase64?`[PDF] ${docType}`:`[Image] ${docType}`);
      saveToHistory({id:Date.now(),docType,language,preview,result:data.result});
      setResult(data.result);
      if (data.result.complexity) setComplexity(data.result.complexity);
      setReferralLink(window.location.origin+'?ref='+btoa(String(Date.now())));
      if (!localStorage.getItem('waitlist_dismissed')) setShowWaitlist(true);
    } catch {
      clearTimeout(slowTimerRef.current);
      const nf=failCount+1; setFailCount(nf);
      triggerError(!navigator.onLine?'No internet connection. Please check your connection and try again.':nf>=3?'Our AI is busy right now. Try again in a few minutes.':'Could not connect to server. Please try again.');
    }
    setLoading(false);
  }

  function triggerError(msg) {
    setError(msg); setErrorShake(true); setTimeout(()=>setErrorShake(false),600);
  }

  function handleReset() {
    clearTimeout(slowTimerRef.current);
    setResult(null); setError(''); setText(''); setImageBase64(''); setImagePreview(''); setImageFileName('');
    setPdfBase64(''); setPdfFileName(''); setComplexity(null);
    if (fileInputRef.current) fileInputRef.current.value='';
    if (pdfFileRef.current) pdfFileRef.current.value='';
    const paid=getIsPaid(); setIsPaid(paid);
    setLimitReached(getUsageCount()>=getDailyLimit()&&!paid);
    setShowUpgrade(false); setFollowups([]); setFollowupQ('');
    setReferralCopied(false); setReferralLink(''); setResultCopied(false); setSlowWarning(false);
    window.speechSynthesis?.cancel(); setSpeaking(false); setActiveTab('home');
  }

  async function handleFollowup() {
    if (!followupQ.trim()) return;
    const q = followupQ.trim(); setFollowupQ(''); setFollowupLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/decode/followup`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:q,originalText:text,language})});
      const d = await r.json();
      setFollowups(p=>[...p,{q,a:d.success?d.answer:d.error}]);
    } catch { setFollowups(p=>[...p,{q,a:'Could not get an answer. Please try again.'}]); }
    setFollowupLoading(false);
  }

  function handleReadAloud() {
    if (!window.speechSynthesis) return;
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const langMap={Hindi:'hi-IN',Bengali:'bn-IN',English:'en-IN'};
    const txt=[`What is this? ${result.what_is_this}`,`What it means for you. ${result.what_it_means_for_you}`,`What to do next. ${(result.what_to_do_next||[]).join('. ')}`].join('. ');
    const u=new SpeechSynthesisUtterance(txt); u.lang=langMap[language]||'en-IN';
    u.onend=()=>setSpeaking(false); u.onerror=()=>setSpeaking(false);
    window.speechSynthesis.speak(u); setSpeaking(true);
  }

  function handleCopyResult() {
    const steps=(result.what_to_do_next||[]).map((s,i)=>`${i+1}. ${s}`).join('\n');
    navigator.clipboard.writeText(`WHAT IS THIS?\n${result.what_is_this}\n\nWHAT IT MEANS FOR YOU:\n${result.what_it_means_for_you}\n\nWHAT TO DO NEXT:\n${steps}\n\nDecoded by Decode — decode.app`).then(()=>{setResultCopied(true);setTimeout(()=>setResultCopied(false),2500);});
  }

  function handleWhatsAppShare() {
    window.open('https://wa.me/?text='+encodeURIComponent(`I just decoded a confusing document with Decode! 🔍\nIt explained everything in simple ${language}.\n\nTry it free: ${window.location.origin}`),'_blank');
  }

  function handleCopyReferral() {
    navigator.clipboard.writeText(referralLink).then(()=>{setReferralCopied(true);setTimeout(()=>setReferralCopied(false),2500);});
  }

  function devRefresh() {
    const paid = getIsPaid(); setIsPaid(paid);
    const count = getUsageCount(); setUsageCount(count);
    setLimitReached(count >= getDailyLimit() && !paid);
  }

  function advanceOnboarding() {
    if (onboardingStep>=2) { localStorage.setItem('seen_onboarding','true'); setOnboardingStep(null); }
    else setOnboardingStep(s=>s+1);
  }

  function skipOnboarding() { localStorage.setItem('seen_onboarding','true'); setOnboardingStep(null); }

  const remaining = getDailyLimit() - usageCount;
  const ringOf = (target) => {
    const map={0:'examples',1:'language',2:'button'};
    if (onboardingStep===null||map[onboardingStep]!==target) return {};
    return {animation:'ringPulse 1.2s ease-in-out infinite',borderRadius:12};
  };

  const bottomPad = (showWaitlist && !showHistory && !showUpgrade && !loading) ? 88 : (isMobile ? 68 : 0);

  return (
    <div style={{ minHeight:'100vh', background:C.bg, fontFamily:FONT, color:C.text, paddingBottom:bottomPad }}>
      <style>{globalStyles}</style>

      {/* Referral toast */}
      {referralToast && (
        <div style={{ position:'fixed', top:72, left:'50%', transform:'translateX(-50%)', background:C.success, color:'#fff', padding:'12px 20px', borderRadius:12, fontSize:14, fontWeight:600, zIndex:2500, boxShadow:'0 4px 20px rgba(16,185,129,0.35)', whiteSpace:'nowrap', animation:'fadeInUp 0.3s ease both' }}>
          🎁 You got 1 bonus decode from a friend!
        </div>
      )}

      {/* Onboarding */}
      {onboardingStep!==null&&!result&&!loading&&<OnboardingTooltip step={onboardingStep} onNext={advanceOnboarding} onSkip={skipOnboarding}/>}

      {/* Upgrade overlay */}
      {showUpgrade && <UpgradeScreen onBack={()=>setShowUpgrade(false)} />}

      {/* History panel */}
      {showHistory && <HistoryPanel isPaid={isPaid} onClose={()=>setShowHistory(false)} />}

      {/* Sticky Header */}
      <header style={{ position:'sticky', top:0, background:'rgba(255,255,255,0.95)', backdropFilter:'blur(12px)', borderBottom:`1px solid ${C.border}`, height:56, display:'flex', alignItems:'center', padding:'0 20px', zIndex:100, boxShadow:'0 1px 12px rgba(83,74,183,0.08)' }}>
        <span style={{ fontSize:20, marginRight:8 }}>🔍</span>
        <span style={{ fontSize:18, fontWeight:700, color:C.text }}>Decode</span>
        {IS_DEV && (
          <span style={{ marginLeft:8, background:'#DC2626', color:'#fff', fontSize:10, fontWeight:800, padding:'2px 7px', borderRadius:6, letterSpacing:'0.06em', verticalAlign:'middle' }}>DEV</span>
        )}
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:10 }}>
          {isPaid && <span style={{ background:C.surface2, color:C.primary, fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:R.pill }}>PRO</span>}
          {!isPaid && (
            <button className="btn-press" onClick={()=>setShowUpgrade(true)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', lineHeight:1 }} title="Upgrade to Pro">👑</button>
          )}
          <button className="btn-press" onClick={()=>setShowHistory(true)}
            style={{ height:34, padding:'0 16px', background:'transparent', color:C.primary, border:`1.5px solid ${C.border}`, borderRadius:R.pill, fontSize:13, fontWeight:600, cursor:'pointer' }}>
            History
          </button>
        </div>
      </header>

      {/* Server wake-up banner */}
      {serverConnecting && (
        <div style={{ background:'#FEF3C7', borderBottom:'1px solid #FDE68A', padding:'8px 20px', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          <Spinner size={13} color="#92400E" />
          <span style={{ fontSize:13, color:'#92400E', fontWeight:500 }}>Connecting to server... first load may take up to 30 seconds</span>
        </div>
      )}

      {/* Main */}
      <main style={{ maxWidth:520, margin:'0 auto', padding:'20px 16px 32px' }}>

        {loading ? <LoadingSkeleton /> : !result ? (
          <div style={{ background:C.surface, borderRadius:20, padding:20, boxShadow:C.shadow }}>

            {/* Language pills */}
            <div style={{ marginBottom:20, ...ringOf('language') }}>
              <label style={{ fontSize:13, fontWeight:600, color:C.textSecondary, display:'block', marginBottom:10 }}>Explain in</label>
              <div style={{ display:'flex', gap:8 }}>
                {LANGUAGES.map(lang=>(
                  <button key={lang} className="btn-press" onClick={()=>setLanguage(lang)} style={{
                    flex:1, height:40, borderRadius:R.pill, border:`1.5px solid ${language===lang?C.primary:C.border}`,
                    background:language===lang?C.primary:C.surface, color:language===lang?'#fff':C.textSecondary,
                    fontWeight:language===lang?600:500, fontSize:14, cursor:'pointer',
                    boxShadow:language===lang?`0 2px 12px rgba(83,74,183,0.3)`:'none',
                    transition:'all 0.18s ease',
                  }}>{lang}</button>
                ))}
              </div>
            </div>

            {/* Document type */}
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:13, fontWeight:600, color:C.textSecondary, display:'block', marginBottom:10 }}>Document type</label>
              <div style={{ position:'relative' }}>
                <select value={docType} onChange={e=>setDocType(e.target.value)} style={{
                  width:'100%', height:48, padding:'0 40px 0 16px', borderRadius:R.input,
                  border:`1.5px solid ${C.border}`, background:C.surface, fontSize:14, color:C.text,
                  outline:'none', cursor:'pointer', appearance:'none', WebkitAppearance:'none',
                }}>
                  {DOC_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
                <span style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', color:C.primary, fontSize:16, pointerEvents:'none' }}>▾</span>
              </div>
            </div>

            {/* Image upload */}
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:13, fontWeight:600, color:C.textSecondary, display:'block', marginBottom:10 }}>Upload document image</label>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageChange} style={{ display:'none' }} />
              {!imagePreview ? (
                <div onClick={()=>fileInputRef.current?.click()} style={{ border:`2px dashed #C4BFFF`, borderRadius:R.card, padding:'24px 16px', textAlign:'center', cursor:'pointer', background:C.bg, transition:'all 0.18s' }}
                  onMouseEnter={e=>{e.currentTarget.style.background=C.surface2;e.currentTarget.style.borderColor=C.primary;}}
                  onMouseLeave={e=>{e.currentTarget.style.background=C.bg;e.currentTarget.style.borderColor='#C4BFFF';}}>
                  <div style={{ fontSize:32, marginBottom:8 }}>📷</div>
                  <p style={{ fontSize:14, color:C.textSecondary, margin:'0 0 4px' }}>Take a photo or upload document</p>
                  <p style={{ fontSize:12, color:C.textMuted, margin:0 }}>JPG, PNG, HEIC supported</p>
                </div>
              ) : (
                <div style={{ display:'flex', alignItems:'center', gap:14, background:C.surface2, borderRadius:12, padding:'12px 14px', border:`1.5px solid ${C.success}33` }}>
                  <img src={imagePreview} alt="doc" style={{ width:64, height:64, objectFit:'cover', borderRadius:10, flexShrink:0 }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:C.text, display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                      <span style={{ color:C.success }}>✓</span>
                      <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{imageFileName||'Image selected'}</span>
                    </div>
                    <p style={{ fontSize:12, color:C.textMuted, margin:0 }}>Ready to decode</p>
                  </div>
                  <button className="btn-press" onClick={handleRemoveImage} style={{ background:C.danger, color:'#fff', border:'none', borderRadius:R.pill, padding:'5px 12px', fontSize:12, fontWeight:600, cursor:'pointer', flexShrink:0 }}>✕ Remove</button>
                </div>
              )}
            </div>

            {/* PDF upload */}
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:13, fontWeight:600, color:C.textSecondary, display:'block', marginBottom:10 }}>Upload PDF</label>
              <input ref={pdfFileRef} type="file" accept="application/pdf,.pdf" onChange={handlePdfChange} style={{ display:'none' }} />
              {!pdfFileName ? (
                <div onClick={()=>pdfFileRef.current?.click()} style={{ border:`2px dashed #C4BFFF`, borderRadius:R.card, padding:'18px 16px', textAlign:'center', cursor:'pointer', background:C.bg, transition:'all 0.18s', display:'flex', alignItems:'center', justifyContent:'center', gap:12 }}
                  onMouseEnter={e=>{e.currentTarget.style.background=C.surface2;e.currentTarget.style.borderColor=C.primary;}}
                  onMouseLeave={e=>{e.currentTarget.style.background=C.bg;e.currentTarget.style.borderColor='#C4BFFF';}}>
                  <span style={{ fontSize:24 }}>📄</span>
                  <div style={{ textAlign:'left' }}>
                    <p style={{ fontSize:14, color:C.textSecondary, margin:'0 0 2px' }}>Upload a PDF document</p>
                    <p style={{ fontSize:12, color:C.textMuted, margin:0 }}>Bank letters, legal notices, medical reports</p>
                  </div>
                </div>
              ) : (
                <div style={{ display:'flex', alignItems:'center', gap:12, background:C.surface2, borderRadius:12, padding:'12px 14px', border:`1.5px solid ${C.success}33` }}>
                  <span style={{ fontSize:28, flexShrink:0 }}>📄</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:C.text, display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                      <span style={{ color:C.success }}>✓</span>
                      <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{pdfFileName}</span>
                    </div>
                    <p style={{ fontSize:12, color:C.textMuted, margin:0 }}>PDF ready to decode</p>
                  </div>
                  <button className="btn-press" onClick={handleRemovePdf} style={{ background:C.danger, color:'#fff', border:'none', borderRadius:R.pill, padding:'5px 12px', fontSize:12, fontWeight:600, cursor:'pointer', flexShrink:0 }}>✕ Remove</button>
                </div>
              )}
            </div>

            {/* Textarea */}
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:13, fontWeight:600, color:C.textSecondary, display:'block', marginBottom:10 }}>
                Document text{(imageBase64||pdfBase64)&&<span style={{ fontWeight:400, color:C.textMuted }}> (optional)</span>}
              </label>
              <textarea value={text} onChange={e=>setText(e.target.value)} placeholder={PLACEHOLDERS[placeholderIdx]} rows={5}
                style={{ width:'100%', minHeight:120, padding:'14px 16px', borderRadius:R.input, border:`1.5px solid ${C.border}`, fontSize:15, color:C.text, lineHeight:1.6, resize:'vertical', outline:'none', fontFamily:FONT, transition:'border-color 0.18s, box-shadow 0.18s', background:C.surface }}
                onFocus={e=>{e.target.style.borderColor=C.primary;e.target.style.boxShadow=`0 0 0 3px ${C.primaryGlow}`;}}
                onBlur={e=>{e.target.style.borderColor=C.border;e.target.style.boxShadow='none';}}
              />
              {/* Example chips with horizontal scroll + fade gradients */}
              <div style={{ position:'relative', marginTop:10 }}>
                <div className="chips-scroll" style={{ ...ringOf('examples') }}>
                  {EXAMPLES.map((ex,i)=>(
                    <button key={i} className="chip btn-press" onClick={()=>setText(ex)} style={{ fontSize:12, padding:'7px 14px', borderRadius:R.pill, border:`1.5px solid ${C.border}`, background:C.surface, color:C.textSecondary, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0, fontFamily:FONT, transition:'all 0.15s' }}>
                      {ex.length>42?ex.slice(0,42)+'…':ex}
                    </button>
                  ))}
                </div>
                <div style={{ position:'absolute', left:0, top:0, bottom:0, width:24, background:`linear-gradient(to right, ${C.surface}, transparent)`, pointerEvents:'none' }} />
                <div style={{ position:'absolute', right:0, top:0, bottom:0, width:24, background:`linear-gradient(to left, ${C.surface}, transparent)`, pointerEvents:'none' }} />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ background:'#fff1f1', border:`1px solid ${C.danger}33`, borderRadius:12, padding:'14px 16px', marginBottom:16, animation:errorShake?'shake 0.5s ease':'none' }}>
                <p style={{ fontSize:14, color:C.danger, lineHeight:1.55, marginBottom:10 }}>{error}</p>
                <button className="btn-press" onClick={handleDecode} style={{ height:40, padding:'0 18px', background:C.primary, color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer' }}>Try again</button>
              </div>
            )}

            {/* Freemium / Decode button */}
            {limitReached && !isPaid ? (
              <button className="btn-press" onClick={()=>setShowUpgrade(true)} style={{ width:'100%', height:52, background:GRAD, color:'#fff', border:'none', borderRadius:14, fontSize:16, fontWeight:700, cursor:'pointer', boxShadow:`0 4px 20px ${C.primaryShadow}` }}>
                🔒 Upgrade for Unlimited Decodes
              </button>
            ) : (
              <>
                {!isPaid && (
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                    <span style={{ fontSize:13, fontWeight:remaining===1?600:400, color:remaining===1?C.warning:C.textMuted }}>
                      {remaining===1?'⚠️ ':''}{remaining} free decode{remaining!==1?'s':''} left today
                      {getBonus()>0&&<span style={{ color:C.success, fontSize:12 }}> (+{getBonus()} bonus)</span>}
                    </span>
                    <div style={{ display:'flex', gap:5 }}>
                      {Array.from({length:getDailyLimit()}).map((_,i)=><div key={i} style={{ width:8, height:8, borderRadius:'50%', background:i<usageCount?C.border:'#22C55E' }} />)}
                    </div>
                  </div>
                )}
                <div style={ringOf('button')}>
                  <button className="btn-press" onClick={handleDecode} style={{
                    width:'100%', height:52, background:GRAD, color:'#fff', border:'none', borderRadius:14,
                    fontSize:16, fontWeight:600, cursor:'pointer',
                    boxShadow:`0 4px 20px ${C.primaryShadow}`, transition:'all 0.18s',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:10,
                  }}
                    onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow=`0 6px 28px ${C.primaryShadow}`;}}
                    onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow=`0 4px 20px ${C.primaryShadow}`;}}
                  >
                    Decode it
                  </button>
                </div>
              </>
            )}

            {/* Slow warning */}
            {slowWarning && <p style={{ textAlign:'center', fontSize:13, color:C.textMuted, marginTop:12, animation:'fadeIn 0.3s ease' }}>⏳ Taking longer than usual... please wait</p>}

            {/* Trust badges */}
            <div style={{ display:'flex', justifyContent:'center', marginTop:20, flexWrap:'wrap' }}>
              {['🔒 Private & secure','⚡ Results in 10 seconds','🇮🇳 Made for India'].map((badge,i,arr)=>(
                <span key={i} style={{ fontSize:11, color:C.textMuted, padding:'0 12px', borderRight:i<arr.length-1?`1px solid ${C.border}`:'none' }}>{badge}</span>
              ))}
            </div>

            {/* How it works */}
            <div style={{ marginTop:28, paddingTop:20, borderTop:`1px solid ${C.border}` }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.textMuted, textAlign:'center', marginBottom:16, letterSpacing:'0.08em', textTransform:'uppercase' }}>How it works</div>
              <div style={{ display:'flex', gap:8 }}>
                {[{icon:'📋',step:'1',title:'Paste or upload',desc:'Your document'},{icon:'🌐',step:'2',title:'Choose language',desc:'Eng, Hindi, Bengali'},{icon:'✨',step:'3',title:'Get explanation',desc:'In plain language'}].map(({icon,step,title,desc})=>(
                  <div key={step} style={{ flex:1, textAlign:'center', padding:'14px 8px', background:C.bg, borderRadius:12, border:`1px solid ${C.border}` }}>
                    <div style={{ fontSize:22, marginBottom:6 }}>{icon}</div>
                    <div style={{ fontSize:10, fontWeight:700, color:C.primary, marginBottom:4, textTransform:'uppercase', letterSpacing:'0.05em' }}>Step {step}</div>
                    <div style={{ fontSize:12, fontWeight:600, color:C.text, marginBottom:2 }}>{title}</div>
                    <div style={{ fontSize:11, color:C.textMuted }}>{desc}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        ) : (
          /* ─── Result Section ─── */
          <div>
            {/* Complexity badge */}
            {complexity && (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, animation:'fadeInUp 0.3s ease both' }}>
                <span style={{ fontSize:13, color:C.textSecondary }}>Document complexity</span>
                <span style={{
                  fontSize:12, fontWeight:700, padding:'5px 14px', borderRadius:R.pill,
                  background: complexity==='simple'?'#D1FAE5':complexity==='moderate'?'#FEF3C7':'#FEE2E2',
                  color: complexity==='simple'?'#065F46':complexity==='moderate'?'#92400E':'#991B1B',
                }}>
                  {complexity==='simple' && '✓ Simple'}
                  {complexity==='moderate' && '⚡ Moderate'}
                  {complexity==='complex' && '⚠ Complex — consider professional advice'}
                </span>
              </div>
            )}

            {/* Result cards */}
            {[
              {key:'what_is_this',label:'WHAT IS THIS?',color:CARD_COLORS.what_is_this,delay:'0ms'},
              {key:'what_it_means_for_you',label:'WHAT IT MEANS FOR YOU',color:CARD_COLORS.what_it_means_for_you,delay:'100ms'},
              {key:'what_to_do_next',label:'WHAT TO DO NEXT',color:CARD_COLORS.what_to_do_next,delay:'200ms'},
            ].map(({key,label,color,delay})=>(
              <div key={key} style={{ background:C.surface, borderRadius:R.card, padding:20, marginBottom:12, boxShadow:C.shadow, borderTop:`3px solid ${color}`, animation:'fadeInUp 0.35s ease both', animationDelay:delay }}>
                <div style={{ fontSize:11, fontWeight:700, color, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:12 }}>{label}</div>
                {key==='what_to_do_next' ? (
                  <ol style={{ paddingLeft:20 }}>{(result.what_to_do_next||[]).map((s,i)=><li key={i} style={{ fontSize:15,color:C.text,lineHeight:1.7,marginBottom:6 }}>{s}</li>)}</ol>
                ) : <p style={{ fontSize:15,color:C.text,lineHeight:1.7 }}>{result[key]}</p>}
              </div>
            ))}

            {/* Action row */}
            <div style={{ display:'flex', gap:8, marginBottom:12, animation:'fadeInUp 0.35s ease 280ms both' }}>
              {[
                {label:resultCopied?'✓ Copied!':'📋 Copy',action:handleCopyResult,active:resultCopied},
                {label:speaking?'⏹ Stop':'🔊 Read',action:handleReadAloud,active:speaking},
                {label:'📤 WhatsApp',action:handleWhatsAppShare,active:false},
              ].map(({label,action,active})=>(
                <button key={label} className="btn-press" onClick={action} style={{ flex:1, height:44, background:active?C.primary:C.surface, color:active?'#fff':C.primary, border:`1.5px solid ${active?C.primary:C.border}`, borderRadius:R.pill, fontSize:13, fontWeight:600, cursor:'pointer', transition:'all 0.18s' }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Referral */}
            <div style={{ background:C.surface, border:`1.5px dashed ${C.border}`, borderRadius:R.card, padding:18, marginBottom:12, animation:'fadeInUp 0.35s ease 340ms both' }}>
              <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:6 }}>🎁 Give a friend 1 free extra decode</div>
              <p style={{ fontSize:13, color:C.textSecondary, lineHeight:1.55, marginBottom:14 }}>Share your link — they get 1 bonus decode automatically.</p>
              <div style={{ display:'flex', gap:8 }}>
                <div style={{ flex:1, background:C.bg, borderRadius:8, padding:'10px 12px', fontSize:12, color:C.textMuted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:'monospace' }}>{referralLink}</div>
                <button className="btn-press" onClick={handleCopyReferral} style={{ flexShrink:0, height:40, padding:'0 16px', background:referralCopied?C.success:C.primary, color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', transition:'background 0.2s', animation:referralCopied?'greenPop 0.3s ease':'none' }}>
                  {referralCopied?'✓ Copied!':'Copy link'}
                </button>
              </div>
            </div>

            {/* Follow-up chat */}
            <div style={{ background:C.surface, borderRadius:R.card, padding:20, marginBottom:12, boxShadow:C.shadow, animation:'fadeInUp 0.35s ease 400ms both' }}>
              <div style={{ fontSize:14, fontWeight:600, color:C.text, marginBottom:16 }}>Ask a follow-up question</div>
              {followups.map((item,i)=>(
                <div key={i} style={{ marginBottom:14 }}>
                  <div style={{ display:'flex', justifyContent:'flex-end' }}>
                    <div style={{ background:C.surface2, color:C.primary, padding:'10px 14px', borderRadius:'16px 16px 4px 16px', fontSize:14, fontWeight:500, maxWidth:'85%' }}>{item.q}</div>
                  </div>
                  <div style={{ display:'flex', gap:8, marginTop:8, alignItems:'flex-start' }}>
                    <div style={{ width:28, height:28, background:C.bg, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0, border:`1px solid ${C.border}` }}>🔍</div>
                    <div style={{ background:C.surface, border:`1px solid ${C.border}`, color:C.text, padding:'10px 14px', borderRadius:'4px 16px 16px 16px', fontSize:14, lineHeight:1.6, maxWidth:'85%' }}>{item.a}</div>
                  </div>
                </div>
              ))}
              {followupLoading && <p style={{ fontSize:14, color:C.textMuted, animation:'pulse 1.4s ease-in-out infinite', marginBottom:12 }}>Thinking...</p>}
              <div ref={chatEndRef} />
              <div style={{ display:'flex', gap:8 }}>
                <input value={followupQ} onChange={e=>setFollowupQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!followupLoading&&handleFollowup()} placeholder="Is this serious? What should I do first?"
                  style={{ flex:1, height:48, padding:'0 14px', borderRadius:12, border:`1.5px solid ${C.border}`, fontSize:16, color:C.text, outline:'none', fontFamily:FONT, background:C.surface, transition:'border-color 0.18s, box-shadow 0.18s' }}
                  onFocus={e=>{e.target.style.borderColor=C.primary;e.target.style.boxShadow=`0 0 0 3px ${C.primaryGlow}`;}}
                  onBlur={e=>{e.target.style.borderColor=C.border;e.target.style.boxShadow='none';}}
                />
                <button className="btn-press" onClick={handleFollowup} disabled={followupLoading||!followupQ.trim()} style={{ width:48, height:48, background:followupLoading?'#9992d4':GRAD, color:'#fff', border:'none', borderRadius:12, fontSize:20, cursor:followupLoading?'not-allowed':'pointer', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {followupLoading?<Spinner size={16}/>:'→'}
                </button>
              </div>
            </div>

            <button className="btn-press" onClick={handleReset} style={{ width:'100%', height:52, background:GRAD, color:'#fff', border:'none', borderRadius:14, fontSize:16, fontWeight:600, cursor:'pointer', boxShadow:`0 4px 20px ${C.primaryShadow}`, animation:'fadeInUp 0.35s ease 460ms both' }}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px)';}}
              onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';}}
            >
              Decode another document
            </button>
          </div>
        )}

        <p style={{ textAlign:'center', fontSize:12, color:C.textMuted, marginTop:32 }}>Decode — making documents simple for everyone</p>
      </main>

      {/* Waitlist bar */}
      {showWaitlist && !showHistory && !showUpgrade && !loading && <WaitlistBar onDismiss={()=>{localStorage.setItem('waitlist_dismissed','true');setShowWaitlist(false);}} />}

      {/* Dev toolbar */}
      {IS_DEV && (
        <DevToolbar
          onRefreshState={devRefresh}
          onShowUpgrade={() => setShowUpgrade(true)}
          onSetText={setText}
          onSetLanguage={setLanguage}
        />
      )}

      {/* Mobile bottom nav */}
      {isMobile && (
        <nav style={{ position:'fixed', bottom:0, left:0, right:0, background:C.surface, borderTop:`1px solid ${C.border}`, height:60, display:'flex', alignItems:'center', zIndex:500, paddingBottom:'env(safe-area-inset-bottom)' }}>
          {[
            {id:'home',icon:'🏠',label:'Home',action:()=>{handleReset();setActiveTab('home');}},
            {id:'history',icon:'📋',label:'History',action:()=>{setShowHistory(true);setActiveTab('history');}},
            {id:'upgrade',icon:'👑',label:'Upgrade',action:()=>{setShowUpgrade(true);setActiveTab('upgrade');}},
          ].map(({id,icon,label,action})=>{
            const active = activeTab===id||(id==='history'&&showHistory)||(id==='upgrade'&&showUpgrade);
            return (
              <button key={id} className="btn-press" onClick={action} style={{ flex:1, height:'100%', background:'none', border:'none', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3, cursor:'pointer', color:active?C.primary:C.textMuted }}>
                <span style={{ fontSize:20 }}>{icon}</span>
                <span style={{ fontSize:10, fontWeight:active?700:500 }}>{label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
