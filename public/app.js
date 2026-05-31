/* ===================================================
   EchoSphere — app.js
   All client-side functionality for the UI
   =================================================== */

// ---- Sidebar ----

function toggleLeftSidebar() {
    const sidebar = document.getElementById('leftSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const isOpen = sidebar.classList.toggle('open');
    overlay.classList.toggle('active', isOpen);
    if (isOpen) fetchHistory();
}

// ---- Conversational Memory ----

let currentSessionHistory = [];

const MAX_HISTORY_PAIRS = 10; // keep last 10 user/assistant exchanges (20 messages)

function updateSessionHistory(task, data) {
    currentSessionHistory.push({ role: 'user', content: task });
    // Store a compact summary to stay within token limits
    const summary = (data.title || '') + (data.desc ? ': ' + data.desc.slice(0, 300) : '');
    currentSessionHistory.push({ role: 'assistant', content: summary });
    // Trim to the last MAX_HISTORY_PAIRS exchanges (2 messages per pair)
    if (currentSessionHistory.length > MAX_HISTORY_PAIRS * 2) {
        currentSessionHistory = currentSessionHistory.slice(-MAX_HISTORY_PAIRS * 2);
    }
}

// ---- New Chat ----

function startNewChat() {
    const feed = document.getElementById('feed');
    // Remove all child nodes except the welcome screen
    Array.from(feed.children).forEach(child => {
        if (child.id !== 'welcomeScreen') child.remove();
    });
    document.getElementById('welcomeScreen').classList.remove('display-none');
    currentSessionHistory = [];
    updateWelcomeMessage(false);
    toggleLeftSidebar();
}

// ---- History ----

let allHistory = [];

async function fetchHistory() {
    const list = document.getElementById('historyList');
    list.innerHTML = '<div class="history-empty">Loading…</div>';
    try {
        const res = await fetch('/api/history', {
            headers: await getAuthHeaders(),
            credentials: 'same-origin'
        });
        if (!res.ok) throw new Error('Failed to fetch');
        allHistory = await res.json();
        renderHistory(allHistory);
    } catch (err) {
        console.error('Failed to fetch history:', err);
        list.innerHTML = '<div class="history-empty">Could not load history.</div>';
    }
}

function renderHistory(items) {
    const list = document.getElementById('historyList');
    list.innerHTML = '';
    if (!items.length) {
        list.innerHTML = '<div class="history-empty">No history yet.</div>';
        return;
    }
    items.forEach(item => {
        const date = item.date ? new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
        const el = document.createElement('div');
        el.className = 'history-item';
        el.innerHTML = `
            <div class="history-item-icon">⚡</div>
            <div class="history-item-content">
                <div class="history-item-title">${escapeHtml(item.title || item.prompt)}</div>
                <div class="history-item-date">${escapeHtml(date)}</div>
            </div>`;
        el.addEventListener('click', () => setInput(item.prompt));
        list.appendChild(el);
    });
}

function filterHistory() {
    const q = document.getElementById('historySearch').value.toLowerCase();
    const filtered = allHistory.filter(item =>
        (item.title || '').toLowerCase().includes(q) ||
        (item.prompt || '').toLowerCase().includes(q)
    );
    renderHistory(filtered);
}

// ---- Optional Accounts ----

let clerkReady = false;
let clerkConfigured = false;

function setAuthButtonsEnabled(enabled) {
    ['signInBtn', 'signUpBtn'].forEach(id => {
        const button = document.getElementById(id);
        button.disabled = !enabled;
        button.classList.toggle('display-none', !enabled);
        button.title = enabled ? '' : 'Account sign-in is not configured yet. Guest mode remains available.';
    });
}

function loadExternalScript(src, attributes = {}) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.crossOrigin = 'anonymous';
        Object.entries(attributes).forEach(([name, value]) => script.setAttribute(name, value));
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Could not load ${src}`));
        document.head.appendChild(script);
    });
}

function getDisplayName() {
    if (!clerkReady || !window.Clerk.user) return '';
    return window.Clerk.user.firstName || '';
}

async function getAuthHeaders() {
    if (!clerkReady || !window.Clerk.session) return {};
    try {
        const token = await window.Clerk.session.getToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
    } catch (error) {
        console.error('Could not read the current account token:', error);
        return {};
    }
}

function updateAuthUi() {
    const signedIn = clerkReady && window.Clerk.isSignedIn;
    const label = document.getElementById('sessionLabel');
    const signIn = document.getElementById('signInBtn');
    const signUp = document.getElementById('signUpBtn');
    const userButton = document.getElementById('userButton');

    label.textContent = signedIn ? `${getDisplayName() || 'Account'} workspace` : 'Guest workspace';
    signIn.classList.toggle('display-none', signedIn);
    signUp.classList.toggle('display-none', signedIn);
    userButton.classList.toggle('display-none', !signedIn);

    if (signedIn && !userButton.hasChildNodes()) {
        window.Clerk.mountUserButton(userButton);
    }

    updateWelcomeMessage(false);
}

async function initOptionalAuth() {
    setAuthButtonsEnabled(false);
    try {
        const response = await fetch('/api/config', { credentials: 'same-origin' });
        const config = await response.json();
        clerkConfigured = Boolean(config.clerkEnabled && config.clerkPublishableKey);
        if (!clerkConfigured) return;

        const clerkDomain = atob(config.clerkPublishableKey.split('_')[2]).slice(0, -1);
        await loadExternalScript(`https://${clerkDomain}/npm/@clerk/ui@1/dist/ui.browser.js`);
        await loadExternalScript(
            `https://${clerkDomain}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`,
            { 'data-clerk-publishable-key': config.clerkPublishableKey }
        );
        await window.Clerk.load({
            ui: { ClerkUI: window.__internal_ClerkUICtor }
        });

        clerkReady = true;
        setAuthButtonsEnabled(true);
        updateAuthUi();
        window.Clerk.addListener(() => {
            updateAuthUi();
            allHistory = [];
            if (document.getElementById('leftSidebar').classList.contains('open')) fetchHistory();
        });
    } catch (error) {
        console.error('Optional account sign-in could not be initialized:', error);
    }
}

