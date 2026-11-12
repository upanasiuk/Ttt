import { useState, useEffect } from 'react';
import { api } from '../api';
import EditTrackModal from '../components/EditTrackModal';

export default function AllTracks({ user, showAlert, showPrompt }) {
  const [tracks, setTracks] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editTarget, setEditTarget] = useState(null);

  const loadTracks = async () => {
    const data = await api("/api/tracks");
    setTracks(data);
  };

  useEffect(() => { loadTracks(); }, []);

  const filtered = tracks.filter(t => {
    if (statusFilter && t.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    
    const trackMatch = (t.barcode && t.barcode.toLowerCase().includes(q)) || 
                       (t.attachment && t.attachment.toLowerCase().includes(q)) ||
                       (t.parcel_name && t.parcel_name.toLowerCase().includes(q)); // <-- Поиск по партии
    const recMatch = t.recipients && t.recipients.some(r => r.name.toLowerCase().includes(q));
    
    return trackMatch || recMatch;
  });

  return (
    <div className="tab-panel active">
      <h2 className="section-title">Все треки</h2>
      <div className="filter-row">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по треку/получателю/партии..." />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Все статусы</option>
          <option value="pending">Ожидает отправки</option>
          <option value="in_transit">В пути к CARGO</option>
          <option value="received_cargo">Получен CARGO</option>
          <option value="issued">Выдан</option>
        </select>
      </div>
      <ul>
        {filtered.map(t => (
          <li key={t.id} onClick={() => user.is_admin && setEditTarget(t)} style={{ cursor: user.is_admin ? 'pointer' : 'default' }}>
            <div className="meta">
              <span className="name">{t.attachment} · {t.parcel_name}</span>
              <span className="code">
                {t.barcode || "Без трека"} · 
                {t.my_price != null ? t.my_price.toFixed(2) : (t.price ? t.price.toFixed(2) : "—")} Br
              </span>
            </div>
            <div className="actions-wrapper">
              {t.url && (
                <button 
                  className="link-icon-btn primary" 
                  onClick={(e) => { e.stopPropagation(); window.open(t.url, "_blank"); }}
                  title="Открыть ссылку"
                >↗</button>
              )}
              <span className={`badge ${t.status}`}>{t.status}</span>
            </div>
          </li>
        ))}
      </ul>

      {editTarget && (
        <EditTrackModal 
          track={editTarget} 
          onClose={() => setEditTarget(null)} 
          onSave={() => { setEditTarget(null); loadTracks(); }}
          showAlert={showAlert}
          showPrompt={showPrompt}
        />
      )}
    </div>
  );
}