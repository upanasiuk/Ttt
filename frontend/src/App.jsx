import { useState, useEffect } from 'react';
import { api, setToken, getToken } from './api';
import Modal from './components/Modal';
import Parcels from './pages/Parcels';
import Scanner from './pages/Scanner';
import Recipients from './pages/Recipients';
import Stats from './pages/Stats';
import AllTracks from './pages/AllTracks';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('parcels');
  
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  const [modalConfig, setModalConfig] = useState({ isOpen: false });

  useEffect(() => {
    const init = async () => {
      if (!getToken()) { setLoading(false); return; }
      try {
        const me = await api("/api/me");
        setUser(me);
        if (!me.is_admin) setCurrentTab('stats');
      } catch (e) {
        setToken(null);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      if (!res.ok) throw new Error("Неверный логин или пароль");
      const data = await res.json();
      setToken(data.access_token);
      setUser(data.user);
      setCurrentTab(data.user.is_admin ? 'parcels' : 'stats');
    } catch (e) { alert(e.message); }
  };

  const logout = () => { setToken(null); setUser(null); };

  const showAlert = (message, title = "Внимание") => {
    setModalConfig({ isOpen: true, type: 'alert', title, message, onConfirm: () => setModalConfig({ isOpen: false }) });
  };

  const showPrompt = (message, title, options = {}) => {
    return new Promise((resolve) => {
      setModalConfig({
        isOpen: true, type: 'prompt', title, message,
        hint: options.hint, placeholder: options.placeholder, isDanger: options.isDanger,
        onConfirm: (val) => { setModalConfig({ isOpen: false }); resolve(val); },
        onCancel: () => { setModalConfig({ isOpen: false }); resolve(null); }
      });
    });
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  if (!user) {
    return (
      <div className="auth-screen">
        <h2>Вход в систему</h2>
        <form onSubmit={handleLogin}>
          <label>Логин</label>
          <input value={loginUsername} onChange={e => setLoginUsername(e.target.value)} placeholder="Введите логин" autoComplete="username" />
          <label>Пароль</label>
          <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Введите пароль" autoComplete="current-password" />
          <button type="submit" className="primary w-100 mt-24 p-14">Войти</button>
        </form>
      </div>
    );
  }

  return (
    <>
      <div className="user-header">
        <div>Вы вошли как: <b>{user.name}</b></div>
        <div className="flex-row gap-8">
          <button className="danger small" onClick={logout}>Выйти</button>
        </div>
      </div>

      <header>
        <h1>Трекер посылок</h1>
        <nav className="tabs">
          {user.is_admin && (
            <>
              <button className={`tab ${currentTab === 'scanner' ? 'active' : ''}`} onClick={() => setCurrentTab('scanner')}>Сканер</button>
              <button className={`tab ${currentTab === 'parcels' ? 'active' : ''}`} onClick={() => setCurrentTab('parcels')}>Партии</button>
              <button className={`tab ${currentTab === 'all_tracks' ? 'active' : ''}`} onClick={() => setCurrentTab('all_tracks')}>Все треки</button>
              <button className={`tab ${currentTab === 'recipients' ? 'active' : ''}`} onClick={() => setCurrentTab('recipients')}>Получатели</button>
            </>
          )}
          {!user.is_admin && (
            <button className={`tab ${currentTab === 'stats' ? 'active' : ''}`} onClick={() => setCurrentTab('stats')}>Моя статистика</button>
          )}
        </nav>
      </header>

      <main>
        {currentTab === 'parcels' && <Parcels user={user} showAlert={showAlert} showPrompt={showPrompt} />}
        {currentTab === 'all_tracks' && <AllTracks user={user} />}
        {currentTab === 'scanner' && <Scanner user={user} showAlert={showAlert} />}
        {currentTab === 'recipients' && <Recipients user={user} showAlert={showAlert} showPrompt={showPrompt} />}
        {currentTab === 'stats' && <Stats user={user} />}
      </main>

      <Modal {...modalConfig} />
    </>
  );
}