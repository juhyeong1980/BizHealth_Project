// --- Dashboard Module ---
// (Handles Chart rendering and Data Aggregation)

// Exposure for generic calls if needed
let DashboardModule = (function () {

    // Slide logic removed for scrollable view
    function init() {
        // Initialization if needed
    }

    return {
        init: init
    };
})();

// Re-expose global functions for existing inline clicks (recalcAll, resetChartHighlight, etc)
// Assuming those are defined in the global scope below or attached to window. 
// The existing dashboard.js seemed to use global functions. Let's keep them but wrap the navigation.

// ... (Existing Global Functions below) ...

// Re-expose global functions for existing inline clicks
// No longer using toggleLocalYearDropdown as we use inline filter
// Re-expose global functions for existing inline clicks
window.toggleLocalYearDropdown = function () {
    const list = document.getElementById('yearDropList');
    if (list) {
        const isHidden = (list.style.display === 'none' || list.style.display === '');
        list.style.display = isHidden ? 'block' : 'none';

        // Update button icon
        const btn = document.getElementById('yearDropBtn');
        if (btn) {
            const icon = btn.querySelector('.fa-chevron-down, .fa-chevron-up');
            if (icon) icon.className = isHidden ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
        }
    }
};

// Close dropdown when clicking outside
window.addEventListener('click', function (e) {
    if (!e.target.closest('.local-year-dropdown')) {
        const list = document.getElementById('yearDropList');
        // Check if visible
        if (list && list.style.display === 'block') {
            toggleLocalYearDropdown(); // Use toggle to sync icon
        }
    }
});


const MAX_RETRIES = 20;
let retryCount = 0;

function renderYearFilter() {
    const list = document.getElementById('yearDropList');
    if (!list) return; // Silent return if not found

    list.innerHTML = '';

    if (!STATE.years || STATE.years.size === 0) {
        list.innerHTML = '<div style="padding:10px; color:#999; text-align:center; font-size:13px;">데이터 로딩 중...</div>';
        return;
    }

    // Style for dropdown items
    const itemStyle = "display: block; padding: 8px 10px; border-bottom: 1px solid #f0f0f0; font-size: 14px; cursor: pointer; transition: background 0.2s;";

    // "All" Checkbox
    const allDiv = document.createElement('div');
    allDiv.className = 'year-item';
    allDiv.style.cssText = itemStyle + "font-weight:bold; color:#3498db; border-bottom: 2px solid #eee;";
    allDiv.innerHTML = `<label style="cursor:pointer; display:flex; align-items:center; width:100%;"><input type="checkbox" id="checkAllYears" checked style="margin-right:8px;"> 전체 연도 선택</label>`;
    list.appendChild(allDiv);

    Array.from(STATE.years).sort((a, b) => b - a).forEach(y => {
        const d = document.createElement('div');
        d.className = 'year-item';
        d.style.cssText = itemStyle;
        d.innerHTML = `<label style="cursor:pointer; display:flex; align-items:center; width:100%;"><input type="checkbox" class="y-chk" value="${y}" checked style="margin-right:8px;"> ${y}년</label>`;
        list.appendChild(d);
    });

    // Event Listeners
    const allChk = document.getElementById('checkAllYears');
    if (allChk) {
        allChk.addEventListener('change', (e) => {
            list.querySelectorAll('.y-chk').forEach(k => k.checked = e.target.checked);
            updateSelectedYears();
        });
    }

    list.querySelectorAll('.y-chk').forEach(chk => {
        chk.addEventListener('change', () => {
            if (!chk.checked && allChk) allChk.checked = false;
            updateSelectedYears();
        });
    });

    updateButtonLabel();
}

