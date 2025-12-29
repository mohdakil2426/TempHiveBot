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
    autoRefreshInterval: null
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

    // Ready
    tg.ready();
    tg.expand();

    // Apply theme
    if (tg.colorScheme === 'dark') {
        document.body.classList.add('dark');
    }

    // Back button handler
    tg.BackButton.onClick(() => {
        if (document.getElementById('email-modal').classList.contains('active')) {
            closeModal();
        } else if (state.currentPage === 'inbox') {
            navigateTo('mail');
        }
    });

    // Haptic feedback helper
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
    copyFeedback: $('#copy-feedback'),
    generateBtn: $('#generate-btn'),
    generateBtnText: $('#generate-btn-text'),

    // Inbox page
    inboxCount: $('#inbox-count'),
    inboxList: $('#inbox-list'),
    emptyState: $('#empty-state'),
    refreshBtn: $('#refresh-btn'),

    // Email modal
    emailModal: $('#email-modal'),
    modalBack: $('#modal-back'),
    modalDelete: $('#modal-delete'),
    detailAvatar: $('#detail-avatar'),
    detailSender: $('#detail-sender'),
    detailFrom: $('#detail-from'),
    detailDate: $('#detail-date'),
    detailSubject: $('#detail-subject'),
    detailBody: $('#detail-body'),

    // Delete modal
    deleteModal: $('#delete-modal'),
    cancelDelete: $('#cancel-delete'),
    confirmDelete: $('#confirm-delete'),

    // Navigation
    navItems: $$('.nav-item'),
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

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });
}

function getInitial(email) {
    return (email?.charAt(0) || '?').toUpperCase();
}

function stripHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
}

function showToast(message, type = '') {
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
    // Get domain
    const domains = await getDomains();
    const activeDomain = domains.find(d => d.isActive);
    if (!activeDomain) throw new Error('No active domains');

    // Generate credentials
    const username = generateUsername();
    const password = generatePassword();
    const email = `${username}@${activeDomain.domain}`;

    // Create account
    const account = await apiRequest('/accounts', {
        method: 'POST',
        body: JSON.stringify({ address: email, password })
    });

    // Get token
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

    // Update pages
    $$('.page').forEach(p => p.classList.remove('active'));
    $(`#${page}-page`).classList.add('active');

    // Update nav
    elements.navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });

    // Telegram back button
    if (tg) {
        if (page === 'inbox') {
            tg.BackButton.show();
        } else {
            tg.BackButton.hide();
        }
    }

    // Load inbox data if needed
    if (page === 'inbox') {
        loadInbox();
    }

    window.haptic?.('light');
}

// =========================================
// UI Updates
// =========================================

function updateEmailDisplay() {
    elements.emailText.textContent = state.account?.email || 'Generating...';
}

function updateInboxCount(count) {
    elements.inboxCount.textContent = `${count} message${count !== 1 ? 's' : ''}`;

    // Update badge
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
        elements.emptyState.classList.add('show');
        return;
    }

    elements.emptyState.classList.remove('show');

    elements.inboxList.innerHTML = messages.map(msg => {
        const senderName = msg.from?.name || '';
        const senderEmail = msg.from?.address || 'Unknown';
        const displayName = senderName || senderEmail.split('@')[0];
        const subject = msg.subject || '(No Subject)';
        const preview = msg.intro || '';
        const time = formatDate(msg.createdAt);
        const initial = getInitial(senderEmail);
        const unreadClass = !msg.seen ? 'unread' : '';

        return `
            <div class="email-item ${unreadClass}" data-id="${msg.id}">
                <div class="email-avatar">${initial}</div>
                <div class="email-item-content">
                    <div class="email-item-header">
                        <span class="email-sender">${displayName}</span>
                        <span class="email-time">${time}</span>
                    </div>
                    <div class="email-subject">${subject}</div>
                    <div class="email-preview">${preview}</div>
                </div>
                ${!msg.seen ? '<div class="unread-dot"></div>' : ''}
            </div>
        `;
    }).join('');

    // Add click handlers
    $$('.email-item').forEach(item => {
        item.addEventListener('click', () => openEmail(item.dataset.id));
    });
}

// =========================================
// Actions
// =========================================

async function initAccount() {
    // Check URL params
    const params = new URLSearchParams(window.location.search);
    const auth = params.get('auth');
    const initialPage = params.get('page') || 'mail';

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

                // Navigate to requested page (usually inbox from bot)
                if (initialPage === 'inbox') {
                    navigateTo('inbox');
                }
            }
        } catch (e) {
            console.log('Auth from URL failed, creating new');
        }
    } else if (tg && !loadAccount()) {
        // Opened from Telegram menu button without synced email
        // Show message and create new email for this session
        showToast('Tip: Use "Open Mini App" button in chat for synced email', 'info');
    }

    // Load from storage
    if (!state.account) {
        state.account = loadAccount();
    }

    // Verify or create
    if (state.account) {
        updateEmailDisplay();
        try {
            await getMessages();
        } catch (error) {
            console.log('Account expired, creating new');
            await generateNewEmail();
        }
    } else {
        await generateNewEmail();
    }
}

