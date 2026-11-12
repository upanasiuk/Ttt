import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Stats({ user }) {
  const [data, setData] = useState(null);
  const [parcelFilter, setParcelFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    api("/api/my_stats").then(setData);
  }, []);

  if (!data) return <p>Загрузка...</p>;

  const allParcels = [...new Set([...data.pending, ...data.issued].map(t => t.parcel_name))];
  
  let pending = data.pending.filter(t => !parcelFilter || t.parcel_name === parcelFilter);
  let issued = data.issued.filter(t => !parcelFilter || t.parcel_name === parcelFilter);

  if (statusFilter === "pending_issued") issued = [];
  if (statusFilter === "issued") pending = [];

  const total = pending.length + issued.length;
  const weightTotal = [...pending, ...issued].reduce((sum, t) => sum + (t.weight_g || 0), 0);
  const weightUnknown = [...pending, ...issued].filter(t => t.weight_g == null).length;
  const priceTotal = [...pending, ...issued].reduce((sum, t) => sum + (t.my_price != null ? t.my_price : (t.price || 0)), 0);

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

      {pending.length > 0 && (
        <>
          <h3 className="mt-20">Неврученные</h3>
          <ul>
            {pending.map(t => (
              <li key={t.id} style={{ background: 'transparent', borderBottom: '1px dashed var(--border-color)', borderRadius: 0 }}>
                {t.attachment} — {t.parcel_name} — {t.my_price ? t.my_price.toFixed(2) + ' Br' : '—'}
              </li>
            ))}
          </ul>
        </>
      )}
      {issued.length > 0 && (
        <>
          <h3 className="mt-20">Врученные</h3>
          <ul>
            {issued.map(t => (
              <li key={t.id} style={{ background: 'transparent', borderBottom: '1px dashed var(--border-color)', borderRadius: 0 }}>
                {t.attachment} — {t.parcel_name} — {t.my_price ? t.my_price.toFixed(2) + ' Br' : '—'}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}