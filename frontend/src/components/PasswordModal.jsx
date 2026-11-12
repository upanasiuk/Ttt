import { useState, useEffect } from 'react';
import { api } from '../api';

export default function PasswordModal({ isOpen, onClose, targetId, targetName, isAdminMode, showAlert }) {
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");

  useEffect(() => {
    if (isOpen) { setOldPass(""); setNewPass(""); }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!newPass) return showAlert("Введите новый пароль");
    try {
      if (isAdminMode) {
        await api(`/api/recipients/${targetId}/password`, { method: "POST", body: JSON.stringify({ new_password: newPass }) });
      } else {
        if (!oldPass) return showAlert("Введите старый пароль");
        await api("/api/change_password", { method: "POST", body: JSON.stringify({ old_password: oldPass, new_password: newPass }) });
      }
      showAlert("Пароль успешно изменен!", "Успех");
      onClose();
    } catch (e) { showAlert("Ошибка: " + e.message); }
  };

  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <h3>Смена пароля {isAdminMode && `для ${targetName}`}</h3>
        
        {!isAdminMode && (
          <>
            <label>Старый пароль</label>
            <input type="password" value={oldPass} onChange={e => setOldPass(e.target.value)} autoComplete="current-password" />
          </>
        )}
        
        <label>Новый пароль</label>
        <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} autoComplete="new-password" />
        
        <div className="btn-row">
          <button className="primary" onClick={handleSave}>Сохранить</button>
          <button className="secondary" onClick={onClose}>Отмена</button>
        </div>
      </div>
    </div>
  );
}