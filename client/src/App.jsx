import React, { useState, useEffect, useRef } from 'react';

const ACCENT = '#534AB7';
const ACCENT_DARK = '#3f38a0';
const LANGUAGES = ['English', 'Hindi', 'Bengali'];
const DOC_TYPES = [
  'Medical report', 'Legal notice', 'Bank document',
  'Govt letter', 'Prescription', 'Contract', 'Other',
];
const DAILY_LIMIT = 3;
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

/* ─── Upgrade Screen ─── */
function UpgradeScreen({ onSuccess, onBack }) {
  const [phone, setPhone] = useState('');
  const [paying, setPaying] = useState(false);
  const [proMsg, setProMsg] = useState('');
  const [phoneError, setPhoneError] = useState('');

  async function handleUpgrade() {
    if (!phone.trim() || phone.trim().length < 10) {
      setPhoneError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setPhoneError('');
    setPaying(true);

    // Step 1 — get key from backend
    let keyId;
    try {
      const res = await fetch('/api/payment/razorpay-key');
      const data = await res.json();
      keyId = data.key_id;
    } catch {
      alert('Could not reach payment server. Please try again.');
      setPaying(false);
      return;
    }

    if (!keyId) {
      alert('Payment is not configured yet. Please try again later.');
      setPaying(false);
      return;
    }

    // Step 2 — load Razorpay script
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      alert('Could not load payment gateway. Please try again.');
      setPaying(false);
      return;
    }

    // Step 3 — open Razorpay modal
    const options = {
      key: keyId,
      amount: 19900,
      currency: 'INR',
      name: 'Decode',
      description: 'Pro Monthly - Unlimited Decodes',
      theme: { color: '#534AB7' },
      prefill: { contact: phone },
      handler: async function (response) {
        // Step 4 — on payment success
        try {
          await fetch('/api/payment/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone,
              razorpay_payment_id: response.razorpay_payment_id,
            }),
          });
        } catch { /* best-effort */ }

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

  if (proMsg) {
    return (
      <div style={{ backgroundColor: '#fff', borderRadius: 20, padding: 32, textAlign: 'center', boxShadow: '0 2px 20px rgba(83,74,183,0.1)' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
        <p style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>{proMsg}</p>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#fff', borderRadius: 20, padding: 28, boxShadow: '0 2px 20px rgba(83,74,183,0.1)' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🔒</div>
        <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#1a1a2e' }}>
          You've used your 3 free decodes today
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: '#666' }}>
          Upgrade to Decode Pro for unlimited decodes
        </p>
      </div>

      {/* Pricing card */}
      <div style={{
        border: `2px solid ${ACCENT}`, borderRadius: 16,
        padding: '20px 22px', marginBottom: 24, backgroundColor: '#faf9ff',
      }}>
        <div style={{ fontSize: 32, fontWeight: 800, color: ACCENT, marginBottom: 4 }}>₹199</div>
        <div style={{ fontSize: 14, color: '#888', marginBottom: 16 }}>per month · cancel anytime</div>
        {[
          'Unlimited decodes every day',
          'Hindi, Bengali and English',
          'Upload document photos',
          'Save decode history (coming soon)',
        ].map((feat, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < 3 ? 10 : 0 }}>
            <span style={{ color: '#10B981', fontSize: 16, flexShrink: 0 }}>✓</span>
            <span style={{ fontSize: 14, color: '#333' }}>{feat}</span>
          </div>
        ))}
      </div>

      {/* Phone input */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: '#444', display: 'block', marginBottom: 8 }}>
          Mobile number (for your account)
        </label>
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
          placeholder="10-digit mobile number"
          style={{
            width: '100%', padding: '11px 14px', borderRadius: 10,
            border: `2px solid ${phoneError ? '#ffd0d0' : '#e8e6f0'}`,
            fontSize: 15, color: '#1a1a2e', outline: 'none',
            fontFamily: 'inherit', boxSizing: 'border-box',
          }}
        />
        {phoneError && <p style={{ margin: '6px 0 0', fontSize: 13, color: '#cc3333' }}>{phoneError}</p>}
      </div>

      <button
        onClick={handleUpgrade}
        disabled={paying}
        style={{
          width: '100%', padding: '15px 0',
          backgroundColor: paying ? '#9992d4' : ACCENT,
          color: '#fff', border: 'none', borderRadius: 12,
          fontSize: 17, fontWeight: 700, cursor: paying ? 'not-allowed' : 'pointer',
          marginBottom: 14,
        }}
      >
        {paying ? 'Opening payment...' : 'Upgrade Now — ₹199/month'}
      </button>

      <div style={{ textAlign: 'center' }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: '#999', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
        >
          Back to free version
        </button>
      </div>
    </div>
  );
}

