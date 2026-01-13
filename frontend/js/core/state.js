// --- Global State & Constants ---
const API_BASE_URL = (window.APP_CONFIG && window.APP_CONFIG.API_URL) ? window.APP_CONFIG.API_URL : "http://127.0.0.1:8000";
let RAW_ROWS = [];
const STATE = { years: new Set(), selectedYears: new Set(), rules: { merge: {}, exclude: [] } };
let HAS_PENDING_CHANGES = false;
let AGG_DATA = {};
let CLIENT_LIST = [];
let CLIENT_SORT_MODE = 'name';
window.CODE_MAP = {};
