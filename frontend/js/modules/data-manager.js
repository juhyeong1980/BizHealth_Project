const DataManager = (function () {
    let currentTab = 'merge';

    function init() {
        console.log("DataManager Initialized");
        switchTab('merge');
    }

    // --- Tab Handling ---
    function switchTab(tabName) {
        currentTab = tabName;
        // 1. UI Update
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.dm-view').forEach(view => view.style.display = 'none');

        document.getElementById(`tab-${tabName}`).classList.add('active');
        document.getElementById(`view-${tabName}`).style.display = 'block';

        // 2. Data Load
        if (tabName === 'merge') loadMergeRules();
        if (tabName === 'exclude') loadExcludeRules();
    }

    // --- 1. Merge Rules ---
    async function loadMergeRules() {
        try {
            const res = await fetch(`${API_BASE_URL}/api/settings/company-map`);
            const data = await res.json();
            const tbody = document.getElementById('merge-list');
            tbody.innerHTML = '';

            data.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.original_name}</td>
                    <td>${item.standard_name}</td>
                    <td>${item.memo || '-'}</td>
                    <td style="text-align: center;">
                        <button class="del-btn" onclick="DataManager.deleteMergeRule('${item.original_name}')">삭제</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (e) {
            console.error("Failed to load merge rules", e);
        }
    }

    async function addMergeRule() {
        const origin = document.getElementById('merge-origin').value;
        const standard = document.getElementById('merge-standard').value;
        const memo = document.getElementById('merge-memo').value;

        if (!origin || !standard) return alert("원본 이름과 표준 이름을 모두 입력해주세요.");

        try {
            await fetch(`${API_BASE_URL}/api/settings/company-map`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ original_name: origin, standard_name: standard, memo: memo })
            });
            alert("저장되었습니다.");
            document.getElementById('merge-origin').value = '';
            loadMergeRules();
        } catch (e) {
            alert("저장 실패: " + e.message);
        }
    }

    async function deleteMergeRule(name) {
        if (!confirm(`'${name}' 규칙을 삭제하시겠습니까?`)) return;
        try {
            await fetch(`${API_BASE_URL}/api/settings/company-map/${name}`, { method: 'DELETE' });
            loadMergeRules();
        } catch (e) {
            alert("삭제 실패");
        }
    }

    // --- 2. Exclude Rules ---
    async function loadExcludeRules() {
        try {
            const res = await fetch(`${API_BASE_URL}/api/settings/exclude`);
            const data = await res.json();
            const tbody = document.getElementById('exclude-list');
            tbody.innerHTML = '';

            data.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.company_name}</td>
                    <td>${item.memo || '-'}</td>
                    <td style="text-align: center;">
                        <button class="del-btn" onclick="DataManager.deleteExcludeRule('${item.company_name}')">삭제</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (e) {
            console.error("Failed to load exclude rules", e);
        }
    }

    async function addExcludeRule() {
        const name = document.getElementById('exclude-name').value;
        const memo = document.getElementById('exclude-memo').value;

        if (!name) return alert("사업장 이름을 입력해주세요.");

        try {
            await fetch(`${API_BASE_URL}/api/settings/exclude`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ company_name: name, memo: memo })
            });
            alert("추가되었습니다.");
            document.getElementById('exclude-name').value = '';
            loadExcludeRules();
        } catch (e) {
            alert("추가 실패: " + e.message);
        }
    }

    async function deleteExcludeRule(name) {
        if (!confirm(`'${name}' 제외 규칙을 삭제하시겠습니까?`)) return;
        try {
            await fetch(`${API_BASE_URL}/api/settings/exclude/${name}`, { method: 'DELETE' });
            loadExcludeRules();
        } catch (e) {
            alert("삭제 실패");
        }
    }

    // --- 3. File Upload ---
    function handleDrop(e) {
        e.preventDefault();
        e.target.style.background = '#fafafa';
        e.target.style.borderColor = '#ccc';

        if (e.dataTransfer.files.length > 0) {
            uploadFile(e.dataTransfer.files[0]);
        }
    }

    async function uploadFile(file) {
        if (!file) return;

        // Validation
        if (!file.name.endsWith('.csv') && !file.name.endsWith('.db')) {
            alert("❌ .csv 파일 또는 .db 파일만 업로드할 수 있습니다.");
            return;
        }

        const statusDiv = document.getElementById('upload-status');
        statusDiv.innerHTML = '<span style="color: blue;">⏳ 업로드 중... 잠시만 기다려주세요.</span>';

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`${API_BASE_URL}/api/upload`, {
                method: 'POST',
                body: formData
            });

            if (!res.ok) throw new Error("Upload Failed");

            statusDiv.innerHTML = '<span style="color: green;">✅ 파일이 서버에 성공적으로 저장되었습니다!</span>';
            setTimeout(() => { statusDiv.innerHTML = ''; }, 5000);
        } catch (e) {
            statusDiv.innerHTML = '<span style="color: red;">❌ 업로드 실패: 서버 로그를 확인해주세요.</span>';
        }
    }

    return {
        init,
        switchTab,
        loadMergeRules, addMergeRule, deleteMergeRule,
        loadExcludeRules, addExcludeRule, deleteExcludeRule,
        handleDrop, uploadFile
    };
})();
