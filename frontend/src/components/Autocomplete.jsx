import { useState, useEffect, useRef } from 'react';
import { api } from '../api';

export default function Autocomplete({ value, onChange, placeholder = "Имя получателя", items, readOnlyInput = false }) {
  const [users, setUsers] = useState([]);
  const [show, setShow] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searchQuery, setSearchQuery] = useState(null); // null = показываем value, строка = печатаем
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
        setSearchQuery(null); // Сбрасываем поиск, показываем сохраненное value
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const handleFocus = () => {
    loadUsers();
    setShow(true);
    setActiveIndex(-1);
    setSearchQuery(""); // При фокусе показываем все элементы
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

  // Если пользователь печатает (searchQuery !== null), фильтруем по введенному тексту.
  // Если нет (searchQuery === null), показываем весь список.
  const filtered = searchQuery 
    ? sourceList.filter(u => getLabel(u).toLowerCase().includes(searchQuery.toLowerCase().trim()))
    : sourceList;

  // Что показывать в поле ввода: если печатаем — то, что напечатали, иначе — сохраненное значение
  const inputValue = searchQuery !== null ? searchQuery : getLabel(value);

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
        setSearchQuery(null);
      } else if (activeIndex === -1 && filtered.length > 0) {
        onChange(filtered[0]);
        setShow(false);
        setSearchQuery(null);
      }
    } else if (e.key === "Escape") {
      setShow(false);
      setSearchQuery(null);
    }
  };

  const handleSelect = (name) => {
    onChange(name);
    setShow(false);
    setSearchQuery(null);
  };

  return (
    <div className="autocomplete-wrapper" ref={wrapperRef}>
      <div className="flex-row gap-0" style={{ position: 'relative' }}>
        <input
          placeholder={placeholder}
          value={inputValue}
          onChange={e => { 
            if (readOnlyInput) return;
            setSearchQuery(e.target.value);
            setShow(true); 
            setActiveIndex(-1); 
          }}
          onFocus={handleFocus}
          onBlur={() => {
            // Если фокус ушел, а мы не выбрали ничего, возвращаем сохраненное значение.
            // Но только если это не readOnlyInput (там значение не должно пропадать)
            setTimeout(() => {
              if (searchQuery !== null) {
                // Если пользователь печатал, но не выбрал элемент — сохраняем его текст как кастомное значение
                // (для единиц измерения и получателей).
                if (!readOnlyInput) {
                  onChange(searchQuery);
                }
                setSearchQuery(null);
              }
            }, 200);
          }}
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