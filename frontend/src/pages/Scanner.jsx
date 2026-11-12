import { useState, useEffect, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { api } from '../api';

export default function Scanner({ user, showAlert }) {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState("");
  const [track, setTrack] = useState(null);
  const [weighMode, setWeighMode] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  
  const videoRef = useRef(null);
  const readerRef = useRef(null);

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      gain.gain.value = 0.1;
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch(e) {}
  };

  const startScan = async () => {
    readerRef.current = new BrowserMultiFormatReader();
    try {
      await readerRef.current.decodeFromVideoDevice(null, videoRef.current, async (result, err) => {
        if (result) {
          const code = result.getText();
          setScanResult(`Сканирую: ${code}...`);
          try {
            const res = await api(`/api/scan?barcode=${encodeURIComponent(code)}`, { method: "POST" });
            const all = await api("/api/tracks");
            const found = all.find(x => x.id === res.id);
            setTrack(found);
            setScanResult(`Найден: ${found.barcode}`);
            playBeep();
            if (navigator.vibrate) navigator.vibrate(80);
          } catch(e) {
            setScanResult(`Трек не найден: ${code}`);
            if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
          }
        }
      });
      setScanning(true);
    } catch (e) { showAlert("Ошибка камеры: " + e.message, "Ошибка"); }
  };

  const stopScan = () => {
    if (readerRef.current) readerRef.current.reset();
    setScanning(false);
  };

  useEffect(() => { return () => stopScan(); }, []);

  const handleIssue = async () => {
    await api(`/api/tracks/${track.id}/issue`, { method: "POST" });
    setTrack(null);
    setScanResult("Выдано");
    playBeep();
  };

  const handleWeigh = async () => {
    const val = parseInt(weightInput, 10);
    if (!val || val <= 0) return showAlert("Введите вес в граммах");
    await api(`/api/tracks/${track.id}/weigh`, { method: "POST", body: JSON.stringify({ weight_g: val }) });
    setTrack({ ...track, weight_g: val });
    setWeighMode(false);
    setWeightInput("");
  };

  const handleHide = () => {
    setTrack(null);
    stopScan();
  };

  return (
    <div className="tab-panel active">
      <div className="scanner">
        <video ref={videoRef} playsInline></video>
        <div className="scan-result">{scanResult || "Наведите камеру на трек-номер"}</div>
        <div className="btn-row center">
          {!scanning ? (
            <button className="primary" onClick={startScan}>Включить камеру</button>
          ) : (
            <button className="danger" onClick={stopScan}>Выключить</button>
          )}
        </div>
      </div>

      {track && (
        <div className="scan-card">
          <div className="row"><span>Трек:</span><b>{track.barcode}</b></div>
          <div className="row"><span>Вложение:</span><b>{track.attachment}</b></div>
          <div className="row">
            <span>Получатели:</span>
            <b>{track.recipients.map(r => `${r.name} (${r.quantity} ${track.unit || "шт"})`).join(", ")}</b>
          </div>
          <div className="row"><span>Партия:</span><b>{track.parcel_name}</b></div>
          <div className="row"><span>Цена:</span><b>{track.price ? `${track.price} Br` : "—"}</b></div>
          <div className="row"><span>Вес:</span><b>{track.weight_g ? `${track.weight_g} г` : "неизвестен"}</b></div>
          <div className="row"><span>Комментарий:</span><b>{track.comment || "—"}</b></div>
          <div className="row">
            <span>Ссылка:</span>
            <b>{track.url ? <a href={track.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)' }}>Открыть товар</a> : "—"}</b>
          </div>

          {weighMode ? (
            <div className="mt-16">
              <label>Введите вес (г)</label>
              <input type="number" value={weightInput} onChange={e => setWeightInput(e.target.value)} autoFocus />
              <div className="btn-row">
                <button className="primary" onClick={handleWeigh}>Сохранить</button>
                <button className="secondary" onClick={() => setWeighMode(false)}>Отмена</button>
              </div>
            </div>
          ) : (
            <div className="btn-row">
              <button 
                className={track.status === "issued" ? "secondary" : "success"} 
                onClick={handleIssue} 
                disabled={track.status === "issued"}
                style={{ opacity: track.status === "issued" ? 0.5 : 1 }}
              >
                {track.status === "issued" ? "Уже выдан" : "Выдать"}
              </button>
              {user.is_admin && (
                <button className="primary" onClick={() => { setWeighMode(true); setWeightInput(track.weight_g || ""); }}>
                  Взвесить
                </button>
              )}
              <button className="secondary" onClick={handleHide}>Скрыть</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}