// --- Code Check Module ---

const CodeConfig = { masterColumns: { code: '코드', name: '명칭', type: '검진종류', price: '본인금액' } };
const CodeCheckService = {
    masterData: [], usedCodes: new Set(),
    parseCSV(text) {
        const rows = []; let currentRow = []; let currentCell = ''; let insideQuote = false;
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (char === '"') insideQuote = !insideQuote;
            else if (char === ',' && !insideQuote) { currentRow.push(currentCell.trim()); currentCell = ''; }
            else if ((char === '\r' || char === '\n') && !insideQuote) { if (currentCell || currentRow.length > 0) { currentRow.push(currentCell.trim()); rows.push(currentRow); currentRow = []; currentCell = ''; } } else currentCell += char;
        }
        if (currentCell) currentRow.push(currentCell.trim()); if (currentRow.length) rows.push(currentRow); return rows;
    },
    loadMaster(csvText) {
        const rows = this.parseCSV(csvText); if (rows.length < 2) return;
        const headers = rows[0].map(h => h.replace(/\s+/g, ''));
        const colIdx = { code: headers.indexOf('코드'), name: headers.indexOf('명칭'), type: headers.indexOf('검진종류'), price: headers.indexOf('본인금액') };
        this.masterData = rows.slice(1).map(row => {
            const id = row[colIdx.code] || ''; const name = row[colIdx.name] || '';
            if (id) window.CODE_MAP[id] = name;
            return { id: id, name: name, type: row[colIdx.type] || '', price: row[colIdx.price] || '', isUsed: false };
        }).filter(item => item.id);
    },
    loadUsage(csvText) { this.usedCodes = new Set(csvText.split(/[\s,"]+/).map(t => t.trim()).filter(t => t.length > 0)); this.matchData(); },
    matchData() { this.masterData.forEach(item => { if (this.usedCodes.has(item.id)) item.isUsed = true; }); }
};

const CodeCheckApp = {
    // init은 이제 renderDetailView나 tabInit에서 수동으로 호출하지 않음 (HTML 로드 타이밍 문제)
    handleFileUpload(event, type) {
        const file = event.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            if (type === 'master') { CodeCheckService.loadMaster(content); this.updateStatus('cc-status-master', '로드 완료', true); }
            else { CodeCheckService.loadUsage(content); this.updateStatus('cc-status-target', `로드 완료 (${CodeCheckService.usedCodes.size}개 코드 식별)`, true); }
            this.render();
        };
        reader.readAsText(file, 'UTF-8');
    },
    updateStatus(id, msg, isActive) { const el = document.getElementById(id); el.textContent = msg; if (isActive) el.classList.add('active'); },
    render() {
        const tbody = document.querySelector('#cc-result-table tbody');
        if (!tbody) return;
        const filterUsed = document.getElementById('cc-filter-used').checked;
        const displayData = CodeCheckService.masterData.filter(item => !filterUsed || item.isUsed);
        const total = CodeCheckService.masterData.length;
        const used = CodeCheckService.masterData.filter(i => i.isUsed).length;
        document.getElementById('cc-stats-display').innerHTML = `총 ${total}개 코드 중 <span style="color:var(--cc-success)">${used}</span>개 사용 확인`;
        if (displayData.length === 0) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">표시할 데이터가 없습니다.</td></tr>'; return; }
        tbody.innerHTML = displayData.map(item => `
        <tr class="cc-table-row ${item.isUsed ? 'used-row' : ''}">
            <td class="cc-check-icon">${item.isUsed ? '✔' : ''}</td><td class="text-left" style="font-weight:bold">${item.id}</td><td class="text-left">${item.name}</td><td class="text-left">${item.type}</td><td>${item.price}</td><td style="font-size:0.85em; color:#666">${item.isUsed ? '코드 발견' : ''}</td>
        </tr>`).join('');
    }
};
