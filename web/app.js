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

        tg.setHeaderColor?.(tg.colorScheme === 'dark' ? '#1C1C1E' : '#F2F2F7');
        tg.setBackgroundColor?.(tg.colorScheme === 'dark' ? '#000000' : '#F2F2F7');
    }

    applyTheme();
    tg.onEvent('themeChanged', applyTheme);

    // Back button
    tg.BackButton.onClick(() => {
        if (state.currentPage === 'read') {
            navigateTo('inbox');
        } else if (state.currentPage === 'inbox') {
            navigateTo('mail');
        } else {
            // Check modals like Settings
            const modals = document.querySelectorAll('.sheet-modal.active');
            if (modals.length > 0) closeAllModals();
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
    readPage: $('#read-page'),

    // Mail page
    emailText: $('#email-text'),
    copyBtn: $('#copy-btn'),
    generateBtn: $('#generate-btn'),
    settingsBtn: $('#settings-btn'),

    // Inbox page
    inboxList: $('#inbox-list'),
    emptyState: $('#empty-state'),
    refreshBtn: $('#refresh-btn'),

    // Read Page Elements
    readBackBtn: $('#read-back-btn'),
    readDeleteBtn: $('#read-delete-btn'),
    detailAvatar: $('#detail-avatar'),
    detailSender: $('#detail-sender'),
    detailFrom: $('#detail-from'),
    detailDate: $('#detail-date'),
    detailSubject: $('#detail-subject'),
    detailBody: $('#detail-body'),

    // Modals
    settingsModal: $('#settings-modal'),
    settingsClose: $('#settings-close'),
    notifyToggle: $('#notify-toggle'),

    // Navigation
    tabItems: $$('.tab-item'),
    navBadge: $('#nav-badge'),
    tabBar: $('.tab-bar'), // Added

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

// =========================================
// API & Sync
// =========================================

async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = { 'Content-Type': 'application/json', ...options.headers };

    if (state.account?.token) {
        headers['Authorization'] = `Bearer ${state.account.token}`;
    }

    const response = await fetch(url, { ...options, headers });
    if (response.status === 204) return null;
    if (!response.ok) throw new Error('API Error');
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

    return { id: account.id, email, password, token: auth.token };
}

async function getMessages() {
    if (!state.account) return [];
    try {
        const response = await apiRequest('/messages');
        return response['hydra:member'] || [];
    } catch (e) { return []; }
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

    // Tab Bar Visibility
    if (page === 'read') {
        elements.tabBar.style.display = 'none'; // Hide nav on read page
        if (tg) tg.BackButton.show();
    } else {
        elements.tabBar.style.display = 'flex';
        // Tab Selection
        elements.tabItems.forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        if (tg) {
            if (page === 'inbox') tg.BackButton.show();
            else tg.BackButton.hide();
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
    if (state.isLoading) {
        elements.emailText.textContent = 'Generating...';
    } else if (state.account?.email) {
        elements.emailText.textContent = state.account.email;
    } else {
        elements.emailText.textContent = 'Tap to retry';
        elements.emailText.style.cursor = 'pointer';
        elements.emailText.onclick = () => generateNewEmail();
    }
}

function updateInboxCount(count) {
    if (!elements.navBadge) return;
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
        elements.emptyState.style.display = 'flex';
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

    if (auth) {
        try {
            const decoded = atob(auth.replace(/-/g, '+').replace(/_/g, '/'));
            const [email, password] = decoded.split(':');
            if (email && password) {
                const authResponse = await apiRequest('/token', { method: 'POST', body: JSON.stringify({ address: email, password }) });
                state.account = { email, password, token: authResponse.token };
                saveAccount(state.account);
                window.history.replaceState({}, document.title, window.location.pathname);
                showToast('Synced from Telegram!', 'success');
                state.notificationsEnabled = true;
                if (elements.notifyToggle) elements.notifyToggle.checked = true;
            }
        } catch (e) { console.log('Auth error'); }
    }

    if (!state.account) state.account = loadAccount();

    if (state.account) {
        updateEmailDisplay();
        try { await getMessages(); } catch (e) { await generateNewEmail(); }
    } else {
        await generateNewEmail();
    }
}

async function generateNewEmail() {
    if (state.isLoading) return;
    state.isLoading = true;
    if (elements.generateBtn) elements.generateBtn.classList.add('loading');
    updateEmailDisplay(); // Shows 'Generating...' because isLoading is true

    try {
        const newAccount = await createAccount();
        state.account = newAccount;
        saveAccount(state.account);
        state.messages = [];
        renderInbox();
        showToast('New Identity Created', 'success');
        window.haptic?.('success');

        if (state.notificationsEnabled && state.isBotMode) syncToBot(newAccount);

    } catch (error) {
        console.error('Failed to generate email:', error);
        showToast('Failed to generate. Tap email to retry.', 'error');
        window.haptic?.('error');
        state.account = null; // Clear any partial state
    } finally {
        state.isLoading = false;
        if (elements.generateBtn) elements.generateBtn.classList.remove('loading');
        updateEmailDisplay(); // Update with final state (email or error)
    }
}

function syncToBot(account) {
    const data = `${account.email}:${account.password}`;
    let payload = btoa(data).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    // Logic to sync
}

async function loadInbox() {
    if (elements.refreshBtn) elements.refreshBtn.classList.add('loading');
    try {
        state.messages = await getMessages();
        renderInbox();
    } finally {
        if (elements.refreshBtn) elements.refreshBtn.classList.remove('loading');
    }
}

async function copyEmail() {
    if (!state.account?.email) {
        showToast('No email to copy yet', 'error');
        window.haptic?.('error');
        return;
    }
    try {
        // Try modern clipboard API first
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(state.account.email);
        } else {
            // Fallback for non-HTTPS or older browsers
            const textArea = document.createElement('textarea');
            textArea.value = state.account.email;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }
        showToast('Copied to clipboard', 'success');
        window.haptic?.('light');
    } catch (e) {
        console.error('Copy failed:', e);
        showToast('Failed to copy', 'error');
        window.haptic?.('error');
    }
}

async function openEmail(id) {
    window.haptic?.('light');
    try {
        const message = await getMessage(id);
        state.currentMessage = message;

        const senderName = message.from?.name || '';
        const senderEmail = message.from?.address || 'Unknown';

        // Populate Details
        elements.detailAvatar.textContent = getInitial(senderEmail);
        elements.detailSender.textContent = senderName || senderEmail.split('@')[0];
        elements.detailFrom.textContent = senderEmail;
        elements.detailDate.textContent = formatDate(message.createdAt);
        elements.detailSubject.textContent = message.subject || '(No Subject)';

        // Handle Body Content
        const htmlSource = Array.isArray(message.html) ? message.html[0] : message.html;

        if (htmlSource) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlSource, 'text/html');
            doc.querySelectorAll('script').forEach(el => el.remove());
            doc.querySelectorAll('a').forEach(el => {
                el.setAttribute('target', '_blank');
                el.setAttribute('rel', 'noopener noreferrer');
            });

            if (!elements.detailBody.shadowRoot) elements.detailBody.attachShadow({ mode: 'open' });

            elements.detailBody.shadowRoot.innerHTML = `
                <style>
                    :host { display: block; overflow-x: auto; }
                    body { 
                        background: transparent !important; 
                        color: var(--text-primary, #000); 
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                        margin: 0; padding: 0; 
                        font-size: 16px; line-height: 1.5;
                    }
                    img { max-width: 100%; height: auto; }
                    a { color: var(--accent, #007AFF); }
                </style>
            `;
            elements.detailBody.shadowRoot.appendChild(doc.body || doc.documentElement);
        } else {
            const content = message.text || '(No content)';
            if (!elements.detailBody.shadowRoot) elements.detailBody.attachShadow({ mode: 'open' });
            elements.detailBody.shadowRoot.innerHTML = `
                <style>
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
                        font-size: 16px; line-height: 1.5; 
                        color: var(--text-primary, #000); 
                        white-space: pre-wrap; margin: 0; 
                    }
                </style>
                <body>${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</body>
            `;
        }

        // Navigate to Read Page
        navigateTo('read');

        // Mark as read locally
        const item = $(`.email-item[data-id="${id}"]`);
        if (item) item.classList.remove('unread');

        // Mark read silently
        if (!message.seen) {
            apiRequest(`/messages/${id}`, { method: 'PATCH', body: JSON.stringify({ seen: true }) }).catch(() => { });
        }

    } catch (e) {
        showToast('Error opening email', 'error');
    }
}

// =========================================
// Event Listeners
// =========================================

function setupEventListeners() {
    // Navigation
    elements.tabItems.forEach(item => {
        item.addEventListener('click', () => navigateTo(item.dataset.page));
    });

    // Read Page Navigation
    if (elements.readBackBtn) elements.readBackBtn.addEventListener('click', () => navigateTo('inbox'));

    // Actions
    if (elements.copyBtn) elements.copyBtn.addEventListener('click', copyEmail);
    if (elements.generateBtn) elements.generateBtn.addEventListener('click', generateNewEmail);
    if (elements.refreshBtn) elements.refreshBtn.addEventListener('click', loadInbox);
    if (elements.settingsBtn) elements.settingsBtn.addEventListener('click', () => elements.settingsModal.classList.add('active'));

    // Settings
    if (elements.settingsClose) elements.settingsClose.addEventListener('click', () => elements.settingsModal.classList.remove('active'));
    if (elements.notifyToggle) elements.notifyToggle.addEventListener('change', handleNotificationToggle);

    // Delete Email
    if (elements.readDeleteBtn) {
        elements.readDeleteBtn.addEventListener('click', async () => {
            if (state.currentMessage) {
                tg.showConfirm("Delete this email?", async (yes) => {
                    if (yes) {
                        try {
                            await deleteMessage(state.currentMessage.id);
                            state.messages = state.messages.filter(m => m.id !== state.currentMessage.id);
                            // We go back to inbox
                            navigateTo('inbox');
                            showToast('Deleted', 'success');
                        } catch (e) {
                            showToast('Error deleting', 'error');
                        }
                    }
                });
            }
        });
    }

    // Close on click outside (settings sheet only now)
    $$('.sheet-overlay').forEach(overlay => {
        overlay.addEventListener('click', () => elements.settingsModal.classList.remove('active'));
    });
}

function closeAllModals() {
    elements.settingsModal.classList.remove('active');
}

// =========================================
// Loop
// =========================================

function startAutoRefresh() {
    if (state.autoRefreshInterval) clearInterval(state.autoRefreshInterval);
    state.autoRefreshInterval = setInterval(async () => {
        if (state.currentPage === 'inbox') await loadInbox();
    }, 15000);
}

// Init
async function init() {
    initTelegram();
    setupEventListeners();
    await initAccount();
    startAutoRefresh();
}

init();
