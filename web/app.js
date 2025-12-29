/**
 * TempMail Web App
 * Uses Mail.tm API directly from the browser
 */

const API_BASE = 'https://api.mail.tm';

// State
let currentAccount = null;
let autoRefreshInterval = null;

// DOM Elements
const elements = {
    emailAddress: document.getElementById('email-address'),
    copyBtn: document.getElementById('copy-btn'),
    newEmailBtn: document.getElementById('new-email-btn'),
    refreshBtn: document.getElementById('refresh-btn'),
    inboxContainer: document.getElementById('inbox-container'),
    messageCount: document.getElementById('message-count'),
    modal: document.getElementById('email-modal'),
    modalSubject: document.getElementById('modal-subject'),
    modalFrom: document.getElementById('modal-from'),
    modalDate: document.getElementById('modal-date'),
    modalBody: document.getElementById('modal-body'),
    closeModal: document.getElementById('close-modal'),
    deleteEmailBtn: document.getElementById('delete-email-btn'),
    toast: document.getElementById('toast'),
    loading: document.getElementById('loading')
};

// ===== Utility Functions =====

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
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getInitials(email) {
    return email.charAt(0).toUpperCase();
}

function stripHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
}

function showLoading() {
    elements.loading.classList.add('active');
}

function hideLoading() {
    elements.loading.classList.remove('active');
}

function showToast(message, type = 'success') {
    elements.toast.textContent = message;
    elements.toast.className = `toast ${type} show`;
    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 3000);
}

// ===== Storage =====

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

// ===== API Functions =====

