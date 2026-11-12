import { useState, useEffect } from 'react';
import { api, getToken } from '../api';
import Autocomplete from '../components/Autocomplete';
import Pagination from '../components/Pagination';

export default function Parcels({ user, showAlert, showPrompt, showToast }) {
  const [parcels, setParcels] = useState([]);
  const [activeParcel, setActiveParcel] = useState(null);
  const [search, setSearch] = useState("");
  const [searchType, setSearchType] = useState("all");

  // Пагинация партий
  const [pageActive, setPageActive] = useState(1);
  const [perPageActive, setPerPageActive] = useState(5);
  const [pageClosed, setPageClosed] = useState(1);
  const [perPageClosed, setPerPageClosed] = useState(5);

  // Поиск по трекам партии
  const [trackSearch, setTrackSearch] = useState("");
  const [trackStatus, setTrackStatus] = useState("");
  const [pageTracks, setPageTracks] = useState(1);
  const [perPageTracks, setPerPageTracks] = useState(5);

  // Состояние для нового трека
  const [trBarcode, setTrBarcode] = useState("");
  const [trShowBarcode, setTrShowBarcode] = useState(false);
  const [trAttachment, setTrAttachment] = useState("");
  const [trUnit, setTrUnit] = useState("шт");
  const [trPrice, setTrPrice] = useState("");
  const [trWeight, setTrWeight] = useState("");
  const [trComment, setTrComment] = useState("");
  const [trUrl, setTrUrl] = useState("");
  const [allocations, setAllocations] = useState([{ name: "", qty: 1 }]);

  // Модалка редактирования
  const [editTarget, setEditTarget] = useState(null);
  const [editData, setEditData] = useState({});

  const loadParcels = async () => {
    let data = await api("/api/parcels");
    if (user.is_admin) {
      setActiveParcel(data.find(p => p.is_active) || null);
    } else {
      data = data.filter(p => p.tracks.length > 0);
      setActiveParcel(data.find(p => p.is_active) || data[0] || null);
    }
    setParcels(data);
  };

  useEffect(() => { loadParcels(); }, []);

  // Escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && editTarget) setEditTarget(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [editTarget]);

  // --- Добавление трека ---
  const addAlloc = () => setAllocations([...allocations, { name: "", qty: 1 }]);
  const updateAlloc = (i, field, val) => {
    const newAlloc = [...allocations];
    newAlloc[i][field] = val;
    setAllocations(newAlloc);
  };
  const removeAlloc = (i) => setAllocations(allocations.filter((_, idx) => idx !== i));

  const handleAddTrack = async () => {
    if (!activeParcel) return showAlert("Сначала выберите партию");
    if (!trAttachment.trim()) return showAlert("Укажите вложение");
    
    try {
      await api("/api/tracks", {
        method: "POST",
        body: JSON.stringify({
          barcode: trBarcode.trim() || null,
          attachment: trAttachment.trim(),
          parcel_id: activeParcel.id,
          allocations: allocations.map(a => ({ recipient_name: a.name, quantity: parseInt(a.qty) })),
          unit: trUnit,
          price: trPrice ? parseFloat(trPrice) : null,
          weight_g: trWeight ? parseInt(trWeight) : null,
          comment: trComment.trim() || null,
          url: trUrl.trim() || null,
        }),
      });
      setTrBarcode(""); setTrAttachment(""); setTrPrice(""); setTrWeight(""); setTrComment(""); setTrUrl("");
      setAllocations([{ name: "", qty: 1 }]);
      loadParcels();
      showToast("Трек успешно добавлен");
    } catch (e) { showAlert("Ошибка: " + e.message); }
  };

  // --- Экспорт ---
  const exportParcel = (id, name) => {
    fetch(`/api/parcels/${id}/export`, { headers: { "Authorization": `Bearer ${getToken()}` } })
      .then(res => {
        if (!res.ok) throw new Error("Ошибка экспорта");
        return res.blob();
      })
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `Опись_${name}.xlsx`; a.click();
        URL.revokeObjectURL(url);
      })
      .catch(err => showAlert(err.message));
  };

  // --- Редактирование ---
  const openEdit = (track) => {
    setEditTarget(track);
    setEditData({
      barcode: track.barcode || "",
      attachment: track.attachment || "",
      unit: track.unit || "шт",
      price: track.price || "",
      weight_g: track.weight_g || "",
      comment: track.comment || "",
      url: track.url || "",
      status: track.status || "pending",
      parcel_id: track.parcel_id,
      allocations: track.recipients.map(r => ({ name: r.name, qty: r.quantity }))
    });
  };

  const updateEditAlloc = (i, field, val) => {
    const newAlloc = [...editData.allocations];
    newAlloc[i][field] = val;
    setEditData({ ...editData, allocations: newAlloc });
  };
  const addEditAlloc = () => setEditData({ ...editData, allocations: [...editData.allocations, { name: "", qty: 1 }] });
  const removeEditAlloc = (i) => setEditData({ ...editData, allocations: editData.allocations.filter((_, idx) => idx !== i) });

  const saveEdit = async () => {
    try {
      await api(`/api/tracks/${editTarget.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...editData,
          allocations: editData.allocations.map(a => ({ recipient_name: a.name, quantity: parseInt(a.qty) })),
          price: editData.price ? parseFloat(editData.price) : null,
          weight_g: editData.weight_g ? parseInt(editData.weight_g) : null,
        })
      });
      setEditTarget(null);
      loadParcels();
      showToast("Изменения сохранены");
    } catch (e) { showAlert("Ошибка: " + e.message); }
  };

  const deleteTrack = async () => {
    if (!editTarget) return;
    const confirm = await showPrompt(`Удалить трек "${editTarget.attachment}"?`, "Удаление", { isDanger: true, hint: "Введите название:", placeholder: editTarget.attachment });
    if (confirm === editTarget.attachment) {
      await api(`/api/tracks/${editTarget.id}`, { method: "DELETE" });
      setEditTarget(null);
      loadParcels();
    }
  };

  // Фильтрация партий
  const filterParcels = (list) => list.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    const nameMatch = p.name.toLowerCase().includes(q);
    const recMatch = p.tracks.some(t => t.recipients.some(r => r.name.toLowerCase().includes(q)));
    const trackMatch = p.tracks.some(t => t.barcode?.toLowerCase().includes(q) || t.attachment?.toLowerCase().includes(q));
    if (searchType === "name") return nameMatch;
    if (searchType === "recipient") return recMatch;
    if (searchType === "track") return trackMatch;
    return nameMatch || recMatch || trackMatch;
  });

  const activeList = filterParcels(parcels.filter(p => p.status !== "completed"));
  const closedList = filterParcels(parcels.filter(p => p.status === "completed"));

  const paginatedActive = activeList.slice((pageActive - 1) * perPageActive, pageActive * perPageActive);
  const paginatedClosed = closedList.slice((pageClosed - 1) * perPageClosed, pageClosed * perPageClosed);

  // Фильтрация треков партии
  const filteredTracks = (activeParcel?.tracks || []).filter(t => {
    if (trackStatus && t.status !== trackStatus) return false;
    if (!trackSearch) return true;
    const q = trackSearch.toLowerCase();
    return (t.barcode && t.barcode.toLowerCase().includes(q)) || 
           (t.attachment && t.attachment.toLowerCase().includes(q)) ||
           (t.recipients && t.recipients.some(r => r.name.toLowerCase().includes(q)));
  });
  const paginatedTracks = filteredTracks.slice((pageTracks - 1) * perPageTracks, pageTracks * perPageTracks);

  return (
    <div className="tab-panel active">
      {/* БЛОК АКТИВНЫХ ПАРТИЙ */}
      <details className="parcels-details" open>
        <summary>
          <span>Активные партии</span>
          <span className="muted ml-auto font-13">({activeParcel ? `выбрана: ${activeParcel.name}` : "нет"})</span>
        </summary>
        <div>
          <div className="filter-row mb-16">
            <input value={search} onChange={e => { setSearch(e.target.value); setPageActive(1); }} placeholder="Поиск..." />
            <select value={searchType} onChange={e => setSearchType(e.target.value)}>
              <option value="all">Везде</option>
              <option value="name">Название</option>
              <option value="recipient">Получатель</option>
              <option value="track">Трек</option>
            </select>
          </div>

          <ul>
            {paginatedActive.map(p => (
              <li key={p.id} className="flex-col" style={{ borderColor: activeParcel?.id === p.id ? 'var(--accent-primary)' : '' }}>
                <div className="flex-row space-between w-100 mb-12">
                  <div>
                    <b>{p.name}</b> <span className="code">· {p.tracks.length} трек(ов)</span>
                    {p.is_active && <span className="badge parcel-active">Выбрана</span>}
                  </div>
                  <div className="parcel-actions">
                    {user.is_admin && !p.is_active && (
                      <button className="primary small" onClick={async () => { await api(`/api/parcels/${p.id}/activate`, { method: "POST" }); loadParcels(); }}>Выбрать</button>
                    )}
                    {user.is_admin && (
                      <>
                        <button className="secondary small" onClick={() => exportParcel(p.id, p.name)}>Экспорт</button>
                        <button className="secondary small" onClick={async () => {
                          const path = p.status === "completed" ? "reopen" : "complete";
                          await api(`/api/parcels/${p.id}/${path}`, { method: "POST" }); loadParcels();
                        }}>Закрыть</button>
                        <button className="danger small" onClick={async () => {
                          const confirm = await showPrompt(`Удалить партию "${p.name}"?`, "Удаление", { isDanger: true, hint: "Введите название:", placeholder: p.name });
                          if (confirm === p.name) { await api(`/api/parcels/${p.id}`, { method: "DELETE" }); loadParcels(); }
                        }}>Удалить</button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <Pagination currentPage={pageActive} totalPages={Math.ceil(activeList.length / perPageActive)} onPageChange={setPageActive} perPage={perPageActive} onPerPageChange={setPerPageActive} />
        </div>
      </details>

      {/* БЛОК АРХИВА */}
      <details className="parcels-details mt-32">
        <summary><span>Архив закрытых партий</span></summary>
        <div>
          <ul>
            {paginatedClosed.map(p => (
              <li key={p.id} className="flex-col">
                <div className="flex-row space-between w-100 mb-12">
                  <div>
                    <b>{p.name}</b> <span className="code">· {p.tracks.length} трек(ов)</span>
                    <span className="badge archive">Архив</span>
                  </div>
                  <div className="parcel-actions">
                    {user.is_admin && (
                      <button className="secondary small" onClick={async () => {
                        await api(`/api/parcels/${p.id}/reopen`, { method: "POST" }); loadParcels();
                      }}>Открыть</button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <Pagination currentPage={pageClosed} totalPages={Math.ceil(closedList.length / perPageClosed)} onPageChange={setPageClosed} perPage={perPageClosed} onPerPageChange={setPerPageClosed} />
        </div>
      </details>

      {/* ФОРМА ДОБАВЛЕНИЯ */}
      {user.is_admin && (
        <div className="card-form mt-32">
          <h3>Добавить трек</h3>
          <div className="muted mb-16">Трек будет добавлен в: <span className="accent-parcel-name">{activeParcel?.name || "не выбрана"}</span></div>

          <div className="btn secondary w-100 mb-12 border-dashed" onClick={() => setTrShowBarcode(true)} style={{ display: trShowBarcode ? 'none' : 'block' }}>+ Имеется трек-код</div>
          {trShowBarcode && (
            <div className="mb-12">
              <label>Трек-номер</label>
              <input value={trBarcode} onChange={e => setTrBarcode(e.target.value)} placeholder="123456789" />
            </div>
          )}

          <label>Вложение</label>
          <input value={trAttachment} onChange={e => setTrAttachment(e.target.value)} placeholder="Одежда" />

          <div className="row-2">
            <div>
              <label>Ед. изм.</label>
              <select value={trUnit} onChange={e => setTrUnit(e.target.value)}>
                <option value="шт">шт</option>
                <option value="упак">упак</option>
                <option value="пар">пар</option>
              </select>
            </div>
            <div>
              <label>Общая стоимость (Br)</label>
              <input type="number" step="0.01" value={trPrice} onChange={e => setTrPrice(e.target.value)} />
            </div>
          </div>
          <label>Вес (г)</label>
          <input type="number" value={trWeight} onChange={e => setTrWeight(e.target.value)} />
          <label>Ссылка на товар</label>
          <input value={trUrl} onChange={e => setTrUrl(e.target.value)} placeholder="https://..." type="text" />

          <div className="bg-box mt-16">
            <label className="mt-0">Распределение по получателям</label>
            <div className="flex-col gap-8">
              {allocations.map((a, i) => (
                <div key={i} className="flex-row gap-8 center">
                  <Autocomplete value={a.name} onChange={val => updateAlloc(i, 'name', val)} />
                  <input type="number" min="1" value={a.qty} onChange={e => updateAlloc(i, 'qty', e.target.value)} style={{ width: '70px' }} />
                  <button className="danger small" onClick={() => removeAlloc(i)}>✕</button>
                </div>
              ))}
            </div>
            <button type="button" className="secondary small mt-8" onClick={addAlloc}>+ Добавить получателя</button>
          </div>
          <label>Комментарий</label>
          <input value={trComment} onChange={e => setTrComment(e.target.value)} placeholder="Хрупкое" />
          <button className="primary w-100 mt-20" onClick={handleAddTrack}>Сохранить трек</button>
        </div>
      )}

      {/* СПИСОК ТРЕКОВ ВЫБРАННОЙ ПАРТИИ */}
      <h2 className="section-title mt-32">Треки выбранной партии</h2>
      <div className="filter-row">
        <input value={trackSearch} onChange={e => { setTrackSearch(e.target.value); setPageTracks(1); }} placeholder="Поиск по треку/получателю..." />
        <select value={trackStatus} onChange={e => { setTrackStatus(e.target.value); setPageTracks(1); }}>
          <option value="">Все статусы</option>
          <option value="pending">Ожидает отправки</option>
          <option value="in_transit">В пути к CARGO</option>
          <option value="received_cargo">Получен CARGO</option>
          <option value="issued">Выдан</option>
        </select>
      </div>
      
      <ul>
        {paginatedTracks.map(t => (
          <li key={t.id} className="track-card" onClick={() => user.is_admin && openEdit(t)}>
            <div className="meta">
              <span className="name">{t.attachment} · {t.recipients.map(r => `${r.name} (${r.quantity})`).join(", ")}</span>
              <span className="code">{t.barcode || "Без трека"} · {t.price ? t.price + " Br" : "цена ?"} · {t.weight_g ? t.weight_g + " г" : "вес ?"}</span>
            </div>
            <div className="flex-row gap-8" style={{ alignItems: 'center' }}>
              {t.url && (
                <button className="link-icon-btn primary" onClick={(e) => { e.stopPropagation(); window.open(t.url, "_blank"); }} title="Открыть ссылку">↗</button>
              )}
              <span className={`badge ${t.status}`}>{t.status}</span>
            </div>
          </li>
        ))}
      </ul>
      <Pagination currentPage={pageTracks} totalPages={Math.ceil(filteredTracks.length / perPageTracks)} onPageChange={setPageTracks} perPage={perPageTracks} onPerPageChange={setPerPageTracks} />

      {/* МОДАЛКА РЕДАКТИРОВАНИЯ */}
      {editTarget && (
        <div className="modal" onClick={(e) => e.target === e.currentTarget && setEditTarget(null)}>
          <div className="modal-content">
            <h3>Редактировать трек</h3>
            
            <label>Трек-номер</label>
            <input value={editData.barcode} onChange={e => setEditData({...editData, barcode: e.target.value})} />
            
            <label>Вложение</label>
            <input value={editData.attachment} onChange={e => setEditData({...editData, attachment: e.target.value})} />
            
            <div className="row-2">
              <div>
                <label>Стоимость (Br)</label>
                <input type="number" value={editData.price} onChange={e => setEditData({...editData, price: e.target.value})} />
              </div>
              <div>
                <label>Вес (г)</label>
                <input type="number" value={editData.weight_g} onChange={e => setEditData({...editData, weight_g: e.target.value})} />
              </div>
            </div>

            <label>Ссылка на товар</label>
            <input value={editData.url} onChange={e => setEditData({...editData, url: e.target.value})} type="text" />

            <div className="bg-box mt-16">
              <label className="mt-0">Распределение по получателям</label>
              <div className="flex-col gap-8">
                {editData.allocations.map((a, i) => (
                  <div key={i} className="flex-row gap-8 center">
                    <Autocomplete value={a.name} onChange={val => updateEditAlloc(i, 'name', val)} />
                    <input type="number" min="1" value={a.qty} onChange={e => updateEditAlloc(i, 'qty', e.target.value)} style={{ width: '70px' }} />
                    <button className="danger small" onClick={() => removeEditAlloc(i)}>✕</button>
                  </div>
                ))}
              </div>
              <button type="button" className="secondary small mt-8" onClick={addEditAlloc}>+ Добавить получателя</button>
            </div>

            <label>
              Партия {activeParcel?.id === editTarget.parcel_id && <span className="muted">(нельзя изменить)</span>}
            </label>
            <select 
              value={editData.parcel_id} 
              onChange={e => setEditData({...editData, parcel_id: Number(e.target.value)})}
              disabled={activeParcel?.id === editTarget.parcel_id}
            >
              {parcels.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

            <label>Статус</label>
            <select value={editData.status} onChange={e => setEditData({...editData, status: e.target.value})}>
              <option value="pending">Ожидает отправки</option>
              <option value="in_transit">В пути к CARGO</option>
              <option value="received_cargo">Получен CARGO</option>
              <option value="issued">Выдан</option>
            </select>

            <div className="btn-row space-between mt-20">
              <button className="danger" onClick={deleteTrack}>Удалить</button>
              <div className="flex-row gap-8">
                <button className="secondary" onClick={() => setEditTarget(null)}>Отмена</button>
                <button className="primary" onClick={saveEdit}>Сохранить</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}