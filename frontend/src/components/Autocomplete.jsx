import { useState, useEffect, useRef } from 'react';
import { api } from '../api';

export default function Autocomplete({ value, onChange, placeholder = "Имя получателя" }) {
  const [users, setUsers] = useState([]);
  const [show, setShow] = useState(false);
  const wrapperRef = useRef(null);

  // Загружаем список пользователей один раз при монтировании
  useEffect(() => {
    api("/api/recipients").then(data => setUsers(data.map(u => u.name)));
  }, []);

  // Закрываем список при клике вне компонента
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

  return (
    <div className="autocomplete-wrapper" ref={wrapperRef}>
      <input
        placeholder={placeholder}
        value={value}
        onChange={e => { onChange(e.target.value); setShow(true); }}
        onFocus={() => setShow(true)}
        autoComplete="off"
      />
      {show && value && filtered.length > 0 && (
        <ul className="autocomplete-list" style={{ display: 'block' }}>
          {filtered.map(u => (
            <li 
              key={u} 
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