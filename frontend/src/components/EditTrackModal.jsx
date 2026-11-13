import { useState, useEffect } from 'react';
import { api } from '../api';
import Autocomplete from './Autocomplete';
import { UNITS_LIST, STATUS_LIST } from '../constants';

export default function EditTrackModal({ track, onClose, onSave, showAlert, showPrompt, hideParcelSelect = false, onShowHistory }) {
  const [data, setData] = useState(null);
  const [parcels, setParcels] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!track) return;
    let cancelled = false;

    api("/api/parcels")
      .then(res => { if (!cancelled) setParcels(res); })
      .catch(e => { if (!cancelled) showAlert("Ошибка загрузки партий: " + e.message, "Ошибка"); });

    setData({
      barcode: track.barcode ?? "",
      attachment: track.attachment ?? "",
      unit: track.unit ?? "шт",
      price: track.price ?? "",
      weight_g: track.weight_g ?? "",
      comment: track.comment ?? "",
      url: track.url ?? "",
      status: track.status || "pending",
      parcel_id: track.parcel_id,
      fromActiveParcel: track.fromActiveParcel || false,
      allocations: (track.recipients || []).map(r => ({
        name: r.name,
        qty: r.quantity,
        is_deleted: r.is_deleted,
      })),
    });

    return () => { cancelled = true; };
  }, [track]);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!track || !data) return null;

  const updateAlloc = (i, field, val) => {
    const newAlloc = [...data.allocations];
    newAlloc[i] = { ...newAlloc[i], [field]: val };
    setData({ ...data, allocations: newAlloc });
  };

  const addAlloc = () => setData({ ...data, allocations: [...data.allocations, { name: "", qty: 1, is_deleted: false }] });
  const removeAlloc = (i) => setData({ ...data, allocations: data.allocations.filter((_, idx) => idx !== i) });

  const handleSave = async () => {
    if (saving) return;
    if (!data.attachment.trim()) return showAlert("Укажите вложение", "Ошибка");
    if (data.price === "" || data.price == null) return showAlert("Укажите общую стоимость", "Ошибка");
    if (!data.unit.trim()) return showAlert("Укажите единицу измерения", "Ошибка");

    const priceNum = parseFloat(data.price);
    if (!Number.isFinite(priceNum) || priceNum < 0) return showAlert("Некорректная стоимость", "Ошибка");

    let weightNum = null;
    if (data.weight_g !== "" && data.weight_g != null) {
      weightNum = parseInt(data.weight_g, 10);
      if (!Number.isFinite(weightNum) || weightNum < 0) return showAlert("Некорректный вес", "Ошибка");
    }

    const validAllocations = data.allocations.filter(a => a.name.trim());
    if (validAllocations.length === 0) return showAlert("Укажите хотя бы одного получателя", "Ошибка");

    let allocPayload;
    try {
      allocPayload = validAllocations.map(a => {
        const q = parseInt(a.qty, 10);
        if (!Number.isFinite(q) || q < 1) throw new Error(`Некорректное количество для «${a.name}»`);
        return { recipient_name: a.name, quantity: q };
      });
    } catch (e) {
      return showAlert(e.message, "Ошибка");
    }

    setSaving(true);
    try {
      await api(`/api/tracks/${track.id}`, {
        method: "PUT",
        body: JSON.stringify({
          barcode: data.barcode.trim() || "",
          attachment: data.attachment.trim(),
          parcel_id: data.parcel_id,
          unit: data.unit.trim(),
          price: priceNum,
          weight_g: weightNum,
          comment: data.comment.trim() || "",
          url: data.url.trim() || "",
          status: data.status,
          allocations: allocPayload,
        })
      });
      onSave();
    } catch (e) {
      showAlert("Ошибка: " + e.message, "Ошибка");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const recNames = (track.recipients || []).map(r => r.name).join(", ");
    const recipientText = recNames ? ` получателя ${recNames}` : "";
    const confirm = await showPrompt(
      `Вы собираетесь безвозвратно удалить трек «${track.attachment}»${recipientText}. Это действие нельзя будет отменить.`,
      "Удаление трека",
      { isDanger: true, hint: "Введите название трека:", placeholder: track.attachment }
    );
    if (confirm === track.attachment) {
      try {
        await api(`/api/tracks/${track.id}`, { method: "DELETE" });
        onSave();
      } catch (e) {
        showAlert("Ошибка: " + e.message, "Ошибка");
      }
    }
  };

  const currentParcelName = parcels.find(p => p.id === data.parcel_id)?.name || "";

  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="flex-row space-between mb-16" style={{ alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Редактировать трек</h3>
          {onShowHistory && (
            <button className="secondary small" onClick={() => onShowHistory(track)}>История</button>
          )}
        </div>

        <label>Трек-номер</label>
        <input value={data.barcode} onChange={e => setData({ ...data, barcode: e.target.value })} />

        <label>Вложение *</label>
        <input value={data.attachment} onChange={e => setData({ ...data, attachment: e.target.value })} required />

        <div className="row-2">
          <div>
            <label>Ед. изм. *</label>
            <Autocomplete value={data.unit} onChange={val => setData({ ...data, unit: val })} placeholder="Например, шт" items={UNITS_LIST} />
          </div>
          <div>
            <label>Стоимость (Br) *</label>
            <input type="number" value={data.price} onChange={e => setData({ ...data, price: e.target.value })} required />
          </div>
        </div>

        <label>Вес (г)</label>
        <input type="number" value={data.weight_g} onChange={e => setData({ ...data, weight_g: e.target.value })} />

        <label>Ссылка на товар</label>
        <input value={data.url} onChange={e => setData({ ...data, url: e.target.value })} type="text" />

        <div className="bg-box mt-16">
          <label className="mt-0">Распределение по получателям *</label>
          <div className="flex-col gap-8">
            {data.allocations.map((a, i) => (
              <div key={i} className="flex-row gap-8 center">
                <Autocomplete value={a.name} onChange={val => updateAlloc(i, 'name', val)} />
                {a.is_deleted && <span style={{ color: 'var(--accent-danger)', fontSize: '12px', whiteSpace: 'nowrap' }}>(удален)</span>}
                <input type="number" min="1" value={a.qty} onChange={e => updateAlloc(i, 'qty', e.target.value)} onFocus={e => e.target.select()} style={{ width: '70px' }} />
                <button className="danger small" onClick={() => removeAlloc(i)}>✕</button>
              </div>
            ))}
          </div>
          <button type="button" className="secondary small mt-8" onClick={addAlloc}>+ Добавить получателя</button>
        </div>

        {!hideParcelSelect && (
          <>
            <label>Партия {data.fromActiveParcel && <span className="muted">(нельзя изменить)</span>}</label>
            {data.fromActiveParcel ? (
              <input value={currentParcelName || "Загрузка..."} disabled style={{ opacity: 0.6 }} />
            ) : parcels.length > 0 ? (
              <Autocomplete
                key={data.parcel_id}
                value={currentParcelName}
                onChange={val => { const match = parcels.find(p => p.name === val); if (match) setData({ ...data, parcel_id: match.id }); }}
                placeholder="Выберите партию"
                items={parcels.map(p => p.name)}
                readOnlyInput={true}
              />
            ) : (
              <input value="Загрузка партий..." disabled style={{ opacity: 0.6 }} />
            )}
          </>
        )}

        <label>Статус</label>
        <Autocomplete value={data.status} onChange={val => setData({ ...data, status: val })} placeholder="Выберите статус" items={STATUS_LIST} readOnlyInput={true} />

        <div className="mt-20">
          <button className="primary w-100" onClick={handleSave} disabled={saving}>
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
          <div className="flex-row gap-8 mt-8">
            <button className="secondary flex-1" onClick={onClose}>Отмена</button>
            <button className="danger flex-1" onClick={handleDelete}>Удалить</button>
          </div>
        </div>
      </div>
    </div>
  );
}