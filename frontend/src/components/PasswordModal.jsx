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
    if (!newPass) return showAlert("Введите новый пароль", "Ошибка");
    try {
      if (isAdminMode) {
        await api(`/api/recipients/${targetId}/password`, { method: "POST", body: JSON.stringify({ new_password: newPass }) });
      } else {
        if (!oldPass) return showAlert("Введите старый пароль", "Ошибка");
        await api("/api/change_password", { method: "POST", body: JSON.stringify({ old_password: oldPass, new_password: newPass }) });
      }
      showAlert("Пароль успешно изменен!", "Успех");
      onClose();
    } catch (e) { showAlert("Ошибка: " + e.message, "Ошибка"); }
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
        
        <div className="mt-20">
          <button className="primary w-100" onClick={handleSave}>Сохранить</button>
          <div className="flex-row gap-8 mt-8">
            <button className="secondary flex-1" onClick={onClose}>Отмена</button>
          </div>
        </div>
      </div>
    </div>
  );
}