import en from './i18n/en.js';
import cs from './i18n/cs.js';

// ====================================
// NEIKI-ASSISTANT / CSS-INJECT
// ====================================
let NEIKI_ASSISTANT_CSS = '';
// ====================================
// END CSS-INJECT
// ====================================

const LOCALES = { en, cs };
const DEFAULT_ENDPOINT = '';
const STORAGE_PREFIX = 'neiki-assistant:';
const DEFAULT_MAX_HISTORY = 40;
const MAX_SESSIONS = 30;
const SVG = {
  chat: '<svg xmlns="http://www.w3.org/2000/svg" width="1.5em" height="1.5em" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none"/><path fill="currentColor" d="M2 22V4q0-.825.588-1.412T4 2h16q.825 0 1.413.588T22 4v12q0 .825-.587 1.413T20 18H6zm4-8h8v-2H6zm0-3h12V9H6zm0-3h12V6H6z"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true" width="1.5em" height="1.5em"><path d="m7 7 10 10M17 7 7 17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
  send: '<svg viewBox="0 0 24 24" aria-hidden="true" width="1.5em" height="1.5em"><path d="m5 12 14-7-4.8 14-2.6-5.7L5 12Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  trash: '<svg viewBox="0 0 24 24" aria-hidden="true" width="1.5em" height="1.5em"><path d="M9 5h6m-8 4h10m-9 0 .7 10h6.6L16 9" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  history: '<svg viewBox="0 0 24 24" aria-hidden="true" width="1.5em" height="1.5em"><path d="M12 8v4l2.6 1.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.6 9A7.5 7.5 0 1 1 4 13.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M4.6 4.8v4.4H9" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  spark: '<svg xmlns="http://www.w3.org/2000/svg" width="1.8em" height="1.8em" viewBox="0 0 512 512"><path d="M0 0h512v512H0z" fill="none"/><path fill="currentColor" d="m320 192l-85.333-32L320 127.968l32-85.301l32.03 85.301L469.333 160l-85.303 32L352 277.333zM149.333 362.667L42.667 320l106.666-42.667L192 170.667l42.667 106.666L341.333 320l-106.666 42.667L192 469.333z"/></svg>'
};

const cssReady = NEIKI_ASSISTANT_CSS
  ? Promise.resolve(NEIKI_ASSISTANT_CSS)
  : fetch(new URL('./styles.css', import.meta.url)).then((response) => response.text()).catch(() => '');

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const sanitizeUrl = (url) => {
  const value = String(url || '').trim();
  if (/^(https?:|mailto:|tel:)/i.test(value) || value.startsWith('#') || value.startsWith('/')) return value;
  return '#';
};

const autoGrow = (textarea) => {
  textarea.style.height = 'auto';
  textarea.style.height = `${Math.min(textarea.scrollHeight, 132)}px`;
};

const normalizeMessages = (value) => Array.isArray(value)
  ? value.filter((message) => message && ['user', 'assistant', 'system', 'error'].includes(message.role))
  : [];

class MarkdownRenderer {
  constructor(labels) {
    this.labels = labels;
  }

  render(markdown) {
    const blocks = [];
    const text = String(markdown ?? '').replace(/\r\n/g, '\n');
    const codePattern = /```([\w-]*)\n?([\s\S]*?)```/g;
    let cursor = 0;
    let match;

    while ((match = codePattern.exec(text))) {
      if (match.index > cursor) blocks.push(this.renderText(text.slice(cursor, match.index)));
      blocks.push(this.renderCode(match[2], match[1]));
      cursor = codePattern.lastIndex;
    }

    if (cursor < text.length) blocks.push(this.renderText(text.slice(cursor)));
    return blocks.join('');
  }

  renderText(text) {
    const paragraphs = escapeHtml(text).trim().split(/\n{2,}/).filter(Boolean);
    return paragraphs.map((paragraph) => {
      if (/^(\s*[-*]\s+.+\n?)+$/.test(paragraph)) {
        const items = paragraph.split('\n').map((line) => line.replace(/^\s*[-*]\s+/, '')).filter(Boolean);
        return `<ul>${items.map((item) => `<li>${this.inline(item)}</li>`).join('')}</ul>`;
      }
      if (/^(\s*\d+\.\s+.+\n?)+$/.test(paragraph)) {
        const items = paragraph.split('\n').map((line) => line.replace(/^\s*\d+\.\s+/, '')).filter(Boolean);
        return `<ol>${items.map((item) => `<li>${this.inline(item)}</li>`).join('')}</ol>`;
      }
      return `<p>${this.inline(paragraph).replace(/\n/g, '<br>')}</p>`;
    }).join('');
  }

