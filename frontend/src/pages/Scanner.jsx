import { useState, useEffect, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { api } from '../api';

export default function Scanner({ user, showAlert }) {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState("");
  const [track, setTrack] = useState(null);
  const videoRef = useRef(null);
  const readerRef = useRef(null);

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
          <div className="row"><span>Получатели:</span><b>{track.recipients.map(r => r.name).join(", ")}</b></div>
          <div className="row"><span>Цена:</span><b>{track.price ? `${track.price} Br` : "—"}</b></div>
          <div className="row"><span>Вес:</span><b>{track.weight_g ? `${track.weight_g} г` : "неизвестен"}</b></div>
          <div className="btn-row">
            <button className="success" onClick={async () => { await api(`/api/tracks/${track.id}/issue`, { method: "POST" }); setTrack(null); setScanResult("Выдано"); }}>Выдать</button>
          </div>
        </div>
      )}
    </div>
  );
}