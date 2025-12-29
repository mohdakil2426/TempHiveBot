/**
 * TempMail Mini App
 * Telegram Mini App for temporary email
 */

const API_BASE = 'https://api.mail.tm';

// =========================================
// State
// =========================================

const state = {
    currentPage: 'mail',
    account: null,
    messages: [],
    currentMessage: null,
    isLoading: false,
    autoRefreshInterval: null,
    isBotMode: false,
    notificationsEnabled: false
};

// =========================================
// Telegram Integration
// =========================================

const tg = window.Telegram?.WebApp;

function initTelegram() {
    if (!tg) {
        console.log('Not running in Telegram');
        return;
    }

    state.isBotMode = !!tg.initData;
    if (state.isBotMode) {
        document.body.classList.add('in-telegram');
        // Retrieve stored notification preference if any (optional, usually we just check if synced)
        // Actually we can't check if synced with bot easily without backend. 
        // We'll trust local storage or user action.
    }

    tg.ready();
    tg.expand();

    // Set Header/Bg colors
    tg.setHeaderColor?.(document.body.classList.contains('dark') ? '#1C1C1E' : '#F2F2F7');
    tg.setBackgroundColor?.(document.body.classList.contains('dark') ? '#000000' : '#F2F2F7');

    function applyTheme() {
        if (tg.colorScheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        // Update header color on theme change
        tg.setHeaderColor?.(tg.colorScheme === 'dark' ? '#1C1C1E' : '#F2F2F7');
        tg.setBackgroundColor?.(tg.colorScheme === 'dark' ? '#000000' : '#F2F2F7');
    }

    applyTheme();
    tg.onEvent('themeChanged', applyTheme);

    // Back button
    tg.BackButton.onClick(() => {
        const modals = document.querySelectorAll('.sheet-modal.active');
        if (modals.length > 0) {
            closeAllModals();
        } else if (state.currentPage === 'inbox') {
            navigateTo('mail');
        }
    });

    window.haptic = (type = 'light') => {
        tg.HapticFeedback?.impactOccurred(type);
    };
}

// =========================================
// DOM Elements
// =========================================

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const elements = {
    // Pages
    mailPage: $('#mail-page'),
    inboxPage: $('#inbox-page'),

    // Mail page
    emailText: $('#email-text'),
    copyBtn: $('#copy-btn'),
    generateBtn: $('#generate-btn'),
    settingsBtn: $('#settings-btn'),

    // Inbox page
    inboxList: $('#inbox-list'),
    emptyState: $('#empty-state'),
    refreshBtn: $('#refresh-btn'),

    // Modals
    emailModal: $('#email-modal'),
    settingsModal: $('#settings-modal'),

    // Email Detail
    modalBack: $('#modal-back'),
    modalDelete: $('#modal-delete'),
    detailAvatar: $('#detail-avatar'),
    detailSender: $('#detail-sender'),
    detailFrom: $('#detail-from'),
    detailDate: $('#detail-date'),
    detailSubject: $('#detail-subject'),
    detailBody: $('#detail-body'),

    // Settings
    settingsClose: $('#settings-close'),
    notifyToggle: $('#notify-toggle'),

    // Navigation
    tabItems: $$('.tab-item'),
    navBadge: $('#nav-badge'),

    // Toast
    toast: $('#toast')
};

// =========================================
// Utilities
// =========================================

function generateUsername(length = 10) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function generatePassword(length = 12) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function formatDate(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getInitial(email) {
    return (email?.charAt(0) || '?').toUpperCase();
}

function stripHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
}

function showToast(message, type = '') {
    if (!elements.toast) return;
    elements.toast.textContent = message;
    elements.toast.className = `toast ${type} show`;
    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 2500);
}

// =========================================
// Storage
// =========================================

function saveAccount(account) {
    localStorage.setItem('tempmail_account', JSON.stringify(account));
}

function loadAccount() {
    const data = localStorage.getItem('tempmail_account');
    return data ? JSON.parse(data) : null;
}

function clearAccount() {
    localStorage.removeItem('tempmail_account');
}

// =========================================
// API
// =========================================

