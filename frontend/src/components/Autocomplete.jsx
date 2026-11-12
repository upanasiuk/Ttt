import { useState, useEffect, useRef } from 'react';
import { api } from '../api';

export default function Autocomplete({ value, onChange, placeholder = "Имя получателя" }) {
  const [users, setUsers] = useState([]);
  const [show, setShow] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    api("/api/recipients").then(data => setUsers(data.map(u => u.name)));
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShow(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const filtered = users.filter(u => u.toLowerCase().includes(value.toLowerCase())).slice(0, 10);

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && filtered[activeIndex]) {
        onChange(filtered[activeIndex]);
        setShow(false);
      }
    } else if (e.key === "Escape") {
      setShow(false);
    }
  };

  return (
    <div className="autocomplete-wrapper" ref={wrapperRef}>
      <input
        ref={inputRef}
        placeholder={placeholder}
        value={value}
        onChange={e => { onChange(e.target.value); setShow(true); setActiveIndex(-1); }}
        onFocus={() => setShow(true)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      {show && value && filtered.length > 0 && (
        <ul className="autocomplete-list" style={{ display: 'block' }}>
          {filtered.map((u, i) => (
            <li 
              key={u}
              className={i === activeIndex ? 'active' : ''}
              onMouseDown={(e) => { 
                e.preventDefault(); 
                onChange(u); 
                setShow(false); 
              }}
            >
              {u}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}