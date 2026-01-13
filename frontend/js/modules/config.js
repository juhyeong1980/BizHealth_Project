
// --- Config Module ---
// (Refactored to use Backend API)

const ConfigModule = (function () {

    function initDraftFromState() {
        console.log("Initializing Draft Config from Backend...");

        // Load Data from Backend
        Promise.all([
            fetch(`${API_BASE_URL}/api/company-list`).then(r => r.json()),
            fetch(`${API_BASE_URL}/api/company-map`).then(r => r.json()),
            fetch(`${API_BASE_URL}/api/company-exclude`).then(r => r.json())
        ]).then(([allCompanies, maps, excludes]) => {

            // Reconstruct STATE.rules for local manipulation (Drag & Drop)
            STATE.rules.merge = {};
            STATE.rules.exclude = new Set(excludes); // excludes is List[str]

            // Maps: [{original_name, standard_name}, ...]
            const parsedMaps = {};
            maps.forEach(m => {
                if (!parsedMaps[m.standard_name]) parsedMaps[m.standard_name] = [];
                parsedMaps[m.standard_name].push(m.original_name);
            });
            STATE.rules.merge = parsedMaps;

            // Prepare Source List (Items not in Merge or Exclude)
            const mappedSet = new Set();
            maps.forEach(m => mappedSet.add(m.original_name));

            const src = [];
            allCompanies.forEach(n => {
                if (!STATE.rules.exclude.has(n) && !mappedSet.has(n)) {
                    src.push(n);
                }
            });

            // Render
            renderDragAndDrop(src.sort());

            // Load Exam Config (if any)
            if (STATE.config && STATE.config.exam) {
                document.getElementById('cfg-exam-col').value = STATE.config.exam.targetCol ?? 13;
                // Assuming keywords are loaded via some other mechanism or simplified
            }

        }).catch(e => {
            console.error("Failed to load config data:", e);
            alert("설정 데이터를 불러오지 못했습니다.");
        });
    }

    function captureCurrentRules() {
        const nM = {}; // New Merge Map

        // Iterate over group-lists in DOM to capture current state
        document.querySelectorAll('.group-list').forEach(l => {
            const t = l.dataset.group; // Standard Name
            const i = Array.from(l.children).map(c => c.dataset.val); // Original Names
            if (i.length > 0) nM[t] = i;
        });

        const ex = Array.from(document.getElementById('excludeList').children).map(c => c.dataset.val);

        // Exam config not strictly part of "Sync" endpoint yet unless we added it to DTO. 
        // Backend `ConfigSyncDTO` has `exam_config`, but we didn't implement logic to save it in DB yet? 
        // Logic in main.py just ignores it or we didn't add DB table for it. 
        // For now, let's focus on Company Map/Exclude.

        return { merge: nM, exclude: ex };
    }

    function saveConfigAndRefresh() {
        const rules = captureCurrentRules();

        // Prepare Payload for /api/config/sync
        const maps = [];
        Object.entries(rules.merge).forEach(([std, originals]) => {
            originals.forEach(org => {
                maps.push({ original_name: org, standard_name: std });
            });
        });

        const payload = {
            maps: maps,
            excludes: rules.exclude
        };

        fetch(`${API_BASE_URL}/api/config/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'synced') {
                    alert('저장되었습니다.');
                    HAS_PENDING_CHANGES = false;
                    document.getElementById('btnCommit').classList.remove('active');

                    // Update Local State to match
                    STATE.rules.merge = rules.merge;
                    STATE.rules.exclude = new Set(rules.exclude);

                    // Trigger global recalc
                    if (typeof recalcAll === 'function') recalcAll();
                } else {
                    throw new Error("Sync failed");
                }
            })
            .catch(e => {
                console.error(e);
                alert("저장 실패: " + e.message);
            });
    }

    // --- Helper Functions (Drag & Drop, UI) ---

    function renderDragAndDrop(src) {
        const sL = document.getElementById('sourceList');
        const gC = document.getElementById('groupContainer');
        const eL = document.getElementById('excludeList');

        if (!sL || !gC || !eL) return;

        sL.innerHTML = ''; gC.innerHTML = ''; eL.innerHTML = '';

        src.forEach(n => sL.appendChild(createItem(n)));

        STATE.rules.exclude.forEach(n => eL.appendChild(createItem(n)));

        Object.entries(STATE.rules.merge).forEach(([t, i]) => {
            createGroupElement(t, i, gC);
        });

        initSortableFor(sL, markPending);
        initSortableFor(eL, markPending);
        document.getElementById('srcCnt').innerText = src.length;

        // Sortable + New Group Zone
        const ngz = document.getElementById('newGroupZone');
        if (ngz) {
            // Destroy existing if any? Sortable cleans up usually?
            new Sortable(ngz, {
                group: 'shared',
                onAdd: function (evt) {
                    const item = evt.item;
                    const defaultName = item.innerText.trim();
                    const name = prompt("새 그룹의 이름을 입력하세요:", defaultName);
                    if (name) {
                        createGroupAndAdd(name, item);
                    } else {
                        document.getElementById('sourceList').prepend(item);
                    }
                }
            });
            // Prevent default drag?
        }
    }

    function createGroupElement(t, items, container) {
        const c = document.createElement('div');
        c.className = 'group-card';
        c.innerHTML = `
            <div class="group-header">
                <span>${t}</span>
                <div>
                    <i class="fas fa-edit group-edit-btn" onclick="renameGroupManually(this)" title="이름 변경"></i>
                    <i class="fas fa-trash" style="color:red;cursor:pointer" onclick="deleteGroup(this)" title="그룹 삭제"></i>
                </div>
            </div>
            <div class="group-list" data-group="${t}"></div>`;

        const gl = c.querySelector('.group-list');
        items.forEach(x => gl.appendChild(createItem(x, true)));
        container.appendChild(c);
        initSortableFor(gl, markPending);
    }

    function createItem(t, isGroupItem = false) {
        const d = document.createElement('div');
        d.className = 'dd-item';
        d.dataset.val = t;
        d.title = t;

        let setBtnHtml = '';
        if (isGroupItem) {
            setBtnHtml = `<span class="item-set-btn" onclick="setAsGroupTitle(this, event)">대표로 설정</span>`;
        }

        d.innerHTML = `
            <div class="item-text">${t}</div>
            <div class="item-actions">
                ${setBtnHtml}
                <i class="fas fa-times item-remove-btn" onclick="restoreItem(this, event)"></i>
            </div>
        `;
        return d;
    }

    function initSortableFor(el, onEndCallback) {
        return new Sortable(el, {
            group: 'shared', animation: 150,
            onEnd: function (evt) { if (onEndCallback) onEndCallback(); }
        });
    }

    function markPending() {
        HAS_PENDING_CHANGES = true;
        const btn = document.getElementById('btnCommit');
        if (btn) btn.classList.add('active');
    }

    // --- Global Handlers (Existing logic adapted) ---

    function createGroupAndAdd(n, initialItem = null) {
        const gC = document.getElementById('groupContainer');
        const c = document.createElement('div');
        c.className = 'group-card';
        c.innerHTML = `
            <div class="group-header">
                <span>${n}</span>
                <div>
                    <i class="fas fa-edit group-edit-btn" onclick="renameGroupManually(this)" title="이름 변경"></i>
                    <i class="fas fa-trash" style="color:red;cursor:pointer" onclick="deleteGroup(this)" title="그룹 삭제"></i>
                </div>
            </div>
            <div class="group-list" data-group="${n}"></div>`;
        gC.prepend(c);

        const gl = c.querySelector('.group-list');
        if (initialItem) {
            const val = initialItem.dataset.val || initialItem.innerText.trim();
            const newItem = createItem(val, true);
            gl.appendChild(newItem);
            initialItem.remove();
        }
        initSortableFor(gl, markPending);
        markPending();
    }

    // Expose necessary functions
    return {
        initDraftFromState,
        saveConfigAndRefresh,
        createGroupAndAdd // Needed for global helpers?
    };

})();


// --- Global Functions for HTML Events ---

function saveConfigAndRefresh() { ConfigModule.saveConfigAndRefresh(); }

// ... Restore other global helpers like deleteGroup based on ConfigModule ...

function deleteGroup(el) {
    if (!confirm('그룹을 삭제하시겠습니까?')) return;
    const c = el.closest('.group-card');
    Array.from(c.querySelector('.group-list').children).forEach(i => {
        // Re-create generic item and append to source
        const newItem = ConfigModule.createGroupAndAdd ? null : null; // Need createItem exposed? 
        // Actually just append to sourceList is easier, createItem logic is simple.
        // Let's just move text.
        const t = i.dataset.val;
        const d = document.createElement('div');
        d.className = 'dd-item'; d.dataset.val = t; d.innerHTML = `<div class="item-text">${t}</div><div class="item-actions"><i class="fas fa-times item-remove-btn" onclick="restoreItem(this, event)"></i></div>`;
        document.getElementById('sourceList').appendChild(d);
        document.getElementById('srcCnt').innerText = document.getElementById('sourceList').children.length;
    });
    c.remove();
    // markPending logic?
    document.getElementById('btnCommit').classList.add('active');
}

function restoreItem(el, e) {
    if (e) e.stopPropagation();
    const item = el.closest('.dd-item');
    const t = item.dataset.val;
    // Create new generic item
    const d = document.createElement('div');
    d.className = 'dd-item'; d.dataset.val = t; d.title = t;
    d.innerHTML = `<div class="item-text">${t}</div><div class="item-actions"><i class="fas fa-times item-remove-btn" onclick="restoreItem(this, event)"></i></div>`;

    const srcList = document.getElementById('sourceList');
    if (srcList) {
        srcList.prepend(d);
        document.getElementById('srcCnt').innerText = srcList.children.length;
        document.getElementById('btnCommit').classList.add('active');
    }
    item.remove();
}

window.renameGroupManually = function (el) {
    const groupCard = el.closest('.group-card');
    if (!groupCard) return;
    const headerSpan = groupCard.querySelector('.group-header span');
    const groupList = groupCard.querySelector('.group-list');
    const oldName = headerSpan.innerText;

    const input = document.createElement('input');
    input.type = 'text'; input.value = oldName; input.className = 'modal-input';
    input.style.marginBottom = '0'; input.style.width = 'auto'; input.style.flex = '1'; input.style.marginRight = '10px';

    const finishEdit = () => {
        if (input.dataset.processing) return;
        input.dataset.processing = "true";
        const newName = input.value.trim();
        if (newName && newName !== oldName) {
            headerSpan.innerText = newName;
            groupList.dataset.group = newName;
            input.replaceWith(headerSpan);
            headerSpan.style.display = '';
            el.style.display = '';
            document.getElementById('btnCommit').classList.add('active');
        } else {
            input.replaceWith(headerSpan);
            headerSpan.style.display = '';
            el.style.display = '';
        }
    };

    input.onkeydown = function (e) {
        if (e.key === 'Enter') { finishEdit(); }
        else if (e.key === 'Escape') { input.dataset.processing = "true"; input.replaceWith(headerSpan); headerSpan.style.display = ''; el.style.display = ''; }
    };
    input.onblur = function () { finishEdit(); };

    headerSpan.style.display = 'none';
    headerSpan.replaceWith(input);
    input.focus();
    el.style.display = 'none';
};

window.setAsGroupTitle = function (el, e) {
    if (e) e.stopPropagation();
    const itemDiv = el.closest('.dd-item');
    const groupCard = itemDiv.closest('.group-card');
    if (!groupCard) return;

    const newName = itemDiv.dataset.val;
    const groupList = groupCard.querySelector('.group-list');
    const headerSpan = groupCard.querySelector('.group-header span');

    if (groupList && headerSpan) {
        if (groupList.dataset.group === newName) return;
        headerSpan.innerText = newName;
        groupList.dataset.group = newName;
        document.getElementById('btnCommit').classList.add('active');
    }
};

window.ConfigModule = ConfigModule;
window.initDraftFromState = ConfigModule.initDraftFromState;
window.createGroupAndAdd = ConfigModule.createGroupAndAdd;
