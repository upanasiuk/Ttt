import { useState, useEffect, useRef } from 'react';
import { api } from '../api';

export default function Autocomplete({ value, onChange, placeholder = "Имя получателя", items, readOnlyInput = false }) {
  const [users, setUsers] = useState([]);
  const [show, setShow] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searchQuery, setSearchQuery] = useState(""); // Локальный поиск
  const wrapperRef = useRef(null);

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
    loadUsers();
  }, [isCustomList]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShow(false);
        setSearchQuery(""); // Сбрасываем поиск при закрытии
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const handleFocus = () => {
    loadUsers();
    setShow(true);
    setActiveIndex(-1);
    setSearchQuery(""); // При фокусе показываем всё
  };

  const getLabel = (val) => {
    const labels = {
      pending: "Ожидает отправки",
      in_transit: "В пути к CARGO",
      received_cargo: "Получен CARGO",
      issued: "Выдан"
    };
    return labels[val] || val;
  };

  // Фильтруем только по локальному запросу
  const filtered = searchQuery 
    ? sourceList.filter(u => getLabel(u).toLowerCase().includes(searchQuery.toLowerCase().trim()))
    : sourceList;

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
        setSearchQuery("");
      } else if (activeIndex === -1 && filtered.length > 0) {
        onChange(filtered[0]);
        setShow(false);
        setSearchQuery("");
      }
    } else if (e.key === "Escape") {
      setShow(false);
      setSearchQuery("");
    }
  };

  const handleSelect = (name) => {
    onChange(name);
    setShow(false);
    setSearchQuery("");
  };

  return (
    <div className="autocomplete-wrapper" ref={wrapperRef}>
      <div className="flex-row gap-0" style={{ position: 'relative' }}>
        <input
          placeholder={placeholder}
          value={getLabel(value)}
          onChange={e => { 
            if (readOnlyInput) return;
            setSearchQuery(e.target.value); // Обновляем локальный запрос
            setShow(true); 
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
          onClick={() => { setShow(!show); setSearchQuery(""); }}
          className="dropdown-toggle-btn"
          title="Показать список"
        >
          ▼
        </button>
      </div>
      
      {show && (
        <ul className="autocomplete-list" style={{ display: 'block', maxHeight: '250px' }}>
          {filtered.length === 0 ? (
            <li className="muted" style={{ padding: '10px 14px', cursor: 'default', textAlign: 'center' }}>
              {searchQuery ? "Нет совпадений" : "Введите текст..."}
            </li>
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
                {readOnlyInput ? getLabel(u) : u}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}