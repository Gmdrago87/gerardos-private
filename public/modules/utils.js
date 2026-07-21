/**
 * Utility functions for GerardOS Private Dashboard
 */

// Configuration constants
export const USERNAME = 'GerardMaestre';
export const ITEMS_PER_PAGE = 9;
export const CACHE_KEY_USER = `gh_user_${USERNAME}`;
export const CACHE_KEY_REPOS = `gh_repos_${USERNAME}`;
export const CACHE_KEY_TIME = `gh_time_${USERNAME}`;
export const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// Filter button classes
export const FILTER_BTN_INACTIVE = 'filter-btn';
export const FILTER_BTN_ACTIVE = 'filter-btn filter-btn--active';
export const FILTER_BTN_ALL_ACTIVE = 'filter-btn filter-btn--active';

// Language colors for repository badges
export const LANG_COLORS = Object.freeze({
    'JavaScript': '#facc15',
    'TypeScript': '#3b82f6',
    'Python': '#22c55e',
    'HTML': '#f97316',
    'CSS': '#3b82f6',
    'Vue': '#42b883',
    'React': '#61dafb',
    'Java': '#b07219',
    'C++': '#f34b7d',
    'C#': '#178600',
    'Go': '#00ADD8',
    'Rust': '#dea584',
    'PHP': '#4F5D95',
    'Ruby': '#701516',
    'Swift': '#ffac45',
    'Kotlin': '#A97BFF',
    'Shell': '#89e051',
    'Dockerfile': '#384d54',
    'Markdown': '#083fa1',
    'JSON': '#292929'
});

// Error messages
export const ERROR_MESSAGES = Object.freeze({
    API: 'Error al conectar con la API',
    TREE: 'Error al obtener el árbol de archivos',
    FILE: 'Error al obtener el archivo',
    UNAUTHORIZED: 'UNAUTHORIZED',
    NETWORK: 'Error de red. Verifica tu conexión.',
    NOT_FOUND: 'Recurso no encontrado',
    RATE_LIMIT: 'Demasiadas peticiones. Espera un momento.',
    SESSION_EXPIRED: 'Sesión expirada. Por favor, inicia sesión nuevamente.'
});

/**
 * Debounce function to limit rapid function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function to limit function calls to once per period
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time period in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
    let inThrottle = false;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// HTML escape map
const htmlMap = Object.freeze({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
});

/**
 * Escape HTML special characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
export function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => htmlMap[m]);
}

/**
 * Sanitize URL to prevent XSS
 * @param {string} url - URL to sanitize
 * @returns {string} Sanitized URL or '#' if invalid
 */
export function sanitizeUrl(url) {
    if (!url) return '#';
    try {
        const parsed = new URL(url);
        // Only allow http/https protocols
        if (['http:', 'https:'].includes(parsed.protocol)) {
            return url;
        }
        return '#';
    } catch (e) {
        return '#';
    }
}

/**
 * Escape regex special characters
 * @param {string} string - String to escape
 * @returns {string} Escaped string
 */
export function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Highlight text matching a search term
 * @param {string} text - Text to highlight
 * @param {string} term - Search term
 * @returns {string} Text with matching terms highlighted
 */
export function highlightText(text, term) {
    if (!term) return escapeHtml(text);
    const escapedText = escapeHtml(text);
    const escapedTerm = escapeHtml(term);
    const regex = new RegExp(`(${escapeRegex(escapedTerm)})`, 'gi');
    return escapedText.replace(regex, '<mark class="search-highlight">$1</mark>');
}

/**
 * Format date to locale string
 * @param {string|Date} date - Date to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date
 */
export function formatDate(date, options = {}) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...options
    });
}

/**
 * Format date with time
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date with time
 */
export function formatDateTime(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Format relative time (e.g., "2 hours ago")
 * @param {string|Date} date - Date to format
 * @returns {string} Relative time string
 */
export function formatRelativeTime(date) {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);
    
    if (years > 0) return `hace ${years} año${years > 1 ? 's' : ''}`;
    if (months > 0) return `hace ${months} mes${months > 1 ? 'es' : ''}`;
    if (days > 0) return `hace ${days} día${days > 1 ? 's' : ''}`;
    if (hours > 0) return `hace ${hours} hora${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    if (seconds > 10) return `hace ${seconds} segundos`;
    return 'ahora';
}

/**
 * Format file size in human readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Truncate text to a maximum length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncate(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Capitalize first letter of a string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Generate a random ID
 * @param {number} length - Length of the ID
 * @returns {string} Random ID
 */
export function generateId(length = 8) {
    return Math.random().toString(36).substring(2, 2 + length);
}

/**
 * Check if element is in viewport
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} True if element is in viewport
 */
export function isInViewport(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

/**
 * Scroll to element smoothly
 * @param {HTMLElement|string} element - Element or selector
 * @param {Object} options - Scroll options
 */
export function scrollTo(element, options = {}) {
    const el = typeof element === 'string' ? document.querySelector(element) : element;
    if (!el) return;
    
    el.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        ...options
    });
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} True if successful
 */
export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (e) {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        return success;
    }
}

/**
 * Get URL parameter
 * @param {string} name - Parameter name
 * @returns {string|null} Parameter value or null
 */
export function getUrlParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
}

/**
 * Set URL parameter
 * @param {string} name - Parameter name
 * @param {string} value - Parameter value
 */
export function setUrlParam(name, value) {
    const url = new URL(window.location.href);
    url.searchParams.set(name, value);
    window.history.pushState({}, '', url.toString());
}

/**
 * Remove URL parameter
 * @param {string} name - Parameter name
 */
export function removeUrlParam(name) {
    const url = new URL(window.location.href);
    url.searchParams.delete(name);
    window.history.pushState({}, '', url.toString());
}

/**
 * Check if running in production
 * @returns {boolean} True if in production
 */
export function isProduction() {
    return process.env.NODE_ENV === 'production' || 
           window.location.protocol === 'https:' ||
           window.location.hostname.includes('pages.dev');
}

/**
 * Check if running in development
 * @returns {boolean} True if in development
 */
export function isDevelopment() {
    return !isProduction();
}
