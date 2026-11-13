import { useState, useEffect } from 'react';
import { api } from '../api';
import { getOrderStatusLabel, getStatusLabel } from '../constants';

export default function AdminOrders({ user, showAlert, onStartTrackCreate }) {
  const [orders, setOrders] = useState([]);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [comment, setComment] = useState("");

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
            <a href={o.url} target="_blank" rel="noreferrer" className="text-primary mb-8">{o.url}</a>
            <div className="mb-8 muted">{o.description} (Кол-во: {o.quantity})</div>
            
            {o.files.length > 0 && (
              <div className="flex-row gap-8 mb-8">
                {o.files.map(f => (
                  <a key={f.id} href={`/uploads/${f.file_path}`} target="_blank" rel="noreferrer">
                    <img src={`/uploads/${f.file_path}`} alt="скрин" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }} />
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
              <div className="bg-box w-100 mt-8">
                Связанный трек: <b>{o.track_barcode || "Без трека"}</b> · {getStatusLabel(o.track_status)}
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
    </div>
  );
}