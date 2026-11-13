import { useState, useEffect } from 'react';
import { api } from '../api';
import { getOrderStatusLabel, getStatusLabel } from '../constants';
import EditTrackModal from '../components/EditTrackModal';

export default function AdminOrders({ user, showAlert, onStartTrackCreate }) {
  const [orders, setOrders] = useState([]);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [comment, setComment] = useState("");
  const [editTrack, setEditTrack] = useState(null);

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

  return (
    <div className="tab-panel active">
      <h2 className="section-title mt-16">Все заказы</h2>
      <ul>
        {orders.map(o => (
          <li key={o.id} className="flex-col w-100" style={{ alignItems: 'flex-start', padding: '16px' }}>
            <div className="flex-row space-between w-100 mb-8" style={{ alignItems: 'flex-start' }}>
              <b>Заказ от: {o.user_name}</b>
              <span className={`badge ${o.status === 'new' ? 'pending' : 'success'}`}>
                {o.status === 'track_created' ? 'Трек создан' : getOrderStatusLabel(o.status)}
              </span>
            </div>
            
            <div className="mb-12 font-14" style={{ color: 'var(--text-main)' }}>
              Количество: <b>{o.quantity} шт.</b>
            </div>

            <button className="primary w-100 mb-12" onClick={() => handleOpenLink(o.id, o.url)} style={{ padding: '10px' }}>
              🔗 Открыть ссылку на товар
            </button>
            
            {o.description && <div className="mb-12 text-primary font-14">Комментарий юзера: {o.description}</div>}
            
            {o.files.length > 0 && (
              <div className="flex-row gap-8 mb-12">
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
                className="track-card w-100" 
                style={{ cursor: 'pointer', margin: 0, padding: '12px' }}
                onClick={() => setEditTrack({ 
                  id: o.track_id, 
                  barcode: o.track_barcode, 
                  attachment: o.track_attachment, 
                  status: o.track_status,
                  recipients: [], 
                  fromActiveParcel: false 
                })}
              >
                <div className="meta">
                  <span className="name">{o.track_attachment || "Товар"} · {o.quantity} шт.</span>
                  <span className="code">{o.track_barcode || "Без трека"}</span>
                </div>
                <span className={`badge ${o.track_status}`}>{getStatusLabel(o.track_status)}</span>
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