function openAuthModal(mode) {
    const modal = document.getElementById('authModal');
    const mount = document.getElementById('authMount');
    const title = document.getElementById('authModalTitle');
    modal.classList.remove('display-none');
    title.textContent = mode === 'sign-up' ? 'Create your EchoSphere account' : 'Sign in to EchoSphere';
    mount.innerHTML = '';

    if (!clerkReady) {
        mount.innerHTML = clerkConfigured
            ? '<p class="auth-unavailable">Account sign-in is still loading. You can continue in guest mode.</p>'
            : '<p class="auth-unavailable">Account sign-in will be available after the authentication keys are configured. Guest mode is ready now.</p>';
        return;
    }

    if (mode === 'sign-up') {
        window.Clerk.mountSignUp(mount);
    } else {
        window.Clerk.mountSignIn(mount);
    }
}

function closeAuthModal() {
    document.getElementById('authModal').classList.add('display-none');
    document.getElementById('authMount').innerHTML = '';
}

// ---- Dynamic Welcome ----

const welcomeMessages = [
    'What would you like to explore today?',
    'Ask a question, compare options, or look for a new opportunity.',
    'Start with a topic, a marketplace search, a job search, or a PDF.',
    'Your next useful answer can start with one clear question.'
];
let currentWelcomeMessageIndex = 0;

function updateWelcomeMessage(rotate = true) {
    const hour = new Date().getHours();
    const period = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    const name = getDisplayName();

    if (rotate) {
        const previous = Number(localStorage.getItem('echosphere-welcome-message') || '-1');
        currentWelcomeMessageIndex = (previous + 1) % welcomeMessages.length;
        localStorage.setItem('echosphere-welcome-message', String(currentWelcomeMessageIndex));
    }

    document.getElementById('welcomeGreeting').textContent = `Good ${period}${name ? `, ${name}` : ''}.`;
    document.getElementById('welcomeMessage').textContent = welcomeMessages[currentWelcomeMessageIndex];
}

// ---- Theme ----

function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    document.querySelector('.moon-icon').classList.toggle('display-none', !isDark);
    document.querySelector('.sun-icon').classList.toggle('display-none', isDark);
    localStorage.setItem('echosphere-theme', newTheme);
}

// ---- Input Helpers ----

function setInput(text) {
    const input = document.getElementById('taskInput');
    input.value = text;
    autoResize(input);
    input.focus();
}