function updateButtonLabel() {
    const btn = document.getElementById('yearDropBtn');
    if (!btn) return;
    const total = STATE.years.size;
    const selected = STATE.selectedYears.size;

    if (selected === 0) btn.innerHTML = `<i class="fas fa-calendar-times"></i> 선택 없음 <i class="fas fa-chevron-down"></i>`;
    else if (selected === total) btn.innerHTML = `<i class="fas fa-calendar-check"></i> 전체 연도 (${selected}) <i class="fas fa-chevron-down"></i>`;
    else btn.innerHTML = `<i class="fas fa-calendar-day"></i> ${selected}개 연도 선택 <i class="fas fa-chevron-down"></i>`;
}

function updateSelectedYears() {
    STATE.selectedYears.clear();
    document.querySelectorAll('.y-chk').forEach(k => { if (k.checked) STATE.selectedYears.add(parseInt(k.value)); });
    updateButtonLabel();
    recalcAll();
}

async function recalcAll() {
    // 1. Gather Filters
    const sInput = document.getElementById('startDate');
    const eInput = document.getElementById('endDate');
    const startDate = sInput ? sInput.value : '';
    const endDate = eInput ? eInput.value : '';

    // 2. Prepare API Params
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    STATE.selectedYears.forEach(y => params.append('years', y));
    // [REFACTORED] Exclusions are now handled by Backend automatically.
    // if (STATE.rules.exclude) { ... }

    console.log("Fetching Stats with params:", params.toString());

    // 3. Call API
    try {
        const res = await fetch(`${API_BASE_URL}/api/stats?${params}`);
        if (!res.ok) throw new Error("API call failed");

        const data = await res.json();

        // 4. Update Global Data
        // API returns { "CL": ..., "MO": ..., "YT": ... }
        // Dashboard uses these exact structures.
        const CL = data.CL;
        const MO = data.MO;
        const YT = data.YT;

        AGG_DATA = CL; // Store for Client Dropdown or Detail View

        // 5. Render
        if (document.getElementById('trendChart')) renderDashboard(CL, MO, YT);
        if (typeof populateClientDropdown === 'function') populateClientDropdown();

    } catch (e) {
        console.error("Error fetching stats:", e);
        // alert("데이터 불러오기 실패");
    }
}

function resetDateFilter() {
    const s = document.getElementById('startDate'); if (s) s.value = '';
    const e = document.getElementById('endDate'); if (e) e.value = '';
    recalcAll();
}

