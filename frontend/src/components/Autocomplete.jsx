import { useState, useEffect, useRef } from 'react';
import { api } from '../api';

export default function Autocomplete({ value, onChange, placeholder = "Имя получателя" }) {
  const [users, setUsers] = useState([]);
  const [show, setShow] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);

  const loadUsers = async () => {
    try {
      const data = await api("/api/recipients");
      setUsers(data.map(u => u.name).sort()); // Сортируем по алфавиту
    } catch (e) {}
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Закрытие при клике вне компонента
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShow(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const handleFocus = () => {
    loadUsers();
    // Если поле пустое, сразу показываем всех
    if (!value) setShow(true);
    else setShow(true);
  };

  const filtered = value 
    ? users.filter(u => u.toLowerCase().includes(value.toLowerCase().trim())).slice(0, 15)
    : users.slice(0, 15); // Показываем первых 15, если пусто

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
      }
    } else if (e.key === "Escape") {
      setShow(false);
    }
  };

  const handleSelect = (name) => {
    onChange(name);
    setShow(false);
  };

  return (
    <div className="autocomplete-wrapper" ref={wrapperRef}>
      <div className="flex-row gap-0" style={{ position: 'relative' }}>
        <input
          placeholder={placeholder}
          value={value}
          onChange={e => { onChange(e.target.value); setShow(true); setActiveIndex(-1); }}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          style={{ paddingRight: '30px' }} // Место под иконку
        />
        <button 
          type="button" 
          onClick={() => setShow(!show)}
          className="dropdown-toggle-btn"
          title="Показать всех"
        >
          ▼
        </button>
      </div>
      
      {show && (
        <ul className="autocomplete-list" style={{ display: 'block', maxHeight: '250px' }}>
          {filtered.length === 0 ? (
            <li className="muted" style={{ padding: '10px 14px', cursor: 'default', textAlign: 'center' }}>Нет совпадений</li>
          ) : (
            filtered.map((u, i) => (
              <li 
                key={u}
                className={i === activeIndex ? 'active' : ''}
                onMouseDown={(e) => { 
                  e.preventDefault(); 
                  handleSelect(u); 
                }}
              >
                {u}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}