async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (state.account?.token) {
        headers['Authorization'] = `Bearer ${state.account.token}`;
    }

    const response = await fetch(url, { ...options, headers });

    if (response.status === 204) return null;

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`API Error: ${response.status} - ${error}`);
    }

    return response.json();
}

async function getDomains() {
    const response = await apiRequest('/domains');
    return response['hydra:member'] || [];
}

async function createAccount() {
    const domains = await getDomains();
    const activeDomain = domains.find(d => d.isActive);
    if (!activeDomain) throw new Error('No active domains');

    const username = generateUsername();
    const password = generatePassword();
    const email = `${username}@${activeDomain.domain}`;

    const account = await apiRequest('/accounts', {
        method: 'POST',
        body: JSON.stringify({ address: email, password })
    });

    const auth = await apiRequest('/token', {
        method: 'POST',
        body: JSON.stringify({ address: email, password })
    });

    return {
        id: account.id,
        email: email,
        password: password,
        token: auth.token
    };
}

async function refreshToken() {
    if (!state.account) return false;
    try {
        const auth = await apiRequest('/token', {
            method: 'POST',
            body: JSON.stringify({
                address: state.account.email,
                password: state.account.password
            })
        });
        state.account.token = auth.token;
        saveAccount(state.account);
        return true;
    } catch (error) {
        return false;
    }
}

async function getMessages() {
    if (!state.account) return [];
    try {
        const response = await apiRequest('/messages');
        return response['hydra:member'] || [];
    } catch (error) {
        if (await refreshToken()) {
            const response = await apiRequest('/messages');
            return response['hydra:member'] || [];
        }
        throw error;
    }
}

async function getMessage(id) {
    return await apiRequest(`/messages/${id}`);
}

async function deleteMessage(id) {
    await apiRequest(`/messages/${id}`, { method: 'DELETE' });
}

// =========================================
// Navigation
// =========================================

function navigateTo(page) {
    state.currentPage = page;

    // Pages
    $$('.page').forEach(p => p.classList.remove('active'));
    $(`#${page}-page`).classList.add('active');

    // Tab Bar
    elements.tabItems.forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });

    // Back Button (Telegram)
    if (tg) {
        if (page === 'inbox') {
            tg.BackButton.show();
        } else {
            tg.BackButton.hide();
        }
    }

    if (page === 'inbox') {
        loadInbox();
    }

    window.haptic?.('light');
}

// =========================================
// UI Updates
// =========================================

function updateEmailDisplay() {
    if (!elements.emailText) return;
    elements.emailText.textContent = state.account?.email || 'Generating...';
}

function updateInboxCount(count) {
    if (!elements.inboxCount) return;
    // Only update badge
    if (count > 0) {
        elements.navBadge.textContent = count > 99 ? '99+' : count;
        elements.navBadge.classList.remove('hidden');
    } else {
        elements.navBadge.classList.add('hidden');
    }
}

function renderInbox() {
    const messages = state.messages;
    updateInboxCount(messages.length);

    if (messages.length === 0) {
        elements.inboxList.innerHTML = '';
        elements.emptyState.style.display = 'flex'; // show
        return;
    }

    elements.emptyState.style.display = 'none';

    elements.inboxList.innerHTML = messages.map(msg => {
        const senderName = msg.from?.name || '';
        const senderEmail = msg.from?.address || 'Unknown';
        const displayName = senderName || senderEmail.split('@')[0];
        const subject = msg.subject || '(No Subject)';
        const preview = msg.intro || '';
        const time = formatDate(msg.createdAt);
        const initial = getInitial(senderEmail);
        const unreadClass = !msg.seen ? 'unread' : ''; // You might want css for .unread

        return `
            <div class="email-item" data-id="${msg.id}">
                <div class="email-avatar">${initial}</div>
                <div class="email-content">
                    <div class="email-header">
                        <span class="sender">${displayName}</span>
                        <span class="time">${time}</span>
                    </div>
                    <div class="subject">${subject}</div>
                    <div class="preview">${preview}</div>
                </div>
            </div>
        `;
    }).join('');

    $$('.email-item').forEach(item => {
        item.addEventListener('click', () => openEmail(item.dataset.id));
    });
}

// =========================================
// Actions
// =========================================

