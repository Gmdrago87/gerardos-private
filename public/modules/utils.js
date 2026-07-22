export const USERNAME = 'GerardMaestre';
export const ITEMS_PER_PAGE = 9;
export const CACHE_KEY_USER = `gh_user_${USERNAME}`;
export const CACHE_KEY_REPOS = `gh_repos_${USERNAME}`;
export const CACHE_KEY_TIME = `gh_time_${USERNAME}`;
export const CACHE_DURATION = 60 * 60 * 1000;

export const FILTER_BTN_INACTIVE = 'px-4 py-1.5 bg-transparent border border-outline-variant/30 rounded-full text-[10px] font-bold text-on-surface uppercase tracking-wider cursor-pointer hover:bg-surface-variant transition-colors';
export const FILTER_BTN_ACTIVE = 'px-4 py-1.5 bg-white text-black border border-white rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors';
export const FILTER_BTN_ALL_ACTIVE = 'px-4 py-1.5 bg-white text-black border border-white rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors';

export const LANG_COLORS = {
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
    'Kotlin': '#A97BFF'
};

export function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

const htmlMap = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#039;"};
export function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => htmlMap[m]);
}

export function sanitizeUrl(url) {
    if (!url) return '#';
    return (url.startsWith('http://') || url.startsWith('https://')) ? url : '#';
}

export function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function highlightText(text, term) {
    if (!term) return escapeHtml(text);
    const escapedText = escapeHtml(text);
    const escapedTerm = escapeHtml(term);
    const regex = new RegExp(`(${escapeRegex(escapedTerm)})`, 'gi');
    return escapedText.replace(regex, '<mark class="search-highlight">$1</mark>');
}
