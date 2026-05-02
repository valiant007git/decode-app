import React, { useState, useEffect, useRef } from 'react';

const ACCENT = '#534AB7';
const ACCENT_DARK = '#3f38a0';
const LANGUAGES = ['English', 'Hindi', 'Bengali'];
const DOC_TYPES = [
  'Medical report',
  'Legal notice',
  'Bank document',
  'Govt letter',
  'Prescription',
  'Contract',
  'Other',
];
const DAILY_LIMIT = 3;

const EXAMPLES = [
  'Haemoglobin 9.2 g/dL, below normal range 12-16',
  'Legal notice: vacate premises within 30 days',
  'EMI bounced, NACH mandate rejected by bank',
];

function getTodayKey() {
  return 'decode_count_' + new Date().toISOString().slice(0, 10);
}
function getUsageCount() {
  return parseInt(localStorage.getItem(getTodayKey()) || '0', 10);
}
function incrementUsage() {
  const key = getTodayKey();
  const next = getUsageCount() + 1;
  localStorage.setItem(key, String(next));
  return next;
}

const CARD_COLORS = {
  what_is_this: '#3B82F6',
  what_it_means_for_you: '#10B981',
  what_to_do_next: '#534AB7',
};

const fadeInStyle = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.7; }
  }
`;

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
  const fileInputRef = useRef(null);

  useEffect(() => {
    const count = getUsageCount();
    setUsageCount(count);
    if (count >= DAILY_LIMIT) setLimitReached(true);
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
    setImageBase64('');
    setImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleDecode() {
    if (!imageBase64 && !text.trim()) {
      setError('Please paste text or upload a document image.');
      return;
    }
    const currentCount = getUsageCount();
    if (currentCount >= DAILY_LIMIT) { setLimitReached(true); return; }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/decode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-usage-count': String(currentCount),
          'x-is-paid': 'false',
        },
        body: JSON.stringify({ text, imageBase64, language, docType }),
      });

      if (res.status === 402) { setLimitReached(true); setLoading(false); return; }

      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Something went wrong. Please try again.');
        setLoading(false);
        return;
      }

      const newCount = incrementUsage();
      setUsageCount(newCount);
      if (newCount >= DAILY_LIMIT) setLimitReached(true);
      setResult(data.result);
    } catch {
      setError('Could not connect to server. Please try again.');
    }

    setLoading(false);
  }

  function handleReset() {
    setResult(null);
    setError('');
    setText('');
    setImageBase64('');
    setImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setLimitReached(getUsageCount() >= DAILY_LIMIT);
  }

  function handleWhatsAppShare() {
    const msg = `I just decoded a confusing document in seconds using Decode! 🔍\n\nIt explained everything in simple ${language} — medical reports, legal notices, bank letters.\n\nTry it free: ${window.location.href}`;
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
  }

  const remaining = DAILY_LIMIT - usageCount;
  const loadingMessage = imageBase64 ? 'Reading your document...' : 'Decoding...';

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f7f6fb',
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    }}>
      <style>{fadeInStyle}</style>

      {/* Header */}
      <div style={{
        backgroundColor: '#fff',
        borderBottom: '1px solid #ede9f8',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <span style={{ fontSize: 22 }}>🔍</span>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', lineHeight: 1.2 }}>Decode</div>
          <div style={{ fontSize: 13, color: '#999', marginTop: 1 }}>Understand any document in plain language</div>
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px 48px' }}>

        {!result ? (
          <div style={{
            backgroundColor: '#fff',
            borderRadius: 20,
            padding: 24,
            boxShadow: '0 2px 20px rgba(83,74,183,0.08)',
          }}>

            {/* Language selector */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#444', display: 'block', marginBottom: 10 }}>
                Explain in
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {LANGUAGES.map(lang => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    style={{
                      flex: 1, padding: '9px 0', borderRadius: 10,
                      border: language === lang ? `2px solid ${ACCENT}` : '2px solid #e8e6f0',
                      backgroundColor: language === lang ? '#eeecf9' : '#fff',
                      color: language === lang ? ACCENT : '#666',
                      fontWeight: language === lang ? 700 : 500,
                      fontSize: 14, cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >{lang}</button>
                ))}
              </div>
            </div>

            {/* Document type */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#444', display: 'block', marginBottom: 10 }}>
                Document type
              </label>
              <select
                value={docType}
                onChange={e => setDocType(e.target.value)}
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 10,
                  border: '2px solid #e8e6f0', backgroundColor: '#fff',
                  fontSize: 15, color: '#1a1a2e', outline: 'none', cursor: 'pointer',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23999' stroke-width='2' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: 36,
                }}
              >
                {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Image upload */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#444', display: 'block', marginBottom: 10 }}>
                Upload document image
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageChange}
                style={{ display: 'none' }}
              />
              {!imagePreview ? (
                <div
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  style={{
                    border: '2px dashed #c9c4e8', borderRadius: 12, padding: '22px 16px',
                    textAlign: 'center', cursor: 'pointer', backgroundColor: '#faf9ff',
                    transition: 'border-color 0.15s, background-color 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.backgroundColor = '#f0eeff'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#c9c4e8'; e.currentTarget.style.backgroundColor = '#faf9ff'; }}
                >
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📷</div>
                  <p style={{ margin: 0, fontSize: 14, color: '#666', lineHeight: 1.5 }}>
                    Take a photo or upload document image
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#aaa' }}>JPG, PNG, HEIC — any image format</p>
                </div>
              ) : (
                <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: `2px solid ${ACCENT}` }}>
                  <img src={imagePreview} alt="Document preview" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }} />
                  <button
                    onClick={handleRemoveImage}
                    style={{
                      position: 'absolute', top: 8, right: 8,
                      backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff',
                      border: 'none', borderRadius: 20, padding: '4px 10px',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}
                  >✕ Remove</button>
                </div>
              )}
            </div>

            {/* Textarea */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#444', display: 'block', marginBottom: 10 }}>
                Document text{imageBase64 && <span style={{ fontWeight: 400, color: '#aaa' }}> (optional if image uploaded)</span>}
              </label>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Paste confusing text here..."
                rows={5}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 10,
                  border: '2px solid #e8e6f0', fontSize: 15, color: '#1a1a2e',
                  lineHeight: 1.6, resize: 'vertical', outline: 'none',
                  fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = ACCENT}
                onBlur={e => e.target.style.borderColor = '#e8e6f0'}
              />

              {/* Example chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {EXAMPLES.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setText(ex)}
                    style={{
                      fontSize: 12, padding: '5px 12px', borderRadius: 20,
                      border: '1px solid #ddd9f5', backgroundColor: '#f5f3ff',
                      color: '#534AB7', cursor: 'pointer', lineHeight: 1.4,
                      transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#eeecf9'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f5f3ff'}
                  >
                    {ex.length > 38 ? ex.slice(0, 38) + '…' : ex}
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                backgroundColor: '#fff3f3', border: '1px solid #ffd0d0',
                borderRadius: 10, padding: '12px 14px', marginBottom: 16,
                fontSize: 14, color: '#cc3333',
              }}>{error}</div>
            )}

            {/* Freemium gate */}
            {limitReached ? (
              <div style={{ backgroundColor: '#f0eeff', borderRadius: 12, padding: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>🔒</div>
                <p style={{ margin: '0 0 6px', fontWeight: 700, color: '#1a1a2e', fontSize: 16 }}>
                  You've used your 3 free decodes today
                </p>
                <p style={{ margin: '0 0 16px', color: '#666', fontSize: 14 }}>Upgrade for unlimited decodes</p>
                <button style={{
                  backgroundColor: ACCENT, color: '#fff', border: 'none',
                  borderRadius: 10, padding: '12px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                }}>Upgrade for ₹199/month</button>
              </div>
            ) : (
              <>
                {/* Usage dots */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{
                    fontSize: 13,
                    color: remaining === 1 ? '#F59E0B' : '#999',
                    fontWeight: remaining === 1 ? 600 : 400,
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

                {/* Decode button */}
                <button
                  onClick={handleDecode}
                  disabled={loading}
                  style={{
                    width: '100%', padding: '15px 0',
                    backgroundColor: loading ? '#9992d4' : ACCENT,
                    color: '#fff', border: 'none', borderRadius: 12,
                    fontSize: 17, fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    letterSpacing: '0.2px',
                    animation: loading ? 'pulse 1.4s ease-in-out infinite' : 'none',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={e => { if (!loading) e.target.style.backgroundColor = ACCENT_DARK; }}
                  onMouseLeave={e => { if (!loading) e.target.style.backgroundColor = loading ? '#9992d4' : ACCENT; }}
                >
                  {loading ? loadingMessage : 'Decode it'}
                </button>
                {loading && (
                  <p style={{ textAlign: 'center', fontSize: 13, color: '#aaa', marginTop: 10, marginBottom: 0 }}>
                    This usually takes 5–10 seconds
                  </p>
                )}
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
              <div
                key={key}
                style={{
                  backgroundColor: '#fff', borderRadius: 16,
                  padding: '20px 22px', marginBottom: 14,
                  boxShadow: '0 2px 16px rgba(83,74,183,0.07)',
                  borderLeft: `4px solid ${color}`,
                  animation: `fadeInUp 0.35s ease both`,
                  animationDelay: delay,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: '1.2px', marginBottom: 10 }}>
                  {label}
                </div>
                {key === 'what_to_do_next' ? (
                  <ol style={{ margin: 0, padding: '0 0 0 20px' }}>
                    {(result.what_to_do_next || []).map((step, i) => (
                      <li key={i} style={{
                        fontSize: 15, color: '#1a1a2e', lineHeight: 1.65,
                        marginBottom: i < result.what_to_do_next.length - 1 ? 10 : 0,
                      }}>{step}</li>
                    ))}
                  </ol>
                ) : (
                  <p style={{ margin: 0, fontSize: 15, color: '#1a1a2e', lineHeight: 1.65 }}>
                    {result[key]}
                  </p>
                )}
              </div>
            ))}

            {/* WhatsApp share */}
            <button
              onClick={handleWhatsAppShare}
              style={{
                width: '100%', height: 48,
                backgroundColor: '#25D366', color: '#fff',
                border: 'none', borderRadius: 12,
                fontSize: 16, fontWeight: 700, cursor: 'pointer',
                marginBottom: 12,
                animation: 'fadeInUp 0.35s ease 240ms both',
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1fb855'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#25D366'}
            >
              📤 Share on WhatsApp
            </button>

            {/* Decode another */}
            <button
              onClick={handleReset}
              style={{
                width: '100%', padding: '15px 0',
                backgroundColor: ACCENT, color: '#fff',
                border: 'none', borderRadius: 12,
                fontSize: 16, fontWeight: 700, cursor: 'pointer',
                animation: 'fadeInUp 0.35s ease 300ms both',
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = ACCENT_DARK}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = ACCENT}
            >
              Decode another document
            </button>
          </div>
        )}

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: 13, color: '#ccc', marginTop: 32 }}>
          Decode — making documents simple for everyone
        </p>
      </div>
    </div>
  );
}