  inline(text) {
    return text
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_all, label, url) => {
        return `<a href="${escapeHtml(sanitizeUrl(url))}" target="_blank" rel="noopener noreferrer">${label}</a>`;
      });
  }

  renderCode(code, language) {
    const lang = escapeHtml(language || 'text');
    const highlighted = this.highlight(code, language);
    return `<div class="neiki-code" data-code="${escapeHtml(code)}">
      <div class="neiki-code-bar"><span>${lang}</span><button class="neiki-copy" type="button">${escapeHtml(this.labels.copy)}</button></div>
      <pre><code>${highlighted}</code></pre>
    </div>`;
  }

  highlight(code, language = '') {
    let value = escapeHtml(code);
    value = value.replace(/(&quot;.*?&quot;|&#39;.*?&#39;|`.*?`)/g, '<span class="tok-string">$1</span>');
    value = value.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tok-number">$1</span>');
    value = value.replace(/\b(const|let|var|function|return|if|else|for|while|class|new|await|async|try|catch|import|export|from)\b/g, '<span class="tok-keyword">$1</span>');
    if (/html|xml|svg/.test(language)) {
      value = value.replace(/(&lt;\/?[\w-]+)/g, '<span class="tok-tag">$1</span>');
    }
    return value;
  }
}

class NeikiAssistant extends HTMLElement {
  static get observedAttributes() {
    return [
      'api',
      'title',
      'subtitle',
      'welcome',
      'placeholder',
      'language',
      'theme',
      'accent',
      'position',
      'storage-key',
      'max-history',
      'open'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.messages = [];
    this.sessions = [];
    this.activeSessionId = null;
    this.isOpen = false;
    this.isHistoryOpen = false;
    this.isSending = false;
    this.abortController = null;
    this.boundOnSubmit = this.onSubmit.bind(this);
    this.boundOnInput = this.onInput.bind(this);
    this.boundOnKeyDown = this.onKeyDown.bind(this);
    this.boundOnDocumentClick = this.onDocumentClick.bind(this);
  }

  connectedCallback() {
    this.renderShell();
    this.applyAttributes();
    this.updateStaticText();
    this.loadConversation();
    if (!this.messages.length && this.option('welcome')) {
      this.messages = [{ role: 'assistant', content: this.option('welcome') }];
    }
    this.renderMessages();
    this.renderHistoryPanel();
    this.bindEvents();
    if (this.hasAttribute('open')) this.open();
  }

  disconnectedCallback() {
    this.abortController?.abort();
    document.removeEventListener('click', this.boundOnDocumentClick);
  }

  attributeChangedCallback(name) {
    if (!this.shadowRoot?.innerHTML) return;
    if (name === 'open') this.syncOpenAttribute();
    this.applyAttributes();
    this.updateStaticText();
    this.renderMessages();
    this.renderHistoryPanel();
  }

  get locale() {
    const language = (this.getAttribute('language') || document.documentElement.lang || navigator.language || 'en').slice(0, 2).toLowerCase();
    return LOCALES[language] ? language : 'en';
  }

  get labels() {
    return { ...LOCALES.en, ...LOCALES[this.locale] };
  }

  get storageKey() {
    return `${STORAGE_PREFIX}${this.getAttribute('storage-key') || location.pathname || 'default'}`;
  }

  get historyStorageKey() {
    return `${this.storageKey}:sessions`;
  }

  get activeSessionStorageKey() {
    return `${this.storageKey}:active`;
  }

  get maxHistory() {
    const value = Number(this.getAttribute('max-history'));
    return Number.isFinite(value) && value > 0 ? value : DEFAULT_MAX_HISTORY;
  }

  option(name) {
    return this.getAttribute(name) || this.labels[name] || '';
  }

  renderShell() {
    this.shadowRoot.innerHTML = `
      <style></style>
      <div class="neiki-root">
        <section class="neiki-window" role="dialog" aria-modal="false" aria-label="${escapeHtml(this.option('title'))}">
          <header class="neiki-header">
            <div class="neiki-avatar">${SVG.spark}</div>
            <div class="neiki-header-text">
              <h2 class="neiki-title"></h2>
              <p class="neiki-subtitle"></p>
            </div>
            <div class="neiki-actions">
              <button class="neiki-icon-button neiki-history" type="button"></button>
              <button class="neiki-icon-button neiki-clear" type="button"></button>
              <button class="neiki-icon-button neiki-close" type="button"></button>
            </div>
          </header>
          <div class="neiki-history-panel"></div>
          <div class="neiki-messages" role="log" aria-live="polite"></div>
          <form class="neiki-composer">
            <div class="neiki-input-wrap">
              <textarea class="neiki-input" rows="1"></textarea>
              <button class="neiki-send" type="submit"></button>
            </div>
            <div class="neiki-footer"></div>
          </form>
        </section>
        <button class="neiki-launcher" type="button">
          <span class="neiki-chat">${SVG.chat}</span>
          <span class="neiki-x">${SVG.close}</span>
        </button>
      </div>
    `;
    cssReady.then((css) => {
      const style = this.shadowRoot.querySelector('style');
      if (style) style.textContent = css;
    });
  }

  bindEvents() {
    this.$('.neiki-launcher').addEventListener('click', () => this.toggle());
    this.$('.neiki-close').addEventListener('click', () => this.close());
    this.$('.neiki-clear').addEventListener('click', () => this.clear());
    this.$('.neiki-history').addEventListener('click', (event) => {
      event.stopPropagation();
      this.toggleHistory();
    });
    this.$('.neiki-history-panel').addEventListener('click', (event) => {
      const clearAll = event.target.closest('.neiki-history-clear-all');
      if (clearAll) {
        this.clearAllHistory();
        return;
      }
      const remove = event.target.closest('.neiki-history-delete');
      if (remove) {
        event.stopPropagation();
        this.deleteSession(remove.dataset.session);
        return;
      }
      const select = event.target.closest('.neiki-history-select');
      if (select) this.selectSession(select.dataset.session);
    });
    this.$('.neiki-composer').addEventListener('submit', this.boundOnSubmit);
    this.$('.neiki-input').addEventListener('input', this.boundOnInput);
    this.$('.neiki-input').addEventListener('keydown', this.boundOnKeyDown);
    this.$('.neiki-messages').addEventListener('click', (event) => this.onMessageClick(event));
    document.addEventListener('click', this.boundOnDocumentClick);
  }

  $(selector) {
    return this.shadowRoot.querySelector(selector);
  }

  applyAttributes() {
    const accent = this.getAttribute('accent');
    if (accent) this.style.setProperty('--neiki-accent', accent);
    this.dataset.theme = this.getAttribute('theme') || 'auto';
  }

  syncOpenAttribute() {
    this.isOpen = this.hasAttribute('open');
    this.$('.neiki-root')?.classList.toggle('is-open', this.isOpen);
  }

  updateStaticText() {
    this.$('.neiki-title').textContent = this.option('title');
    this.$('.neiki-subtitle').textContent = this.option('subtitle');
    this.$('.neiki-input').placeholder = this.option('placeholder');
    this.$('.neiki-send').title = this.labels.send;
    this.$('.neiki-send').setAttribute('aria-label', this.labels.send);
    this.$('.neiki-send').innerHTML = SVG.send;
    this.$('.neiki-clear').title = this.labels.clear;
    this.$('.neiki-clear').setAttribute('aria-label', this.labels.clear);
    this.$('.neiki-clear').innerHTML = SVG.trash;
    this.$('.neiki-history').title = this.labels.history;
    this.$('.neiki-history').setAttribute('aria-label', this.labels.history);
    this.$('.neiki-history').innerHTML = SVG.history;
    this.$('.neiki-close').title = this.labels.close;
    this.$('.neiki-close').setAttribute('aria-label', this.labels.close);
    this.$('.neiki-close').innerHTML = SVG.close;
    this.$('.neiki-launcher').title = this.isOpen ? this.labels.close : this.labels.open;
    this.$('.neiki-launcher').setAttribute('aria-label', this.isOpen ? this.labels.close : this.labels.open);
    this.$('.neiki-footer').textContent = this.labels.poweredBy;
  }

  renderMessages() {
    const container = this.$('.neiki-messages');
    const renderer = new MarkdownRenderer(this.labels);
    if (!this.messages.length) {
      container.innerHTML = `<div class="neiki-empty">${escapeHtml(this.labels.empty)}</div>`;
      return;
    }
    container.innerHTML = this.messages.map((message, index) => {
      const role = message.role === 'user' ? 'user' : message.role === 'error' ? 'error' : 'assistant';
      const retry = role === 'error' && message.retry
        ? `<button class="neiki-copy" type="button" data-retry="${index}">${escapeHtml(this.labels.retry)}</button>`
        : '';
      return `<article class="neiki-message is-${role}" data-index="${index}">
        <div class="neiki-bubble">${renderer.render(message.content)}${retry}</div>
      </article>`;
    }).join('');
    this.scrollToBottom();
  }

  renderTyping() {
    const container = this.$('.neiki-messages');
    const node = document.createElement('article');
    node.className = 'neiki-message is-assistant';
    node.dataset.typing = 'true';
    node.innerHTML = `<div class="neiki-bubble"><span class="neiki-typing" aria-label="${escapeHtml(this.labels.typing)}"><span></span><span></span><span></span></span></div>`;
    container.append(node);
    this.scrollToBottom();
  }

  removeTyping() {
    this.shadowRoot.querySelector('[data-typing="true"]')?.remove();
  }

  open() {
    this.isOpen = true;
    this.$('.neiki-root').classList.add('is-open');
    this.setAttribute('open', '');
    this.updateStaticText();
    setTimeout(() => this.$('.neiki-input')?.focus(), 80);
  }

  close() {
    this.isOpen = false;
    this.$('.neiki-root').classList.remove('is-open');
    this.removeAttribute('open');
    this.updateStaticText();
    this.closeHistory();
  }

  toggle() {
    this.isOpen ? this.close() : this.open();
  }

  clear() {
    this.closeHistory();
    this.activeSessionId = this.generateId();
    this.messages = this.option('welcome') ? [{ role: 'assistant', content: this.option('welcome') }] : [];
    this.renderMessages();
    this.dispatchEvent(new CustomEvent('neiki:clear'));
  }

  toggleHistory() {
    this.isHistoryOpen ? this.closeHistory() : this.openHistory();
  }

  openHistory() {
    this.isHistoryOpen = true;
    this.renderHistoryPanel();
    this.$('.neiki-history-panel')?.classList.add('is-open');
  }

  closeHistory() {
    this.isHistoryOpen = false;
    this.$('.neiki-history-panel')?.classList.remove('is-open');
  }

  onDocumentClick(event) {
    if (!this.isHistoryOpen) return;
    const path = event.composedPath();
    if (path.includes(this.$('.neiki-history')) || path.includes(this.$('.neiki-history-panel'))) return;
    this.closeHistory();
  }

  selectSession(id) {
    if (!id || id === this.activeSessionId) {
      this.closeHistory();
      return;
    }
    const session = this.sessions.find((item) => item.id === id);
    if (!session) return;
    this.activeSessionId = session.id;
    this.messages = session.messages;
    try {
      localStorage.setItem(this.activeSessionStorageKey, this.activeSessionId);
    } catch {
      /* Persistence is a convenience, not a hard dependency. */
    }
    this.renderMessages();
    this.closeHistory();
  }

  hasContent(session) {
    return session.messages.some((message) => message.role === 'user');
  }

  renderHistoryPanel() {
    const panel = this.$('.neiki-history-panel');
    if (!panel) return;
    const items = this.sessions.filter((session) => this.hasContent(session));
    const list = items.length
      ? items.map((session) => {
        const id = escapeHtml(session.id);
        const title = escapeHtml(session.title || this.labels.newConversation);
        const date = escapeHtml(this.formatDate(session.updatedAt));
        const active = session.id === this.activeSessionId ? ' is-active' : '';
        return `<div class="neiki-history-item${active}">
          <button type="button" class="neiki-history-select" data-session="${id}">
            <span class="neiki-history-title">${title}</span>
            <span class="neiki-history-date">${date}</span>
          </button>
          <button type="button" class="neiki-history-delete" data-session="${id}" title="${escapeHtml(this.labels.historyDelete)}" aria-label="${escapeHtml(this.labels.historyDelete)}">&times;</button>
        </div>`;
      }).join('')
      : `<div class="neiki-history-empty">${escapeHtml(this.labels.historyEmpty)}</div>`;

    panel.innerHTML = `
      <div class="neiki-history-head">
        <span class="neiki-history-label">${escapeHtml(this.labels.history)}</span>
        <button type="button" class="neiki-history-clear-all"${items.length ? '' : ' disabled'}>${escapeHtml(this.labels.historyClearAll)}</button>
      </div>
      <div class="neiki-history-list">${list}</div>
    `;
  }

  deleteSession(id) {
    if (!id) return;
    this.sessions = this.sessions.filter((session) => session.id !== id);
    try {
      localStorage.setItem(this.historyStorageKey, JSON.stringify(this.sessions));
    } catch {
      /* Persistence is a convenience, not a hard dependency. */
    }
    if (id === this.activeSessionId) {
      this.activeSessionId = this.generateId();
      this.messages = this.option('welcome') ? [{ role: 'assistant', content: this.option('welcome') }] : [];
      this.renderMessages();
    }
    this.renderHistoryPanel();
  }

  clearAllHistory() {
    if (!this.sessions.some((session) => this.hasContent(session))) return;
    if (!confirm(this.labels.historyClearAllConfirm)) return;
    this.sessions = [];
    this.activeSessionId = this.generateId();
    this.messages = this.option('welcome') ? [{ role: 'assistant', content: this.option('welcome') }] : [];
    try {
      localStorage.removeItem(this.historyStorageKey);
      localStorage.removeItem(this.activeSessionStorageKey);
    } catch {
      /* Persistence is a convenience, not a hard dependency. */
    }
    this.renderMessages();
    this.renderHistoryPanel();
  }

  formatDate(timestamp) {
    if (!timestamp) return '';
    try {
      return new Date(timestamp).toLocaleString(this.locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  deriveTitle(messages) {
    const first = messages.find((message) => message.role === 'user');
    if (!first) return '';
    const text = first.content.trim().replace(/\s+/g, ' ');
    return text.length > 42 ? `${text.slice(0, 42)}…` : text;
  }

  generateId() {
    return `s_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }

  async sendMessage(content) {
    const text = String(content || '').trim();
    if (!text || this.isSending) return;
    this.open();
    this.messages.push({ role: 'user', content: text });
    this.trimHistory();
    this.persist();
    this.renderMessages();
    await this.requestAssistant(text);
  }

  onSubmit(event) {
    event.preventDefault();
    const input = this.$('.neiki-input');
    const value = input.value;
    input.value = '';
    autoGrow(input);
    this.sendMessage(value);
  }

  onInput(event) {
    autoGrow(event.currentTarget);
  }

  onKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.$('.neiki-composer').requestSubmit();
    }
  }

  onMessageClick(event) {
    const copy = event.target.closest('.neiki-copy');
    if (!copy) return;
    const retryIndex = copy.dataset.retry;
    if (retryIndex) {
      const failed = this.messages[Number(retryIndex)];
      if (failed?.retry) this.sendMessage(failed.retry);
      return;
    }
    const code = copy.closest('.neiki-code')?.dataset.code || '';
    navigator.clipboard?.writeText(code);
    copy.textContent = this.labels.copied;
    setTimeout(() => { copy.textContent = this.labels.copy; }, 1100);
  }

  async requestAssistant(latestMessage) {
    const api = this.getAttribute('api') || DEFAULT_ENDPOINT;
    if (!api) {
      this.addError(this.labels.networkError, latestMessage);
      return;
    }

    this.isSending = true;
    this.$('.neiki-send').disabled = true;
    this.abortController = new AbortController();
    this.renderTyping();

    try {
      const response = await fetch(api, {
        body: JSON.stringify({
          messages: this.messages.filter((message) => message.role !== 'error'),
          locale: this.locale
        }),
        headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream, text/plain' },
        method: 'POST',
        signal: this.abortController.signal
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.removeTyping();

      const contentType = response.headers.get('content-type') || '';
      if (response.body && (contentType.includes('text/event-stream') || contentType.includes('text/plain'))) {
        await this.readStream(response);
      } else {
        const data = await response.json();
        const content = data.reply || data.message || data.content || data.text || '';
        this.messages.push({ role: 'assistant', content: String(content || this.labels.error) });
      }

      this.trimHistory();
      this.persist();
      this.renderMessages();
      this.dispatchEvent(new CustomEvent('neiki:message', { detail: { messages: this.messages } }));
    } catch (error) {
      if (error.name !== 'AbortError') this.addError(this.labels.error, latestMessage);
    } finally {
      this.removeTyping();
      this.isSending = false;
      this.$('.neiki-send').disabled = false;
      this.abortController = null;
    }
  }

  async readStream(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const assistant = { role: 'assistant', content: '' };
    this.messages.push(assistant);
    let done = false;
    while (!done) {
      const chunk = await reader.read();
      done = chunk.done;
      const text = decoder.decode(chunk.value || new Uint8Array(), { stream: !done });
      assistant.content += this.parseStreamChunk(text);
      this.renderMessages();
    }
  }

  parseStreamChunk(text) {
    return text.split('\n').map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') return '';
      if (!trimmed.startsWith('data:')) return line;
      const payload = trimmed.slice(5).trim();
      try {
        const json = JSON.parse(payload);
        return json.delta || json.content || json.message || json.choices?.[0]?.delta?.content || '';
      } catch {
        return payload;
      }
    }).join('');
  }

  addError(content, retry) {
    this.removeTyping();
    this.messages.push({ role: 'error', content, retry });
    this.trimHistory();
    this.persist();
    this.renderMessages();
  }

  readJson(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch {
      return null;
    }
  }

  loadSessions() {
    const raw = this.readJson(this.historyStorageKey);
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((session) => session && typeof session.id === 'string')
      .map((session) => ({
        id: session.id,
        title: String(session.title || ''),
        updatedAt: Number(session.updatedAt) || 0,
        messages: normalizeMessages(session.messages)
      }))
      .filter((session) => this.hasContent(session));
  }

  loadConversation() {
    this.sessions = this.loadSessions();
    const activeId = localStorage.getItem(this.activeSessionStorageKey);
    let session = this.sessions.find((item) => item.id === activeId);
    if (!session) {
      const legacy = normalizeMessages(this.readJson(this.storageKey));
      session = { id: this.generateId(), title: this.deriveTitle(legacy), updatedAt: Date.now(), messages: legacy };
      this.sessions.unshift(session);
    }
    this.activeSessionId = session.id;
    this.messages = session.messages;
  }

  persist() {
    const trimmed = this.messages.slice(-this.maxHistory);
    const existing = this.sessions.find((session) => session.id === this.activeSessionId);
    if (this.hasContent({ messages: trimmed })) {
      const title = this.deriveTitle(trimmed);
      if (existing) {
        existing.messages = trimmed;
        existing.title = title;
        existing.updatedAt = Date.now();
      } else {
        this.sessions.unshift({ id: this.activeSessionId, title, updatedAt: Date.now(), messages: trimmed });
      }
    } else if (existing) {
      this.sessions = this.sessions.filter((session) => session.id !== this.activeSessionId);
    }
    this.sessions = this.sessions.filter((session) => this.hasContent(session));
    this.sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    this.sessions = this.sessions.slice(0, MAX_SESSIONS);
    try {
      localStorage.setItem(this.historyStorageKey, JSON.stringify(this.sessions));
      localStorage.setItem(this.activeSessionStorageKey, this.activeSessionId);
    } catch {
      /* Persistence is a convenience, not a hard dependency. */
    }
    this.renderHistoryPanel();
  }

  trimHistory() {
    this.messages = this.messages.slice(-this.maxHistory);
  }

  scrollToBottom() {
    requestAnimationFrame(() => {
      const container = this.$('.neiki-messages');
      if (container) container.scrollTop = container.scrollHeight;
    });
  }
}

if (!customElements.get('neiki-assistant')) {
  customElements.define('neiki-assistant', NeikiAssistant);
}

export default NeikiAssistant;
