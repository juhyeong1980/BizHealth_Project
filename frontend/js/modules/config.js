
// --- Config Module ---
// (Refactored to use Backend API)

const ConfigModule = (function () {

    // [Fix] Ensure API_BASE_URL is defined
    const API_BASE_URL = window.APP_CONFIG ? window.APP_CONFIG.API_URL : "http://127.0.0.1:8000";

    // [State]
    let EXAM_TYPES = []; // Distinct values from DB
    let EXAM_RULES = []; // Current rules
    let ACTIVE_RULE_CARD = null; // Track which card is being edited

    function initDraftFromState() {
        console.log("Initializing Draft Config from Backend...");

        // Load Data from Backend
        Promise.all([
            fetch(`${API_BASE_URL}/api/company-list`).then(r => r.json()),
            fetch(`${API_BASE_URL}/api/company-map`).then(r => r.json()),
            fetch(`${API_BASE_URL}/api/company-exclude`).then(r => r.json()),
            // [NEW] Exam Config Data
            fetch(`${API_BASE_URL}/api/config/exam-rules`).then(r => r.json()),
            fetch(`${API_BASE_URL}/api/exam-types`).then(r => r.json())
        ]).then(([allCompanies, maps, excludes, rules, types]) => {

            // Reconstruct STATE.rules for local manipulation
            STATE.rules.merge = {};
            STATE.rules.exclude = new Set(excludes);

            // Maps
            const parsedMaps = {};
            maps.forEach(m => {
                if (!parsedMaps[m.standard_name]) parsedMaps[m.standard_name] = [];
                parsedMaps[m.standard_name].push(m.original_name);
            });
            STATE.rules.merge = parsedMaps;

            // Prepare Source List
            const mappedSet = new Set();
            maps.forEach(m => mappedSet.add(m.original_name));

            const src = [];
            allCompanies.forEach(n => {
                if (!STATE.rules.exclude.has(n) && !mappedSet.has(n)) {
                    src.push(n);
                }
            });

            // Exam State
            EXAM_RULES = rules;
            EXAM_TYPES = types;

            // Render
            renderDragAndDrop(src.sort());
            renderExamRules(); // [NEW]

            // [Fix] Bind Save Buttons
            document.querySelectorAll('.btn-commit').forEach(btn => {
                btn.onclick = saveConfigAndRefresh;
            });

        }).catch(e => {
            console.error("Failed to load config data:", e);
            alert("설정 데이터를 불러오지 못했습니다.");
        });
    }

    // Capture Rules from DOM
    function captureExamRules() {
        const rules = [];
        const container = document.getElementById('examRuleContainer');
        if (!container) return [];

        Array.from(container.children).forEach((card, idx) => {
            const name = card.querySelector('.rule-name').value.trim();
            const tags = Array.from(card.querySelectorAll('.keyword-tag')).map(t => {
                // Robust text extraction: Clone and remove icon
                const clone = t.cloneNode(true);
                const icon = clone.querySelector('i');
                if (icon) icon.remove();
                return clone.innerText.trim();
            });

            rules.push({
                category_name: name,
                keywords: tags.join(','), // CSV format for backend
                priority: idx + 1
            });
        });
        return rules;
    }

    // [Fix] Capture current state from DOM for saving
    function captureCurrentRules() {
        const merge = {};
        const exclude = new Set();

        // 1. Capture Merged Groups
        const groupContainer = document.getElementById('groupContainer');
        if (groupContainer) {
            Array.from(groupContainer.children).forEach(card => {
                const header = card.querySelector('.group-header span');
                if (!header) return;
                const stdName = header.innerText.trim();
                const list = card.querySelector('.group-list');
                if (list) {
                    // [Fix] initialize if not exists (defensive, though createGroupAndAdd mostly solves it)
                    if (!merge[stdName]) merge[stdName] = [];

                    Array.from(list.children).forEach(item => {
                        merge[stdName].push(item.dataset.val);
                    });
                }
            });
        }

        // 2. Capture Excludes
        const excludeList = document.getElementById('excludeList');
        if (excludeList) {
            Array.from(excludeList.children).forEach(item => {
                exclude.add(item.dataset.val);
            });
        }

        return { merge, exclude };
    }

    function saveConfigAndRefresh() {
        const rules = captureCurrentRules();
        const examRules = captureExamRules(); // [NEW]

        // 1. Company Map/Exclude Payload
        const maps = [];
        Object.entries(rules.merge).forEach(([std, originals]) => {
            originals.forEach(org => {
                maps.push({ original_name: org, standard_name: std });
            });
        });

        const syncPayload = {
            maps: maps,
            excludes: Array.from(rules.exclude)
        };

        // 2. Parallel Save
        Promise.all([
            fetch(`${API_BASE_URL}/api/config/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(syncPayload)
            }).then(r => r.json()),

            fetch(`${API_BASE_URL}/api/config/exam-rules`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(examRules)
            }).then(r => r.json())
        ])
            .then(([syncRes, ruleRes]) => {
                if (syncRes.status === 'synced' && ruleRes.status === 'success') {
                    alert('모든 설정이 저장되었습니다.');
                    HAS_PENDING_CHANGES = false;
                    document.querySelectorAll('.btn-commit').forEach(btn => btn.classList.remove('active'));

                    // Update Local State
                    STATE.rules.merge = rules.merge;
                    STATE.rules.exclude = new Set(rules.exclude);
                    // Trigger global recalc
                    if (typeof recalcAll === 'function') recalcAll();
                } else {
                    throw new Error("Save incomplete");
                }
            })
            .catch(e => {
                console.error(e);
                alert("저장 실패: " + e.message);
            });
    }

    // --- Exam Rule Rendering ---

    function renderExamRules() {
        const c = document.getElementById('examRuleContainer');
        if (!c) return;
        c.innerHTML = '';

        EXAM_RULES.forEach(rule => {
            const div = document.createElement('div');
            div.className = 'exam-rule-card';
            div.style.cssText = "background:#f9f9f9; padding:10px; margin-bottom:8px; border:1px solid #eee; border-radius:5px; display:flex; flex-direction:column; gap:8px;";

            const keywords = rule.keywords ? rule.keywords.split(',').filter(k => k.trim()) : [];
            const tagHtml = keywords.map(k =>
                `<span class="keyword-tag" style="background:#e0f7fa; color:#006064; padding:2px 8px; border-radius:12px; font-size:12px; margin-right:5px; display:inline-block;">
                    ${k} <i class="fas fa-times" style="cursor:pointer; margin-left:3px; opacity:0.6;" onclick="removeKeyword(this)"></i>
                 </span>`
            ).join('');

            div.innerHTML = `
                <div style="display:flex; align-items:center; justify-content:space-between;">
                    <div style="display:flex; align-items:center; gap:10px; flex:1;">
                        <span class="drag-handle" style="cursor:grab; color:#999; font-size:18px;">☰</span>
                        <input type="text" class="rule-name modal-input" value="${rule.category_name}" style="width:150px; font-weight:bold;">
                    </div>
                </div>
                <div style="background:white; padding:8px; border:1px dashed #ccc; border-radius:4px; display:flex; flex-wrap:wrap; align-items:center; gap:5px;">
                    <div class="tags-area" style="display:flex; flex-wrap:wrap;">${tagHtml}</div>
                    <button onclick="openKeywordModal(this)" style="border:none; background:#eee; padding:4px 8px; border-radius:4px; font-size:11px; cursor:pointer; color:#555; hover:background:#ddd;">+ 키워드 선택</button>
                </div>
            `;
            c.appendChild(div);
        });

        // Enable Sortable
        new Sortable(c, {
            animation: 150,
            handle: '.drag-handle',
            onEnd: markPending
        });
    }

    // Export helper to global scope for HTML event handlers
    window.openKeywordModal = function (btn) {
        ACTIVE_RULE_CARD = btn.closest('.exam-rule-card');
        const container = document.getElementById('keywordModal');
        const list = document.getElementById('keywordCheckList');

        // Get existing tags
        const currentTags = Array.from(ACTIVE_RULE_CARD.querySelectorAll('.keyword-tag'))
            .map(t => t.innerText.replace('×', '').trim());

        let html = '';
        EXAM_TYPES.forEach(t => {
            const checked = currentTags.includes(t) ? 'checked' : '';
            html += `
                <label style="display:block; margin-bottom:5px; cursor:pointer;">
                    <input type="checkbox" value="${t}" ${checked}> ${t}
                </label>`;
        });

        list.innerHTML = html;
        container.style.display = 'flex';
    };

    window.closeKeywordModal = function () {
        document.getElementById('keywordModal').style.display = 'none';
        ACTIVE_RULE_CARD = null;
    };

    window.applyKeywords = function () {
        if (!ACTIVE_RULE_CARD) return;

        const checks = document.querySelectorAll('#keywordCheckList input[type="checkbox"]:checked');
        const selected = Array.from(checks).map(c => c.value);

        const tagsArea = ACTIVE_RULE_CARD.querySelector('.tags-area');

        // Re-render tags
        const tagHtml = selected.map(k =>
            `<span class="keyword-tag" style="background:#e0f7fa; color:#006064; padding:2px 8px; border-radius:12px; font-size:12px; margin-right:5px; display:inline-block;">
                ${k} <i class="fas fa-times" style="cursor:pointer; margin-left:3px; opacity:0.6;" onclick="removeKeyword(this)"></i>
             </span>`
        ).join('');

        tagsArea.innerHTML = tagHtml;

        closeKeywordModal();
        markPending();
    };

    window.removeKeyword = function (icon) {
        icon.parentElement.remove();
        markPending();
    };

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
            // Prevent default drag?
        }

        // [New] Render Dropdowns for Manual Merge
        renderDropdowns(src, Object.keys(STATE.rules.merge));

        // [New] Render Mapping Table
        renderMappingTable();
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
        document.querySelectorAll('.btn-commit').forEach(btn => btn.classList.add('active'));
    }

    // --- Global Handlers (Existing logic adapted) ---

    function createGroupAndAdd(n, initialItem = null) {
        const gC = document.getElementById('groupContainer');

        // [Fix] Check for existing group first
        let existingGroupList = null;
        for (let card of gC.children) {
            const header = card.querySelector('.group-header span');
            if (header && header.innerText.trim() === n.trim()) {
                existingGroupList = card.querySelector('.group-list');
                // Flash effect to show it was added to existing
                card.style.transition = "background 0.3s";
                const originalBg = card.style.background;
                card.style.background = "#fff3cd"; // Highlight
                setTimeout(() => { card.style.background = originalBg; }, 500);
                break;
            }
        }

        if (existingGroupList) {
            if (initialItem) {
                const val = initialItem.dataset.val || initialItem.innerText.trim();
                const newItem = createItem(val, true);
                existingGroupList.appendChild(newItem);
                initialItem.remove(); // Remove from source / previous location
                initSortableFor(existingGroupList, markPending);
                markPending();
            }
            return;
        }

        // Create New Group Card
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

    // --- Dropdown Manual Merge Logic ---

    function renderDropdowns(srcList, groupList) {
        const dlSource = document.getElementById('dl-source');
        const dlTarget = document.getElementById('dl-target');

        if (!dlSource || !dlTarget) return;

        // Populate Source Datalist (Unclassified)
        dlSource.innerHTML = '';
        srcList.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            dlSource.appendChild(opt);
        });

        // Populate Target Datalist (Existing Groups)
        dlTarget.innerHTML = '';
        const groups = Object.keys(STATE.rules.merge).sort();
        // Fix Syntax: Ensure renderDropdowns closes correctly if this was it
        // Assuming previous code was:
        // function renderDropdowns(...) { ... groups.forEach(...) }
        // So:
        groups.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            dlTarget.appendChild(opt);
        });
    } // End of renderDropdowns (inferred)

    function renderMappingTable() {
        const tbody = document.getElementById('mapping-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        const rows = [];
        // Flatten STATE.rules.merge for table
        Object.entries(STATE.rules.merge).forEach(([std, originals]) => {
            originals.forEach(org => {
                rows.push({ org, std });
            });
        });

        // Sort by Representative Name (std), then Original Name (org)
        rows.sort((a, b) => {
            if (a.std !== b.std) return a.std.localeCompare(b.std);
            return a.org.localeCompare(b.org);
        });

        if (rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px; color:#999;">병합된 항목이 없습니다.</td></tr>';
            return;
        }

        let lastStd = null;

        rows.forEach(r => {
            const tr = document.createElement('tr');

            // Visual separator for new groups
            let borderStyle = 'border-bottom:1px solid #eee;';
            if (lastStd !== r.std) {
                if (lastStd !== null) {
                    borderStyle = 'border-top:2px solid #bbb; border-bottom:1px solid #eee;';
                }
            }

            // Only show Representative Name if it changed (Group Header Style)
            // User asked: "representative name changed part boundary".
            // Let's show representative name always, but highlight the boundary.
            const stdDisplay = (lastStd !== r.std) ? `<strong>${r.std}</strong>` : `<span style="color:#ccc;">"</span>`;
            // Actually user just asked for boundary. Let's keep it simple: Show standard name always, but add strong border.

            tr.innerHTML = `
                <td style="padding:10px; ${borderStyle} border-right:1px solid #eee; font-weight:bold; color:#2980b9;">${stdDisplay}</td>
                <td style="padding:10px; ${borderStyle} text-align:left;">${r.org}</td>
                <td style="padding:10px; ${borderStyle} text-align:center;">
                    <button onclick="ConfigModule.unmergeItem('${r.org}', '${r.std}')" style="background:#e74c3c; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:11px;">해제</button>
                </td>
            `;
            tbody.appendChild(tr);
            lastStd = r.std;
        });
    }

    function unmergeItem(org, std) {
        if (!confirm(`'${org}' 항목의 병합을 해제하시겠습니까?`)) return;

        // Remove from STATE.rules.merge
        const arr = STATE.rules.merge[std];
        if (arr) {
            const idx = arr.indexOf(org);
            if (idx > -1) arr.splice(idx, 1);
            if (arr.length === 0) delete STATE.rules.merge[std];
        }

        // Refresh UI
        // Re-calculate Unclassified Source List?
        // Simplest is to reload from source or just append to sourceList in API
        // But here we rely on STATE.
        // Let's just trigger full re-render logic if possible, or simpler:
        // 1. Add back to Source List in DOM
        // 2. Remove from Group in DOM
        // 3. Re-render Table

        // Ideally, we should re-run the full 'init' logic or 'renderDragAndDrop' with updated STATE?
        // But STATE doesn't track 'All Companies' explicitly in a variable we can reuse easily without fetching?
        // Wait, initDraftFromState fetches.
        // Let's just create a quick 'reload' function or hack the DOM.

        // Hack DOM for speed:
        // Find item in Group List and move to Source List
        // But we have `restoreItem` global function!
        // We need to find the DOM element `div[data-val="${org}"]` inside `.group-list`

        const groupLists = document.querySelectorAll('.group-list');
        let foundEl = null;
        groupLists.forEach(gl => {
            for (let c of gl.children) {
                if (c.dataset.val === org) { foundEl = c; break; }
            }
        });

        if (foundEl) {
            foundEl.remove();
            // Create new Source Item
            const sL = document.getElementById('sourceList');
            if (sL) {
                const d = document.createElement('div');
                d.className = 'dd-item'; d.dataset.val = org; d.innerHTML = `<div class="item-text">${org}</div><div class="item-actions"><i class="fas fa-times item-remove-btn" onclick="restoreItem(this, event)"></i></div>`;
                sL.prepend(d);
                document.getElementById('srcCnt').innerText = sL.children.length;
            }
        }

        // Update Table
        renderMappingTable();
        renderDropdowns(
            Array.from(document.getElementById('sourceList').children).map(c => c.dataset.val),
            Object.keys(STATE.rules.merge)
        );

        markPending();
    }

    function manualMergeAction() {
        const srcInput = document.getElementById('manual-source-input');
        const tgtInput = document.getElementById('manual-target-input');

        const srcVal = srcInput.value.trim();
        const tgtVal = tgtInput.value.trim();

        if (!srcVal || !tgtVal) {
            alert("원본 이름과 표준 이름을 모두 입력해주세요.");
            return;
        }

        // Validate Source Existence (Must be in Unclassified Source List)
        // We check the DOM of sourceList for simplicity? Or STATE?
        // Let's check DOM to ensure it's available.
        const sourceListDiv = document.getElementById('sourceList');
        let foundItem = null;
        for (let child of sourceListDiv.children) {
            if (child.innerText === srcVal || child.dataset.val === srcVal) {
                foundItem = child;
                break;
            }
        }

        if (!foundItem) {
            // Check if it's already in a group
            alert(`'${srcVal}' 항목을 '미분류' 목록에서 찾을 수 없습니다.\n이미 그룹에 속해 있거나 제외된 항목일 수 있습니다.`);
            return;
        }

        // Logic similar to Drop: Find target group card or create new
        const groupContainer = document.getElementById('groupContainer');
        let targetGroupList = null;

        // Find existing group
        for (let card of groupContainer.children) {
            const header = card.querySelector('.group-header span');
            if (header && header.innerText === tgtVal) {
                targetGroupList = card.querySelector('.group-list');
                break;
            }
        }

        if (targetGroupList) {
            // Add to existing
            const newItem = createItem(srcVal, true);
            targetGroupList.appendChild(newItem);
            foundItem.remove(); // Remove from source
        } else {
            // Create new group
            createGroupAndAdd(tgtVal, foundItem);
            // createGroupAndAdd handles removing from source internally if passed
        }

        // Refresh Dropdowns (Remove used source item, Add new target if created)
        // Ideally we re-render dropdowns, but full re-render is expensive?
        // Let's just clear inputs for now.
        srcInput.value = '';
        tgtInput.value = '';

        // Re-read current state to refresh dropdowns?
        // Or just let user continue.
        // A simple way is to remove the moved option from datalist
        const optToRemove = document.querySelector(`#dl-source option[value="${srcVal}"]`);
        if (optToRemove) optToRemove.remove();

        // Add target to datalist if not exists
        const optExists = document.querySelector(`#dl-target option[value="${tgtVal}"]`);
        if (!optExists) {
            const opt = document.createElement('option');
            opt.value = tgtVal;
            document.getElementById('dl-target').appendChild(opt);
        }

        markPending();
        alert(`[${srcVal}] -> [${tgtVal}] 병합 완료!`);
        renderMappingTable(); // Added renderMappingTable here
    }



    // Expose necessary functions
    return {
        initDraftFromState,
        saveConfigAndRefresh,
        createGroupAndAdd, // Needed for global helpers?
        manualMergeAction,
        unmergeItem
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
    document.querySelectorAll('.btn-commit').forEach(btn => btn.classList.add('active'));
}

function restoreItem(el, e) {
    if (e) e.stopPropagation();
    const item = el.closest('.dd-item');
    const t = item.dataset.val;

    // Check if this action is from Exclude List
    const isFromExclude = el.closest('#excludeList') !== null;

    if (isFromExclude) {
        // If restoring from Exclude, check if this was a Merged Group
        // Find visible group card with this name
        const groupLists = document.querySelectorAll('.group-list');
        let targetGroupCard = null;
        groupLists.forEach(gl => {
            if (gl.dataset.group === t) targetGroupCard = gl.closest('.group-card');
        });

        if (targetGroupCard) {
            // It was a group exclusion. Just unmark the group card.
            targetGroupCard.style.opacity = '1';
            targetGroupCard.style.border = '';
            targetGroupCard.title = '';
            const badge = targetGroupCard.querySelector('.excl-badge');
            if (badge) badge.remove();

            // Do NOT add to Source List (because the group structure is intact)
            item.remove();

            // Mark pending
            document.querySelectorAll('.btn-commit').forEach(btn => btn.classList.add('active'));
            return;
        }
        // If not a group card, fall through to default behavior (add to Source)
    }

    // Default: Move to Source List (Unmerge or Restore Item)
    const d = document.createElement('div');
    d.className = 'dd-item'; d.dataset.val = t; d.title = t;
    d.innerHTML = `<div class="item-text">${t}</div><div class="item-actions"><i class="fas fa-times item-remove-btn" onclick="restoreItem(this, event)"></i></div>`;

    const srcList = document.getElementById('sourceList');
    if (srcList) {
        srcList.prepend(d);
        document.getElementById('srcCnt').innerText = srcList.children.length;
        document.querySelectorAll('.btn-commit').forEach(btn => btn.classList.add('active'));
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
            document.querySelectorAll('.btn-commit').forEach(btn => btn.classList.add('active'));
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
        document.querySelectorAll('.btn-commit').forEach(btn => btn.classList.add('active'));
    }
};

window.ConfigModule = ConfigModule;
window.initDraftFromState = ConfigModule.initDraftFromState;
window.createGroupAndAdd = ConfigModule.createGroupAndAdd;

// [Fix] Global Search Functions for Config Page
window.filterList = function (listId, query) {
    const list = document.getElementById(listId);
    if (!list) return;
    const q = query.toLowerCase();
    Array.from(list.children).forEach(item => {
        const txt = item.innerText.toLowerCase();
        item.style.display = txt.includes(q) ? '' : 'none';
    });
};

window.filterGroups = function (query) {
    const container = document.getElementById('groupContainer');
    if (!container) return;
    const q = query.toLowerCase();
    Array.from(container.children).forEach(card => {
        const header = card.querySelector('.group-header span');
        if (header) {
            const txt = header.innerText.toLowerCase();
            card.style.display = txt.includes(q) ? '' : 'none';
        }
    });
};

window.filterQuickExclude = function () {
    const input = document.getElementById('quickExcludeInput');
    const dropdown = document.getElementById('quickExcludeDropdown');
    const q = input.value.toLowerCase().trim();

    if (!q) {
        if (dropdown) dropdown.style.display = 'none';
        return;
    }

    if (!dropdown) return;

    // 1. Gather Candidates
    const candidates = [];

    // A. Unclassified (Source List)
    const srcList = document.getElementById('sourceList');
    if (srcList) {
        Array.from(srcList.children).forEach(el => {
            const val = el.dataset.val;
            // Only if displayed (not hidden by other filters if any)
            if (val && val.toLowerCase().includes(q)) {
                candidates.push({ type: 'item', name: val, el: el });
            }
        });
    }

    // B. Merged Groups (Group Container)
    const groupContainer = document.getElementById('groupContainer');
    if (groupContainer) {
        Array.from(groupContainer.children).forEach(card => {
            const header = card.querySelector('.group-header span');
            if (header) {
                const name = header.innerText;
                if (name.toLowerCase().includes(q)) {
                    candidates.push({ type: 'group', name: name, el: card });
                }
            }
        });
    }

    // 2. Render Dropdown
    dropdown.innerHTML = '';
    if (candidates.length === 0) {
        dropdown.style.display = 'none'; // Hide if no results matches better
    } else {
        candidates.forEach(c => {
            const div = document.createElement('div');
            div.className = 'search-item';
            div.innerHTML = `<span>${c.name}</span> <small style="color:#aaa;">${c.type === 'group' ? '[그룹]' : '[미분류]'}</small>`;
            div.onclick = () => {
                addToExclude(c);
                dropdown.style.display = 'none';
                input.value = '';
            };
            dropdown.appendChild(div);
        });
        dropdown.style.display = 'block';
    }
};

function addToExclude(candidate) {
    const excludeList = document.getElementById('excludeList');
    if (!excludeList) return;

    // Avoid duplicates in Exclude List
    let exists = false;
    Array.from(excludeList.children).forEach(child => {
        if (child.dataset.val === candidate.name) exists = true;
    });

    if (!exists) {
        // Create Exclude Item
        const d = document.createElement('div');
        d.className = 'dd-item';
        d.dataset.val = candidate.name;
        d.title = candidate.name;
        d.innerHTML = `<div class="item-text">${candidate.name}</div><div class="item-actions"><i class="fas fa-times item-remove-btn" onclick="restoreItem(this, event)"></i></div>`;
        excludeList.appendChild(d);
    }

    // Handle Source/Group Object
    if (candidate.type === 'item') {
        candidate.el.remove();
        document.getElementById('srcCnt').innerText = document.getElementById('sourceList').children.length;
    } else if (candidate.type === 'group') {
        // [MODIFIED] Do NOT dissolve group. Just mark it visually.
        const card = candidate.el;
        card.style.opacity = '0.5';
        card.style.border = '2px dashed #e74c3c';
        card.title = "이 그룹은 제외 목록에 포함되어 있습니다.";

        if (!card.querySelector('.excl-badge')) {
            const badge = document.createElement('span');
            badge.className = 'excl-badge';
            badge.innerText = '[제외됨]';
            badge.style.color = '#e74c3c';
            badge.style.fontSize = '12px';
            badge.style.fontWeight = 'bold';
            badge.style.marginLeft = '8px';
            card.querySelector('.group-header').appendChild(badge);
        }
    }

    // Mark as pening
    if (typeof markPending === 'function') markPending();
    else {
        // Fallback if markPending not global
        HAS_PENDING_CHANGES = true;
        document.querySelectorAll('.btn-commit').forEach(btn => btn.classList.add('active'));
    }
}