async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (currentAccount?.token) {
        headers['Authorization'] = `Bearer ${currentAccount.token}`;
    }

    const response = await fetch(url, {
        ...options,
        headers
    });

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
    showLoading();
    try {
        // Get available domain
        const domains = await getDomains();
        const activeDomain = domains.find(d => d.isActive);

        if (!activeDomain) {
            throw new Error('No active domains available');
        }

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

        currentAccount = {
            id: account.id,
            email: email,
            password: password,
            token: auth.token
        };

        saveAccount(currentAccount);
        updateEmailDisplay();
        await refreshInbox();

        showToast('New email created!', 'success');

    } catch (error) {
        console.error('Error creating account:', error);
        showToast('Failed to create email. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

async function refreshToken() {
    if (!currentAccount) return false;

    try {
        const auth = await apiRequest('/token', {
            method: 'POST',
            body: JSON.stringify({
                address: currentAccount.email,
                password: currentAccount.password
            })
        });

        currentAccount.token = auth.token;
        saveAccount(currentAccount);
        return true;
    } catch (error) {
        console.error('Token refresh failed:', error);
        return false;
    }
}

async function getMessages() {
    if (!currentAccount) return [];

    try {
        const response = await apiRequest('/messages');
        return response['hydra:member'] || [];
    } catch (error) {
        // Try refreshing token
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

// ===== UI Functions =====

function updateEmailDisplay() {
    if (currentAccount) {
        elements.emailAddress.textContent = currentAccount.email;
    } else {
        elements.emailAddress.textContent = 'Click "New Email" to generate';
    }
}

function renderInbox(messages) {
    elements.messageCount.textContent = messages.length;

    if (messages.length === 0) {
        elements.inboxContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <p>Your inbox is empty</p>
                <span>Waiting for emails...</span>
            </div>
        `;
        return;
    }

    elements.inboxContainer.innerHTML = messages.map(msg => {
        const senderEmail = msg.from?.address || 'Unknown';
        const subject = msg.subject || '(No Subject)';
        const preview = msg.intro || '';
        const time = formatDate(msg.createdAt);
        const initial = getInitials(senderEmail);
        const unreadClass = !msg.seen ? 'unread' : '';

        return `
            <div class="email-item ${unreadClass}" data-id="${msg.id}">
                <div class="email-avatar">${initial}</div>
                <div class="email-content">
                    <div class="email-header">
                        <span class="email-sender">${senderEmail}</span>
                        <span class="email-time">${time}</span>
                    </div>
                    <div class="email-subject">${subject}</div>
                    <div class="email-preview">${preview}</div>
                </div>
            </div>
        `;
    }).join('');

    // Add click handlers
    document.querySelectorAll('.email-item').forEach(item => {
        item.addEventListener('click', () => openEmail(item.dataset.id));
    });
}

async function refreshInbox() {
    if (!currentAccount) return;

    try {
        const messages = await getMessages();
        renderInbox(messages);
    } catch (error) {
        console.error('Error refreshing inbox:', error);
    }
}

async function openEmail(id) {
    showLoading();
    try {
        const message = await getMessage(id);

        elements.modalSubject.textContent = message.subject || '(No Subject)';
        elements.modalFrom.textContent = message.from?.address || 'Unknown';
        elements.modalDate.textContent = formatDate(message.createdAt);

        // Get content (prefer text, fallback to HTML)
        let content = message.text || '';
        if (!content && message.html) {
            const htmlContent = Array.isArray(message.html) ? message.html[0] : message.html;
            content = stripHtml(htmlContent);
        }

        elements.modalBody.textContent = content || '(No content)';
        elements.deleteEmailBtn.dataset.id = id;

        elements.modal.classList.add('active');

        // Mark as read locally
        document.querySelector(`.email-item[data-id="${id}"]`)?.classList.remove('unread');

    } catch (error) {
        console.error('Error opening email:', error);
        showToast('Failed to load email', 'error');
    } finally {
        hideLoading();
    }
}

function closeEmailModal() {
    elements.modal.classList.remove('active');
}

async function handleDeleteEmail() {
    const id = elements.deleteEmailBtn.dataset.id;
    if (!id) return;

    showLoading();
    try {
        await deleteMessage(id);
        closeEmailModal();
        await refreshInbox();
        showToast('Email deleted', 'success');
    } catch (error) {
        console.error('Error deleting email:', error);
        showToast('Failed to delete email', 'error');
    } finally {
        hideLoading();
    }
}

async function copyEmail() {
    if (!currentAccount) return;

    try {
        await navigator.clipboard.writeText(currentAccount.email);
        showToast('Email copied to clipboard!', 'success');
    } catch (error) {
        // Fallback
        const textArea = document.createElement('textarea');
        textArea.value = currentAccount.email;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('Email copied!', 'success');
    }
}

// ===== Auto Refresh =====

function startAutoRefresh() {
    stopAutoRefresh();
    autoRefreshInterval = setInterval(async () => {
        if (currentAccount) {
            await refreshInbox();
        }
    }, 10000); // Refresh every 10 seconds
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// ===== Event Listeners =====

elements.newEmailBtn.addEventListener('click', createAccount);
elements.refreshBtn.addEventListener('click', async () => {
    showLoading();
    await refreshInbox();
    hideLoading();
    showToast('Inbox refreshed', 'success');
});
elements.copyBtn.addEventListener('click', copyEmail);
elements.closeModal.addEventListener('click', closeEmailModal);
elements.deleteEmailBtn.addEventListener('click', handleDeleteEmail);

// Close modal on backdrop click
elements.modal.addEventListener('click', (e) => {
    if (e.target === elements.modal) {
        closeEmailModal();
    }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && elements.modal.classList.contains('active')) {
        closeEmailModal();
    }
});

// ===== URL Auth Handling =====

function getAuthFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const auth = params.get('auth');
    if (!auth) return null;

    try {
        // Decode base64 credentials
        const decoded = atob(auth.replace(/-/g, '+').replace(/_/g, '/'));
        const [email, password] = decoded.split(':');
        if (email && password) {
            return { email, password };
        }
    } catch (e) {
        console.error('Failed to decode auth:', e);
    }
    return null;
}

async function loadFromAuth(email, password) {
    showLoading();
    try {
        // Get token for existing account
        const auth = await apiRequest('/token', {
            method: 'POST',
            body: JSON.stringify({ address: email, password })
        });

        currentAccount = {
            email: email,
            password: password,
            token: auth.token
        };

        saveAccount(currentAccount);
        updateEmailDisplay();
        await refreshInbox();

        showToast('Loaded email from Telegram', 'success');

        // Clear URL params
        window.history.replaceState({}, document.title, window.location.pathname);

    } catch (error) {
        console.error('Failed to load auth:', error);
        showToast('Email session expired. Creating new one...', 'error');
        await createAccount();
    } finally {
        hideLoading();
    }
}

// ===== Initialize =====

async function init() {
    // Check for auth in URL (from Telegram deep link)
    const urlAuth = getAuthFromUrl();

    if (urlAuth) {
        // Load account from Telegram
        await loadFromAuth(urlAuth.email, urlAuth.password);
    } else {
        // Try to load existing account from localStorage
        currentAccount = loadAccount();

        if (currentAccount) {
            // Verify account still works
            updateEmailDisplay();
            try {
                await refreshInbox();
            } catch (error) {
                // Account expired, create new one
                console.log('Account expired, creating new one');
                await createAccount();
            }
        } else {
            // Create new account
            await createAccount();
        }
    }

    // Start auto-refresh
    startAutoRefresh();
}

// Start the app
init();
