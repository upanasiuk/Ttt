import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Recipients({ user, showAlert, showPrompt }) {
  const [recipients, setRecipients] = useState([]);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  
  const [statsTarget, setStatsTarget] = useState(null);

  const load = async () => setRecipients(await api("/api/recipients"));
  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name || !username || !password) return showAlert("Заполните все поля");
    try {
      await api("/api/recipients", { method: "POST", body: JSON.stringify({ name, username, password }) });
      setName(""); setUsername(""); setPassword("");
      load();
    } catch (e) { showAlert("Ошибка: " + e.message); }
  };

  const openStats = async (id, name) => {
    const data = await api(`/api/recipients/${id}/stats`);
    setStatsTarget({ id, name, data });
  };

  return (
    <div className="tab-panel active">
      <h2 className="section-title">Пользователи</h2>
      <div className="card-form">
        <form onSubmit={handleCreate}>
          <label>Имя</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Иван Иванов" />
          <label>Логин</label>
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="ivan" />
          <label>Пароль</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="****" />
          <button type="submit" className="primary w-100 mt-20">Добавить</button>
        </form>
      </div>
      <ul>
        {recipients.map(r => (
          <li key={r.id} onClick={() => openStats(r.id, r.name)} style={{ cursor: 'pointer' }}>
            <div className="meta">
              <span className="name">{r.name} {r.is_admin && <span className="badge admin-badge">Админ</span>}</span>
              <span className="code">Логин: {r.username}</span>
              <span className="code muted" style={{ fontSize: '11px' }}>нажмите для статистики</span>
            </div>
            {r.id !== user.id && (
              <div className="flex-row gap-8" onClick={e => e.stopPropagation()}>
                <label className="role-switch">
                  <input type="checkbox" checked={r.is_admin} onChange={async (e) => {
                    const action = e.target.checked ? "promote" : "demote";
                    const confirm = await showPrompt(`Изменить права для "${r.name}"?`, "Роли", { isDanger: !e.target.checked, hint: "Введите имя:", placeholder: r.name });
                    if (confirm === r.name) { await api(`/api/recipients/${r.id}/${action}`, { method: "POST" }); load(); }
                  }} />
                  <span className="slider"></span>
                  <span>Админ</span>
                </label>
                {user.id === 1 && (
                  <button className="danger small" onClick={async () => {
                    const confirm = await showPrompt(`Удалить "${r.name}"?`, "Удаление", { isDanger: true, hint: "Введите имя:", placeholder: r.name });
                    if (confirm === r.name) { await api(`/api/recipients/${r.id}`, { method: "DELETE" }); load(); }
                  }}>Удалить</button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      {statsTarget && (
        <div className="modal" onClick={(e) => e.target === e.currentTarget && setStatsTarget(null)}>
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="flex-row space-between mb-16">
              <h3>Статистика: {statsTarget.name}</h3>
              <button className="secondary small" onClick={() => setStatsTarget(null)}>Закрыть</button>
            </div>
            
            <div className="stats-box">
              <div className="stat-row"><span>Всего треков:</span><b>{statsTarget.data.stats.total}</b></div>
              <div className="stat-row"><span>Выдано:</span><b>{statsTarget.data.stats.issued_count}</b></div>
              <div className="stat-row"><span>Ожидает:</span><b>{statsTarget.data.stats.pending_count}</b></div>
              <div className="stat-row"><span>Суммарный вес:</span><b>{statsTarget.data.stats.weight_total} г</b></div>
              <div className="stat-row"><span>Суммарная цена:</span><b>{statsTarget.data.stats.price_total.toFixed(2)} Br</b></div>
            </div>

            {statsTarget.data.pending.length > 0 && (
              <>
                <h3 className="mt-20">Неврученные</h3>
                <ul>
                  {statsTarget.data.pending.map(t => (
                    <li key={t.id} style={{ background: 'transparent', borderBottom: '1px dashed var(--border-color)', borderRadius: 0 }}>
                      {t.attachment} — {t.parcel_name} — {t.my_price ? t.my_price.toFixed(2) + ' Br' : '—'}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {statsTarget.data.issued.length > 0 && (
              <>
                <h3 className="mt-20">Врученные</h3>
                <ul>
                  {statsTarget.data.issued.map(t => (
                    <li key={t.id} style={{ background: 'transparent', borderBottom: '1px dashed var(--border-color)', borderRadius: 0 }}>
                      {t.attachment} — {t.parcel_name} — {t.my_price ? t.my_price.toFixed(2) + ' Br' : '—'}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}