function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleTask();
    }
}

function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

// ---- PDF UI ----

let attachedPdfFile = null;
const MAX_PDF_SIZE = 5 * 1024 * 1024;

function togglePdfManager() {
    const manager = document.getElementById('inlinePdfManager');
    manager.classList.toggle('display-none');
}

function browsePdfFiles() {
    const pdfInput = document.getElementById('pdfInput');
    pdfInput.value = '';
    pdfInput.click();
}

function formatFileSize(bytes) {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function showPdfError(message) {
    const error = document.getElementById('pdfError');
    error.textContent = message;
    error.classList.toggle('display-none', !message);
}

function attachPdf(file) {
    showPdfError('');
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        showPdfError('Only PDF documents can be analyzed.');
        return;
    }

    if (file.size > MAX_PDF_SIZE) {
        showPdfError('PDF files must be 5 MB or smaller.');
        return;
    }

    attachedPdfFile = file;
    document.getElementById('pdfFileName').textContent = file.name;
    document.getElementById('pdfFileSize').textContent = formatFileSize(file.size);
    document.getElementById('uploadZone').classList.add('display-none');
    document.getElementById('pdfAttached').classList.remove('display-none');
}

function removeAttachedPdf() {
    attachedPdfFile = null;
    showPdfError('');
    document.getElementById('pdfAttached').classList.add('display-none');
    document.getElementById('uploadZone').classList.remove('display-none');
}

// ---- Core Task Handling ----

async function handleTask() {
    const input = document.getElementById('taskInput');
    const task = input.value.trim();
    if (!task) return;

    input.value = '';
    autoResize(input);

    // Hide welcome screen on first submission
    const welcome = document.getElementById('welcomeScreen');
    if (welcome) welcome.classList.add('display-none');

    const feed = document.getElementById('feed');

    // Insert a loading card
    const loadingCard = document.createElement('div');
    loadingCard.className = 'card-loading';
    loadingCard.innerHTML = `
        <div class="loading-icon-placeholder"></div>
        <div class="loading-lines">
            <div class="skeleton-line w-75"></div>
            <div class="skeleton-line w-90"></div>
            <div class="skeleton-line w-55"></div>
        </div>`;
    feed.appendChild(loadingCard);
    feed.scrollTop = feed.scrollHeight;

    // Status text phases
    const statusEl = document.getElementById('loadingStatus');
    const statusText = document.getElementById('statusText');
    if (statusEl && statusText) {
        statusEl.classList.add('active');
        const phases = [
            'Discovering relevant web sources…',
            'Comparing evidence across sources…',
            attachedPdfFile ? 'Reading the attached PDF in memory…' : 'Structuring the academic brief…',
            'Preparing the cited research note…'
        ];
        let phaseIndex = 0;
        statusText.textContent = phases[0];
        const phaseInterval = setInterval(() => {
            phaseIndex++;
            if (phaseIndex < phases.length) statusText.textContent = phases[phaseIndex];
        }, 1500);

        try {
            const formData = new FormData();
            formData.append('task', task);
            formData.append('history', JSON.stringify(currentSessionHistory));
            if (attachedPdfFile) {
                formData.append('file', attachedPdfFile, attachedPdfFile.name);
            }
            const response = await fetch('/api/dispatch', {
                method: 'POST',
                headers: await getAuthHeaders(),
                credentials: 'same-origin',
                body: formData
            });
            const data = await response.json();
            clearInterval(phaseInterval);
            statusEl.classList.remove('active');
            loadingCard.remove();
            if (!data.error) {
                // Update conversational memory
                updateSessionHistory(task, data);
            }
            renderCard(data);
        } catch (err) {
            clearInterval(phaseInterval);
            console.error('Agent request failed:', err);
            statusText.textContent = 'Unable to process request. Please try again.';
            loadingCard.remove();
            setTimeout(() => statusEl.classList.remove('active'), 3000);
        }
    } else {
        // Fallback if status elements not present
        try {
            const formData = new FormData();
            formData.append('task', task);
            formData.append('history', JSON.stringify(currentSessionHistory));
            if (attachedPdfFile) {
                formData.append('file', attachedPdfFile, attachedPdfFile.name);
            }
            const response = await fetch('/api/dispatch', {
                method: 'POST',
                headers: await getAuthHeaders(),
                credentials: 'same-origin',
                body: formData
            });
            const data = await response.json();
            loadingCard.remove();
            if (!data.error) {
                updateSessionHistory(task, data);
            }
            renderCard(data);
        } catch (err) {
            console.error('Agent request failed:', err);
            loadingCard.remove();
        }
    }
}

