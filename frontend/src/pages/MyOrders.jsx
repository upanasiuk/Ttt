import { useState, useEffect } from 'react';
import { api, apiDownload } from '../api';
import { getOrderStatusLabel, getStatusLabel } from '../constants';

export default function MyOrders({ user, showAlert }) {
  const [orders, setOrders] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [desc, setDesc] = useState("");
  const [qty, setQty] = useState(1);
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const data = await api("/api/orders");
      setOrders(data);
    } catch (e) { showAlert("Ошибка: " + e.message, "Ошибка"); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!url.trim()) return showAlert("Введите ссылку", "Ошибка");
    setSaving(true);
    
    const formData = new FormData();
    formData.append("url", url);
    formData.append("description", desc);
    formData.append("quantity", qty);
    files.forEach(f => formData.append("files", f));

    try {
      await api("/api/orders", { method: "POST", body: formData });
      setIsModalOpen(false);
      setUrl(""); setDesc(""); setQty(1); setFiles([]);
      load();
    } catch (e) { showAlert("Ошибка: " + e.message, "Ошибка"); }
    finally { setSaving(false); }
  };

  return (
    <div className="tab-panel active">
      <div className="admin-header mt-16 mb-16">
        <h2>Мои заказы</h2>
        <button className="primary small" onClick={() => setIsModalOpen(true)}>+ Новый заказ</button>
      </div>

      <ul>
        {orders.map(o => (
          <li key={o.id} className="flex-col w-100" style={{ alignItems: 'flex-start' }}>
            <div className="flex-row space-between w-100 mb-8">
              <b>{o.description || "Без описания"} (Кол-во: {o.quantity})</b>
              <span className={`badge ${o.status === 'rejected' ? 'danger' : 'primary'}`}>
                {getOrderStatusLabel(o.status)}
              </span>
            </div>
            <a href={o.url} target="_blank" rel="noreferrer" className="text-muted mb-8">{o.url}</a>
            
            {o.files.length > 0 && (
              <div className="flex-row gap-8 mb-8">
                {o.files.map(f => (
                  <a key={f.id} href={`/uploads/${f.file_path}`} target="_blank" rel="noreferrer">
                    <img src={`/uploads/${f.file_path}`} alt="скрин" style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4 }} />
                  </a>
                ))}
              </div>
            )}

            {o.admin_comment && <div className="mb-8 text-primary">Комментарий админа: {o.admin_comment}</div>}
            
            {o.track_id && (
              <div className="bg-box w-100 mt-8">
                Связанный трек: <b>{o.track_barcode || "Без трека"}</b> · {getStatusLabel(o.track_status)}
              </div>
            )}
          </li>
        ))}
      </ul>

      {isModalOpen && (
        <div className="modal" onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}>
          <div className="modal-content">
            <h3>Новый заказ</h3>
            <label>Ссылка на товар *</label>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
            
            <label>Комментарий</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Например: размер L, черная" />

            <label>Количество</label>
            <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} />

            <label>Скрины (макс 5 шт)</label>
            <input type="file" multiple accept="image/*" onChange={e => setFiles(Array.from(e.target.files).slice(0,5))} />

            <div className="btn-row">
              <button className="primary" onClick={handleCreate} disabled={saving}>
                {saving ? "Отправка..." : "Отправить"}
              </button>
              <button className="secondary" onClick={() => setIsModalOpen(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}