function renderDashboard(CL, MO, YT) {
    const sys = Array.from(STATE.selectedYears).sort((a, b) => a - b);
    let tr = 0, tc = 0, hr = '', hc = '', prevRev = 0, prevCnt = 0;

    sys.forEach((y, i) => {
        const d = YT[y] || { rev: 0, cnt: 0 };
        tr += d.rev; tc += d.cnt;
        let rdStr = '', cdStr = '';
        if (i > 0) {
            const rd = d.rev - prevRev, cd = d.cnt - prevCnt;
            const rc = rd > 0 ? '#e74c3c' : (rd < 0 ? '#3498db' : '#999');
            const cc = cd > 0 ? '#e74c3c' : (cd < 0 ? '#3498db' : '#999');
            if (rd !== 0) rdStr = `<small style="color:${rc};font-size:11px;margin-right:4px;">(${rd > 0 ? '+' : ''}${rd.toLocaleString()})</small>`;
            if (cd !== 0) cdStr = `<small style="color:${cc};font-size:11px;margin-right:4px;">(${cd > 0 ? '+' : ''}${cd.toLocaleString()})</small>`;
        }
        hr += `<div class="kpi-row-item"><span>${y}년</span><span>${rdStr}${d.rev.toLocaleString()}</span></div>`;
        hc += `<div class="kpi-row-item"><span>${y}년</span><span>${cdStr}${d.cnt.toLocaleString()}</span></div>`;
        prevRev = d.rev; prevCnt = d.cnt;
    });

    // 증감 현황 계산 및 리스트 생성
    let changeHtml = '';
    let totalNew = 0, totalLost = 0;

    sys.forEach((y, i) => {
        let newCnt = 0, lostCnt = 0;
        let changeStr = '<span style="color:#ccc; font-size:11px;">-</span>';

        // 이전 연도가 내역에 있을 때만 비교 (sys 리스트 기준)
        if (i > 0) {
            const prevY = sys[i - 1];
            const currY = y;
            Object.values(CL).forEach(data => {
                const cPrev = data.c[prevY] || 0;
                const cCurr = data.c[currY] || 0;
                if (cPrev === 0 && cCurr > 0) newCnt++;
                else if (cPrev > 0 && cCurr === 0) lostCnt++;
            });
            changeStr = `<small style="color:#27ae60;font-size:11px;margin-right:4px;">(+${newCnt})</small><small style="color:#e74c3c;font-size:11px;">(-${lostCnt})</small>`;
            totalNew += newCnt;
            totalLost += lostCnt;
        }

        const netChange = newCnt - lostCnt;
        const netColor = netChange > 0 ? '#27ae60' : (netChange < 0 ? '#e74c3c' : '#555');
        const netStr = i > 0 ? `<span style="color:${netColor}; margin-left:4px;">${netChange > 0 ? '+' : ''}${netChange}</span>` : '<span style="color:#ccc; font-size:11px;">-</span>';

        changeHtml += `<div class="kpi-row-item"><span>${y}년</span><span>${changeStr}${netStr}</span></div>`;
    });

    // 요소가 있을 때만 값 주입
    const kpiRevList = document.getElementById('kpiRevList');
    if (kpiRevList) {
        kpiRevList.innerHTML = hr || '-';
        document.getElementById('kpiRevTotal').innerText = tr.toLocaleString() + '원';
        document.getElementById('kpiCntList').innerHTML = hc || '-';
        document.getElementById('kpiCntTotal').innerText = tc.toLocaleString() + '명';

        // Update Business Place Change
        const kpiChangeList = document.getElementById('kpiChangeList');
        const kpiChangeTotal = document.getElementById('kpiChangeTotal');
        if (kpiChangeList) kpiChangeList.innerHTML = changeHtml || '-';
        if (kpiChangeTotal) {
            const totalNet = totalNew - totalLost;
            const totalColor = totalNet > 0 ? '#27ae60' : (totalNet < 0 ? '#e74c3c' : '#2c3e50');
            kpiChangeTotal.innerHTML = `<span style="color:${totalColor}">${totalNet > 0 ? '+' : ''}${totalNet}</span> <small style="font-size:14px; color:#888;">(신규 ${totalNew} / 중단 ${totalLost})</small>`;
        }

        Sales3DAdapter.render('trendChart', sys.map(y => `${y}년`), sys.map(y => YT[y]?.rev || 0));

        if (window.chMonth) window.chMonth.destroy();
        window.chMonth = new Chart(document.getElementById('monthlyChart'), {
            type: 'line',
            data: {
                labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
                datasets: sys.map(y => ({ label: `${y}년`, data: MO[y], borderColor: getYearColor(y), tension: 0.3, fill: false }))
            },
            options: { maintainAspectRatio: false }
        });

        const tb = document.querySelector('#mainTable tbody');
        const thead = document.querySelector('#mainTable thead');
        if (tb && thead) {
            tb.innerHTML = '';
            let headHtml = `<tr><th>순위</th><th class="text-left">사업장</th>`;
            sys.forEach(y => headHtml += `<th>${y}년</th>`);
            headHtml += `<th>합계</th></tr>`;
            thead.innerHTML = headHtml;
            const sortedList = Object.entries(CL).map(([name, data]) => {
                let sum = 0; sys.forEach(y => sum += (data.y[y] || 0));
                return { name, sum, yearsData: data.y };
            }).sort((a, b) => (a.name === '기타' ? 1 : b.name === '기타' ? -1 : b.sum - a.sum));
            sortedList.slice(0, 50).forEach((item, idx) => {
                let row = `<tr><td>${idx + 1}</td><td class="text-left">${item.name}</td>`;
                sys.forEach(y => row += `<td>${(item.yearsData[y] || 0).toLocaleString()}</td>`);
                row += `<td>${item.sum.toLocaleString()}</td></tr>`;
                tb.innerHTML += row;
            });
        }
    }
}

