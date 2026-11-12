/**
 * Трекер посылок - Frontend Application
 */

/* =========================================
   STATE & CONFIG
   ========================================= */
const state = {
  user: null,
  token: localStorage.getItem("token"),
  apiBase: "",
  parcels: [],
  activeParcel: null,
  recipients: [],
  allTracks: [],
  myStats: null,
  scanning: false,
  codeReader: null,
  currentAdminStatsRecipientId: null,
  adminPasswordTargetId: null,
  weighTarget: null,
  editTarget: null,
  itemsPerPage: { active: 5, closed: 5, parcelTracks: 5, allTracks: 5, recipients: 5 },
  page: { active: 1, closed: 1, parcelTracks: 1, allTracks: 1, recipients: 1 }
};

const STATUS_LABELS = {
  pending: "Ожидает отправки",
  in_transit: "В пути к CARGO",
  received_cargo: "Получен CARGO",
  issued: "Выдан",
};

/* =========================================
   DOM ELEMENTS
   ========================================= */
const DOM = {
  setupSection: document.getElementById("setupSection"),
  setupForm: document.getElementById("setupForm"),
  loginSection: document.getElementById("loginSection"),
  loginForm: document.getElementById("loginForm"),
  appSection: document.getElementById("appSection"),
  currentUserName: document.getElementById("currentUserName"),
  logoutBtn: document.getElementById("logoutBtn"),

  alertModal: document.getElementById("alertModal"),
  alertTitle: document.getElementById("alertTitle"),
  alertMessage: document.getElementById("alertMessage"),
  alertOkBtn: document.getElementById("alertOkBtn"),

  promptModal: document.getElementById("promptModal"),
  promptModalContent: document.getElementById("promptModalContent"),
  promptTitle: document.getElementById("promptTitle"),
  promptMessage: document.getElementById("promptMessage"),
  promptHint: document.getElementById("promptHint"),
  promptInput: document.getElementById("promptInput"),
  promptOkBtn: document.getElementById("promptOkBtn"),
  promptCancelBtn: document.getElementById("promptCancelBtn"),

  toastContainer: document.getElementById("toastContainer"),

  video: document.getElementById("video"),
  scanResult: document.getElementById("scanResult"),
  startScanBtn: document.getElementById("startScanBtn"),
  stopScanBtn: document.getElementById("stopScanBtn"),
  scanCard: document.getElementById("scanCard"),
  cardBarcode: document.getElementById("cardBarcode"),
  cardAttachment: document.getElementById("cardAttachment"),
  cardRecipients: document.getElementById("cardRecipients"),
  cardParcel: document.getElementById("cardParcel"),
  cardPrice: document.getElementById("cardPrice"),
  cardWeight: document.getElementById("cardWeight"),
  cardComment: document.getElementById("cardComment"),
  cardUrl: document.getElementById("cardUrl"),
  cardStatus: document.getElementById("cardStatus"),
  issueBtn: document.getElementById("issueBtn"),
  weighBtn: document.getElementById("weighBtn"),
  closeCardBtn: document.getElementById("closeCardBtn"),

  openNewParcelBtn: document.getElementById("openNewParcelBtn"),
  newParcelModal: document.getElementById("newParcelModal"),
  newParcelName: document.getElementById("newParcelName"),
  saveNewParcelBtn: document.getElementById("saveNewParcelBtn"),
  cancelNewParcelBtn: document.getElementById("cancelNewParcelBtn"),
  activeParcelSummary: document.getElementById("activeParcelSummary"),
  activeParcelNotice: document.getElementById("activeParcelNotice"),
  parcelSearch: document.getElementById("parcelSearch"),
  parcelSearchFieldFilter: document.getElementById("parcelSearchFieldFilter"),
  parcelSearchClosed: document.getElementById("parcelSearchClosed"),
  parcelSearchClosedFieldFilter: document.getElementById("parcelSearchClosedFieldFilter"),
  parcelListActive: document.getElementById("parcelListActive"),
  parcelListClosed: document.getElementById("parcelListClosed"),

  addTrackBtn: document.getElementById("addTrackBtn"),
  trBarcodeToggleBtn: document.getElementById("trBarcodeToggleBtn"),
  trBarcodeBlock: document.getElementById("trBarcodeBlock"),
  trBarcode: document.getElementById("trBarcode"),
  trAttachment: document.getElementById("trAttachment"),
  trUnitSelect: document.getElementById("trUnitSelect"),
  trUnitCustom: document.getElementById("trUnitCustom"),
  trPrice: document.getElementById("trPrice"),
  trWeight: document.getElementById("trWeight"),
  trComment: document.getElementById("trComment"),
  trUrl: document.getElementById("trUrl"),
  allocationsContainer: document.getElementById("allocationsContainer"),
  addAllocBtn: document.getElementById("addAllocBtn"),
  activeTracksSearch: document.getElementById("activeTracksSearch"),
  activeTracksFilter: document.getElementById("activeTracksFilter"),
  activeTracksList: document.getElementById("activeTracksList"),
  trackSearch: document.getElementById("trackSearch"),
  allTracksFilter: document.getElementById("allTracksFilter"),
  trackList: document.getElementById("trackList"),

  recipientForm: document.getElementById("recipientForm"),
  recipientName: document.getElementById("recipientName"),
  recipientUsername: document.getElementById("recipientUsername"),
  recipientPassword: document.getElementById("recipientPassword"),
  recipientList: document.getElementById("recipientList"),
  adminStatsSection: document.getElementById("adminStatsSection"),
  adminStatsName: document.getElementById("adminStatsName"),
  closeAdminStatsBtn: document.getElementById("closeAdminStatsBtn"),
  adminStatsParcelFilter: document.getElementById("adminStatsParcelFilter"),
  adminStatsBox: document.getElementById("adminStatsBox"),

  myStatsParcelFilter: document.getElementById("myStatsParcelFilter"),
  myStatsStatusFilter: document.getElementById("myStatsStatusFilter"),
  myStatsBox: document.getElementById("myStatsBox"),

  editModal: document.getElementById("editModal"),
  editBarcodeLabel: document.getElementById("editBarcodeLabel"),
  editBarcode: document.getElementById("editBarcode"),
  editAttachment: document.getElementById("editAttachment"),
  editUnitSelect: document.getElementById("editUnitSelect"),
  editUnitCustom: document.getElementById("editUnitCustom"),
  editPrice: document.getElementById("editPrice"),
  editWeight: document.getElementById("editWeight"),
  editComment: document.getElementById("editComment"),
  editUrl: document.getElementById("editUrl"),
  editStatus: document.getElementById("editStatus"),
  editParcel: document.getElementById("editParcel"),
  editParcelHint: document.getElementById("editParcelHint"),
  editAllocationsContainer: document.getElementById("editAllocationsContainer"),
  editSave: document.getElementById("editSave"),
  editCancel: document.getElementById("editCancel"),
  editDeleteBtn: document.getElementById("editDeleteBtn"),

  weighModal: document.getElementById("weighModal"),
  weighBarcode: document.getElementById("weighBarcode"),
  weighInput: document.getElementById("weighInput"),
  weighSave: document.getElementById("weighSave"),
  weighCancel: document.getElementById("weighCancel"),

  openPasswordModalBtn: document.getElementById("openPasswordModalBtn"),
  passwordModal: document.getElementById("passwordModal"),
  selfPasswordBlock: document.getElementById("selfPasswordBlock"),
  oldPasswordInput: document.getElementById("oldPasswordInput"),
  newPasswordInput: document.getElementById("newPasswordInput"),
  savePasswordBtn: document.getElementById("savePasswordBtn"),
  cancelPasswordBtn: document.getElementById("cancelPasswordBtn"),
  adminPasswordModal: document.getElementById("adminPasswordModal"),
  adminPwdUserName: document.getElementById("adminPwdUserName"),
  adminNewPasswordInput: document.getElementById("adminNewPasswordInput"),
  saveAdminPasswordBtn: document.getElementById("saveAdminPasswordBtn"),
  cancelAdminPasswordBtn: document.getElementById("cancelAdminPasswordBtn"),

  perPageActive: document.getElementById("perPageActive"),
  perPageClosed: document.getElementById("perPageClosed"),
  perPageParcelTracks: document.getElementById("perPageParcelTracks"),
  perPageAllTracks: document.getElementById("perPageAllTracks"),
  perPageRecipients: document.getElementById("perPageRecipients"),
  paginationActive: document.getElementById("paginationActive"),
  paginationClosed: document.getElementById("paginationClosed"),
  paginationParcelTracks: document.getElementById("paginationParcelTracks"),
  paginationAllTracks: document.getElementById("paginationAllTracks"),
  paginationRecipients: document.getElementById("paginationRecipients"),
  btnPrevActive: document.getElementById("btnPrevActive"),
  btnNextActive: document.getElementById("btnNextActive"),
  pageInfoActive: document.getElementById("pageInfoActive"),
  btnPrevClosed: document.getElementById("btnPrevClosed"),
  btnNextClosed: document.getElementById("btnNextClosed"),
  pageInfoClosed: document.getElementById("pageInfoClosed"),
  btnPrevParcelTracks: document.getElementById("btnPrevParcelTracks"),
  btnNextParcelTracks: document.getElementById("btnNextParcelTracks"),
  pageInfoParcelTracks: document.getElementById("pageInfoParcelTracks"),
  btnPrevAllTracks: document.getElementById("btnPrevAllTracks"),
  btnNextAllTracks: document.getElementById("btnNextAllTracks"),
  pageInfoAllTracks: document.getElementById("pageInfoAllTracks"),
  btnPrevRecipients: document.getElementById("btnPrevRecipients"),
  btnNextRecipients: document.getElementById("btnNextRecipients"),
  pageInfoRecipients: document.getElementById("pageInfoRecipients"),
};

