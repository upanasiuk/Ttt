import { useState, useEffect } from 'react';
import { api } from '../api';
import { getOrderStatusLabel, getStatusLabel } from '../constants';
import ImageUploader from '../components/ImageUploader';

export default function MyOrders({ user, showAlert, showPrompt }) {
  const [orders, setOrders] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [desc, setDesc] = useState("");
  const [qty, setQty] = useState(1);
  const [files, setFiles] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const data = await api("/api/orders");
      setOrders(data);
    } catch (e) { showAlert("Ошибка: " + e.message, "Ошибка"); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setTitle(""); setUrl(""); setDesc(""); setQty(1); setFiles([]); setExistingFiles([]);
    setIsModalOpen(true);
  };

  const openEdit = (order) => {
    setEditingId(order.id);
    setTitle(order.title || "");
    setUrl(order.url || "");
    setDesc(order.description || "");
    setQty(order.quantity || 1);
    setFiles([]);
    setExistingFiles(order.files || []);
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title.trim()) return showAlert("Введите наименование", "Ошибка");
    if (!url.trim()) return showAlert("Введите ссылку", "Ошибка");
    setSaving(true);
    
    const formData = new FormData();
    formData.append("title", title);
    formData.append("url", url);
    formData.append("description", desc);
    formData.append("quantity", qty);
    formData.append("keep_file_ids", JSON.stringify(existingFiles.map(f => f.id)));
    files.forEach(f => formData.append("files", f));

    try {
      if (editingId) {
        await api(`/api/orders/${editingId}/edit`, { method: "PUT", body: formData });
      } else {
        await api("/api/orders", { method: "POST", body: formData });
      }
      setIsModalOpen(false);
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

  const handleOpenLink = (link) => {
    window.open(link, "_blank");
  };

  return (
    <div className="tab-panel active">
      <div className="admin-header mt-16 mb-16">
        <h2>Мои заказы</h2>
        <button className="primary small" onClick={openCreate}>+ Новый заказ</button>
      </div>

      <ul>
        {orders.map(o => (
          <li key={o.id} className="flex-col w-100" style={{ alignItems: 'flex-start', padding: '16px' }}>
            <div className="flex-row space-between w-100 mb-8" style={{ alignItems: 'flex-start' }}>
              <div className="font-15"><b>{o.title || "Без названия"}</b></div>
              <span className={`badge ${o.status === 'rejected' ? 'danger' : o.status === 'track_created' ? 'success' : 'primary'}`}>
                {o.status === 'track_created' ? 'Заказ оформлен' : getOrderStatusLabel(o.status)}
              </span>
            </div>
            
            <div className="mb-12 font-14" style={{ color: 'var(--text-main)' }}>
              Количество: <b>{o.quantity} шт.</b>
            </div>

            <button className="primary w-100 mb-12" onClick={() => handleOpenLink(o.url)} style={{ padding: '10px' }}>
              🔗 Открыть ссылку на товар
            </button>

            {o.description && (
              <div className="mb-12 bg-box w-100" style={{ padding: '10px', borderLeft: '3px solid var(--accent-primary)' }}>
                <div className="font-12 muted mb-4">Ваш комментарий:</div>
                <div className="font-14">{o.description}</div>
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

            {o.admin_comment && (
              <div className="mb-12 bg-box w-100" style={{ padding: '10px', borderLeft: '3px solid var(--accent-danger)' }}>
                <div className="font-12 text-danger mb-4">Комментарий админа:</div>
                <div className="font-14">{o.admin_comment}</div>
              </div>
            )}
            
            {o.track_id && (
              <div className="bg-box w-100" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '150px' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>{o.track_attachment || "Товар"}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {o.track_barcode || "Без трека"} · {o.track_parcel_name || "Партия"} · {o.track_price != null ? `${o.track_price.toFixed(2)} Br` : "—"}
                  </span>
                </div>
                <span className={`badge ${o.track_status}`} style={{ marginLeft: '0' }}>{getStatusLabel(o.track_status)}</span>
              </div>
            )}

            {o.status === 'new' && (
              <div className="flex-row gap-8 mt-12 w-100">
                <button className="secondary small flex-1" onClick={() => openEdit(o)}>Редактировать</button>
                <button className="danger small flex-1" onClick={() => handleDelete(o.id)}>Удалить</button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {isModalOpen && (
        <div className="modal" onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}>
          <div className="modal-content">
            <h3>{editingId ? "Редактировать заказ" : "Новый заказ"}</h3>
            
            <label>Наименование товара *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Например: Футболка Nike" />

            <label>Ссылка на товар *</label>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
            
            <label>Комментарий</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Например: размер L, черная" />

            <label>Количество</label>
            <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} />

            <label>Скрины (макс 5)</label>
            <ImageUploader 
              files={files} 
              setFiles={setFiles} 
              existingFiles={existingFiles} 
              setExistingFiles={setExistingFiles} 
            />

            <div className="btn-row">
              <button className="primary" onClick={handleSave} disabled={saving}>
                {saving ? "Сохранение..." : (editingId ? "Сохранить" : "Отправить")}
              </button>
              <button className="secondary" onClick={() => setIsModalOpen(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}