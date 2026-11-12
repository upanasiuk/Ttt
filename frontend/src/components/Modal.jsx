import { useState, useEffect, useRef } from 'react';

export default function Modal({ isOpen, type, title, message, hint, placeholder, isDanger, onConfirm, onCancel, children }) {
  const [input, setInput] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && type === 'prompt') {
      setInput("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, type]);

  if (!isOpen) return null;

  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal-content" style={{ borderColor: isDanger ? 'var(--accent-danger)' : 'var(--border-color)' }}>
        <h3 style={{ color: isDanger ? 'var(--accent-danger)' : 'var(--accent-primary)' }}>{title}</h3>
        
        {message && <p className="mb-16 font-14 text-muted" style={{ whiteSpace: 'pre-wrap' }}>{message}</p>}
        
        {type === 'prompt' && (
          <>
            {hint && <p className="muted font-12 mb-8">{hint}</p>}
            <input 
              ref={inputRef}
              className={isDanger ? "danger-input" : ""}
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') onConfirm(input); if (e.key === 'Escape') onCancel(); }}
              placeholder={placeholder || ""} 
              autoComplete="new-password"
            />
          </>
        )}

        {children}

        <div className="btn-row">
          {type !== 'alert' && <button className="secondary flex-1" onClick={onCancel}>Отмена</button>}
          <button 
            className="primary flex-1" 
            onClick={() => onConfirm(input)}
            style={{ background: isDanger ? 'var(--accent-danger)' : '', borderColor: isDanger ? 'var(--accent-danger)' : '', color: isDanger ? 'white' : '' }}
          >
            {type === 'alert' ? "ОК" : "Подтвердить"}
          </button>
        </div>
      </div>
    </div>
  );
}