const Sales3DAdapter = {
    instance: null,
    render: function (domId, years, values) {
        const dom = document.getElementById(domId); if (!dom) return;
        if (this.instance) this.instance.dispose();
        this.instance = echarts.init(dom);
        this.instance.setOption({
            tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,0.9)', textStyle: { color: '#333' } },
            grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
            xAxis: { type: 'category', data: years, axisLabel: { fontWeight: 'bold', color: '#555' }, axisTick: { show: false }, axisLine: { lineStyle: { color: '#ddd' } } },
            yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed', color: '#eee' } } },
            series: [{
                name: '매출', type: 'custom',
                renderItem: (params, api) => {
                    const l = api.coord([api.value(0), api.value(1)]);
                    const yearVal = years[params.dataIndex].replace(/[^0-9]/g, '');
                    const baseColor = getYearColor(parseInt(yearVal));
                    return {
                        type: 'group', children: [
                            { type: 'rect', shape: { x: l[0] - 15, y: l[1], width: 30, height: api.coord([0, 0])[1] - l[1] }, style: { fill: baseColor } },
                            { type: 'rect', shape: { x: l[0] + 15, y: l[1] - 10, width: 10, height: api.coord([0, 0])[1] - l[1] }, style: { fill: echarts.color.lift(baseColor, -0.2) } },
                            { type: 'polygon', shape: { points: [[l[0] - 15, l[1]], [l[0] + 15, l[1]], [l[0] + 25, l[1] - 10], [l[0] - 5, l[1] - 10]] }, style: { fill: echarts.color.lift(baseColor, 0.2) } }
                        ]
                    };
                }, data: values
            }]
        });
        window.addEventListener('resize', () => this.instance.resize());

        // [INTERACTION] 막대그래프 클릭 시 월별 차트 하이라이트 (다중 선택)
        this.instance.off('click'); // 기존 리스너 제거
        this.highlightedYears = new Set(); // 다중 선택용 Set

        this.instance.on('click', (params) => {
            const yearStr = years[params.dataIndex]; // "2023년"
            const year = parseInt(yearStr.replace(/[^0-9]/g, ''));

            if (this.highlightedYears.has(year)) {
                // 이미 선택된 연도면 제거 (Toggle Off)
                this.highlightedYears.delete(year);
            } else {
                // 선택되지 않은 연도면 추가 (Toggle On/Add)
                this.highlightedYears.add(year);
            }

            // 하이라이트 업데이트
            highlightMonthChart(this.highlightedYears);
        });
    }
};

// [외부 호출용] 초기화 버튼 기능
window.resetChartHighlight = function () {
    if (Sales3DAdapter.highlightedYears) {
        Sales3DAdapter.highlightedYears.clear();
        highlightMonthChart(Sales3DAdapter.highlightedYears);
    }
};

function highlightMonthChart(targetYears) {
    if (!window.chMonth) return;

    const isReset = targetYears.size === 0;

    // 차트의 모든 데이터셋을 순회하며 색상 조정
    window.chMonth.data.datasets.forEach(ds => {
        const dsYear = parseInt(ds.label.replace(/[^0-9]/g, ''));
        const originalColor = getYearColor(dsYear);

        if (isReset || targetYears.has(dsYear)) {
            // 선택된 연도(또는 전체 복귀): 원래 색상
            ds.borderColor = originalColor;
            ds.borderWidth = isReset ? 2 : 4; // 복귀 시 기본 두께 2, 선택 시 4
            ds.order = 0;
        } else {
            // 나머지 연도: 회색조/투명도, 얇게, 뒤로 보내기
            ds.borderColor = 'rgba(200, 200, 200, 0.3)';
            ds.borderWidth = 1;
            ds.order = 1;
        }
    });
    window.chMonth.update();
}

window.DashboardModule = DashboardModule;
