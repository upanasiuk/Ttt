import { useState, useEffect } from 'react';
import { api } from '../api';
import { getHistoryActionLabel, getHistoryFieldLabel, getStatusLabel } from '../constants';

function formatDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString("ru-RU", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  } catch (e) {
    return iso;
  }
}

function formatValue(field, val) {
  if (val === null || val === undefined || val === "") return "—";
  if (field === "status") return getStatusLabel(val);
  if (field === "allocations") {
    if (typeof val !== "object") return String(val);
    const parts = Object.entries(val).map(([k, v]) => `${k}: ${v}`);
    return parts.length ? parts.join(", ") : "—";
  }
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

// Проверяем, изменилось ли значение (игнорируем null <-> "")
function isChanged(val1, val2) {
  const v1 = val1 === null || val1 === undefined || val1 === "" ? null : val1;
  const v2 = val2 === null || val2 === undefined || val2 === "" ? null : val2;
  if (v1 === null && v2 === null) return false;
  return v1 !== v2;
}

export default function TrackHistoryModal({ trackId, trackName, onClose, showAlert }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api(`/api/tracks/${trackId}/history`)
      .then(data => { if (!cancelled) setItems(data); })
      .catch(e => { if (!cancelled) showAlert("Ошибка загрузки истории: " + e.message, "Ошибка"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [trackId]);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const renderEntry = (item) => {
    const head = (
      <div className="history-head">
        <span className={`badge history-action-${item.action}`}>
          {getHistoryActionLabel(item.action)}
        </span>
        <span className="history-date">{formatDate(item.created_at)}</span>
        <span className="history-user">({item.user_name || "—"})</span>
      </div>
    );

    if (item.action === "created") {
      const s = item.details?.snapshot;
      if (!s) return <li key={item.id} className="history-item">{head}</li>;
      const rows = [
        ["attachment", s.attachment],
        ["quantity", s.quantity != null ? `${s.quantity} ${s.unit || ""}`.trim() : null],
        ["price", s.price != null ? `${s.price} Br` : null],
        ["barcode", s.barcode],
        ["weight_g", s.weight_g != null ? `${s.weight_g} г` : null],
      ].filter(([, v]) => v != null && v !== "");

      return (
        <li key={item.id} className="history-item">
          {head}
          <div className="history-changes">
            {rows.map(([field, val]) => (
              <div key={field} className="history-line">
                <span className="muted">{getHistoryFieldLabel(field)}:</span>{" "}
                <span className="history-new">{formatValue(field, val)}</span>
              </div>
            ))}
          </div>
        </li>
      );
    }

    const details = item.details || {};
    const rows = Object.entries(details)
      .filter(([field, ch]) => {
        if (!ch || typeof ch !== "object" || !("from" in ch || "to" in ch)) return false;
        // Игнорируем изменения пустоты (null -> "", "" -> null)
        if (field !== "allocations" && !isChanged(ch.from, ch.to)) return false;
        return true;
      })
      .map(([field, ch]) => {
        // Если это распределение, и оно не изменилось — пропускаем
        if (field === "allocations") {
           const fromStr = JSON.stringify(ch.from || {});
           const toStr = JSON.stringify(ch.to || {});
           if (fromStr === toStr) return null;
        }
        
        return (
          <div key={field} className="history-line">
            <span className="muted">{getHistoryFieldLabel(field)}:</span>{" "}
            <span className="history-old">{formatValue(field, ch.from)}</span>
            {" → "}
            <span className="history-new">{formatValue(field, ch.to)}</span>
          </div>
        );
      })
      .filter(Boolean);

    return (
      <li key={item.id} className="history-item">
        {head}
        {rows.length > 0 && <div className="history-changes">{rows}</div>}
      </li>
    );
  };

  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        <div className="flex-row space-between mb-16">
          <h3>История: {trackName}</h3>
          <button className="secondary small" onClick={onClose}>Закрыть</button>
        </div>

        {loading ? (
          <p className="muted">Загрузка...</p>
        ) : items.length === 0 ? (
          <p className="muted">История пуста</p>
        ) : (
          <ul className="history-list">
            {items.map(renderEntry)}
          </ul>
        )}
      </div>
    </div>
  );
}