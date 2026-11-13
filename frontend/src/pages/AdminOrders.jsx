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
          <li key={o.id} className="flex-col w-100" style={{ alignItems: 'flex-start' }}>
            <div className="flex-row space-between w-100 mb-8">
              <b>Заказ от: {o.user_name}</b>
              <span className={`badge ${o.status === 'new' ? 'pending' : 'success'}`}>{getOrderStatusLabel(o.status)}</span>
            </div>
            
            <div className="mb-8 font-14" style={{ color: 'var(--text-main)' }}>
              Количество: <b>{o.quantity} шт.</b>
            </div>

            <div className="mb-8">
              <button className="secondary small" onClick={() => handleOpenLink(o.id, o.url)}>🔗 Открыть ссылку на товар</button>
            </div>
            
            {o.description && <div className="mb-8 text-primary font-14">Комментарий юзера: {o.description}</div>}
            
            {o.files.length > 0 && (
              <div className="flex-row gap-8 mb-8">
                {o.files.map(f => (
                  <a key={f.id} href={`/uploads/${f.file_path}`} target="_blank" rel="noreferrer">
                    <img src={`/uploads/thumb_${f.file_path}`} alt="скрин" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }} />
                  </a>
                ))}
              </div>
            )}

            {o.status === 'new' && (
              <div className="flex-row gap-8 mt-8">
                <button className="primary small" onClick={() => updateStatus(o.id, 'ordered')}>Выкуплен</button>
                <button className="danger small" onClick={() => { setRejectTarget(o.id); setComment(""); }}>Отклонить</button>
              </div>
            )}

            {o.status === 'ordered' && (
              <div className="flex-row gap-8 mt-8">
                <button className="success small" onClick={() => onStartTrackCreate(o)}>Создать трек</button>
              </div>
            )}

            {o.track_id && (
              <div className="bg-box w-100 mt-8 flex-row space-between">
                <span>Связанный трек: <b>{o.track_barcode || "Без трека"}</b> ({getStatusLabel(o.track_status)})</span>
                <button className="primary small" onClick={() => setEditTrack({ 
                  id: o.track_id, 
                  barcode: o.track_barcode, 
                  attachment: o.track_attachment, 
                  status: o.track_status,
                  recipients: [], 
                  fromActiveParcel: false 
                })}>Детали</button>
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
          onSave={() => setEditTrack(null)} 
          showAlert={showAlert} 
          hideParcelSelect={true} 
        />
      )}
    </div>
  );
}