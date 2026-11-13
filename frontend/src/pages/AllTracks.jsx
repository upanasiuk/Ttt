import { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import EditTrackModal from '../components/EditTrackModal';
import Pagination from '../components/Pagination';
import { getStatusLabel, STATUS_LIST } from '../constants';

export default function AllTracks({ user, showAlert, showPrompt }) {
  const [tracks, setTracks] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editTarget, setEditTarget] = useState(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(5);

  const loadTracks = async () => {
    try {
      const data = await api("/api/tracks");
      setTracks(data);
    } catch (e) {
      showAlert("Ошибка загрузки треков: " + e.message, "Ошибка");
    }
  };

  useEffect(() => { loadTracks(); }, []);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape' && editTarget) setEditTarget(null); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [editTarget]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tracks.filter(t => {
      if (statusFilter && t.status !== statusFilter) return false;
      if (!q) return true;

      const trackMatch =
        (t.barcode && t.barcode.toLowerCase().includes(q)) ||
        (t.attachment && t.attachment.toLowerCase().includes(q)) ||
        (t.parcel_name && t.parcel_name.toLowerCase().includes(q));
      const recMatch = t.recipients && t.recipients.some(r => r.name.toLowerCase().includes(q));

      return trackMatch || recMatch;
    });
  }, [tracks, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const safePage = Math.min(page, Math.max(totalPages, 1));
  const paginated = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  return (
    <div className="tab-panel active">
      <h2 className="section-title">Все треки</h2>
      <div className="filter-row">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Поиск по треку/получателю/партии..."
        />
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">Все статусы</option>
          {STATUS_LIST.map(s => (
            <option key={s} value={s}>{getStatusLabel(s)}</option>
          ))}
        </select>
      </div>
      <ul>
        {paginated.map(t => (
          <li key={t.id} className="track-card" onClick={() => user.is_admin && setEditTarget(t)} style={{ cursor: user.is_admin ? 'pointer' : 'default' }}>
            <div className="meta">
              <span className="name">{t.attachment} · {t.parcel_name}</span>
              <span className="code">
                {t.barcode || "Без трека"} ·
                {t.my_price != null ? t.my_price.toFixed(2) : (t.price != null ? t.price.toFixed(2) : "—")} Br
              </span>
            </div>
            <div className="flex-row gap-8" style={{ alignItems: 'center' }}>
              {t.url && (
                <button className="link-icon-btn primary" onClick={(e) => { e.stopPropagation(); window.open(t.url, "_blank"); }} title="Открыть ссылку">↗</button>
              )}
              <span className={`badge ${t.status}`}>{getStatusLabel(t.status)}</span>
            </div>
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