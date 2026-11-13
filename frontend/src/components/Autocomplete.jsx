import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { getStatusLabel } from '../constants';

export default function Autocomplete({ value, onChange, placeholder = "Имя получателя", items, readOnlyInput = false }) {
  const [users, setUsers] = useState([]);
  const [show, setShow] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isTyping, setIsTyping] = useState(false);
  const wrapperRef = useRef(null);
  const listRef = useRef(null);

  const isCustomList = !!items;
  const sourceList = isCustomList ? items : users;

  const loadUsers = async () => {
    if (isCustomList) return;
    try {
      const data = await api("/api/recipients");
      setUsers(data.map(u => u.name).sort());
    } catch (e) {}
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (isCustomList) return;
      try {
        const data = await api("/api/recipients");
        if (!cancelled) setUsers(data.map(u => u.name).sort());
      } catch (e) {}
    };
    run();
    return () => { cancelled = true; };
  }, [isCustomList]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShow(false);
        setIsTyping(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = isTyping
    ? sourceList.filter(u => getStatusLabel(u).toLowerCase().includes(value.toLowerCase().trim()))
    : sourceList;

  useEffect(() => {
    if (!show || activeIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll('li');
    const el = items[activeIndex];
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeIndex, show]);

  const handleFocus = () => {
    loadUsers();
    setShow(true);
    setActiveIndex(-1);
    setIsTyping(false);
  };

  const handleKeyDown = (e) => {
    if (!show) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (filtered.length > 0) setActiveIndex(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (filtered.length > 0) setActiveIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && filtered[activeIndex]) {
        onChange(filtered[activeIndex]);
        setShow(false);
        setIsTyping(false);
        setActiveIndex(-1);
      } else if (activeIndex === -1 && filtered.length > 0 && readOnlyInput) {
        onChange(filtered[0]);
        setShow(false);
        setIsTyping(false);
      } else {
        setShow(false);
        setIsTyping(false);
      }
    } else if (e.key === "Escape") {
      setShow(false);
      setIsTyping(false);
    }
  };

  const handleSelect = (name) => {
    onChange(name);
    setShow(false);
    setIsTyping(false);
    setActiveIndex(-1);
  };

  return (
    <div className="autocomplete-wrapper" ref={wrapperRef}>
      <div className="flex-row gap-0" style={{ position: 'relative' }}>
        <input
          placeholder={placeholder}
          value={getStatusLabel(value)}
          onChange={e => {
            if (readOnlyInput) return;
            onChange(e.target.value);
            setShow(true);
            setIsTyping(true);
            setActiveIndex(-1);
          }}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          style={{ paddingRight: '30px', cursor: readOnlyInput ? 'pointer' : 'text' }}
          readOnly={readOnlyInput}
        />
        <button
          type="button"
          onClick={() => { setShow(!show); setIsTyping(false); }}
          className="dropdown-toggle-btn"
          title="Показать список"
        >
          ▼
        </button>
      </div>

      {show && (
        <ul ref={listRef} className="autocomplete-list" style={{ display: 'block', maxHeight: '250px' }}>
          {filtered.length === 0 ? (
            <li className="muted" style={{ padding: '10px 14px', cursor: 'default', textAlign: 'center' }}>
              {value ? "Своё значение" : "Введите текст..."}
            </li>
          ) : (
            filtered.map((u, i) => (
              <li
                key={`${u}-${i}`}
                className={i === activeIndex ? 'active' : ''}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(u);
                }}
              >
                {readOnlyInput ? getStatusLabel(u) : u}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}