/* =========================================
   UI HELPERS
   ========================================= */
function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<span class="toast-icon">✓</span> <span>${message}</span>`;
  DOM.toastContainer.appendChild(toast);
  
  void toast.offsetWidth;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function customAlert(msg, title = "Внимание") {
  return new Promise((resolve) => {
    DOM.alertTitle.textContent = title;
    DOM.alertTitle.style.color = title === "Ошибка" ? "var(--accent-danger)" : "var(--accent-primary)";
    DOM.alertMessage.textContent = msg;
    DOM.alertModal.classList.remove("hidden");
    
    const handleOk = () => { 
      DOM.alertModal.classList.add("hidden"); 
      DOM.alertOkBtn.removeEventListener("click", handleOk); 
      resolve(); 
    };
    DOM.alertOkBtn.addEventListener("click", handleOk);
  });
}

function customPrompt(msg, title = "Подтверждение", options = {}) {
  return new Promise((resolve) => {
    const isDanger = options.isDanger || false;
    
    DOM.promptModalContent.style.borderColor = isDanger ? "var(--accent-danger)" : "var(--border-color)";
    DOM.promptTitle.style.color = isDanger ? "var(--accent-danger)" : "var(--accent-primary)";
    DOM.promptOkBtn.style.background = isDanger ? "var(--accent-danger)" : "var(--accent-primary)";
    DOM.promptOkBtn.style.borderColor = isDanger ? "var(--accent-danger)" : "var(--accent-primary)";
    DOM.promptOkBtn.style.color = isDanger ? "white" : "#1a1a1a";

    if (isDanger) {
      DOM.promptInput.classList.add("danger-input");
    } else {
      DOM.promptInput.classList.remove("danger-input");
    }

    // Принудительно показываем подсказку, если это опасное действие
    if (isDanger) {
      DOM.promptHint.textContent = options.hint || "Для подтверждения введите текст:";
      DOM.promptHint.style.display = "block";
    } else {
      DOM.promptHint.textContent = options.hint || "";
      DOM.promptHint.style.display = options.hint ? "block" : "none";
    }
    
    DOM.promptTitle.textContent = title;
    DOM.promptMessage.textContent = msg;
    DOM.promptInput.value = "";
    
    DOM.promptInput.type = "text";
    DOM.promptInput.setAttribute("autocomplete", "new-password");
    DOM.promptInput.setAttribute("autocapitalize", "off");
    DOM.promptInput.setAttribute("spellcheck", "false");
    DOM.promptInput.placeholder = options.placeholder || "";
    
    DOM.promptModal.classList.remove("hidden");
    DOM.promptInput.focus();

    const handleOk = () => { DOM.promptModal.classList.add("hidden"); cleanup(); resolve(DOM.promptInput.value); };
    const handleCancel = () => { DOM.promptModal.classList.add("hidden"); cleanup(); resolve(null); };
    const handleKey = (e) => {
      if (e.key === "Enter") handleOk();
      if (e.key === "Escape") handleCancel();
    };
    const cleanup = () => {
      DOM.promptOkBtn.removeEventListener("click", handleOk);
      DOM.promptCancelBtn.removeEventListener("click", handleCancel);
      DOM.promptInput.removeEventListener("keydown", handleKey);
    };
    DOM.promptOkBtn.addEventListener("click", handleOk);
    DOM.promptCancelBtn.addEventListener("click", handleCancel);
    DOM.promptInput.addEventListener("keydown", handleKey);
  });
}

/* =========================================
   API CLIENT
   ========================================= */
async function api(path, opts = {}) {
  const headers = { "Content-Type": "application/json" };
  if (state.token) headers["Authorization"] = `Bearer ${state.token}`;
  
  const res = await fetch(state.apiBase + path, { headers, ...opts });
  
  const newToken = res.headers.get("X-Refresh-Token");
  if (newToken) {
    state.token = newToken;
    localStorage.setItem("token", state.token);
  }

  if (res.status === 401) { logout(); throw new Error("Unauthorized"); }
  if (!res.ok) {
    let errMsg = await res.text();
    try { const errObj = JSON.parse(errMsg); if (errObj.detail) errMsg = errObj.detail; } catch(e) {}
    throw new Error(errMsg);
  }
  return res.json();
}

async function loadConfig() {
  try {
    const res = await fetch("/api/config");
    const cfg = await res.json();
    state.apiBase = cfg.backend_url && cfg.backend_url !== window.location.origin 
      ? cfg.backend_url.replace(/\/$/, "") : "";
  } catch { state.apiBase = ""; }
}

/* =========================================
   AUTH & INIT
   ========================================= */
async function checkAuth() {
  try {
    const res = await fetch(state.apiBase + "/api/check_setup");
    const data = await res.json();
    if (!data.is_setup) return showSetup();
  } catch (e) { console.error(e); }

  if (!state.token) return showLogin();
  try {
    state.user = await api("/api/me");
    showApp();
  } catch (e) { showLogin(); }
}

function showSetup() { DOM.setupSection.style.display = "block"; DOM.loginSection.style.display = "none"; DOM.appSection.style.display = "none"; }
function showLogin() { DOM.setupSection.style.display = "none"; DOM.loginSection.style.display = "block"; DOM.appSection.style.display = "none"; state.token = null; state.user = null; localStorage.removeItem("token"); }

function showApp() {
  DOM.setupSection.style.display = "none";
  DOM.loginSection.style.display = "none";
  DOM.appSection.style.display = "block";
  DOM.currentUserName.textContent = state.user.name;

  const isAdmin = state.user.is_admin;
  
  document.getElementById("tabScanBtn").style.display = isAdmin ? "block" : "none";
  document.getElementById("tabRecipientsBtn").style.display = isAdmin ? "block" : "none";
  document.getElementById("tabMyStatsBtn").style.display = isAdmin ? "none" : "block";
  document.getElementById("parcelAdminHeader").style.display = isAdmin ? "flex" : "none";
  document.getElementById("addTrackFormBlock").style.display = isAdmin ? "block" : "none";
  DOM.selfPasswordBlock.style.display = "block";

  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
  
  if (isAdmin) {
    document.querySelector('[data-tab="parcels"]').classList.add("active");
    document.getElementById("tab-parcels").classList.add("active");
  } else {
    document.querySelector('[data-tab="my_stats"]').classList.add("active");
    document.getElementById("tab-my_stats").classList.add("active");
  }

  Object.keys(state.page).forEach(k => state.page[k] = 1);

  if (DOM.allocationsContainer.children.length === 0) {
    createAllocRow(DOM.allocationsContainer);
  }

  refreshAll();
}

function logout() { showLogin(); }

/* =========================================
   RENDER: RECIPIENTS
   ========================================= */
async function loadRecipients() {
  state.recipients = await api("/api/recipients");
  renderRecipientsList();
}

function renderRecipientsList() {
  const listEl = DOM.recipientList;
  listEl.innerHTML = "";
  
  if (!state.recipients.length) {
    listEl.innerHTML = '<li style="justify-content:center"><span class="muted">Нет пользователей</span></li>';
    DOM.paginationRecipients.classList.add("hidden");
    return;
  }

  const limit = state.itemsPerPage.recipients;
  const currentPage = state.page.recipients;
  const totalPages = Math.ceil(state.recipients.length / limit);
  if (currentPage > totalPages) state.page.recipients = totalPages || 1;

  const start = (state.page.recipients - 1) * limit;
  const list = state.recipients.slice(start, start + limit);

  list.forEach(r => {
    const li = document.createElement("li");
    li.style.cursor = "pointer";
    
    const meta = document.createElement("div");
    meta.className = "meta";
    const adminBadge = r.is_admin ? '<span class="badge admin-badge">Админ</span>' : '';
    meta.innerHTML = `
      <span class="name">${r.name} ${adminBadge}</span>
      <span class="code">Логин: ${r.username || "—"}</span>
      <span class="code muted" style="font-size: 11px;">нажмите для статистики</span>
    `;

    const btns = document.createElement("div");
    btns.style.display = "flex"; btns.style.gap = "8px"; btns.style.alignItems = "center";

    if (r.id !== state.user.id) {
      const roleLabel = document.createElement("label");
      roleLabel.className = "role-switch";
      roleLabel.innerHTML = `
        <input type="checkbox" ${r.is_admin ? 'checked' : ''}>
        <span class="slider"></span>
        <span>Админ</span>
      `;
      const checkbox = roleLabel.querySelector("input");
      checkbox.onchange = async (e) => {
        e.stopPropagation();
        const isTurningOn = checkbox.checked;
        checkbox.checked = !isTurningOn;
        
        const action = isTurningOn ? "выдать" : "отозвать";
        const confirm = await customPrompt(
          `Вы уверены, что хотите ${action} права администратора пользователю "${r.name}"?`,
          isTurningOn ? "Выдача прав" : "Отзыв прав",
          { isDanger: !isTurningOn, hint: "Для подтверждения введите имя пользователя:", placeholder: r.name }
        );
        
        if (confirm !== r.name) {
          if (confirm !== null) customAlert("Имя не совпадает. Действие отменено.", "Ошибка");
          return;
        }
        
        try {
          const endpoint = isTurningOn ? "promote" : "demote";
          await api(`/api/recipients/${r.id}/${endpoint}`, { method: "POST" });
          showToast(`Права администратора ${isTurningOn ? 'выданы' : 'отозваны'}`);
          await loadRecipients();
        } catch (err) {
          customAlert("Ошибка: " + err.message, "Ошибка");
          checkbox.checked = !isTurningOn;
        }
      };
      btns.appendChild(roleLabel);

      if (state.user.id === 1) {
        const pwdBtn = document.createElement("button");
        pwdBtn.className = "secondary small";
        pwdBtn.textContent = "Пароль";
        pwdBtn.onclick = (e) => {
          e.stopPropagation();
          state.adminPasswordTargetId = r.id;
          DOM.adminPwdUserName.textContent = r.name;
          DOM.adminNewPasswordInput.value = "";
          DOM.adminPasswordModal.classList.remove("hidden");
        };
        btns.appendChild(pwdBtn);

        const delBtn = document.createElement("button");
        delBtn.className = "danger small";
        delBtn.textContent = "Удалить";
        delBtn.onclick = async (e) => {
          e.stopPropagation();
          const confirmName = await customPrompt(
            `ВНИМАНИЕ! Вы собираетесь удалить получателя "${r.name}".\nЕго треки останутся в архиве, но он больше не сможет войти.`,
            "Удаление получателя",
            { isDanger: true, hint: "Для подтверждения введите имя получателя:", placeholder: r.name }
          );
          if (confirmName !== r.name) {
            if (confirmName !== null) customAlert("Имя не совпадает.", "Ошибка");
            return;
          }
          try {
            await api(`/api/recipients/${r.id}`, { method: "DELETE" });
            await loadRecipients();
          } catch (err) { customAlert("Ошибка: " + err.message, "Ошибка"); }
        };
        btns.appendChild(delBtn);
      }
    }

    li.append(meta, btns);
    li.onclick = () => showAdminStats(r.id, r.name);
    listEl.appendChild(li);
  });

  updatePaginationUI("recipients", totalPages, DOM.paginationRecipients, DOM.pageInfoRecipients, DOM.btnPrevRecipients, DOM.btnNextRecipients);
}

/* =========================================
   RENDER: PARCELS
   ========================================= */
async function loadParcels() {
  state.parcels = await api("/api/parcels");
  
  if (state.user.is_admin) {
    state.activeParcel = state.parcels.find(p => p.is_active) || null;
  } else {
    state.parcels = state.parcels.filter(p => p.tracks.length > 0);
    if (!state.activeParcel || !state.parcels.find(p => p.id === state.activeParcel.id)) {
      state.activeParcel = state.parcels.find(p => p.is_active) || state.parcels[0] || null;
    }
  }

  state.parcels.sort((a, b) => {
    if (a.status === "completed" && b.status !== "completed") return 1;
    if (a.status !== "completed" && b.status === "completed") return -1;
    return b.id - a.id;
  });

  renderParcelList();
  updateActiveParcelUI();
  renderActiveTracks();
}

function updateActiveParcelUI() {
  if (!state.activeParcel) {
    DOM.activeParcelSummary.textContent = "(партия не выбрана)";
    DOM.activeParcelSummary.style.color = "var(--accent-danger)";
    DOM.activeParcelNotice.innerHTML = '<span style="color: var(--accent-danger);">Сначала выберите партию выше</span>';
    return;
  }
  DOM.activeParcelSummary.textContent = `(выбрана: ${state.activeParcel.name} · ${state.activeParcel.tracks.length} шт.)`;
  DOM.activeParcelSummary.style.color = "var(--accent-success)";
  DOM.activeParcelNotice.innerHTML = `Трек будет добавлен в: <span class="accent-parcel-name">${state.activeParcel.name}</span>`;
}

function renderParcelList() {
  const activeQuery = DOM.parcelSearch.value.trim().toLowerCase();
  const activeFilter = DOM.parcelSearchFieldFilter.value;
  const closedQuery = DOM.parcelSearchClosed.value.trim().toLowerCase();
  const closedFilter = DOM.parcelSearchClosedFieldFilter.value;

  const activeParcels = state.parcels.filter(p => 
    p.status !== "completed" && (!activeQuery || matchParcel(p, activeQuery, activeFilter))
  );

  const closedParcels = state.parcels.filter(p => 
    p.status === "completed" && (!closedQuery || matchParcel(p, closedQuery, closedFilter))
  );

  renderParcelGroup(activeParcels, DOM.parcelListActive, DOM.paginationActive, DOM.pageInfoActive, DOM.btnPrevActive, DOM.btnNextActive, "active");
  renderParcelGroup(closedParcels, DOM.parcelListClosed, DOM.paginationClosed, DOM.pageInfoClosed, DOM.btnPrevClosed, DOM.btnNextClosed, "closed");
}

function matchParcel(p, query, filterType) {
  const nameMatch = p.name.toLowerCase().includes(query);
  const recMatch = p.tracks.some(t => t.recipients.some(r => r.name.toLowerCase().includes(query)));
  const trackMatch = p.tracks.some(t => 
    (t.barcode && t.barcode.toLowerCase().includes(query)) || 
    (t.attachment && t.attachment.toLowerCase().includes(query))
  );

  if (filterType === "name") return nameMatch;
  if (filterType === "recipient") return recMatch;
  if (filterType === "track") return trackMatch;
  return nameMatch || recMatch || trackMatch;
}

function renderParcelGroup(list, container, paginationEl, pageInfoEl, btnPrev, btnNext, type) {
  container.innerHTML = "";
  if (!list.length) {
    container.innerHTML = `<li style="justify-content:center"><span class="muted">Нет ${type === 'active' ? 'активных' : 'закрытых'} партий</span></li>`;
    paginationEl.classList.add("hidden");
    return;
  }

  const limit = type === "active" ? state.itemsPerPage.active : state.itemsPerPage.closed;
  const currentPage = type === "active" ? state.page.active : state.page.closed;
  const totalPages = Math.ceil(list.length / limit);

  if (currentPage > totalPages) {
    if (type === "active") state.page.active = totalPages || 1;
    else state.page.closed = totalPages || 1;
    return renderParcelGroup(list, container, paginationEl, pageInfoEl, btnPrev, btnNext, type);
  }

  const start = (currentPage - 1) * limit;
  const items = list.slice(start, start + limit);

  items.forEach(p => {
    const isSelected = state.activeParcel && p.id === state.activeParcel.id;
    const li = document.createElement("li");
    li.style.flexDirection = "column";
    li.style.alignItems = "stretch";
    if (isSelected) li.style.borderColor = "var(--accent-primary)";

    const head = document.createElement("div");
    head.style.display = "flex";
    head.style.justifyContent = "space-between";
    head.style.alignItems = "flex-start";
    head.style.gap = "16px";
    head.style.flexWrap = "wrap";

    const titleWrap = document.createElement("div");
    titleWrap.style.display = "flex";
    titleWrap.style.flexDirection = "column";
    titleWrap.style.gap = "4px";

    const statusBadge = p.status === "completed" 
      ? '<span class="badge archive">Архив</span>' 
      : '<span class="badge active">В работе</span>';
    const activeBadge = p.is_active ? '<span class="badge parcel-active">Выбрана</span>' : "";

    titleWrap.innerHTML = `
      <div><b>${p.name}</b> <span class="code"> · ${p.tracks.length} трек(ов) · </span> ${statusBadge} ${activeBadge}</div>
    `;

    const btns = document.createElement("div");
    btns.className = "parcel-actions";
    btns.style.display = "flex";
    btns.style.gap = "8px";
    btns.style.flexWrap = "wrap";

    if (state.user.is_admin) {
      if (!isSelected && p.status !== "completed") {
        const btn = document.createElement("button");
        btn.className = "primary small";
        btn.textContent = "Выбрать";
        btn.onclick = async () => { await api(`/api/parcels/${p.id}/activate`, { method: "POST" }); await refreshAll(); };
        btns.appendChild(btn);
      }

      const toggleBtn = document.createElement("button");
      toggleBtn.className = "secondary small";
      toggleBtn.textContent = p.status === "completed" ? "Открыть" : "Закрыть";
      toggleBtn.onclick = async () => {
        const path = p.status === "completed" ? "reopen" : "complete";
        await api(`/api/parcels/${p.id}/${path}`, { method: "POST" });
        await refreshAll();
      };
      btns.appendChild(toggleBtn);

      const expBtn = document.createElement("button");
      expBtn.className = "btn-export";
      expBtn.textContent = "Экспорт";
      expBtn.onclick = () => {
        fetch(`${state.apiBase}/api/parcels/${p.id}/export`, { headers: { "Authorization": `Bearer ${state.token}` } })
          .then(res => {
            if (!res.ok) throw new Error("Ошибка экспорта (возможно, нет треков 'Получен CARGO')");
            return res.blob();
          })
          .then(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = `Опись_${p.name}.xlsx`; a.click();
            URL.revokeObjectURL(url);
          })
          .catch(err => customAlert(err.message, "Ошибка"));
      };
      btns.appendChild(expBtn);

      const delBtn = document.createElement("button");
      delBtn.className = "danger small";
      delBtn.textContent = "Удалить";
      delBtn.onclick = async () => {
        const confirmName = await customPrompt(
          `ВНИМАНИЕ! Удаление партии "${p.name}" и всех её треков.`,
          "Удаление партии",
          { isDanger: true, hint: "Для подтверждения введите название партии:", placeholder: p.name }
        );
        if (confirmName !== p.name) {
          if (confirmName !== null) customAlert("Название не совпадает.", "Ошибка");
          return;
        }
        try {
          await api(`/api/parcels/${p.id}`, { method: "DELETE" });
          await refreshAll();
        } catch (err) { customAlert("Ошибка: " + err.message, "Ошибка"); }
      };
      btns.appendChild(delBtn);
    } else {
      if (!isSelected) {
        const btn = document.createElement("button");
        btn.className = "primary small";
        btn.textContent = "Показать треки";
        btn.onclick = () => {
          state.activeParcel = p;
          renderParcelList();
          updateActiveParcelUI();
          renderActiveTracks();
        };
        btns.appendChild(btn);
      }
    }

    head.append(titleWrap, btns);
    li.appendChild(head);

    const recStats = {};
    p.tracks.forEach(t => {
      const qty = t.quantity || 1;
      const pricePerUnit = (t.price || 0) / qty;
      t.recipients.forEach(r => {
        if (!recStats[r.name]) recStats[r.name] = { count: 0, price: 0 };
        recStats[r.name].count += 1;
        recStats[r.name].price += (pricePerUnit * r.quantity);
      });
    });

    if (Object.keys(recStats).length > 0) {
      const summary = document.createElement("div");
      summary.className = "parcel-summary";
      summary.innerHTML = Object.entries(recStats).map(([name, s]) => 
        `<div>• ${name} · ${s.count} трек(ов) · ${s.price.toFixed(2)} Br</div>`
      ).join("");
      li.appendChild(summary);
    }

    container.appendChild(li);
  });

  updatePaginationUI(type, totalPages, paginationEl, pageInfoEl, btnPrev, btnNext);
}

/* =========================================
   RENDER: TRACKS
   ========================================= */
function renderActiveTracks() {
  if (!state.activeParcel) {
    DOM.activeTracksList.innerHTML = "";
    DOM.paginationParcelTracks.classList.add("hidden");
    return;
  }

  const filter = DOM.activeTracksFilter.value;
  const q = DOM.activeTracksSearch.value.trim().toLowerCase();

  const list = state.activeParcel.tracks.filter(t => {
    if (filter && t.status !== filter) return false;
    if (!q) return true;
    return (t.barcode && t.barcode.toLowerCase().includes(q)) ||
           (t.attachment && t.attachment.toLowerCase().includes(q)) ||
           t.recipients.some(r => r.name.toLowerCase().includes(q));
  });

  DOM.activeTracksList.innerHTML = "";
  if (!list.length) {
    DOM.activeTracksList.innerHTML = '<li style="justify-content:center"><span class="muted">Нет треков</span></li>';
    DOM.paginationParcelTracks.classList.add("hidden");
    return;
  }

  const limit = state.itemsPerPage.parcelTracks;
  const currentPage = state.page.parcelTracks;
  const totalPages = Math.ceil(list.length / limit);
  if (currentPage > totalPages) state.page.parcelTracks = totalPages || 1;

  const start = (state.page.parcelTracks - 1) * limit;
  list.slice(start, start + limit).forEach(t => {
    DOM.activeTracksList.appendChild(renderTrackRow(t, false));
  });

  updatePaginationUI("parcelTracks", totalPages, DOM.paginationParcelTracks, DOM.pageInfoParcelTracks, DOM.btnPrevParcelTracks, DOM.btnNextParcelTracks);
}

function renderTrackRow(t, showParcelName = false) {
  const li = document.createElement("li");
  li.className = "track-card";
  
  const meta = document.createElement("div");
  meta.className = "meta";
  const name = document.createElement("span");
  name.className = "name";

  if (state.user.is_admin) {
    const recs = t.recipients.map(r => `${r.name} (${r.quantity})`).join(", ");
    name.textContent = `${t.attachment || "—"} · ${recs}`;
  } else {
    const myAlloc = t.recipients.find(r => r.id === state.user.id);
    const qty = myAlloc ? ` (${myAlloc.quantity} ${t.unit || "шт"})` : "";
    name.textContent = `${t.attachment || "—"}${qty}`;
  }

  const displayPrice = t.my_price != null ? t.my_price : t.price;
  const code = document.createElement("span");
  code.className = "code";
  code.innerHTML = [
    t.barcode || "Без трека",
    showParcelName ? t.parcel_name : null,
    displayPrice != null ? displayPrice.toFixed(2) + " Br" : "цена ?",
    t.weight_g != null ? t.weight_g + " г" : "вес ?",
    t.comment ? `💬 ${t.comment}` : null
  ].filter(Boolean).join(" · ");

  meta.append(name, code);

  const right = document.createElement("div");
  right.style.display = "flex";
  right.style.gap = "8px";
  right.style.alignItems = "center";

  if (t.url) {
    const linkBtn = document.createElement("button");
    linkBtn.className = "link-icon-btn primary";
    linkBtn.innerHTML = "↗";
    linkBtn.title = "Открыть ссылку";
    linkBtn.onclick = (e) => { e.stopPropagation(); window.open(t.url, "_blank"); };
    right.appendChild(linkBtn);
  }

  const badge = document.createElement("span");
  badge.className = "badge " + t.status;
  badge.textContent = STATUS_LABELS[t.status] || t.status;
  right.appendChild(badge);

  if (state.user.is_admin) {
    const isFromActive = state.activeParcel && t.parcel_id === state.activeParcel.id;
    li.onclick = () => openEditModal(t, isFromActive);
  }

  li.append(meta, right);
  return li;
}

async function loadAllTracks() {
  state.allTracks = await api("/api/tracks");
  renderAllTracks();
}

function renderAllTracks() {
  const q = DOM.trackSearch.value.trim().toLowerCase();
  const st = DOM.allTracksFilter.value;
  
  DOM.trackList.innerHTML = "";
  const list = state.allTracks.filter(t =>
    (!st || t.status === st) &&
    (!q || (t.barcode && t.barcode.toLowerCase().includes(q)) || t.attachment.toLowerCase().includes(q))
  );

  if (!list.length) {
    DOM.trackList.innerHTML = '<li style="justify-content:center"><span class="muted">Нет треков</span></li>';
    DOM.paginationAllTracks.classList.add("hidden");
    return;
  }

  const limit = state.itemsPerPage.allTracks;
  const currentPage = state.page.allTracks;
  const totalPages = Math.ceil(list.length / limit);
  if (currentPage > totalPages) state.page.allTracks = totalPages || 1;

  const start = (state.page.allTracks - 1) * limit;
  list.slice(start, start + limit).forEach(t => {
    DOM.trackList.appendChild(renderTrackRow(t, true));
  });

  updatePaginationUI("allTracks", totalPages, DOM.paginationAllTracks, DOM.pageInfoAllTracks, DOM.btnPrevAllTracks, DOM.btnNextAllTracks);
}

/* =========================================
   STATS
   ========================================= */
async function loadMyStats() {
  state.myStats = await api("/api/my_stats");
  const parcels = [...new Set([...state.myStats.pending, ...state.myStats.issued].map(t => t.parcel_name))];
  
  const prevVal = DOM.myStatsParcelFilter.value;
  DOM.myStatsParcelFilter.innerHTML = '<option value="">Все партии</option>';
  parcels.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p; opt.textContent = p;
    DOM.myStatsParcelFilter.appendChild(opt);
  });
  if (prevVal && parcels.includes(prevVal)) DOM.myStatsParcelFilter.value = prevVal;
  
  renderMyStats();
}

function renderMyStats() {
  if (!state.myStats) return;
  
  const filterParcel = DOM.myStatsParcelFilter.value;
  const filterStatus = DOM.myStatsStatusFilter.value;

  let pending = state.myStats.pending.filter(t => !filterParcel || t.parcel_name === filterParcel);
  let issued = state.myStats.issued.filter(t => !filterParcel || t.parcel_name === filterParcel);

  if (filterStatus === "pending_issued") issued = [];
  if (filterStatus === "issued") pending = [];

  const total = pending.length + issued.length;
  const weightTotal = [...pending, ...issued].reduce((sum, t) => sum + (t.weight_g || 0), 0);
  const weightUnknown = [...pending, ...issued].filter(t => t.weight_g == null).length;
  const priceTotal = [...pending, ...issued].reduce((sum, t) => sum + (t.my_price != null ? t.my_price : (t.price || 0)), 0);

  DOM.myStatsBox.innerHTML = `
    <div class="stat-row"><span>Всего треков:</span><b>${total}</b></div>
    <div class="stat-row"><span>Выдано:</span><b>${issued.length}</b></div>
    <div class="stat-row"><span>Ожидает:</span><b>${pending.length}</b></div>
    <div class="stat-row"><span>Суммарный вес:</span><b>${weightTotal} г</b></div>
    <div class="stat-row"><span>Без веса:</span><b>${weightUnknown}</b></div>
    <div class="stat-row"><span>Суммарная цена:</span><b>${priceTotal.toFixed(2)} Br</b></div>
  `;

  const renderGroup = (title, list) => {
    if (!list.length) return;
    const h = document.createElement("h3");
    h.textContent = title;
    DOM.myStatsBox.appendChild(h);
    const ul = document.createElement("ul");
    list.forEach(t => ul.appendChild(renderTrackRow(t, true)));
    DOM.myStatsBox.appendChild(ul);
  };
  
  renderGroup("Неврученные", pending);
  renderGroup("Врученные", issued);
}

async function showAdminStats(id, name) {
  state.currentAdminStatsRecipientId = id;
  DOM.adminStatsName.textContent = name;
  const data = await api(`/api/recipients/${id}/stats`);
  
  const parcels = [...new Set([...data.pending, ...data.issued].map(t => t.parcel_name))];
  DOM.adminStatsParcelFilter.innerHTML = '<option value="">Все партии</option>';
  parcels.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p; opt.textContent = p;
    DOM.adminStatsParcelFilter.appendChild(opt);
  });
  DOM.adminStatsParcelFilter.value = "";

  DOM.adminStatsSection.classList.remove("hidden");
  renderAdminStats(data);
  DOM.adminStatsSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderAdminStats(data) {
  const filterParcel = DOM.adminStatsParcelFilter.value;
  const pending = data.pending.filter(t => !filterParcel || t.parcel_name === filterParcel);
  const issued = data.issued.filter(t => !filterParcel || t.parcel_name === filterParcel);

  const total = pending.length + issued.length;
  const weightTotal = [...pending, ...issued].reduce((sum, t) => sum + (t.weight_g || 0), 0);
  const weightUnknown = [...pending, ...issued].filter(t => t.weight_g == null).length;
  const priceTotal = [...pending, ...issued].reduce((sum, t) => sum + (t.my_price != null ? t.my_price : (t.price || 0)), 0);

  DOM.adminStatsBox.innerHTML = `
    <div class="stat-row"><span>Всего треков:</span><b>${total}</b></div>
    <div class="stat-row"><span>Выдано:</span><b>${issued.length}</b></div>
    <div class="stat-row"><span>Ожидает:</span><b>${pending.length}</b></div>
    <div class="stat-row"><span>Суммарный вес:</span><b>${weightTotal} г</b></div>
    <div class="stat-row"><span>Без веса:</span><b>${weightUnknown}</b></div>
    <div class="stat-row"><span>Суммарная цена:</span><b>${priceTotal.toFixed(2)} Br</b></div>
  `;

  const renderGroup = (title, list) => {
    if (!list.length) return;
    const h = document.createElement("h3");
    h.textContent = title;
    DOM.adminStatsBox.appendChild(h);
    const ul = document.createElement("ul");
    list.forEach(t => ul.appendChild(renderTrackRow(t, true)));
    DOM.adminStatsBox.appendChild(ul);
  };
  
  renderGroup("Неврученные", pending);
  renderGroup("Врученные", issued);
}

/* =========================================
   PAGINATION HELPER
   ========================================= */
function updatePaginationUI(type, totalPages, container, pageInfo, btnPrev, btnNext) {
  if (totalPages > 1) {
    container.classList.remove("hidden");
    const current = state.page[type];
    pageInfo.textContent = `${current} из ${totalPages}`;
    btnPrev.disabled = current === 1;
    btnNext.disabled = current === totalPages;
  } else {
    container.classList.add("hidden");
  }
}

/* =========================================
   EDIT MODAL
   ========================================= */
function openEditModal(t, fromActiveParcel = false) {
  if (!t || !t.id) {
    customAlert("Ошибка: у трека нет ID.", "Ошибка");
    return;
  }
  state.editTarget = t;

  DOM.editBarcodeLabel.textContent = t.barcode || "(без трека)";
  DOM.editBarcode.value = t.barcode ?? "";
  DOM.editAttachment.value = t.attachment ?? "";
  DOM.editPrice.value = t.price ?? "";
  DOM.editWeight.value = t.weight_g ?? "";
  DOM.editComment.value = t.comment ?? "";
  DOM.editUrl.value = t.url ?? "";
  DOM.editStatus.value = t.status;

  const stdUnits = ["шт", "упак", "пар"];
  if (stdUnits.includes(t.unit)) {
    DOM.editUnitSelect.value = t.unit;
    DOM.editUnitCustom.style.display = "none";
    DOM.editUnitCustom.value = "";
  } else if (t.unit) {
    DOM.editUnitSelect.value = "custom";
    DOM.editUnitCustom.style.display = "block";
    DOM.editUnitCustom.value = t.unit;
  } else {
    DOM.editUnitSelect.value = "шт";
    DOM.editUnitCustom.style.display = "none";
    DOM.editUnitCustom.value = "";
  }

  DOM.editAllocationsContainer.innerHTML = "";
  t.recipients.forEach(rec => createAllocRow(DOM.editAllocationsContainer, rec.name, rec.quantity));

  DOM.editParcel.innerHTML = "";
  let hasTarget = false;
  state.parcels.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name + (p.is_active ? " (Активна)" : "");
    DOM.editParcel.appendChild(opt);
    if (p.id === t.parcel_id) hasTarget = true;
  });
  if (!hasTarget) {
    const opt = document.createElement("option");
    opt.value = t.parcel_id;
    opt.textContent = t.parcel_name;
    DOM.editParcel.appendChild(opt);
  }
  DOM.editParcel.value = t.parcel_id;

  if (fromActiveParcel) {
    DOM.editParcel.disabled = true;
    DOM.editParcelHint.textContent = "(нельзя изменить)";
  } else {
    DOM.editParcel.disabled = false;
    DOM.editParcelHint.textContent = "(можно перенести)";
  }

  DOM.editModal.classList.remove("hidden");
}

/* =========================================
   ALLOCATIONS ROW
   ========================================= */
function createAllocRow(container, recName = "", qty = 1) {
  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.gap = "8px";
  row.style.alignItems = "center";

  const inputWrap = document.createElement("div");
  inputWrap.className = "autocomplete-wrapper";
  inputWrap.style.flex = "1";

  const input = document.createElement("input");
  input.placeholder = "Имя получателя";
  input.value = recName;
  input.className = "alloc-recipient-input";

  const ul = document.createElement("ul");
  ul.className = "autocomplete-list";

  const qtyInput = document.createElement("input");
  qtyInput.type = "number";
  qtyInput.min = "1";
  qtyInput.value = qty;
  qtyInput.className = "alloc-qty-input";
  qtyInput.style.width = "70px";
  qtyInput.addEventListener("focus", function() { this.select(); });

  const delBtn = document.createElement("button");
  delBtn.className = "danger small";
  delBtn.textContent = "✕";
  delBtn.type = "button";
  delBtn.onclick = () => row.remove();

  inputWrap.append(input, ul);
  row.append(inputWrap, qtyInput, delBtn);
  container.appendChild(row);

  setupAutocomplete(input, ul, () => state.recipients.map(r => r.name));
}

/* =========================================
   AUTOCOMPLETE
   ========================================= */
function setupAutocomplete(input, list, getItems) {
  let activeIndex = -1;
  let currentMatches = [];

  function renderList(query) {
    list.innerHTML = "";
    activeIndex = -1;
    const q = query.trim().toLowerCase();
    if (!q) {
      list.style.display = "none";
      currentMatches = [];
      return;
    }
    currentMatches = getItems().filter(item => item.toLowerCase().includes(q)).slice(0, 10);
    if (!currentMatches.length) {
      list.style.display = "none";
      return;
    }
    currentMatches.forEach(item => {
      const li = document.createElement("li");
      li.textContent = item;
      li.addEventListener("mousedown", (e) => {
        e.preventDefault();
        input.value = item;
        list.style.display = "none";
      });
      list.appendChild(li);
    });
    list.style.display = "block";
  }

  input.addEventListener("input", () => renderList(input.value));
  input.addEventListener("focus", () => renderList(input.value));
  input.addEventListener("blur", () => setTimeout(() => { list.style.display = "none"; }, 200));
  
  input.addEventListener("keydown", (e) => {
    const items = list.querySelectorAll("li");
    if (!items.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, items.length - 1);
      updateActive(items);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      updateActive(items);
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && items[activeIndex]) {
        e.preventDefault();
        input.value = items[activeIndex].textContent;
        list.style.display = "none";
      }
    } else if (e.key === "Escape") {
      list.style.display = "none";
    }
  });

  function updateActive(items) {
    items.forEach((li, i) => {
      li.classList.toggle("active", i === activeIndex);
      if (i === activeIndex) li.scrollIntoView({ block: "nearest" });
    });
  }
}

/* =========================================
   SCANNER
   ========================================= */
async function startScan() {
  if (state.scanning) return;
  state.codeReader = new ZXing.BrowserMultiFormatReader();
  try {
    await state.codeReader.decodeFromVideoDevice(null, DOM.video, onScanSuccess);
    state.scanning = true;
    DOM.startScanBtn.classList.add("hidden");
    DOM.stopScanBtn.classList.remove("hidden");
  } catch (e) {
    customAlert("Не удалось открыть камеру: " + e.message, "Ошибка");
    stopScan();
  }
}

function stopScan() {
  if (state.codeReader) {
    state.codeReader.reset();
    state.codeReader = null;
  }
  state.scanning = false;
  DOM.startScanBtn.classList.remove("hidden");
  DOM.stopScanBtn.classList.add("hidden");
}

let lastCode = "", lastTime = 0;
async function onScanSuccess(result) {
  if (!result) return;
  const code = result.getText();
  const now = Date.now();
  if (code === lastCode && now - lastTime < 3000) return;
  lastCode = code;
  lastTime = now;

  try {
    const res = await api(`/api/scan?barcode=${encodeURIComponent(code)}`, { method: "POST" });
    const all = await api(`/api/tracks`);
    const t = all.find(x => x.id === res.id);
    if (t) {
      showScanResult(t);
      showScanCard(t);
    }
  } catch (e) {
    showScanError(code);
  }
}

function showScanResult(t) {
  DOM.scanResult.className = "scan-result found";
  const recs = t.recipients.map(r => `${r.name} (${r.quantity} ${t.unit || "шт"})`).join(", ");
  DOM.scanResult.textContent = `👤 ${recs} — ${t.barcode}`;
  if (navigator.vibrate) navigator.vibrate(80);
}

function showScanError(code) {
  DOM.scanResult.className = "scan-result error";
  DOM.scanResult.textContent = `⚠ Трек не найден: ${code}`;
  DOM.scanCard.classList.add("hidden");
  if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
}

function showScanCard(t) {
  DOM.scanCard.classList.remove("hidden");
  
  DOM.cardBarcode.textContent = t.barcode || "(без трека)";
  DOM.cardAttachment.textContent = t.attachment || "—";
  DOM.cardRecipients.innerHTML = t.recipients.map(r => `${r.name} <span class="muted">(${r.quantity} ${t.unit || "шт"})</span>`).join(", ");
  DOM.cardParcel.textContent = t.parcel_name;
  DOM.cardPrice.textContent = t.price != null ? `${t.price} Br` : "—";
  DOM.cardWeight.textContent = t.weight_g != null ? `${t.weight_g} г` : "неизвестен";
  DOM.cardComment.textContent = t.comment || "—";
  DOM.cardStatus.textContent = STATUS_LABELS[t.status] || t.status;

  if (t.url) {
    DOM.cardUrl.innerHTML = `<a href="${t.url}" target="_blank" style="color: var(--accent-primary); text-decoration: underline;">Открыть товар</a>`;
  } else {
    DOM.cardUrl.textContent = "—";
  }

  const canAdmin = state.user.is_admin;
  DOM.issueBtn.style.display = canAdmin ? "inline-flex" : "none";
  DOM.weighBtn.style.display = canAdmin ? "inline-flex" : "none";
  DOM.issueBtn.disabled = t.status === "issued";
  DOM.issueBtn.textContent = t.status === "issued" ? "Уже выдан" : "Выдать";

  state.editTarget = t;
}

/* =========================================
   EVENT LISTENERS
   ========================================= */
// Auth
DOM.setupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("setupName").value.trim();
  const username = document.getElementById("setupUsername").value.trim();
  const password = document.getElementById("setupPassword").value;
  if (!name || !username || !password) return customAlert("Заполните все поля");

  try {
    const res = await fetch(state.apiBase + "/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, username, password })
    });
    if (!res.ok) {
      let err = await res.text();
      try { err = JSON.parse(err).detail; } catch(e){}
      throw new Error(err);
    }
    await customAlert("Администратор создан! Теперь войдите.", "Успех");
    showLogin();
  } catch (e) { customAlert(e.message, "Ошибка"); }
});

DOM.loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("loginUsername").value;
  const password = document.getElementById("loginPassword").value;
  try {
    const res = await fetch(state.apiBase + "/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) throw new Error("Неверный логин или пароль");
    const data = await res.json();
    state.token = data.access_token;
    localStorage.setItem("token", state.token);
    state.user = data.user;
    document.getElementById("loginPassword").value = "";
    showApp();
  } catch (e) { customAlert(e.message, "Ошибка входа"); }
});

DOM.logoutBtn.addEventListener("click", showLogin);

// Tabs
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add("active");
  });
});

// Scanner
DOM.startScanBtn.addEventListener("click", startScan);
DOM.stopScanBtn.addEventListener("click", stopScan);
DOM.closeCardBtn.addEventListener("click", () => DOM.scanCard.classList.add("hidden"));

DOM.issueBtn.addEventListener("click", async () => {
  if (!state.editTarget) return;
  await api(`/api/tracks/${state.editTarget.id}/issue`, { method: "POST" });
  showToast("Посылка выдана");
  await refreshAll();
  DOM.scanCard.classList.add("hidden");
});

DOM.weighBtn.addEventListener("click", () => {
  if (!state.editTarget) return;
  state.weighTarget = state.editTarget.id;
  DOM.weighBarcode.textContent = state.editTarget.barcode || "Без трека";
  DOM.weighInput.value = state.editTarget.weight_g ?? "";
  DOM.weighModal.classList.remove("hidden");
  DOM.weighInput.focus();
});

DOM.weighCancel.addEventListener("click", () => {
  DOM.weighModal.classList.add("hidden");
  state.weighTarget = null;
});

DOM.weighSave.addEventListener("click", async () => {
  const val = parseInt(DOM.weighInput.value, 10);
  if (!val || val <= 0) return customAlert("Введите вес в граммах");
  await api(`/api/tracks/${state.weighTarget}/weigh`, {
    method: "POST",
    body: JSON.stringify({ weight_g: val })
  });
  DOM.weighModal.classList.add("hidden");
  state.weighTarget = null;
  showToast("Вес обновлен");
  await refreshAll();
});

// Parcels Filters
DOM.parcelSearch.addEventListener("input", () => { state.page.active = 1; renderParcelList(); });
DOM.parcelSearchFieldFilter.addEventListener("change", () => { state.page.active = 1; renderParcelList(); });
DOM.parcelSearchClosed.addEventListener("input", () => { state.page.closed = 1; renderParcelList(); });
DOM.parcelSearchClosedFieldFilter.addEventListener("change", () => { state.page.closed = 1; renderParcelList(); });

DOM.activeTracksSearch.addEventListener("input", () => { state.page.parcelTracks = 1; renderActiveTracks(); });
DOM.activeTracksFilter.addEventListener("change", () => { state.page.parcelTracks = 1; renderActiveTracks(); });

// Global Tracks Filters
DOM.trackSearch.addEventListener("input", () => { state.page.allTracks = 1; renderAllTracks(); });
DOM.allTracksFilter.addEventListener("change", () => { state.page.allTracks = 1; renderAllTracks(); });

// Items Per Page Selects
const perPageMap = {
  active: "perPageActive", closed: "perPageClosed", parcelTracks: "perPageParcelTracks",
  allTracks: "perPageAllTracks", recipients: "perPageRecipients"
};

Object.entries(perPageMap).forEach(([key, id]) => {
  DOM[id].addEventListener("change", (e) => {
    state.itemsPerPage[key] = parseInt(e.target.value);
    state.page[key] = 1;
    if (key === "active" || key === "closed") renderParcelList();
    if (key === "parcelTracks") renderActiveTracks();
    if (key === "allTracks") renderAllTracks();
    if (key === "recipients") renderRecipientsList();
  });
});

// Pagination Buttons
DOM.btnPrevActive.onclick = () => { if (state.page.active > 1) { state.page.active--; renderParcelList(); } };
DOM.btnNextActive.onclick = () => { state.page.active++; renderParcelList(); };
DOM.btnPrevClosed.onclick = () => { if (state.page.closed > 1) { state.page.closed--; renderParcelList(); } };
DOM.btnNextClosed.onclick = () => { state.page.closed++; renderParcelList(); };
DOM.btnPrevParcelTracks.onclick = () => { if (state.page.parcelTracks > 1) { state.page.parcelTracks--; renderActiveTracks(); } };
DOM.btnNextParcelTracks.onclick = () => { state.page.parcelTracks++; renderActiveTracks(); };
DOM.btnPrevAllTracks.onclick = () => { if (state.page.allTracks > 1) { state.page.allTracks--; renderAllTracks(); } };
DOM.btnNextAllTracks.onclick = () => { state.page.allTracks++; renderAllTracks(); };
DOM.btnPrevRecipients.onclick = () => { if (state.page.recipients > 1) { state.page.recipients--; renderRecipientsList(); } };
DOM.btnNextRecipients.onclick = () => { state.page.recipients++; renderRecipientsList(); };

// Parcel Creation
DOM.openNewParcelBtn.addEventListener("click", () => {
  DOM.newParcelName.value = "";
  DOM.newParcelModal.classList.remove("hidden");
  DOM.newParcelName.focus();
});
DOM.cancelNewParcelBtn.addEventListener("click", () => DOM.newParcelModal.classList.add("hidden"));
DOM.saveNewParcelBtn.addEventListener("click", async () => {
  if (!DOM.newParcelName.value.trim()) return customAlert("Введите название");
  try {
    await api("/api/parcels", { method: "POST", body: JSON.stringify({ name: DOM.newParcelName.value.trim() }) });
    DOM.newParcelModal.classList.add("hidden");
    await refreshAll();
  } catch (err) { customAlert("Ошибка: " + err.message, "Ошибка"); }
});

// Track Barcode Toggle
DOM.trBarcodeToggleBtn.addEventListener("click", () => {
  DOM.trBarcodeToggleBtn.style.display = "none";
  DOM.trBarcodeBlock.style.display = "block";
  DOM.trBarcode.focus();
});
DOM.trBarcode.addEventListener("blur", () => {
  if (!DOM.trBarcode.value.trim()) {
    DOM.trBarcodeBlock.style.display = "none";
    DOM.trBarcodeToggleBtn.style.display = "block";
  }
});

// Units Select
DOM.trUnitSelect.addEventListener("change", () => {
  DOM.trUnitCustom.style.display = DOM.trUnitSelect.value === "custom" ? "block" : "none";
  if (DOM.trUnitSelect.value === "custom") DOM.trUnitCustom.focus();
  else DOM.trUnitCustom.value = "";
});
DOM.editUnitSelect.addEventListener("change", () => {
  DOM.editUnitCustom.style.display = DOM.editUnitSelect.value === "custom" ? "block" : "none";
  if (DOM.editUnitSelect.value === "custom") DOM.editUnitCustom.focus();
  else DOM.editUnitCustom.value = "";
});

// Add Track Form
DOM.addAllocBtn.addEventListener("click", () => createAllocRow(DOM.allocationsContainer));

DOM.addTrackBtn.addEventListener("click", async () => {
  if (!state.activeParcel) return customAlert("Сначала выберите партию");
  if (!DOM.trAttachment.value.trim()) return customAlert("Укажите вложение");

  let unit = DOM.trUnitSelect.value;
  if (unit === "custom") {
    unit = DOM.trUnitCustom.value.trim();
    if (!unit) return customAlert("Укажите свою единицу измерения");
  }

  const allocations = [];
  for (let r of DOM.allocationsContainer.children) {
    const recName = r.querySelector(".alloc-recipient-input").value.trim();
    const qty = parseInt(r.querySelector(".alloc-qty-input").value, 10);
    if (recName && qty > 0) allocations.push({ recipient_name: recName, quantity: qty });
  }

  if (!allocations.length) return customAlert("Укажите хотя бы одного получателя и количество");
  for (let a of allocations) {
    if (!state.recipients.some(r => r.name === a.recipient_name)) {
      return customAlert(`Получатель ${a.recipient_name} не найден в справочнике.`, "Ошибка");
    }
  }

  try {
    await api("/api/tracks", {
      method: "POST",
      body: JSON.stringify({
        barcode: DOM.trBarcode.value.trim() || null,
        attachment: DOM.trAttachment.value.trim(),
        parcel_id: state.activeParcel.id,
        allocations,
        unit,
        price: DOM.trPrice.value ? parseFloat(DOM.trPrice.value) : null,
        weight_g: DOM.trWeight.value ? parseInt(DOM.trWeight.value, 10) : null,
        comment: DOM.trComment.value.trim() || null,
        url: DOM.trUrl.value.trim() || null,
      }),
    });

    DOM.trBarcode.value = ""; DOM.trBarcodeBlock.style.display = "none"; DOM.trBarcodeToggleBtn.style.display = "block";
    DOM.trAttachment.value = ""; DOM.trUnitSelect.value = "шт"; DOM.trUnitCustom.style.display = "none"; DOM.trUnitCustom.value = "";
    DOM.trPrice.value = ""; DOM.trWeight.value = ""; DOM.trComment.value = ""; DOM.trUrl.value = "";

    DOM.allocationsContainer.innerHTML = "";
    createAllocRow(DOM.allocationsContainer);

    state.page.parcelTracks = 1;
    await refreshAll();
    showToast("Трек успешно добавлен");
  } catch (err) { customAlert("Ошибка: " + err.message, "Ошибка"); }
});

// Edit Track Modal
DOM.editCancel.addEventListener("click", () => {
  DOM.editModal.classList.add("hidden");
  state.editTarget = null;
});

DOM.editSave.addEventListener("click", async () => {
  if (!state.editTarget) return;
  if (!DOM.editAttachment.value.trim()) return customAlert("Укажите вложение");

  let unit = DOM.editUnitSelect.value;
  if (unit === "custom") {
    unit = DOM.editUnitCustom.value.trim();
    if (!unit) return customAlert("Укажите свою единицу измерения");
  }

  const allocations = [];
  for (let r of DOM.editAllocationsContainer.children) {
    const recName = r.querySelector(".alloc-recipient-input").value.trim();
    const qty = parseInt(r.querySelector(".alloc-qty-input").value, 10);
    if (recName && qty > 0) allocations.push({ recipient_name: recName, quantity: qty });
  }
  if (!allocations.length) return customAlert("Укажите хотя бы одного получателя");

  const targetParcelId = DOM.editParcel.disabled ? state.editTarget.parcel_id : Number(DOM.editParcel.value);
  const body = {
    barcode: DOM.editBarcode.value.trim() || null,
    attachment: DOM.editAttachment.value.trim(),
    unit,
    parcel_id: targetParcelId,
    allocations,
    price: DOM.editPrice.value ? parseFloat(DOM.editPrice.value) : null,
    weight_g: DOM.editWeight.value ? parseInt(DOM.editWeight.value, 10) : null,
    comment: DOM.editComment.value.trim() || null,
    url: DOM.editUrl.value.trim() || null,
    status: DOM.editStatus.value,
  };

  try {
    await api(`/api/tracks/${state.editTarget.id}`, { method: "PUT", body: JSON.stringify(body) });
    DOM.editModal.classList.add("hidden");
    state.editTarget = null;
    await refreshAll();
    showToast("Изменения сохранены");
  } catch (e) { customAlert("Ошибка: " + e.message, "Ошибка"); }
});

DOM.editDeleteBtn.addEventListener("click", async () => {
  if (!state.editTarget) return;
  
  const confirm = await customPrompt(
    `Вы уверены, что хотите безвозвратно удалить трек "${state.editTarget.attachment}"?`,
    "Удаление трека",
    { isDanger: true, hint: "Для подтверждения введите название трека:", placeholder: state.editTarget.attachment }
  );
  
  if (confirm !== state.editTarget.attachment) {
    if (confirm !== null) customAlert("Название не совпадает. Удаление отменено.", "Ошибка");
    return;
  }
  try {
    await api(`/api/tracks/${state.editTarget.id}`, { method: "DELETE" });
    DOM.editModal.classList.add("hidden");
    state.editTarget = null;
    await refreshAll();
    showToast("Трек удален");
  } catch (e) { customAlert("Ошибка: " + e.message, "Ошибка"); }
});

// Recipient Form & Admin Password
DOM.recipientForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = DOM.recipientName.value.trim();
  const username = DOM.recipientUsername.value.trim();
  const password = DOM.recipientPassword.value;
  if (!name || !username || !password) return customAlert("Заполните все поля");

  try {
    await api("/api/recipients", { method: "POST", body: JSON.stringify({ name, username, password }) });
    DOM.recipientName.value = ""; DOM.recipientUsername.value = ""; DOM.recipientPassword.value = "";
    await loadRecipients();
    showToast("Пользователь добавлен");
  } catch (err) { customAlert("Ошибка: " + err.message, "Ошибка"); }
});

DOM.cancelAdminPasswordBtn.addEventListener("click", () => DOM.adminPasswordModal.classList.add("hidden"));
DOM.saveAdminPasswordBtn.addEventListener("click", async () => {
  if (!DOM.adminNewPasswordInput.value) return customAlert("Введите новый пароль");
  try {
    await api(`/api/recipients/${state.adminPasswordTargetId}/password`, {
      method: "POST", body: JSON.stringify({ new_password: DOM.adminNewPasswordInput.value })
    });
    customAlert("Пароль пользователя изменен!", "Успех");
    DOM.adminPasswordModal.classList.add("hidden");
  } catch (e) { customAlert("Ошибка: " + e.message, "Ошибка"); }
});

// Self Password
DOM.openPasswordModalBtn.addEventListener("click", () => {
  DOM.oldPasswordInput.value = ""; DOM.newPasswordInput.value = "";
  DOM.passwordModal.classList.remove("hidden");
});
DOM.cancelPasswordBtn.addEventListener("click", () => DOM.passwordModal.classList.add("hidden"));
DOM.savePasswordBtn.addEventListener("click", async () => {
  if (!DOM.oldPasswordInput.value) return customAlert("Введите старый пароль");
  if (!DOM.newPasswordInput.value) return customAlert("Введите новый пароль");
  try {
    await api("/api/change_password", {
      method: "POST",
      body: JSON.stringify({ old_password: DOM.oldPasswordInput.value, new_password: DOM.newPasswordInput.value })
    });
    customAlert("Пароль успешно изменен!", "Успех");
    DOM.passwordModal.classList.add("hidden");
  } catch (e) { customAlert("Ошибка: " + e.message, "Ошибка"); }
});

// Admin Stats
DOM.closeAdminStatsBtn.addEventListener("click", () => {
  DOM.adminStatsSection.classList.add("hidden");
  state.currentAdminStatsRecipientId = null;
});
DOM.adminStatsParcelFilter.addEventListener("change", async () => {
  if (!state.currentAdminStatsRecipientId) return;
  const data = await api(`/api/recipients/${state.currentAdminStatsRecipientId}/stats`);
  renderAdminStats(data);
});

DOM.myStatsParcelFilter.addEventListener("change", renderMyStats);
DOM.myStatsStatusFilter.addEventListener("change", renderMyStats);

/* =========================================
   GLOBAL KEYBOARD SHORTCUTS
   ========================================= */
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;

  if (!DOM.promptModal.classList.contains("hidden")) {
    DOM.promptCancelBtn.click();
    return;
  }
  if (!DOM.alertModal.classList.contains("hidden")) {
    DOM.alertOkBtn.click();
    return;
  }
  if (!DOM.editModal.classList.contains("hidden")) {
    DOM.editCancel.click();
    return;
  }
  if (!DOM.weighModal.classList.contains("hidden")) {
    DOM.weighCancel.click();
    return;
  }
  if (!DOM.passwordModal.classList.contains("hidden")) {
    DOM.cancelPasswordBtn.click();
    return;
  }
  if (!DOM.adminPasswordModal.classList.contains("hidden")) {
    DOM.cancelAdminPasswordBtn.click();
    return;
  }
  if (!DOM.newParcelModal.classList.contains("hidden")) {
    DOM.cancelNewParcelBtn.click();
    return;
  }
});

/* =========================================
   REFRESH & INIT
   ========================================= */
async function refreshAll() {
  await loadParcels();
  await loadAllTracks();
  
  if (state.user.is_admin) {
    await loadRecipients();
    if (state.currentAdminStatsRecipientId) {
      const data = await api(`/api/recipients/${state.currentAdminStatsRecipientId}/stats`);
      renderAdminStats(data);
    }
  } else {
    await loadMyStats();
  }
}

(async function init() {
  await loadConfig();
  await checkAuth();
})();

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
