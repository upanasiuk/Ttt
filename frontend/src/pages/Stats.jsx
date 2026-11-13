import { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import { getStatusLabel } from '../constants';

export default function Stats({ user }) {
  const [data, setData] = useState(null);
  const [parcelFilter, setParcelFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    api("/api/my_stats")
      .then(setData)
      .catch(() => setData({ stats: { total: 0, issued_count: 0, pending_count: 0, weight_total: 0, weight_unknown: 0, price_total: 0 }, pending: [], issued: [] }));
  }, []);

  const allParcels = useMemo(() => {
    if (!data) return [];
    const names = [...data.pending, ...data.issued].map(t => t.parcel_name).filter(Boolean);
    return [...new Set(names)];
  }, [data]);

  const { pending, issued } = useMemo(() => {
    if (!data) return { pending: [], issued: [] };
    let p = data.pending.filter(t => !parcelFilter || t.parcel_name === parcelFilter);
    let i = data.issued.filter(t => !parcelFilter || t.parcel_name === parcelFilter);
    if (statusFilter === "pending_issued") i = [];
    if (statusFilter === "issued") p = [];
    return { pending: p, issued: i };
  }, [data, parcelFilter, statusFilter]);

  if (!data) return <p className="muted">Загрузка...</p>;

  const combined = [...pending, ...issued];
  const total = combined.length;
  const weightTotal = combined.reduce((sum, t) => sum + (t.weight_g || 0), 0);
  const weightUnknown = combined.filter(t => t.weight_g == null).length;
  const priceTotal = combined.reduce((sum, t) => {
    if (t.my_price != null) return sum + t.my_price;
    return sum + (t.price || 0);
  }, 0);

  const renderList = (list, emptyText) => (
    list.length === 0 ? (
      <p className="muted mt-8">{emptyText}</p>
    ) : (
      <ul>
        {list.map(t => (
          <li key={t.id} className="track-card">
            <div className="meta">
              <span className="name">{t.attachment}</span>
              <span className="code">
                {t.barcode || "Без трека"} · {t.parcel_name} · {t.my_price != null ? t.my_price.toFixed(2) + ' Br' : '—'}
              </span>
            </div>
            <span className={`badge ${t.status}`}>{getStatusLabel(t.status)}</span>
          </li>
        ))}
      </ul>
    )
  );

  return (
    <div className="tab-panel active">
      <h2 className="section-title">Моя статистика</h2>

      <div className="filter-row">
        <select value={parcelFilter} onChange={e => setParcelFilter(e.target.value)}>
          <option value="">Все партии</option>
          {allParcels.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Все треки</option>
          <option value="pending_issued">Неврученные</option>
          <option value="issued">Только врученные</option>
        </select>
      </div>

      <div className="stats-box">
        <div className="stat-row"><span>Всего треков:</span><b>{total}</b></div>
        <div className="stat-row"><span>Выдано:</span><b>{issued.length}</b></div>
        <div className="stat-row"><span>Ожидает:</span><b>{pending.length}</b></div>
        <div className="stat-row"><span>Суммарный вес:</span><b>{weightTotal} г</b></div>
        <div className="stat-row"><span>Без веса:</span><b>{weightUnknown}</b></div>
        <div className="stat-row"><span>Суммарная цена:</span><b>{priceTotal.toFixed(2)} Br</b></div>
      </div>

      <h3 className="mt-20 mb-12">Неврученные</h3>
      {renderList(pending, "Неврученных треков нет")}

      <h3 className="mt-20 mb-12">Врученные</h3>
      {renderList(issued, "Врученных треков нет")}
    </div>
  );
}