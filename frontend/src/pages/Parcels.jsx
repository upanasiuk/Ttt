import { useState, useEffect, useMemo } from 'react';
import { api, apiDownload } from '../api';
import Autocomplete from '../components/Autocomplete';
import Pagination from '../components/Pagination';
import EditTrackModal from '../components/EditTrackModal';
import TrackHistoryModal from '../components/TrackHistoryModal';
import { UNITS_LIST, getStatusLabel, STATUS_LIST } from '../constants';

export default function Parcels({ user, showAlert, showPrompt, showToast }) {
  const [parcels, setParcels] = useState([]);
  const [activeParcel, setActiveParcel] = useState(null);
  const [search, setSearch] = useState("");
  const [searchType, setSearchType] = useState("all");

  const [pageActive, setPageActive] = useState(1);
  const [perPageActive, setPerPageActive] = useState(5);
  const [pageClosed, setPageClosed] = useState(1);
  const [perPageClosed, setPerPageClosed] = useState(5);

  const [trackSearch, setTrackSearch] = useState("");
  const [trackStatus, setTrackStatus] = useState("");
  const [pageTracks, setPageTracks] = useState(1);
  const [perPageTracks, setPerPageTracks] = useState(5);

  const [trBarcode, setTrBarcode] = useState("");
  const [trShowBarcode, setTrShowBarcode] = useState(false);
  const [trAttachment, setTrAttachment] = useState("");
  const [trUnit, setTrUnit] = useState("шт");
  const [trPrice, setTrPrice] = useState("");
  const [trWeight, setTrWeight] = useState("");
  const [trComment, setTrComment] = useState("");
  const [trUrl, setTrUrl] = useState("");
  const [allocations, setAllocations] = useState([{ name: "", qty: 1 }]);

  const [editTarget, setEditTarget] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);

  const [isNewParcelModalOpen, setIsNewParcelModalOpen] = useState(false);
  const [newParcelName, setNewParcelName] = useState("");

  const [exporting, setExporting] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [expandedParcels, setExpandedParcels] = useState({});
  const toggleParcel = (id) => setExpandedParcels(prev => ({ ...prev, [id]: !prev[id] }));

  const [isActiveListOpen, setIsActiveListOpen] = useState(true);
  const [isClosedListOpen, setIsClosedListOpen] = useState(false);

  const [userTracksModal, setUserTracksModal] = useState(null);
  const [recipients, setRecipients] = useState([]);

  const loadParcels = async () => {
    try {
      let data = await api("/api/parcels");
      if (user.is_admin) {
        setActiveParcel(data.find(p => p.is_active && p.status === 'active') || null);
      } else {
        data = data.filter(p => p.tracks.length > 0);
        setActiveParcel(data.find(p => p.is_active && p.status === 'active') || data[0] || null);
      }
      setParcels(data);
    } catch (e) {
      showAlert("Ошибка загрузки партий: " + e.message, "Ошибка");
    }
  };

  const loadRecipients = async () => {
    if (!user.is_admin) return;
    try {
      const data = await api("/api/recipients");
      setRecipients(data);
    } catch (e) {}
  };

  useEffect(() => {
    loadParcels();
    loadRecipients();
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (historyTarget) setHistoryTarget(null);
        else if (userTracksModal) setUserTracksModal(null);
        else if (editTarget) setEditTarget(null);
        else if (isNewParcelModalOpen) setIsNewParcelModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [editTarget, isNewParcelModalOpen, userTracksModal, historyTarget]);

  const handleCreateParcel = async () => {
    if (!newParcelName.trim()) return showAlert("Введите название", "Ошибка");
    try {
      await api("/api/parcels", { method: "POST", body: JSON.stringify({ name: newParcelName.trim() }) });
      setIsNewParcelModalOpen(false);
      setNewParcelName("");
      await loadParcels();
      showToast("Партия создана");
    } catch (e) { showAlert("Ошибка: " + e.message, "Ошибка"); }
  };

  const addAlloc = () => setAllocations([...allocations, { name: "", qty: 1 }]);
  const updateAlloc = (i, field, val) => {
    const newAlloc = [...allocations];
    newAlloc[i] = { ...newAlloc[i], [field]: val };
    setAllocations(newAlloc);
  };
  const removeAlloc = (i) => setAllocations(allocations.filter((_, idx) => idx !== i));

  const handleAddTrack = async () => {
    if (isSubmitting) return;
    if (!activeParcel) return showAlert("Сначала выберите партию", "Ошибка");
    if (!trAttachment.trim()) return showAlert("Укажите вложение", "Ошибка");
    if (trPrice === "" || trPrice == null) return showAlert("Укажите общую стоимость", "Ошибка");
    if (!trUnit.trim()) return showAlert("Укажите единицу измерения", "Ошибка");

    const priceNum = parseFloat(trPrice);
    if (!Number.isFinite(priceNum) || priceNum < 0) return showAlert("Некорректная стоимость", "Ошибка");

    let weightNum = null;
    if (trWeight !== "" && trWeight != null) {
      weightNum = parseInt(trWeight, 10);
      if (!Number.isFinite(weightNum) || weightNum < 0) return showAlert("Некорректный вес", "Ошибка");
    }

    const validAllocations = allocations.filter(a => a.name.trim());
    if (validAllocations.length === 0) return showAlert("Укажите хотя бы одного получателя", "Ошибка");

    for (let a of validAllocations) {
      if (!recipients.some(r => r.name === a.name)) {
        return showAlert(`Получатель "${a.name}" не найден в справочнике.`, "Ошибка");
      }
    }

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

    setIsSubmitting(true);
    try {
      await api("/api/tracks", {
        method: "POST",
        body: JSON.stringify({
          barcode: trBarcode.trim() || null,
          attachment: trAttachment.trim(),
          parcel_id: activeParcel.id,
          allocations: allocPayload,
          unit: trUnit,
          price: priceNum,
          weight_g: weightNum,
          comment: trComment.trim() || null,
          url: trUrl.trim() || null,
        }),
      });
      setTrBarcode(""); setTrAttachment(""); setTrPrice(""); setTrWeight(""); setTrComment(""); setTrUrl("");
      setTrUnit("шт"); setAllocations([{ name: "", qty: 1 }]);
      await loadParcels();
      showToast("Трек успешно добавлен");
    } catch (e) { showAlert("Ошибка: " + e.message, "Ошибка"); }
    finally { setIsSubmitting(false); }
  };

  const exportParcel = (id, name) => {
    setExporting(id);
    apiDownload(`/api/parcels/${id}/export`)
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `Опись_${name}.xlsx`; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      })
      .catch(err => showAlert(err.message, "Ошибка"))
      .finally(() => setExporting(null));
  };

  const openEdit = (track, fromActiveParcel = false) => {
    setEditTarget({ ...track, fromActiveParcel });
  };

  const filterParcels = (list) => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(p => {
      const nameMatch = p.name.toLowerCase().includes(q);
      const recMatch = p.tracks.some(t => t.recipients.some(r => r.name.toLowerCase().includes(q)));
      const trackMatch = p.tracks.some(t => t.barcode?.toLowerCase().includes(q) || t.attachment?.toLowerCase().includes(q));
      if (searchType === "name") return nameMatch;
      if (searchType === "recipient") return recMatch;
      if (searchType === "track") return trackMatch;
      return nameMatch || recMatch || trackMatch;
    });
  };

  const activeList = useMemo(
    () => filterParcels(parcels.filter(p => p.status !== "completed")),
    [parcels, search, searchType]
  );
  const closedList = useMemo(
    () => filterParcels(parcels.filter(p => p.status === "completed")),
    [parcels, search, searchType]
  );

  const safePageActive = Math.min(pageActive, Math.max(Math.ceil(activeList.length / perPageActive), 1));
  const safePageClosed = Math.min(pageClosed, Math.max(Math.ceil(closedList.length / perPageClosed), 1));

  const paginatedActive = activeList.slice((safePageActive - 1) * perPageActive, safePageActive * perPageActive);
  const paginatedClosed = closedList.slice((safePageClosed - 1) * perPageClosed, safePageClosed * perPageClosed);

  const filteredTracks = useMemo(() => {
    const q = trackSearch.trim().toLowerCase();
    return (activeParcel?.tracks || []).filter(t => {
      if (trackStatus && t.status !== trackStatus) return false;
      if (!q) return true;
      return (t.barcode && t.barcode.toLowerCase().includes(q)) ||
        (t.attachment && t.attachment.toLowerCase().includes(q)) ||
        (t.recipients && t.recipients.some(r => r.name.toLowerCase().includes(q)));
    });
  }, [activeParcel, trackSearch, trackStatus]);

  const safePageTracks = Math.min(pageTracks, Math.max(Math.ceil(filteredTracks.length / perPageTracks), 1));
  const paginatedTracks = filteredTracks.slice((safePageTracks - 1) * perPageTracks, safePageTracks * perPageTracks);

  return (
    <div className="tab-panel active">
      {user.is_admin && (
        <div className="admin-header mt-16 mb-16">
          <h2>Управление партиями</h2>
          <button className="primary small" onClick={() => setIsNewParcelModalOpen(true)}>+ Новая партия</button>
        </div>
      )}

      <div className="smooth-details">
        <div className="smooth-details-header" onClick={() => setIsActiveListOpen(!isActiveListOpen)}>
          <span>Активные партии</span>
          <span className="muted ml-auto font-13">({activeParcel ? `выбрана: ${activeParcel.name}` : "нет"})</span>
          <span className={`smooth-chevron ${isActiveListOpen ? 'open' : ''}`}>▼</span>
        </div>

        <div className={`smooth-details-content ${isActiveListOpen ? 'open' : ''}`}>
          <div className="filter-row mb-16">
            <input value={search} onChange={e => { setSearch(e.target.value); setPageActive(1); setPageClosed(1); }} placeholder="Поиск..." />
            <select value={searchType} onChange={e => { setSearchType(e.target.value); setPageActive(1); setPageClosed(1); }}>
              <option value="all">Везде</option>
              <option value="name">Название</option>
              <option value="recipient">Получатель</option>
              <option value="track">Трек</option>
            </select>
          </div>

          <ul>
            {paginatedActive.length === 0 ? (
              <li style={{ justifyContent: 'center' }}><span className="muted">Активных партий нет</span></li>
            ) : paginatedActive.map(p => {
              const recStats = {};
              p.tracks.forEach(t => {
                const totalQty = t.quantity || 1;
                const pricePerUnit = (t.price || 0) / totalQty;
                t.recipients.forEach(r => {
                  if (!recStats[r.name]) recStats[r.name] = { count: 0, price: 0, tracks: [] };
                  recStats[r.name].count += 1;
                  recStats[r.name].price += (pricePerUnit * r.quantity);
                  recStats[r.name].tracks.push(t);
                });
              });

              return (
                <li
                  key={p.id}
                  className="flex-col"
                  style={{ borderColor: activeParcel?.id === p.id ? 'var(--accent-primary)' : '', cursor: 'pointer', position: 'relative' }}
                  onClick={() => toggleParcel(p.id)}
                >
                  <div className="flex-row space-between w-100" style={{ alignItems: 'flex-start' }}>
                    <div>
                      <b>{p.name}</b> <span className="code">· {p.tracks.length} трек(ов)</span>
                      {p.is_active && <span className="badge parcel-active">Выбрана</span>}
                    </div>
                    <div className="parcel-actions" onClick={e => e.stopPropagation()}>
                      {user.is_admin && !p.is_active && (
                        <button className="primary small" onClick={async () => {
                          try {
                            await api(`/api/parcels/${p.id}/activate`, { method: "POST" });
                            await loadParcels();
                          } catch (e) { showAlert("Ошибка: " + e.message, "Ошибка"); }
                        }}>Выбрать</button>
                      )}
                      {user.is_admin && (
                        <>
                          <button className="secondary small" onClick={async () => {
                            try {
                              await api(`/api/parcels/${p.id}/complete`, { method: "POST" });
                              if (activeParcel?.id === p.id) setActiveParcel(null);
                              await loadParcels();
                            } catch (e) { showAlert("Ошибка: " + e.message, "Ошибка"); }
                          }}>Закрыть</button>

                          <button className="btn-export small" onClick={() => exportParcel(p.id, p.name)} disabled={exporting === p.id}>
                            {exporting === p.id ? "Ждите..." : "Экспорт"}
                          </button>

                          <button className="danger small" onClick={async () => {
                            const confirm = await showPrompt(`Вы собираетесь удалить партию «${p.name}». Все треки в ней также будут удалены.`,
                              "Удаление партии", { isDanger: true, hint: "Введите название партии:", placeholder: p.name });
                            if (confirm === p.name) {
                              try {
                                await api(`/api/parcels/${p.id}`, { method: "DELETE" });
                                if (activeParcel?.id === p.id) setActiveParcel(null);
                                await loadParcels();
                              } catch (e) { showAlert("Ошибка: " + e.message, "Ошибка"); }
                            }
                          }}>Удалить</button>
                        </>
                      )}
                    </div>
                  </div>

                  {Object.keys(recStats).length > 0 && (
                    <div style={{ width: '100%', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                      <div className="flex-row space-between" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        <span>Сводка по получателям</span>
                        <span style={{ transform: expandedParcels[p.id] ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
                      </div>
                      <div style={{ overflow: 'hidden', transition: 'max-height 0.3s ease-in-out, opacity 0.3s ease-in-out', maxHeight: expandedParcels[p.id] ? '500px' : '0px', opacity: expandedParcels[p.id] ? 1 : 0 }}>
                        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {Object.entries(recStats).map(([name, stats]) => (
                            <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', cursor: 'pointer', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                              onClick={(e) => { e.stopPropagation(); setUserTracksModal({ name, tracks: stats.tracks }); }}>
                              <span style={{ fontWeight: '500' }}>{name}</span>
                              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{stats.count} трек(ов) · {stats.price.toFixed(2)} Br</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <Pagination currentPage={safePageActive} totalPages={Math.ceil(activeList.length / perPageActive)} onPageChange={setPageActive} perPage={perPageActive} onPerPageChange={(v) => { setPerPageActive(v); setPageActive(1); }} />
        </div>
      </div>

      <div className="smooth-details mt-32">
        <div className="smooth-details-header" onClick={() => setIsClosedListOpen(!isClosedListOpen)}>
          <span>Архив закрытых партий</span>
          <span className={`smooth-chevron ${isClosedListOpen ? 'open' : ''}`}>▼</span>
        </div>
        <div className={`smooth-details-content ${isClosedListOpen ? 'open' : ''}`}>
          <ul>
            {paginatedClosed.length === 0 ? (
              <li style={{ justifyContent: 'center' }}><span className="muted">Закрытых партий не найдено</span></li>
            ) : paginatedClosed.map(p => (
              <li key={p.id} className="flex-col">
                <div className="flex-row space-between w-100 mb-12">
                  <div>
                    <b>{p.name}</b> <span className="code">· {p.tracks.length} трек(ов)</span>
                    <span className="badge archive">Архив</span>
                  </div>
                  <div className="parcel-actions">
                    {user.is_admin && (
                      <button className="secondary small" onClick={async () => {
                        try {
                          await api(`/api/parcels/${p.id}/reopen`, { method: "POST" });
                          await loadParcels();
                        } catch (e) { showAlert("Ошибка: " + e.message, "Ошибка"); }
                      }}>Открыть</button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <Pagination currentPage={safePageClosed} totalPages={Math.ceil(closedList.length / perPageClosed)} onPageChange={setPageClosed} perPage={perPageClosed} onPerPageChange={(v) => { setPerPageClosed(v); setPageClosed(1); }} />
        </div>
      </div>

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

          <label>Вложение *</label>
          <input value={trAttachment} onChange={e => setTrAttachment(e.target.value)} placeholder="Одежда" required />

          <div className="row-2">
            <div>
              <label>Ед. изм. *</label>
              <Autocomplete value={trUnit} onChange={val => setTrUnit(val)} placeholder="Например, шт" items={UNITS_LIST} />
            </div>
            <div>
              <label>Общая стоимость (Br) *</label>
              <input type="number" step="0.01" value={trPrice} onChange={e => setTrPrice(e.target.value)} required />
            </div>
          </div>
          <label>Вес (г)</label>
          <input type="number" value={trWeight} onChange={e => setTrWeight(e.target.value)} />
          <label>Ссылка на товар</label>
          <input value={trUrl} onChange={e => setTrUrl(e.target.value)} placeholder="https://..." type="text" />

          <div className="bg-box mt-16">
            <label className="mt-0">Распределение по получателям *</label>
            <div className="flex-col gap-8">
              {allocations.map((a, i) => (
                <div key={i} className="flex-row gap-8 center">
                  <Autocomplete value={a.name} onChange={val => updateAlloc(i, 'name', val)} />
                  <input type="number" min="1" value={a.qty} onChange={e => updateAlloc(i, 'qty', e.target.value)} onFocus={e => e.target.select()} style={{ width: '70px' }} />
                  <button className="danger small" onClick={() => removeAlloc(i)}>✕</button>
                </div>
              ))}
            </div>
            <button type="button" className="secondary small mt-8" onClick={addAlloc}>+ Добавить получателя</button>
          </div>
          <label>Комментарий</label>
          <input value={trComment} onChange={e => setTrComment(e.target.value)} placeholder="Хрупкое" />
          <button className="primary w-100 mt-20" onClick={handleAddTrack} disabled={isSubmitting}>
            {isSubmitting ? "Сохранение..." : "Сохранить трек"}
          </button>
        </div>
      )}

      <h2 className="section-title mt-32">Треки выбранной партии</h2>
      <div className="filter-row">
        <input value={trackSearch} onChange={e => { setTrackSearch(e.target.value); setPageTracks(1); }} placeholder="Поиск по треку/получателю..." />
        <select value={trackStatus} onChange={e => { setTrackStatus(e.target.value); setPageTracks(1); }}>
          <option value="">Все статусы</option>
          {STATUS_LIST.map(s => (
            <option key={s} value={s}>{getStatusLabel(s)}</option>
          ))}
        </select>
      </div>

      <ul>
        {paginatedTracks.length === 0 ? (
          <li style={{ justifyContent: 'center' }}><span className="muted">Треков нет</span></li>
        ) : paginatedTracks.map(t => (
          <li key={t.id} className="track-card" onClick={() => user.is_admin && openEdit(t, activeParcel?.id === t.parcel_id)}>
            <div className="meta">
              <span className="name">{t.attachment} · {t.recipients.map(r => `${r.name} (${r.quantity})`).join(", ")}</span>
              <span className="code">
                {t.barcode || "Без трека"} ·
                {t.my_price != null ? t.my_price.toFixed(2) : (t.price != null ? t.price.toFixed(2) : "—")} Br ·
                {t.weight_g != null ? t.weight_g + " г" : "вес ?"}
              </span>
            </div>
            <div className="flex-row gap-8" style={{ alignItems: 'center' }}>
              {t.url && (
                <button className="link-icon-btn primary" onClick={(e) => { e.stopPropagation(); window.open(t.url, "_blank"); }} title="Открыть ссылку">↗</button>
              )}
              <span className={`badge ${t.status}`}>{getStatusLabel(t.status)}</span>
            </div>
          </li>
        ))}
      </ul>
      <Pagination currentPage={safePageTracks} totalPages={Math.ceil(filteredTracks.length / perPageTracks)} onPageChange={setPageTracks} perPage={perPageTracks} onPerPageChange={(v) => { setPerPageTracks(v); setPageTracks(1); }} />

      {isNewParcelModalOpen && (
        <div className="modal" onClick={(e) => e.target === e.currentTarget && setIsNewParcelModalOpen(false)}>
          <div className="modal-content">
            <h3>Новая партия</h3>
            <label>Название партии</label>
            <input value={newParcelName} onChange={e => setNewParcelName(e.target.value)} placeholder="Например, Ноябрь 26" autoFocus />
            <div className="btn-row">
              <button className="primary" onClick={handleCreateParcel}>Создать</button>
              <button className="secondary" onClick={() => setIsNewParcelModalOpen(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      {editTarget && (
        <EditTrackModal
          track={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={() => { setEditTarget(null); loadParcels(); }}
          showAlert={showAlert}
          showPrompt={showPrompt}
          hideParcelSelect={true}
          onShowHistory={(t) => setHistoryTarget({ id: t.id, name: t.attachment })}
        />
      )}

      {userTracksModal && (
        <div className="modal" onClick={(e) => e.target === e.currentTarget && setUserTracksModal(null)}>
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="flex-row space-between mb-16">
              <h3>Треки получателя: {userTracksModal.name}</h3>
              <button className="secondary small" onClick={() => setUserTracksModal(null)}>Закрыть</button>
            </div>
            <ul>
              {userTracksModal.tracks.map(t => (
                <li key={t.id} className="track-card" onClick={() => { setUserTracksModal(null); openEdit(t, activeParcel?.id === t.parcel_id); }}>
                  <div className="meta">
                    <span className="name">{t.attachment}</span>
                    <span className="code">
                      {t.barcode || "Без трека"} ·
                      {t.price != null ? t.price.toFixed(2) : "—"} Br ·
                      {t.weight_g != null ? t.weight_g + " г" : "вес ?"}
                    </span>
                  </div>
                  <div className="flex-row gap-8" style={{ alignItems: 'center' }}>
                    {t.url && (
                      <button className="link-icon-btn primary" onClick={(e) => { e.stopPropagation(); window.open(t.url, "_blank"); }} title="Открыть ссылку">↗</button>
                    )}
                    <span className={`badge ${t.status}`}>{getStatusLabel(t.status)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {historyTarget && (
        <TrackHistoryModal
          trackId={historyTarget.id}
          trackName={historyTarget.name}
          onClose={() => setHistoryTarget(null)}
          showAlert={showAlert}
        />
      )}
    </div>
  );
}