async function initAccount() {
    const params = new URLSearchParams(window.location.search);
    const auth = params.get('auth');
    const initialPage = params.get('page') || 'mail';

    let synced = false;

    if (auth) {
        try {
            const decoded = atob(auth.replace(/-/g, '+').replace(/_/g, '/'));
            const [email, password] = decoded.split(':');
            if (email && password) {
                const authResponse = await apiRequest('/token', {
                    method: 'POST',
                    body: JSON.stringify({ address: email, password })
                });
                state.account = { email, password, token: authResponse.token };
                saveAccount(state.account);
                window.history.replaceState({}, document.title, window.location.pathname);
                showToast('Synced from Telegram!', 'success');
                synced = true;

                // Assume if synced from bot, notifications should be enabled (UI wise)
                state.notificationsEnabled = true;
                if (elements.notifyToggle) elements.notifyToggle.checked = true;

                if (initialPage === 'inbox') navigateTo('inbox');
            }
        } catch (e) {
            console.log('Auth failed');
        }
    }

    if (!state.account) {
        state.account = loadAccount();
    }

    if (state.account) {
        updateEmailDisplay();
        try {
            await getMessages();
        } catch (error) {
            console.log('Expired');
            if (elements.emailText) elements.emailText.textContent = 'Expired';
            // Auto-generate new one if expired
            await generateNewEmail();
        }
    } else {
        await generateNewEmail();
    }
}

async function generateNewEmail() {
    if (state.isLoading) return;

    state.isLoading = true;
    if (elements.generateBtn) elements.generateBtn.classList.add('loading');
    if (elements.emailText) elements.emailText.textContent = 'Generating...';

    try {
        const newAccount = await createAccount();
        state.account = newAccount;
        saveAccount(state.account);
        updateEmailDisplay();
        state.messages = [];
        renderInbox();
        showToast('New Identity Created', 'success');
        window.haptic?.('success');

        // Check if we need to sync for notifications
        if (state.notificationsEnabled && state.isBotMode) {
            syncToBot(newAccount);
        }

    } catch (error) {
        console.error('Error:', error);
        showToast('Failed to generate', 'error');
        window.haptic?.('error');
    } finally {
        state.isLoading = false;
        if (elements.generateBtn) elements.generateBtn.classList.remove('loading');
    }
}

function syncToBot(account) {
    // Create Deep Link payload
    const data = `${account.email}:${account.password}`;
    let payload = btoa(data);
    payload = payload.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    // We can't stay in app AND open link easily (it closes app). 
    // Option: Use tg.openTelegramLink which closes app.
    // For now, we will NOT auto-sync on every generate to avoid annoyance.
    // We only sync if user explicitly toggles the notification switch.
    // OR we warn user "Syncing..." and do it.
}

// Notification Toggle Logic
function handleNotificationToggle(e) {
    const isChecked = e.target.checked;
    state.notificationsEnabled = isChecked;

    if (isChecked && state.account && state.isBotMode) {
        // Trigger Sync
        const data = `${state.account.email}:${state.account.password}`;
        let payload = btoa(data);
        payload = payload.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

        tg.showConfirm("To enable notifications, we need to sync with the Bot. This will close the app briefly.", (confirmed) => {
            if (confirmed) {
                tg.openTelegramLink(`https://t.me/TempHiveBot?start=SYNC_${payload}`);
            } else {
                e.target.checked = false; // revert
                state.notificationsEnabled = false;
            }
        });
    }
}

async function loadInbox() {
    if (elements.refreshBtn) elements.refreshBtn.classList.add('loading'); // You'll need css rotation for this class
    try {
        state.messages = await getMessages();
        renderInbox();
    } catch (e) {
        console.error(e);
    } finally {
        if (elements.refreshBtn) elements.refreshBtn.classList.remove('loading');
    }
}

async function copyEmail() {
    if (!state.account) return;
    try {
        await navigator.clipboard.writeText(state.account.email);
        showToast('Copied to clipboard', 'success');
        window.haptic?.('light');
    } catch (e) {
        // fallback?
    }
}

