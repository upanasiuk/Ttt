import { useState, useEffect } from 'react';
import { api } from '../api';
import { getOrderStatusLabel } from '../constants';

export default function OrderInfoModal({ orderId, onClose, showAlert }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api(`/api/orders/${orderId}`)
      .then(data => { if (!cancelled) setOrder(data); })
      .catch(e => { if (!cancelled) showAlert("Ошибка загрузки заказа: " + e.message, "Ошибка"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [orderId]);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (loading || !order) return null;

  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        <div className="flex-row space-between mb-16">
          <h3>Заказ от {order.user_name}</h3>
          <button className="secondary small" onClick={onClose}>Закрыть</button>
        </div>
        
        <div className="mb-8">
          <span className={`badge ${order.status === 'rejected' ? 'danger' : 'primary'}`}>
            {getOrderStatusLabel(order.status)}
          </span>
        </div>

        <div className="mb-12 font-14">
          Количество: <b>{order.quantity} шт.</b>
        </div>

        <button className="primary w-100 mb-12" onClick={() => window.open(order.url, "_blank")} style={{ padding: '10px' }}>
          🔗 Открыть ссылку на товар
        </button>

        {order.description && <div className="mb-12 text-primary font-14">Комментарий юзера: {order.description}</div>}
        {order.admin_comment && <div className="mb-12 text-danger font-14">Комментарий админа: {order.admin_comment}</div>}

        {order.files && order.files.length > 0 && (
          <div className="flex-row gap-8 mb-12 flex-wrap">
            {order.files.map(f => (
              <a key={f.id} href={`/uploads/${f.file_path}`} target="_blank" rel="noreferrer">
                <img src={`/uploads/thumb_${f.file_path}`} alt="скрин" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border-color)' }} />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}