import { useState, useEffect } from 'react';
import { api } from '../api';
import Autocomplete from './Autocomplete';

export default function EditTrackModal({ track, onClose, onSave, showAlert, showPrompt }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (track) {
      // Инициализируем данные, защищаясь от undefined в recipients
      setData({
        barcode: track.barcode || "",
        attachment: track.attachment || "",
        unit: track.unit || "шт",
        price: track.price || "",
        weight_g: track.weight_g || "",
        comment: track.comment || "",
        url: track.url || "",
        status: track.status || "pending",
        parcel_id: track.parcel_id,
        allocations: (track.recipients || []).map(r => ({ name: r.name, qty: r.quantity }))
      });
    }
  }, [track]);

  // Пока данные не загрузились (или если трек не передан), ничего не рендерим
  if (!track || !data) return null;

  const updateAlloc = (i, field, val) => {
    const newAlloc = [...data.allocations];
    newAlloc[i][field] = val;
    setData({ ...data, allocations: newAlloc });
  };

  const addAlloc = () => setData({ ...data, allocations: [...data.allocations, { name: "", qty: 1 }] });
  const removeAlloc = (i) => setData({ ...data, allocations: data.allocations.filter((_, idx) => idx !== i) });

  const handleSave = async () => {
    try {
      await api(`/api/tracks/${track.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...data,
          allocations: data.allocations.map(a => ({ recipient_name: a.name, quantity: parseInt(a.qty) })),
          price: data.price ? parseFloat(data.price) : null,
          weight_g: data.weight_g ? parseInt(data.weight_g) : null,
        })
      });
      onSave();
    } catch (e) { showAlert("Ошибка: " + e.message); }
  };

  const handleDelete = async () => {
    const confirm = await showPrompt(`Удалить трек "${track.attachment}"?`, "Удаление", { isDanger: true, hint: "Введите название:", placeholder: track.attachment });
    if (confirm === track.attachment) {
      await api(`/api/tracks/${track.id}`, { method: "DELETE" });
      onSave();
    }
  };

  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <h3>Редактировать трек</h3>
        
        <label>Трек-номер</label>
        <input value={data.barcode} onChange={e => setData({...data, barcode: e.target.value})} />
        
        <label>Вложение</label>
        <input value={data.attachment} onChange={e => setData({...data, attachment: e.target.value})} />
        
        <div className="row-2">
          <div>
            <label>Стоимость (Br)</label>
            <input type="number" value={data.price} onChange={e => setData({...data, price: e.target.value})} />
          </div>
          <div>
            <label>Вес (г)</label>
            <input type="number" value={data.weight_g} onChange={e => setData({...data, weight_g: e.target.value})} />
          </div>
        </div>

        <label>Ссылка на товар</label>
        <input value={data.url} onChange={e => setData({...data, url: e.target.value})} type="text" />

        <div className="bg-box mt-16">
          <label className="mt-0">Распределение по получателям</label>
          <div className="flex-col gap-8">
            {data.allocations.map((a, i) => (
              <div key={i} className="flex-row gap-8 center">
                <Autocomplete value={a.name} onChange={val => updateAlloc(i, 'name', val)} />
                <input type="number" min="1" value={a.qty} onChange={e => updateAlloc(i, 'qty', e.target.value)} style={{ width: '70px' }} />
                <button className="danger small" onClick={() => removeAlloc(i)}>✕</button>
              </div>
            ))}
          </div>
          <button type="button" className="secondary small mt-8" onClick={addAlloc}>+ Добавить получателя</button>
        </div>

        <label>Статус</label>
        <select value={data.status} onChange={e => setData({...data, status: e.target.value})}>
          <option value="pending">Ожидает отправки</option>
          <option value="in_transit">В пути к CARGO</option>
          <option value="received_cargo">Получен CARGO</option>
          <option value="issued">Выдан</option>
        </select>

        <div className="btn-row space-between mt-20">
          <button className="danger" onClick={handleDelete}>Удалить</button>
          <div className="flex-row gap-8">
            <button className="secondary" onClick={onClose}>Отмена</button>
            <button className="primary" onClick={handleSave}>Сохранить</button>
          </div>
        </div>
      </div>
    </div>
  );
}