import { useState, useEffect } from 'react';
import { api } from '../api';
import EditTrackModal from '../components/EditTrackModal';
import PasswordModal from '../components/PasswordModal';
import Pagination from '../components/Pagination';
import { getStatusLabel } from '../constants';

export default function Recipients({ user, showAlert, showPrompt, showToast }) {
  const [recipients, setRecipients] = useState([]);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [statsTarget, setStatsTarget] = useState(null);
  const [editTrack, setEditTrack] = useState(null);
  const [pwdTarget, setPwdTarget] = useState(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(5);

  const isSuperAdmin = user.id === 1;

  const load = async () => setRecipients(await api("/api/recipients"));
  useEffect(() => { load(); }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (pwdTarget) setPwdTarget(null);
        else if (editTrack) setEditTrack(null);
        else if (statsTarget) setStatsTarget(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [statsTarget, editTrack, pwdTarget]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name || !username || !password) return showAlert("Заполните все поля");
    try {
      await api("/api/recipients", { method: "POST", body: JSON.stringify({ name, username, password }) });
      setName(""); setUsername(""); setPassword("");
      load();
      showToast("Пользователь добавлен");
    } catch (e) { showAlert("Ошибка: " + e.message); }
  };

  const openStats = async (id, name) => {
    const data = await api(`/api/recipients/${id}/stats`);
    setStatsTarget({ id, name, data });
  };

  const refreshStats = async () => {
    if (statsTarget) {
      const data = await api(`/api/recipients/${statsTarget.id}/stats`);
      setStatsTarget({ ...statsTarget, data });
    }
  };

  const paginatedRecipients = recipients.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="tab-panel active">
      <h2 className="section-title">Пользователи</h2>
      
      {isSuperAdmin && (
        <div className="card-form">
          <form onSubmit={handleCreate}>
            <input type="text" name="fakeusernameremembered" style={{ display: 'none' }} />
            <input type="password" name="fakepasswordremembered" style={{ display: 'none' }} />
            <label>Имя</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Иван Иванов" autoComplete="off" />
            <label>Логин</label>
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="ivan" autoComplete="new-password" />
            <label>Пароль</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="****" autoComplete="new-password" />
            <button type="submit" className="primary w-100 mt-20">Добавить</button>
          </form>
        </div>
      )}
      
      <ul>
        {paginatedRecipients.map(r => (
          <li key={r.id} onClick={() => openStats(r.id, r.name)} style={{ cursor: 'pointer' }}>
            <div className="meta">
              <span className="name">{r.name} {r.is_admin === 1 && <span className="badge admin-badge">Админ</span>}</span>
              <span className="code">Логин: {r.username}</span>
              <span className="code muted" style={{ fontSize: '11px' }}>нажмите для статистики</span>
            </div>
            {isSuperAdmin && r.id !== user.id && (
              <div className="flex-row gap-8" onClick={e => e.stopPropagation()}>
                <label className="role-switch">
                  <input type="checkbox" checked={r.is_admin === 1} onChange={async (e) => {
                    const isTurningOn = e.target.checked;
                    const action = isTurningOn ? "promote" : "demote";
                    const confirm = await showPrompt(
                      `Вы собираетесь ${isTurningOn ? 'выдать' : 'отозвать'} права администратора пользователю «${r.name}».`, 
                      isTurningOn ? "Выдача прав" : "Отзыв прав", 
                      { isDanger: !isTurningOn, hint: "Введите имя:", placeholder: r.name }
                    );
                    if (confirm === r.name) { 
                      await api(`/api/recipients/${r.id}/${action}`, { method: "POST" }); 
                      load(); 
                    } else e.preventDefault();
                  }} />
                  <span className="slider"></span>
                  <span>Админ</span>
                </label>
                <button className="secondary small" onClick={() => setPwdTarget({ id: r.id, name: r.name })}>Пароль</button>
                <button className="danger small" onClick={async () => {
                  const confirm = await showPrompt(`Вы собираетесь удалить пользователя «${r.name}».`, "Удаление", { isDanger: true, hint: "Введите имя:", placeholder: r.name });
                  if (confirm === r.name) { await api(`/api/recipients/${r.id}`, { method: "DELETE" }); load(); }
                }}>Удалить</button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <Pagination currentPage={page} totalPages={Math.ceil(recipients.length / perPage)} onPageChange={setPage} perPage={perPage} onPerPageChange={setPerPage} />

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
                <h3 className="mt-20 mb-12">Неврученные</h3>
                <ul>
                  {statsTarget.data.pending.map(t => (
                    <li key={t.id} className="track-card" onClick={() => setEditTrack(t)}>
                      <div className="meta">
                        <span className="name">{t.attachment}</span>
                        <span className="code">{t.barcode || "Без трека"} · {t.parcel_name} · {t.my_price ? t.my_price.toFixed(2) + ' Br' : '—'}</span>
                      </div>
                      <div className="flex-row gap-8" style={{ alignItems: 'center' }}>
                        {t.url && <button className="link-icon-btn primary" onClick={(e) => { e.stopPropagation(); window.open(t.url, "_blank"); }}>↗</button>}
                        <span className={`badge ${t.status}`}>{getStatusLabel(t.status)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {statsTarget.data.issued.length > 0 && (
              <>
                <h3 className="mt-20 mb-12">Врученные</h3>
                <ul>
                  {statsTarget.data.issued.map(t => (
                    <li key={t.id} className="track-card" onClick={() => setEditTrack(t)}>
                      <div className="meta">
                        <span className="name">{t.attachment}</span>
                        <span className="code">{t.barcode || "Без трека"} · {t.parcel_name} · {t.my_price ? t.my_price.toFixed(2) + ' Br' : '—'}</span>
                      </div>
                      <div className="flex-row gap-8" style={{ alignItems: 'center' }}>
                        {t.url && <button className="link-icon-btn primary" onClick={(e) => { e.stopPropagation(); window.open(t.url, "_blank"); }}>↗</button>}
                        <span className={`badge ${t.status}`}>{getStatusLabel(t.status)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}

      {editTrack && (
        <EditTrackModal track={editTrack} onClose={() => setEditTrack(null)} onSave={() => { setEditTrack(null); refreshStats(); }} showAlert={showAlert} showPrompt={showPrompt} />
      )}

      {pwdTarget && (
        <PasswordModal isOpen={true} onClose={() => setPwdTarget(null)} targetId={pwdTarget.id} targetName={pwdTarget.name} isAdminMode={true} showAlert={showAlert} />
      )}
    </div>
  );
}