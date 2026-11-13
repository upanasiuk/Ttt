import { useState, useEffect } from 'react';
import { api } from '../api';
import EditTrackModal from '../components/EditTrackModal';
import PasswordModal from '../components/PasswordModal';
import Pagination from '../components/Pagination';
import { getStatusLabel } from '../constants';

function AdminToggle({ recipient, onPromote, onDemote }) {
  const [checked, setChecked] = useState(recipient.is_admin === 1);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setChecked(recipient.is_admin === 1);
  }, [recipient.is_admin]);

  const handleChange = async (e) => {
    const next = e.target.checked;
    e.target.checked = checked;
    if (busy) return;
    setBusy(true);
    try {
      const ok = next ? await onPromote(recipient) : await onDemote(recipient);
      if (ok) setChecked(next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <label className="role-switch" style={{ opacity: busy ? 0.6 : 1 }}>
      <input type="checkbox" checked={checked} disabled={busy} onChange={handleChange} />
      <span className="slider"></span>
      <span>Админ</span>
    </label>
  );
}

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

  const load = async () => {
    try {
      const data = await api("/api/recipients");
      setRecipients(data);
      return true;
    } catch (e) {
      showAlert("Ошибка загрузки: " + e.message, "Ошибка");
      return false;
    }
  };

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
    if (!name || !username || !password) return showAlert("Заполните все поля", "Ошибка");
    try {
      await api("/api/recipients", { method: "POST", body: JSON.stringify({ name, username, password }) });
      setName(""); setUsername(""); setPassword("");
      await load();
      showToast("Пользователь добавлен");
    } catch (e) { showAlert("Ошибка: " + e.message, "Ошибка"); }
  };

  const openStats = async (id, name) => {
    try {
      const data = await api(`/api/recipients/${id}/stats`);
      setStatsTarget({ id, name, data });
    } catch (e) {
      showAlert("Ошибка: " + e.message, "Ошибка");
    }
  };

  const refreshStats = async () => {
    if (!statsTarget) return;
    try {
      const data = await api(`/api/recipients/${statsTarget.id}/stats`);
      setStatsTarget({ ...statsTarget, data });
    } catch (e) {
      showAlert("Ошибка: " + e.message, "Ошибка");
    }
  };

  const promote = async (rec) => {
    const confirm = await showPrompt(
      `Вы собираетесь выдать права администратора пользователю «${rec.name}».`,
      "Выдача прав",
      { hint: "Введите имя:", placeholder: rec.name }
    );
    if (confirm !== rec.name) return false;
    try {
      await api(`/api/recipients/${rec.id}/promote`, { method: "POST" });
      await load();
      return true;
    } catch (e) {
      showAlert("Ошибка: " + e.message, "Ошибка");
      return false;
    }
  };

  const demote = async (rec) => {
    const confirm = await showPrompt(
      `Вы собираетесь отозвать права администратора у пользователя «${rec.name}».`,
      "Отзыв прав",
      { isDanger: true, hint: "Введите имя:", placeholder: rec.name }
    );
    if (confirm !== rec.name) return false;
    try {
      await api(`/api/recipients/${rec.id}/demote`, { method: "POST" });
      await load();
      return true;
    } catch (e) {
      showAlert("Ошибка: " + e.message, "Ошибка");
      return false;
    }
  };

  const removeRecipient = async (rec) => {
    const confirm = await showPrompt(`Вы собираетесь удалить пользователя «${rec.name}».`, "Удаление", { isDanger: true, hint: "Введите имя:", placeholder: rec.name });
    if (confirm !== rec.name) return;
    try {
      await api(`/api/recipients/${rec.id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      showAlert("Ошибка: " + e.message, "Ошибка");
    }
  };

  const totalPages = Math.ceil(recipients.length / perPage);
  const safePage = Math.min(page, Math.max(totalPages, 1));
  const paginatedRecipients = recipients.slice((safePage - 1) * perPage, safePage * perPage);

  const renderTrackList = (list, emptyText) => (
    list.length === 0 ? (
      <p className="muted mt-8">{emptyText}</p>
    ) : (
      <ul>
        {list.map(t => (
          <li key={t.id} className="track-card" onClick={() => setEditTrack(t)}>
            <div className="meta">
              <span className="name">{t.attachment}</span>
              <span className="code">
                {t.barcode || "Без трека"} · {t.parcel_name} · {t.my_price != null ? t.my_price.toFixed(2) + ' Br' : '—'}
              </span>
            </div>
            <div className="flex-row gap-8" style={{ alignItems: 'center' }}>
              {t.url && <button className="link-icon-btn primary" onClick={(e) => { e.stopPropagation(); window.open(t.url, "_blank"); }}>↗</button>}
              <span className={`badge ${t.status}`}>{getStatusLabel(t.status)}</span>
            </div>
          </li>
        ))}
      </ul>
    )
  );

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
                <AdminToggle recipient={r} onPromote={promote} onDemote={demote} />
                <button className="secondary small" onClick={() => setPwdTarget({ id: r.id, name: r.name })}>Пароль</button>
                <button className="danger small" onClick={() => removeRecipient(r)}>Удалить</button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <Pagination
        currentPage={safePage}
        totalPages={totalPages}
        onPageChange={setPage}
        perPage={perPage}
        onPerPageChange={(v) => { setPerPage(v); setPage(1); }}
      />

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

            <h3 className="mt-20 mb-12">Неврученные</h3>
            {renderTrackList(statsTarget.data.pending, "Неврученных треков нет")}

            <h3 className="mt-20 mb-12">Врученные</h3>
            {renderTrackList(statsTarget.data.issued, "Врученных треков нет")}
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