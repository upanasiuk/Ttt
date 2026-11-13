import { useState, useEffect } from 'react';
import { api } from '../api';
import { getOrderStatusLabel, getStatusLabel } from '../constants';
import EditTrackModal from '../components/EditTrackModal';

export default function AdminOrders({ user, showAlert, onStartTrackCreate }) {
  const [orders, setOrders] = useState([]);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [comment, setComment] = useState("");
  const [editTrack, setEditTrack] = useState(null);
  const [loadingTrack, setLoadingTrack] = useState(false);

  const load = async () => {
    try {
      const data = await api("/api/orders");
      setOrders(data);
    } catch (e) { showAlert("Ошибка: " + e.message, "Ошибка"); }
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status, admin_comment = null) => {
    try {
      await api(`/api/orders/${id}`, { method: "PUT", body: JSON.stringify({ status, admin_comment }) });
      load();
    } catch (e) { showAlert("Ошибка: " + e.message, "Ошибка"); }
  };

  const handleOpenLink = async (id, link) => {
    window.open(link, "_blank");
    if (orders.find(o => o.id === id)?.status === 'new') {
      updateStatus(id, 'ordered');
    }
  };

  const handleOpenTrack = async (trackId) => {
    setLoadingTrack(true);
    try {
      const allTracks = await api("/api/tracks");
      const fullTrack = allTracks.find(t => t.id === trackId);
      if (fullTrack) {
        setEditTrack({ ...fullTrack, fromActiveParcel: false });
      } else {
        showAlert("Трек не найден", "Ошибка");
      }
    } catch (e) {
      showAlert("Ошибка загрузки трека: " + e.message, "Ошибка");
    } finally {
      setLoadingTrack(false);
    }
  };

  return (
    <div className="tab-panel active">
      <h2 className="section-title mt-16">Все заказы</h2>
      <ul>
        {orders.map(o => (
          <li key={o.id} className="flex-col w-100" style={{ alignItems: 'flex-start', padding: '16px' }}>
            <div className="flex-row space-between w-100 mb-8" style={{ alignItems: 'flex-start' }}>
              <div className="font-15"><b>{o.title || "Без названия"}</b></div>
              <span className={`badge ${o.status === 'new' ? 'pending' : o.status === 'track_created' ? 'success' : 'primary'}`}>
                {o.status === 'track_created' ? 'Трек создан' : getOrderStatusLabel(o.status)}
              </span>
            </div>
            
            <div className="font-12 muted mb-8">Заказ от: {o.user_name}</div>
            <div className="mb-12 font-14" style={{ color: 'var(--text-main)' }}>
              Количество: <b>{o.quantity} шт.</b>
            </div>

            <button className="primary w-100 mb-12" onClick={() => handleOpenLink(o.id, o.url)} style={{ padding: '10px' }}>
              🔗 Открыть ссылку на товар
            </button>
            
            {o.description && (
              <div className="mb-12 bg-box w-100" style={{ padding: '10px', borderLeft: '3px solid var(--accent-primary)' }}>
                <div className="font-12 muted mb-4">Комментарий юзера:</div>
                <div className="font-14">{o.description}</div>
              </div>
            )}

            {o.admin_comment && (
              <div className="mb-12 bg-box w-100" style={{ padding: '10px', borderLeft: '3px solid var(--accent-danger)' }}>
                <div className="font-12 text-danger mb-4">Комментарий админа:</div>
                <div className="font-14">{o.admin_comment}</div>
              </div>
            )}
            
            {o.files.length > 0 && (
              <div className="flex-row gap-8 mb-12 flex-wrap">
                {o.files.map(f => (
                  <a key={f.id} href={`/uploads/${f.file_path}`} target="_blank" rel="noreferrer">
                    <img src={`/uploads/thumb_${f.file_path}`} alt="скрин" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border-color)' }} />
                  </a>
                ))}
              </div>
            )}

            {o.status === 'new' && (
              <div className="flex-row gap-8 mt-8">
                <button className="primary small" onClick={() => updateStatus(o.id, 'ordered')}>Выкуплен (вручную)</button>
                <button className="danger small" onClick={() => { setRejectTarget(o.id); setComment(""); }}>Отклонить</button>
              </div>
            )}

            {o.status === 'ordered' && (
              <div className="flex-row gap-8 mt-8">
                <button className="success small" onClick={() => onStartTrackCreate(o)}>Создать трек</button>
              </div>
            )}

            {o.track_id && (
              <div 
                className="bg-box w-100" 
                style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                onClick={() => !loadingTrack && handleOpenTrack(o.track_id)}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '150px' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>{o.track_attachment || "Товар"}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {o.track_barcode || "Без трека"} · {o.track_parcel_name || "Партия"} · {o.track_price != null ? `${o.track_price.toFixed(2)} Br` : "—"}
                  </span>
                </div>
                <span className={`badge ${o.track_status}`} style={{ marginLeft: '0' }}>{getStatusLabel(o.track_status)}</span>
              </div>
            )}
          </li>
        ))}
      </ul>

      {rejectTarget && (
        <div className="modal" onClick={(e) => e.target === e.currentTarget && setRejectTarget(null)}>
          <div className="modal-content">
            <h3 className="text-danger">Отклонение заказа</h3>
            <label>Причина отказа</label>
            <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Недоступно, нет размера..." />
            <div className="btn-row">
              <button className="danger" onClick={() => { updateStatus(rejectTarget, 'rejected', comment); setRejectTarget(null); }}>Отклонить</button>
              <button className="secondary" onClick={() => setRejectTarget(null)}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      {editTrack && (
        <EditTrackModal 
          track={editTrack} 
          onClose={() => setEditTrack(null)} 
          onSave={() => { setEditTrack(null); load(); }} 
          showAlert={showAlert} 
          hideParcelSelect={true} 
        />
      )}
    </div>
  );
}