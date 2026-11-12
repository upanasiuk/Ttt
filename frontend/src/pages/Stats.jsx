import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Stats({ user }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    api("/api/my_stats").then(setData);
  }, []);

  if (!data) return <p>Загрузка...</p>;

  return (
    <div className="tab-panel active">
      <h2 className="section-title">Моя статистика</h2>
      <div className="stats-box">
        <div className="stat-row"><span>Всего треков:</span><b>{data.stats.total}</b></div>
        <div className="stat-row"><span>Выдано:</span><b>{data.stats.issued_count}</b></div>
        <div className="stat-row"><span>Ожидает:</span><b>{data.stats.pending_count}</b></div>
        <div className="stat-row"><span>Суммарный вес:</span><b>{data.stats.weight_total} г</b></div>
        <div className="stat-row"><span>Без веса:</span><b>{data.stats.weight_unknown}</b></div>
        <div className="stat-row"><span>Суммарная цена:</span><b>{data.stats.price_total.toFixed(2)} Br</b></div>
      </div>

      {data.pending.length > 0 && (
        <>
          <h3>Неврученные</h3>
          <ul>{data.pending.map(t => <li key={t.id}>{t.attachment} — {t.parcel_name}</li>)}</ul>
        </>
      )}
      {data.issued.length > 0 && (
        <>
          <h3>Врученные</h3>
          <ul>{data.issued.map(t => <li key={t.id}>{t.attachment} — {t.parcel_name}</li>)}</ul>
        </>
      )}
    </div>
  );
}