function renderCard(data) {
    const feed = document.getElementById('feed');
    const metrics = Array.isArray(data.metrics) ? data.metrics : [];
    const metricsHtml = metrics.map(m => `<span class="metric-badge">${escapeHtml(m)}</span>`).join('');

    const card = document.createElement('div');
    card.className = 'card';

    const safeUrl = sanitizeUrl(data.realUrl);
    const formattedDesc = escapeHtml(data.desc || '').replace(/\n/g, '<br>');
    card.innerHTML = `
        <div class="card-icon">${escapeHtml(data.icon || '⚡')}</div>
        <div class="card-content">
            <h3>${escapeHtml(data.title || '')}</h3>
            <p>${formattedDesc}</p>
            <div class="metrics-row">${metricsHtml}</div>
            <div class="action-buttons">
                <button class="btn js-primary-action">${escapeHtml(data.primaryAction || 'Open')}</button>
                <button class="btn btn-outline js-download-action">Download Report</button>
                <button class="btn btn-outline js-dismiss-action">${escapeHtml(data.secondaryAction || 'Dismiss')}</button>
            </div>
        </div>`;

    card.querySelector('.js-primary-action').addEventListener('click', () => {
        window.open(safeUrl, '_blank', 'noopener,noreferrer');
    });
    card.querySelector('.js-download-action').addEventListener('click', () => {
        const reportText = `# ${data.title || 'EchoSphere research brief'}\n\n${data.desc || ''}\n\n## Source\n\n${safeUrl === '#' ? 'No verified source link was returned.' : `- ${safeUrl}`}\n`;
        const blob = new Blob([reportText], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (data.title || 'ecosphere-research-brief').replace(/[^a-z0-9_\-. ]/gi, '_') + '.md';
        a.click();
        URL.revokeObjectURL(url);
    });
    card.querySelector('.js-dismiss-action').addEventListener('click', () => {
        card.remove();
    });

    feed.appendChild(card);
    feed.scrollTop = feed.scrollHeight;
}

// ---- Utility ----

function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function sanitizeUrl(url) {
    if (!url || typeof url !== 'string') return '#';
    const trimmed = url.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return '#';
}

// ---- Init ----

document.addEventListener('DOMContentLoaded', () => {
    const pdfInput = document.getElementById('pdfInput');
    const uploadZone = document.getElementById('uploadZone');
    pdfInput.addEventListener('change', (event) => attachPdf(event.target.files && event.target.files[0]));
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadZone.addEventListener(eventName, event => {
            event.preventDefault();
            uploadZone.classList.add('dragging');
        });
    });
    ['dragleave', 'drop'].forEach(eventName => {
        uploadZone.addEventListener(eventName, event => {
            event.preventDefault();
            uploadZone.classList.remove('dragging');
        });
    });
    uploadZone.addEventListener('drop', event => attachPdf(event.dataTransfer.files[0]));
    document.getElementById('authModal').addEventListener('click', event => {
        if (event.target.id === 'authModal') closeAuthModal();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeAuthModal();
    });
    updateWelcomeMessage(true);
    initOptionalAuth();

    // Inject status bar into feed if not present
    const feed = document.getElementById('feed');
    if (feed && !document.getElementById('loadingStatus')) {
        const status = document.createElement('div');
        status.id = 'loadingStatus';
        status.className = 'loading-status';
        status.innerHTML = '<div class="spinner"></div><span id="statusText">Processing request…</span>';
        feed.parentElement.insertBefore(status, feed.nextSibling);
    }

    // Restore theme preference
    const saved = localStorage.getItem('echosphere-theme');
    if (saved) {
        document.documentElement.setAttribute('data-theme', saved);
        if (saved === 'light') {
            document.querySelector('.moon-icon').classList.add('display-none');
            document.querySelector('.sun-icon').classList.remove('display-none');
        }
    }
});