async function generateNewEmail() {
    if (state.isLoading) return;

    state.isLoading = true;
    elements.generateBtn.disabled = true;
    elements.generateBtn.classList.add('loading');
    elements.generateBtnText.textContent = 'Generating...';
    elements.emailText.textContent = 'Generating...';

    try {
        state.account = await createAccount();
        saveAccount(state.account);
        updateEmailDisplay();
        state.messages = [];
        renderInbox();
        showToast('New email created!', 'success');
        window.haptic?.('success');
    } catch (error) {
        console.error('Error creating account:', error);
        showToast('Failed to create email', 'error');
        window.haptic?.('error');
    } finally {
        state.isLoading = false;
        elements.generateBtn.disabled = false;
        elements.generateBtn.classList.remove('loading');
        elements.generateBtnText.textContent = 'Generate New Email';
    }
}

async function loadInbox() {
    if (state.isLoading) return;

    elements.refreshBtn.classList.add('loading');

    try {
        state.messages = await getMessages();
        renderInbox();
    } catch (error) {
        console.error('Error loading inbox:', error);
        showToast('Failed to load inbox', 'error');
    } finally {
        elements.refreshBtn.classList.remove('loading');
    }
}

async function copyEmail() {
    if (!state.account) return;

    try {
        await navigator.clipboard.writeText(state.account.email);
        elements.copyFeedback.classList.add('show');
        window.haptic?.('light');
        setTimeout(() => {
            elements.copyFeedback.classList.remove('show');
        }, 2000);
    } catch (error) {
        // Fallback
        const textArea = document.createElement('textarea');
        textArea.value = state.account.email;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        elements.copyFeedback.classList.add('show');
        setTimeout(() => {
            elements.copyFeedback.classList.remove('show');
        }, 2000);
    }
}

async function openEmail(id) {
    window.haptic?.('light');

    try {
        const message = await getMessage(id);
        state.currentMessage = message;

        const senderName = message.from?.name || '';
        const senderEmail = message.from?.address || 'Unknown';

        elements.detailAvatar.textContent = getInitial(senderEmail);
        elements.detailSender.textContent = senderName || senderEmail.split('@')[0];
        elements.detailFrom.textContent = senderEmail;
        elements.detailDate.textContent = formatDate(message.createdAt);
        elements.detailSubject.textContent = message.subject || '(No Subject)';

        // Get body content
        let content = message.text || '';
        if (!content && message.html) {
            const htmlContent = Array.isArray(message.html) ? message.html[0] : message.html;
            content = stripHtml(htmlContent);
        }
        elements.detailBody.textContent = content || '(No content)';

        // Show modal
        elements.emailModal.classList.add('active');

        // Show back button
        if (tg) {
            tg.BackButton.show();
        }

        // Mark as read locally
        const item = $(`.email-item[data-id="${id}"]`);
        if (item) {
            item.classList.remove('unread');
            item.querySelector('.unread-dot')?.remove();
        }

    } catch (error) {
        console.error('Error loading email:', error);
        showToast('Failed to load email', 'error');
    }
}

function closeModal() {
    elements.emailModal.classList.remove('active');
    elements.deleteModal.classList.remove('active');
    state.currentMessage = null;

    // Update back button
    if (tg && state.currentPage === 'mail') {
        tg.BackButton.hide();
    }
}

function showDeleteConfirm() {
    elements.deleteModal.classList.add('active');
    window.haptic?.('warning');
}

async function confirmDeleteEmail() {
    if (!state.currentMessage) return;

    try {
        await deleteMessage(state.currentMessage.id);

        // Remove from list
        state.messages = state.messages.filter(m => m.id !== state.currentMessage.id);
        renderInbox();

        closeModal();
        showToast('Email deleted', 'success');
        window.haptic?.('success');
    } catch (error) {
        console.error('Error deleting email:', error);
        showToast('Failed to delete email', 'error');
    }
}

// =========================================
// Auto Refresh
// =========================================

function startAutoRefresh() {
    stopAutoRefresh();
    state.autoRefreshInterval = setInterval(async () => {
        if (state.currentPage === 'inbox' && !elements.emailModal.classList.contains('active')) {
            await loadInbox();
        }
    }, 15000); // 15 seconds
}

function stopAutoRefresh() {
    if (state.autoRefreshInterval) {
        clearInterval(state.autoRefreshInterval);
        state.autoRefreshInterval = null;
    }
}

// =========================================
// Event Listeners
// =========================================

function setupEventListeners() {
    // Navigation
    elements.navItems.forEach(item => {
        item.addEventListener('click', () => navigateTo(item.dataset.page));
    });

    // Mail page
    elements.copyBtn.addEventListener('click', copyEmail);
    elements.generateBtn.addEventListener('click', generateNewEmail);

    // Inbox page
    elements.refreshBtn.addEventListener('click', loadInbox);

    // Email modal
    elements.modalBack.addEventListener('click', closeModal);
    elements.modalDelete.addEventListener('click', showDeleteConfirm);
    elements.emailModal.querySelector('.modal-overlay').addEventListener('click', closeModal);

    // Delete modal
    elements.cancelDelete.addEventListener('click', () => {
        elements.deleteModal.classList.remove('active');
    });
    elements.confirmDelete.addEventListener('click', confirmDeleteEmail);
    elements.deleteModal.querySelector('.modal-overlay').addEventListener('click', () => {
        elements.deleteModal.classList.remove('active');
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
}

// =========================================
// Initialize
// =========================================

async function init() {
    initTelegram();
    setupEventListeners();
    await initAccount();
    updateEmailDisplay();
    startAutoRefresh();
}

// Start app
init();
