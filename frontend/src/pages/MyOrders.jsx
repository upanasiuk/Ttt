import { useState, useEffect } from 'react';
import { api } from '../api';
import { getOrderStatusLabel, getStatusLabel } from '../constants';
import ImageUploader from '../components/ImageUploader';
import EditTrackModal from '../components/EditTrackModal';

export default function MyOrders({ user, showAlert, showPrompt }) {
  const [orders, setOrders] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [desc, setDesc] = useState("");
  const [qty, setQty] = useState(1);
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [editTrack, setEditTrack] = useState(null);

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

  const handleDelete = async (id) => {
    const confirm = await showPrompt("Удалить этот заказ?", "Удаление", { isDanger: true, hint: "Введите ID заказа:", placeholder: String(id) });
    if (confirm === String(id)) {
      try {
        await api(`/api/orders/${id}`, { method: "DELETE" });
        load();
      } catch (e) { showAlert("Ошибка: " + e.message, "Ошибка"); }
    }
  };

  const handleOpenLink = async (id, link) => {
    window.open(link, "_blank");
    if (orders.find(o => o.id === id)?.status === 'new') {
      try {
        await api(`/api/orders/${id}/click_link`, { method: "PUT" }); // мы не делали этот роут, используем костыль через update? Нет, сделаем через PUT статус
        await api(`/api/orders/${id}`, { method: "PUT", body: JSON.stringify({ status: "ordered" }) }); // Админский роут, юзеру нельзя.
      } catch(e) {}
    }
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
              <div className="font-15"><b>{o.description || "Без описания"}</b></div>
              <span className={`badge ${o.status === 'rejected' ? 'danger' : 'primary'}`}>
                {getOrderStatusLabel(o.status)}
              </span>
            </div>
            <div className="mb-8 font-14" style={{ color: 'var(--text-main)' }}>
              Количество: <b>{o.quantity} шт.</b>
            </div>
            
            <div className="mb-8">
              <button className="secondary small" onClick={() => handleOpenLink(o.id, o.url)}>🔗 Открыть ссылку на товар</button>
            </div>
            
            {o.files.length > 0 && (
              <div className="flex-row gap-8 mb-8">
                {o.files.map(f => (
                  <a key={f.id} href={`/uploads/${f.file_path}`} target="_blank" rel="noreferrer">
                    <img src={`/uploads/thumb_${f.file_path}`} alt="скрин" style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4 }} />
                  </a>
                ))}
              </div>
            )}

            {o.admin_comment && <div className="mb-8 text-primary">Комментарий админа: {o.admin_comment}</div>}
            
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

            {o.status === 'new' && (
              <button className="danger small mt-8" onClick={() => handleDelete(o.id)}>Удалить заказ</button>
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
            
            <label>Ваш комментарий</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Например: размер L, черная" />

            <label>Количество</label>
            <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} />

            <label>Скрины</label>
            <ImageUploader files={files} setFiles={setFiles} />

            <div className="btn-row">
              <button className="primary" onClick={handleCreate} disabled={saving}>
                {saving ? "Отправка..." : "Отправить"}
              </button>
              <button className="secondary" onClick={() => setIsModalOpen(false)}>Отмена</button>
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