/* ─── Main App ─── */
export default function App() {
  const [language, setLanguage] = useState('English');
  const [docType, setDocType] = useState('Medical report');
  const [text, setText] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [usageCount, setUsageCount] = useState(getUsageCount());
  const [limitReached, setLimitReached] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [isPaid, setIsPaid] = useState(getIsPaid());
  const [followups, setFollowups] = useState([]);
  const [followupQ, setFollowupQ] = useState('');
  const [followupLoading, setFollowupLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const count = getUsageCount();
    setUsageCount(count);
    const paid = getIsPaid();
    setIsPaid(paid);
    if (count >= DAILY_LIMIT && !paid) setLimitReached(true);
  }, []);

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
    if (!imageBase64 && !text.trim()) {
      setError('Please paste text or upload a document image.');
      return;
    }
    const currentCount = getUsageCount();
    if (currentCount >= DAILY_LIMIT && !isPaid) {
      setLimitReached(true);
      setShowUpgrade(true);
      return;
    }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/decode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-usage-count': String(currentCount),
          'x-is-paid': String(isPaid),
        },
        body: JSON.stringify({ text, imageBase64, language, docType }),
      });
      if (res.status === 402) { setLimitReached(true); setShowUpgrade(true); setLoading(false); return; }
      const data = await res.json();
      if (!data.success) { setError(data.error || 'Something went wrong. Please try again.'); setLoading(false); return; }
      if (!isPaid) {
        const newCount = incrementUsage();
        setUsageCount(newCount);
        if (newCount >= DAILY_LIMIT) setLimitReached(true);
      }
      setResult(data.result);
    } catch { setError('Could not connect to server. Please try again.'); }
    setLoading(false);
  }

  function handleReset() {
    setResult(null); setError(''); setText('');
    setImageBase64(''); setImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    const paid = getIsPaid();
    setIsPaid(paid);
    setLimitReached(getUsageCount() >= DAILY_LIMIT && !paid);
    setShowUpgrade(false);
    setFollowups([]); setFollowupQ('');
    window.speechSynthesis && window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  async function handleFollowup() {
    if (!followupQ.trim()) return;
    const q = followupQ.trim();
    setFollowupQ('');
    setFollowupLoading(true);
    try {
      const res = await fetch('/api/decode/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, originalText: text, language }),
      });
      const data = await res.json();
      setFollowups(prev => [...prev, { q, a: data.success ? data.answer : data.error }]);
    } catch {
      setFollowups(prev => [...prev, { q, a: 'Could not get an answer. Please try again.' }]);
    }
    setFollowupLoading(false);
  }

  function handleReadAloud() {
    if (!window.speechSynthesis) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const langMap = { Hindi: 'hi-IN', Bengali: 'bn-IN', English: 'en-IN' };
    const fullText = [
      `What is this? ${result.what_is_this}`,
      `What it means for you. ${result.what_it_means_for_you}`,
      `What to do next. ${(result.what_to_do_next || []).join('. ')}`,
    ].join('. ');
    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.lang = langMap[language] || 'en-IN';
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  function handleUpgradeSuccess() {
    setIsPaid(true);
    setLimitReached(false);
    setShowUpgrade(false);
    setUsageCount(0);
  }

  function handleWhatsAppShare() {
    const msg = `I just decoded a confusing document in seconds using Decode! 🔍\n\nIt explained everything in simple ${language} — medical reports, legal notices, bank letters.\n\nTry it free: ${window.location.href}`;
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
  }

  const remaining = DAILY_LIMIT - usageCount;
  const loadingMessage = imageBase64 ? 'Reading your document...' : 'Decoding...';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f7f6fb', fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }}>
      <style>{globalStyles}</style>

      {/* Header */}
      <div style={{
        backgroundColor: '#fff', borderBottom: '1px solid #ede9f8',
        padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 22 }}>🔍</span>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', lineHeight: 1.2 }}>Decode</div>
          <div style={{ fontSize: 13, color: '#999', marginTop: 1 }}>Understand any document in plain language</div>
        </div>
        {isPaid && (
          <div style={{
            marginLeft: 'auto', backgroundColor: '#f0eeff', color: ACCENT,
            fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
          }}>PRO</div>
        )}
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px 48px' }}>

        {/* Upgrade screen */}
        {showUpgrade ? (
          <UpgradeScreen onSuccess={handleUpgradeSuccess} onBack={() => setShowUpgrade(false)} />
        ) : !result ? (
          <div style={{ backgroundColor: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 2px 20px rgba(83,74,183,0.08)' }}>

            {/* Language selector */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#444', display: 'block', marginBottom: 10 }}>Explain in</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {LANGUAGES.map(lang => (
                  <button key={lang} onClick={() => setLanguage(lang)} style={{
                    flex: 1, padding: '9px 0', borderRadius: 10,
                    border: language === lang ? `2px solid ${ACCENT}` : '2px solid #e8e6f0',
                    backgroundColor: language === lang ? '#eeecf9' : '#fff',
                    color: language === lang ? ACCENT : '#666',
                    fontWeight: language === lang ? 700 : 500,
                    fontSize: 14, cursor: 'pointer', transition: 'all 0.15s',
                  }}>{lang}</button>
                ))}
              </div>
            </div>

            {/* Document type */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#444', display: 'block', marginBottom: 10 }}>Document type</label>
              <select value={docType} onChange={e => setDocType(e.target.value)} style={{
                width: '100%', padding: '11px 14px', borderRadius: 10,
                border: '2px solid #e8e6f0', backgroundColor: '#fff',
                fontSize: 15, color: '#1a1a2e', outline: 'none', cursor: 'pointer',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23999' stroke-width='2' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: 36,
              }}>
                {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Image upload */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#444', display: 'block', marginBottom: 10 }}>Upload document image</label>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageChange} style={{ display: 'none' }} />
              {!imagePreview ? (
                <div
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  style={{
                    border: '2px dashed #c9c4e8', borderRadius: 12, padding: '22px 16px',
                    textAlign: 'center', cursor: 'pointer', backgroundColor: '#faf9ff', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.backgroundColor = '#f0eeff'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#c9c4e8'; e.currentTarget.style.backgroundColor = '#faf9ff'; }}
                >
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📷</div>
                  <p style={{ margin: 0, fontSize: 14, color: '#666' }}>Take a photo or upload document image</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#aaa' }}>JPG, PNG, HEIC — any image format</p>
                </div>
              ) : (
                <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: `2px solid ${ACCENT}` }}>
                  <img src={imagePreview} alt="Document" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }} />
                  <button onClick={handleRemoveImage} style={{
                    position: 'absolute', top: 8, right: 8,
                    backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff',
                    border: 'none', borderRadius: 20, padding: '4px 10px',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}>✕ Remove</button>
                </div>
              )}
            </div>

            {/* Textarea */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#444', display: 'block', marginBottom: 10 }}>
                Document text{imageBase64 && <span style={{ fontWeight: 400, color: '#aaa' }}> (optional if image uploaded)</span>}
              </label>
              <textarea
                value={text} onChange={e => setText(e.target.value)}
                placeholder="Paste confusing text here..." rows={5}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 10,
                  border: '2px solid #e8e6f0', fontSize: 15, color: '#1a1a2e',
                  lineHeight: 1.6, resize: 'vertical', outline: 'none',
                  fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = ACCENT}
                onBlur={e => e.target.style.borderColor = '#e8e6f0'}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {EXAMPLES.map((ex, i) => (
                  <button key={i} onClick={() => setText(ex)} style={{
                    fontSize: 12, padding: '5px 12px', borderRadius: 20,
                    border: '1px solid #ddd9f5', backgroundColor: '#f5f3ff',
                    color: ACCENT, cursor: 'pointer', lineHeight: 1.4, transition: 'background-color 0.15s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#eeecf9'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f5f3ff'}
                  >{ex.length > 38 ? ex.slice(0, 38) + '…' : ex}</button>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ backgroundColor: '#fff3f3', border: '1px solid #ffd0d0', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 14, color: '#cc3333' }}>
                {error}
              </div>
            )}

            {/* Freemium gate or decode button */}
            {limitReached && !isPaid ? (
              <button
                onClick={() => setShowUpgrade(true)}
                style={{
                  width: '100%', padding: '15px 0', backgroundColor: ACCENT,
                  color: '#fff', border: 'none', borderRadius: 12,
                  fontSize: 17, fontWeight: 700, cursor: 'pointer',
                }}
              >🔒 Upgrade for Unlimited Decodes</button>
            ) : (
              <>
                {!isPaid && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <span style={{
                      fontSize: 13, fontWeight: remaining === 1 ? 600 : 400,
                      color: remaining === 1 ? '#F59E0B' : '#999',
                    }}>
                      {remaining === 1 ? '⚠️ ' : ''}{remaining} free decode{remaining !== 1 ? 's' : ''} remaining today
                    </span>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{
                          width: 10, height: 10, borderRadius: '50%',
                          backgroundColor: i < (DAILY_LIMIT - remaining) ? '#e0ddf5' : '#22C55E',
                        }} />
                      ))}
                    </div>
                  </div>
                )}
                <button
                  onClick={handleDecode} disabled={loading}
                  style={{
                    width: '100%', padding: '15px 0',
                    backgroundColor: loading ? '#9992d4' : ACCENT,
                    color: '#fff', border: 'none', borderRadius: 12,
                    fontSize: 17, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                    animation: loading ? 'pulse 1.4s ease-in-out infinite' : 'none',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={e => { if (!loading) e.target.style.backgroundColor = ACCENT_DARK; }}
                  onMouseLeave={e => { if (!loading) e.target.style.backgroundColor = loading ? '#9992d4' : ACCENT; }}
                >
                  {loading ? loadingMessage : 'Decode it'}
                </button>
                {loading && <p style={{ textAlign: 'center', fontSize: 13, color: '#aaa', marginTop: 10, marginBottom: 0 }}>This usually takes 5–10 seconds</p>}
              </>
            )}
          </div>
        ) : (
          /* Result cards */
          <div>
            {[
              { key: 'what_is_this', label: 'WHAT IS THIS?', color: CARD_COLORS.what_is_this, delay: '0ms' },
              { key: 'what_it_means_for_you', label: 'WHAT IT MEANS FOR YOU', color: CARD_COLORS.what_it_means_for_you, delay: '80ms' },
              { key: 'what_to_do_next', label: 'WHAT TO DO NEXT', color: CARD_COLORS.what_to_do_next, delay: '160ms' },
            ].map(({ key, label, color, delay }) => (
              <div key={key} style={{
                backgroundColor: '#fff', borderRadius: 16, padding: '20px 22px', marginBottom: 14,
                boxShadow: '0 2px 16px rgba(83,74,183,0.07)', borderLeft: `4px solid ${color}`,
                animation: `fadeInUp 0.35s ease both`, animationDelay: delay,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: '1.2px', marginBottom: 10 }}>{label}</div>
                {key === 'what_to_do_next' ? (
                  <ol style={{ margin: 0, padding: '0 0 0 20px' }}>
                    {(result.what_to_do_next || []).map((step, i) => (
                      <li key={i} style={{ fontSize: 15, color: '#1a1a2e', lineHeight: 1.65, marginBottom: i < result.what_to_do_next.length - 1 ? 10 : 0 }}>{step}</li>
                    ))}
                  </ol>
                ) : (
                  <p style={{ margin: 0, fontSize: 15, color: '#1a1a2e', lineHeight: 1.65 }}>{result[key]}</p>
                )}
              </div>
            ))}

            {/* Read aloud */}
            <button
              onClick={handleReadAloud}
              style={{
                width: '100%', height: 44, backgroundColor: '#fff', color: ACCENT,
                border: `2px solid ${ACCENT}`, borderRadius: 12, fontSize: 15, fontWeight: 600,
                cursor: 'pointer', marginBottom: 12, animation: 'fadeInUp 0.35s ease 200ms both',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f0eeff'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fff'; }}
            >
              {speaking ? '⏹ Stop reading' : '🔊 Read aloud'}
            </button>

            {/* WhatsApp share */}
            <button onClick={handleWhatsAppShare} style={{
              width: '100%', height: 48, backgroundColor: '#25D366', color: '#fff',
              border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700,
              cursor: 'pointer', marginBottom: 12, animation: 'fadeInUp 0.35s ease 280ms both',
            }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1fb855'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#25D366'}
            >📤 Share on WhatsApp</button>

            {/* Follow-up chat */}
            <div style={{
              backgroundColor: '#fff', borderRadius: 16, padding: '20px 22px', marginBottom: 14,
              boxShadow: '0 2px 16px rgba(83,74,183,0.07)',
              animation: 'fadeInUp 0.35s ease 340ms both',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#444', marginBottom: 14 }}>
                Have a question about this document?
              </div>

              {/* Previous Q&As */}
              {followups.map((item, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{
                    backgroundColor: '#f0eeff', borderRadius: '12px 12px 4px 12px',
                    padding: '10px 14px', fontSize: 14, color: ACCENT, fontWeight: 500,
                    marginBottom: 8, alignSelf: 'flex-end',
                  }}>
                    {item.q}
                  </div>
                  <div style={{
                    backgroundColor: '#f7f6fb', borderRadius: '4px 12px 12px 12px',
                    padding: '10px 14px', fontSize: 14, color: '#1a1a2e', lineHeight: 1.6,
                  }}>
                    {item.a}
                  </div>
                </div>
              ))}

              {followupLoading && (
                <div style={{ fontSize: 13, color: '#aaa', marginBottom: 12, animation: 'pulse 1.4s ease-in-out infinite' }}>
                  Thinking...
                </div>
              )}

              {/* Input row */}
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={followupQ}
                  onChange={e => setFollowupQ(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !followupLoading && handleFollowup()}
                  placeholder="Ask anything... e.g. Is this serious?"
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: 10,
                    border: '2px solid #e8e6f0', fontSize: 14, color: '#1a1a2e',
                    outline: 'none', fontFamily: 'inherit',
                  }}
                  onFocus={e => e.target.style.borderColor = ACCENT}
                  onBlur={e => e.target.style.borderColor = '#e8e6f0'}
                />
                <button
                  onClick={handleFollowup}
                  disabled={followupLoading || !followupQ.trim()}
                  style={{
                    padding: '10px 18px', backgroundColor: followupLoading ? '#9992d4' : ACCENT,
                    color: '#fff', border: 'none', borderRadius: 10,
                    fontSize: 14, fontWeight: 700, cursor: followupLoading ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >Ask</button>
              </div>
            </div>

            <button onClick={handleReset} style={{
              width: '100%', padding: '15px 0', backgroundColor: ACCENT, color: '#fff',
              border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700,
              cursor: 'pointer', animation: 'fadeInUp 0.35s ease 400ms both',
            }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = ACCENT_DARK}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = ACCENT}
            >Decode another document</button>
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: 13, color: '#ccc', marginTop: 32 }}>
          Decode — making documents simple for everyone
        </p>
      </div>
    </div>
  );
}