async function openEmail(id) {
    window.haptic?.('light');
    try {
        const message = await getMessage(id);
        state.currentMessage = message;

        const senderName = message.from?.name || '';
        const senderEmail = message.from?.address || 'Unknown';

        // Populate Modal
        // elements.detailAvatar TODO: set color or initial
        elements.detailSender.textContent = senderName || senderEmail.split('@')[0];
        elements.detailFrom.textContent = senderEmail;
        elements.detailDate.textContent = formatDate(message.createdAt);
        elements.detailSubject.textContent = message.subject || '(No Subject)';

        let content = message.text || '';
        if (!content && message.html) {
            const htmlContent = Array.isArray(message.html) ? message.html[0] : message.html;
            content = stripHtml(htmlContent);
        }
        elements.detailBody.textContent = content || '(No content)';

        elements.emailModal.classList.add('active');
        if (tg) tg.BackButton.show();

        // Mark read silently
        if (!message.seen) {
            apiRequest(`/messages/${id}`, { method: 'PATCH', body: JSON.stringify({ seen: true }) }).catch(() => { });
        }

    } catch (e) {
        showToast('Error opening email', 'error');
    }
}

function closeAllModals() {
    $$('.sheet-modal').forEach(m => m.classList.remove('active'));
    state.currentMessage = null;
    if (tg && state.currentPage === 'mail') tg.BackButton.hide();
}


// Auto Refresh
function startAutoRefresh() {
    stopAutoRefresh();
    state.autoRefreshInterval = setInterval(async () => {
        if (state.currentPage === 'inbox') await loadInbox();
    }, 15000);
}

function stopAutoRefresh() {
    if (state.autoRefreshInterval) clearInterval(state.autoRefreshInterval);
}

// =========================================
// Event Listeners
// =========================================

function setupEventListeners() {
    // Navigation
    elements.tabItems.forEach(item => {
        item.addEventListener('click', () => navigateTo(item.dataset.page));
    });

    // Actions
    if (elements.copyBtn) elements.copyBtn.addEventListener('click', copyEmail);
    if (elements.generateBtn) elements.generateBtn.addEventListener('click', generateNewEmail);
    if (elements.refreshBtn) elements.refreshBtn.addEventListener('click', loadInbox);
    if (elements.settingsBtn) elements.settingsBtn.addEventListener('click', () => elements.settingsModal.classList.add('active'));

    // Modals
    if (elements.modalBack) elements.modalBack.addEventListener('click', closeAllModals);
    if (elements.settingsClose) elements.settingsClose.addEventListener('click', closeAllModals);

    // Note: modalDelete logic might need updates if modalDelete button isn't immediately in DOM or if changed to simpler confirmation
    // For now assuming existing structure for Delete Confirmation or just deleting directly/using standard confirmation
    // Reusing the modalDelete button from HTML

    // Actually we don't have a separate delete confirmation modal in the new HTML, only 'modal-delete' button in the reader.
    // Let's implement a direct confirmation using Telegram confirm or simple browser confirm for simplicity in MVP premium.
    // Or if we kept the delete-modal in HTML (I think I removed it? Let me check previous turn)
    // Checking index.html... I REMOVED delete-modal in favor of simpler UI.
    // Wait, checking my previous `replace_file_content` for index.html... 
    // I DID NOT include delete-modal in the new version.

    if (elements.modalDelete) {
        elements.modalDelete.addEventListener('click', async () => {
            if (state.currentMessage) {
                tg.showConfirm("Delete this email?", async (yes) => {
                    if (yes) {
                        try {
                            await deleteMessage(state.currentMessage.id);
                            state.messages = state.messages.filter(m => m.id !== state.currentMessage.id);
                            renderInbox();
                            closeAllModals();
                            showToast('Deleted', 'success');
                        } catch (e) {
                            showToast('Error deleting', 'error');
                        }
                    }
                });
            }
        });
    }

    // Settings Toggle
    if (elements.notifyToggle) elements.notifyToggle.addEventListener('change', handleNotificationToggle);

    // Close on click outside (sheets)
    $$('.sheet-overlay').forEach(overlay => {
        overlay.addEventListener('click', closeAllModals);
    });
}

// =========================================
// Init
// =========================================

async function init() {
    initTelegram();
    setupEventListeners();
    await initAccount();
    startAutoRefresh();
}

init();
