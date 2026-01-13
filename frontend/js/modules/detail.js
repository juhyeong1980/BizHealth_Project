// --- Detail Module ---
// (Refactored to use Backend API)

const DetailModule = (function () {

    let rankingYear = 'all'; // 'all' or specific year (e.g., 2024)

    function init() {
        populateRankingYearSelect();
        populateClientDropdown();

        // Event Listeners for improved UX
        const input = document.getElementById('clientSearchInput');
        if (input) {
            input.addEventListener('focus', showDropdown);
            // Hide on outside click handled by global listener or we can add specific one here if needed
        }
    }

    function populateRankingYearSelect() {
        const sel = document.getElementById('detailRankYear');
        if (!sel) return;

        // Keep 'all' option
        const currentVal = sel.value;
        sel.innerHTML = '<option value="all">누적 기준</option>';

        Array.from(STATE.years).sort((a, b) => b - a).forEach(y => {
            const opt = document.createElement('option');
            opt.value = y;
            opt.innerText = `${y}년 매출순`;
            sel.appendChild(opt);
        });

        // Restore selection if possible
        if (currentVal && (currentVal === 'all' || STATE.years.has(parseInt(currentVal)))) {
            sel.value = currentVal;
        } else {
            sel.value = 'all';
        }
        rankingYear = sel.value;
    }

    function updateRankingYear() {
        const sel = document.getElementById('detailRankYear');
        if (sel) rankingYear = sel.value;

        // If user selects a specific year, force sort mode to 'rev' (revenue) for better UX
        if (rankingYear !== 'all') {
            CLIENT_SORT_MODE = 'rev';
            document.getElementById('sortLabel').innerText = '매출순';
        }

        populateClientDropdown();
    }

    function populateClientDropdown() {
        // Calculate value based on rankingYear (Uses AGG_DATA global, which is now populated from API)
        if (!AGG_DATA) return;

        CLIENT_LIST = Object.keys(AGG_DATA).map(n => {
            let val = 0;
            if (rankingYear === 'all') {
                val = AGG_DATA[n].t; // Total revenue
            } else {
                const y = parseInt(rankingYear);
                val = AGG_DATA[n].y[y] || 0; // Specific year revenue
            }
            return { n: n, c: cleanName(n), v: val };
        });

        renderDropdownList();
    }

    function renderDropdownList() {
        const l = document.getElementById('clientDropdownList');
        if (!l) return;

        const input = document.getElementById('clientSearchInput');
        const v = input ? input.value.toLowerCase() : '';

        let f = CLIENT_LIST.filter(i => i.n.toLowerCase().includes(v));

        // Filter out zero revenue items if specific year is selected
        if (rankingYear !== 'all') {
            f = f.filter(i => i.v > 0);
        }

        if (CLIENT_SORT_MODE === 'name') {
            f.sort((a, b) => a.c.localeCompare(b.c));
        } else {
            f.sort((a, b) => b.v - a.v);
        }

        l.innerHTML = '';
        if (!f.length) {
            l.innerHTML = '<div style="padding:10px; color:#999;">검색 결과 없음</div>';
            return;
        }

        f.slice(0, 100).forEach(i => {
            const d = document.createElement('div');
            d.className = 'search-item';
            d.innerHTML = `<span>${i.n}</span><span class="rev">${i.v.toLocaleString()}</span>`;
            d.onclick = () => {
                if (input) input.value = i.n;
                l.style.display = 'none';
                renderDetailView(); // Auto-render on selection
            };
            l.appendChild(d);
        });
    }

    function filterClientDropdown() { renderDropdownList(); }

    function toggleClientSort() {
        CLIENT_SORT_MODE = CLIENT_SORT_MODE === 'name' ? 'rev' : 'name';
        const label = document.getElementById('sortLabel');
        if (label) label.innerText = CLIENT_SORT_MODE === 'name' ? '가나다순' : '매출순';
        renderDropdownList();
    }

    async function renderDetailView() {
        const input = document.getElementById('clientSearchInput');
        const name = input ? input.value : '';

        if (!name) { alert('사업장을 선택해주세요.'); return; }

        const div = document.getElementById('detailContent');
        if (div) div.style.display = 'block';

        const ph = document.getElementById('detailPlaceholder');
        if (ph) ph.style.display = 'none';

        // Fetch Data from API
        const params = new URLSearchParams();
        STATE.selectedYears.forEach(y => params.append('years', y));

        try {
            const res = await fetch(`${API_BASE_URL}/api/company/${encodeURIComponent(name)}/stats?${params}`);
            if (!res.ok) throw new Error("API call failed");

            const data = await res.json();
            // Expected: { summary: {rev, cnt, max_age}, annual: {}, monthly: {}, demographics: {'20':{M,F}...}, packages: {} }

            // Update KPIs
            const elRev = document.getElementById('dtRev');
            const elCnt = document.getElementById('dtCnt');
            if (elRev) elRev.innerText = (data.summary.rev || 0).toLocaleString() + '원';
            if (elCnt) elCnt.innerText = (data.summary.cnt || 0).toLocaleString() + '명';

            const elAge = document.getElementById('dtAge');
            if (elAge) elAge.innerText = data.summary.max_age || '-';

            // KPI Rows (Annual Growth)
            const sys = Array.from(STATE.selectedYears).sort((a, b) => a - b);
            let hr = '', hc = '';
            let pr = 0, pc = 0;

            sys.forEach((y, i) => {
                const d = data.annual[y] || { r: 0, c: 0 };
                let rdS = '', cdS = '';
                if (i > 0) {
                    const rd = d.r - pr, cd = d.c - pc;
                    const rc = rd > 0 ? '#e74c3c' : (rd < 0 ? '#3498db' : '#999');
                    const cc = cd > 0 ? '#e74c3c' : (cd < 0 ? '#3498db' : '#999');
                    if (rd !== 0) rdS = `<small style="color:${rc};font-size:11px;margin-right:4px;">(${rd > 0 ? '+' : ''}${rd.toLocaleString()})</small>`;
                    if (cd !== 0) cdS = `<small style="color:${cc};font-size:11px;margin-right:4px;">(${cd > 0 ? '+' : ''}${cd.toLocaleString()})</small>`;
                }
                hr += `<div class="kpi-row-item"><span>${y}년</span><span>${rdS}${d.r.toLocaleString()}</span></div>`;
                hc += `<div class="kpi-row-item"><span>${y}년</span><span>${cdS}${d.c.toLocaleString()}</span></div>`;
                pr = d.r; pc = d.c;
            });

            const elRevList = document.getElementById('dtRevList');
            const elCntList = document.getElementById('dtCntList');
            if (elRevList) elRevList.innerHTML = hr;
            if (elCntList) elCntList.innerHTML = hc;

            // Charts
            renderAnnualChart(sys, data.annual);
            renderDemoChart(data.demographics);
            renderMonthChart(sys, data.monthly);

            // Package Table
            const tb = document.querySelector('#pkgTable tbody');
            if (tb) {
                tb.innerHTML = '';
                Object.entries(data.packages).sort((a, b) => b[1] - a[1]).slice(0, 20).forEach(([p, c]) => {
                    const nm = window.CODE_MAP[p] || '-';
                    tb.innerHTML += `<tr><td class="text-left" style="font-weight:bold;">${nm}</td><td class="text-left" style="color:#666; font-size:12px;">${p}</td><td>${c}</td></tr>`;
                });
            }

        } catch (e) {
            console.error("Detail load error:", e);
            alert("상세 데이터를 불러오지 못했습니다.");
        }
    }

    function renderAnnualChart(sys, cY) {
        const can = document.getElementById('dtAnnualChart');
        if (!can) return;
        if (window.dtA) window.dtA.destroy();

        window.dtA = new Chart(can, {
            type: 'bar',
            data: {
                labels: sys.map(y => `${y}년`),
                datasets: [
                    { label: '매출', data: sys.map(y => (cY[y]?.r || 0)), backgroundColor: sys.map(y => getYearColor(y)), barThickness: 40, yAxisID: 'y' },
                    { label: '인원', data: sys.map(y => (cY[y]?.c || 0)), backgroundColor: '#566573', barThickness: 20, yAxisID: 'y1' }
                ]
            },
            options: {
                maintainAspectRatio: false,
                scales: {
                    y: { position: 'left' },
                    y1: { position: 'right', grid: { drawOnChartArea: false } }
                }
            }
        });
    }

    function renderDemoChart(demographics) {
        const can = document.getElementById('dtDemoChart');
        if (!can) return;
        if (window.dtD) window.dtD.destroy();

        const labels = ['20대', '30대', '40대', '50대', '60대↑'];
        const keys = ['20', '30', '40', '50', '60'];

        const dM = keys.map(k => demographics[k]?.M || 0);
        const dF = keys.map(k => demographics[k]?.F || 0);

        window.dtD = new Chart(can, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: '남성', data: dM, backgroundColor: '#AED6F1' },
                    { label: '여성', data: dF, backgroundColor: '#F5B7B1' }
                ]
            },
            options: {
                indexAxis: 'y',
                maintainAspectRatio: false,
                scales: { x: { stacked: true }, y: { stacked: true } }
            }
        });
    }

    function renderMonthChart(sys, cM) {
        const can = document.getElementById('dtMonthChart');
        if (!can) return;
        if (window.dtM) window.dtM.destroy();

        window.dtM = new Chart(can, {
            type: 'line',
            data: {
                labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
                datasets: sys.map(y => ({
                    label: `${y}년`,
                    data: cM[y] || Array(12).fill(0),
                    borderColor: getYearColor(y),
                    tension: 0.3,
                    fill: false
                }))
            },
            options: { maintainAspectRatio: false }
        });
    }

    return {
        init: init,
        renderDetailView: renderDetailView,
        toggleClientSort: toggleClientSort,
        updateRankingYear: updateRankingYear,
        renderDropdownList: renderDropdownList // Exposed for global call
    };

})();

// Global proxies
function showDropdown() { document.getElementById('clientDropdownList').style.display = 'block'; }
// We exposed renderDropdownList directly in DetailModule return
function filterClientDropdown() { if (DetailModule.renderDropdownList) DetailModule.renderDropdownList(); }
window.DetailModule = DetailModule;
