// --- Common Utilities ---

function getYearColor(y) {
    const c = { 2021: '#2ecc71', 2022: '#3498db', 2023: '#e67e22', 2024: '#9b59b6', 2025: '#1abc9c', 2026: '#e74c3c' };
    return c[y] || `hsl(${(y * 137) % 360}, 65%, 55%)`;
}

function cleanName(n) { return n.replace(/^\(주\)|^\(유\)|^주식회사|^유한회사|\s/g, '').trim(); }

// --- Global UI Event Helpers ---
function toggleYearDropdown(e) { if (e) e.stopPropagation(); document.getElementById('yearDropList').classList.toggle('show'); }

// Close dropdowns when clicking outside
window.addEventListener('click', function (e) {
    if (!e.target.closest('.year-dropdown')) { const el = document.getElementById('yearDropList'); if (el) el.classList.remove('show'); }
    if (typeof ctxMenu !== 'undefined' && ctxMenu) ctxMenu.style.display = 'none';
    if (!e.target.closest('.search-select-wrapper')) { const el = document.getElementById('clientDropdownList'); if (el) el.style.display = 'none'; }
    if (e.target.id !== 'quickExcludeInput') { const el = document.getElementById('quickExcludeDropdown'); if (el) el.style.display = 'none'; }
});

// Context Menu (Exclude feature)
let ctxTarget = null;
const ctxMenu = document.getElementById('contextMenu'); // Note: Make sure contextMenu exists in DOM or check for null
function showContextMenu(e, el) {
    const menu = document.getElementById('contextMenu');
    if (!menu) return;
    e.preventDefault(); e.stopPropagation();
    ctxTarget = el;
    menu.style.display = 'block';
    menu.style.left = e.pageX + 'px';
    menu.style.top = e.pageY + 'px';
}
function toggleExcludeItem() { if (ctxTarget) ctxTarget.classList.toggle('excluded'); const menu = document.getElementById('contextMenu'); if (menu) menu.style.display = 'none'; }
