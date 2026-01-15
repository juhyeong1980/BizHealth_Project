
// --- Period Detailed Status Module (Multi-Year Support) ---
// (Refactored to use Backend API)

const PeriodStatusModule = (function () {

    const PRIORITY_ORDER = [
        "종합검진", "기업검진", "특수검진", "공단검진", "암검진", "공단구강", "추가영상", "기타"
    ];

    // Consistent Colors
    const COLORS = [
        '#e74c3c', '#3498db', '#9b59b6', '#f1c40f', '#2ecc71', '#e67e22', '#95a5a6', '#34495e'
    ];
    const COLOR_MAP = {};
    PRIORITY_ORDER.forEach((k, i) => COLOR_MAP[k] = COLORS[i] || '#999');

    let charts = {};

    function init() {
        // [User Request] Fixed Defaults: 2025 (A) vs 2024 (B)
        const startEl = document.getElementById('ps-startDate');
        const endEl = document.getElementById('ps-endDate');
        const compStartEl = document.getElementById('ps-comp-startDate');
        const compEndEl = document.getElementById('ps-comp-endDate');

        // Force set values regardless of Saved State for now (or prioritise defaults if user insists "change settings")
        // But usually we respect state. However, to ensure user sees 2025/2024 on refresh after this update:
        // Key logic: If state exists, use it? User said "Change initial settings".
        // I will set the VALUEs explicitly.

        if (startEl) startEl.value = '2025-01-01';
        if (endEl) endEl.value = '2025-12-31';
        if (compStartEl) compStartEl.value = '2024-01-01';
        if (compEndEl) compEndEl.value = '2024-12-31';

        // Check if we should restore localstorage? 
        // If the user wants to "Change Defaults", standard behavior is: Defaults are 2025/2024.
        // If I write them here, they are the defaults. 
        // I will SKIP restoring localStorage to force these new defaults for the user this time, 
        // or strictly check if localStorage overrides. 
        // To be safe and responsive to "Change initial settings", I'll prefer these values this time.

        // [UX] Auto-analyze
        setTimeout(analyze, 100);
    }

    async function analyze() {
        const startVal = document.getElementById('ps-startDate').value;
        const endVal = document.getElementById('ps-endDate').value;
        const compStartVal = document.getElementById('ps-comp-startDate').value;
        const compEndVal = document.getElementById('ps-comp-endDate').value;

        if (!startVal || !endVal || !compStartVal || !compEndVal) {
            alert("분석 기간과 비교 기간을 모두 선택해주세요.");
            return;
        }

        const includeExcluded = document.getElementById('ps-include-excluded')?.checked || false;

        localStorage.setItem('bh_period_state', JSON.stringify({
            s1: startVal, e1: endVal, s2: compStartVal, e2: compEndVal
        }));

        try {
            const [resA, resB] = await Promise.all([
                fetch(`${API_BASE_URL}/api/stats/period?start_date=${startVal}&end_date=${endVal}&ignore_exclude=${includeExcluded}`),
                fetch(`${API_BASE_URL}/api/stats/period?start_date=${compStartVal}&end_date=${compEndVal}&ignore_exclude=${includeExcluded}`)
            ]);

            if (!resA.ok || !resB.ok) throw new Error("Backend API Failed");

            const dataA = await resA.json();
            const dataB = await resB.json();

            updateView(dataA, dataB, {
                s1: startVal, e1: endVal,
                s2: compStartVal, e2: compEndVal
            });

        } catch (e) {
            console.error(e);
            alert("기간 분석 데이터를 불러오지 못했습니다. (console 확인)");
        }
    }

    function updateView(dataA, dataB, dates) {
        // [SORTING Logic] Sort based on Analysis Period (Desc)
        let keys = Object.keys(dataA.byType);
        Object.keys(dataB.byType).forEach(k => { if (!keys.includes(k)) keys.push(k); });

        const sortedKeys = keys.sort((a, b) => {
            const valA = (dataA.byType[a] && dataA.byType[a].amount) || 0;
            const valB = (dataA.byType[b] && dataA.byType[b].amount) || 0;
            return valA < valB ? 1 : -1; // Descending
        });

        // 1. Calculate Grand Totals Diffs
        const diffAmt = (dataA.total.amount || 0) - (dataB.total.amount || 0);
        const diffCnt = (dataA.total.count || 0) - (dataB.total.count || 0);

        const fmtDiff = (v) => {
            if (v === 0) return '';
            const sign = v > 0 ? '▲' : '▼';
            const color = v > 0 ? '#e74c3c' : '#3498db';
            const valStr = Math.abs(v).toLocaleString();
            return `<small style="color:${color}; font-size:0.8em; margin-left:5px; vertical-align:middle; font-weight:bold;">${sign} ${valStr}</small>`;
        };

        // 2. Render Panel A
        document.getElementById('ps-period-label-a').innerText = `${dates.s1} ~ ${dates.e1}`;
        document.getElementById('ps-amt-a').innerHTML = (dataA.total.amount || 0).toLocaleString() + " 원" + fmtDiff(diffAmt);
        document.getElementById('ps-count-a').innerHTML = (dataA.total.count || 0).toLocaleString() + " 건" + fmtDiff(diffCnt);

        renderCategoryTable('a', dataA.byType, dataA.total.amount, sortedKeys, dataB.byType);
        renderCategoryChart('a', dataA.byType, sortedKeys);
        renderBizTable('a', dataA.byBiz, dataB.byBiz); // Pass B for diffs

        // 3. Render Panel B
        document.getElementById('ps-period-label-b').innerText = `${dates.s2} ~ ${dates.e2}`;
        document.getElementById('ps-amt-b').innerText = (dataB.total.amount || 0).toLocaleString() + " 원";
        document.getElementById('ps-count-b').innerText = (dataB.total.count || 0).toLocaleString() + " 건";

        renderCategoryTable('b', dataB.byType, dataB.total.amount, sortedKeys, null);
        renderCategoryChart('b', dataB.byType, sortedKeys);
        renderBizTable('b', dataB.byBiz, null);
    }

    function renderCategoryChart(suffix, byType, sortedKeys) {
        const ctx = document.getElementById(`ps-chart-${suffix}`).getContext('2d');
        if (charts[suffix]) charts[suffix].destroy();

        const labels = sortedKeys;
        const dataVals = sortedKeys.map(k => (byType[k] ? byType[k].amount : 0));
        const bgColors = sortedKeys.map(k => COLOR_MAP[k] || '#ccc');

        charts[suffix] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '매출',
                    data: dataVals,
                    backgroundColor: bgColors,
                    borderRadius: 4,
                    barPercentage: 0.6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',     // Capture all items in x-index
                    intersect: false,  // Trigger hover even if not directly on the bar
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { borderDash: [2, 4], color: '#f0f0f0' },
                        ticks: { font: { size: 10 } }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 10 }, autoSkip: false }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        titleFont: { size: 16 }, // 2x Bigger
                        bodyFont: { size: 14 },  // Bigger
                        padding: 12,
                        callbacks: {
                            label: function (context) {
                                return context.parsed.y.toLocaleString() + " 원";
                            }
                        }
                    }
                }
            }
        });
    }

    function renderCategoryTable(suffix, byType, totalAmt, sortedKeys, compByType) {
        const container = document.getElementById(`ps-table-cat-${suffix}`);
        let html = '';

        sortedKeys.forEach(key => {
            const item = byType[key];
            const amt = item ? item.amount : 0;
            const ratio = totalAmt > 0 ? ((amt / totalAmt) * 100).toFixed(1) : 0;

            // Diff calculation
            let diffHtml = '<div style="width:70px;"></div>'; // Placeholder size
            if (compByType) {
                const compAmt = (compByType[key] && compByType[key].amount) || 0;
                const dv = amt - compAmt;
                if (dv !== 0) {
                    const sign = dv > 0 ? '▲' : '▼';
                    const color = dv > 0 ? '#e74c3c' : '#3498db';
                    const diffVal = Math.abs(dv).toLocaleString();
                    // Right aligned within 70px
                    diffHtml = `<div style="width:70px; text-align:right; color:${color}; font-size:11px; white-space:nowrap;">${sign} ${diffVal}</div>`;
                }
            }

            const color = COLOR_MAP[key] || '#ccc';

            if (amt > 0 || (compByType && compByType[key]?.amount > 0)) {
                html += `
                    <div class="cat-item" style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #f5f5f5;">
                        <div style="display:flex; align-items:center; flex:1; min-width:0; margin-right:10px;">
                            <div style="width:12px; height:12px; background:${color}; margin-right:10px; border-radius:3px; flex-shrink:0;"></div>
                            <span class="cat-name" style="font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${key}</span>
                        </div>
                        
                        <!-- Value Container: Fixed Width Columns -->
                        <div style="display:flex; align-items:center;">
                            ${diffHtml}
                            <div style="width:100px; text-align:right; font-weight:bold; color:#2c3e50; font-size:13px; margin-left:10px;">${amt.toLocaleString()}</div>
                            <div style="width:50px; text-align:right; font-size:11px; color:#aaa; margin-left:5px;">(${ratio}%)</div>
                        </div>
                    </div>
                `;
            }
        });
        container.innerHTML = html;
    }

    function renderBizTable(suffix, byBiz, compByBiz) {
        const tbody = document.getElementById(`ps-biz-tbody-${suffix}`);
        tbody.innerHTML = '';

        const list = Object.entries(byBiz).map(([name, val]) => ({ name, ...val }));
        list.sort((a, b) => b.amount - a.amount);

        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" style="text-align:center; color:#aaa; padding:20px;">데이터 없음</td></tr>';
            return;
        }

        list.forEach(item => {
            const tr = document.createElement('tr');

            let diffHtml = '<span></span>';
            if (compByBiz) {
                const compAmt = (compByBiz[item.name] && compByBiz[item.name].amount) || 0;
                const dv = item.amount - compAmt;
                if (dv !== 0) {
                    const sign = dv > 0 ? '▲' : '▼';
                    const color = dv > 0 ? '#e74c3c' : '#3498db';
                    diffHtml = `<span style="color:${color}; font-size:11px;">${sign} ${Math.abs(dv).toLocaleString()}</span>`;
                }
            }

            const cellContent = compByBiz
                ? `<div style="display:flex; justify-content:space-between; align-items:center;">
                     ${diffHtml}
                     <span>${item.amount.toLocaleString()}</span>
                   </div>`
                : `<div style="text-align:right;">${item.amount.toLocaleString()}</div>`;

            tr.innerHTML = `
                <td style="padding:6px 10px; border-bottom:1px solid #eee; font-size:12px; color:#555;">${item.name}</td>
                <td style="padding:6px 10px; border-bottom:1px solid #eee; font-size:12px; font-weight:bold; color:#2c3e50;">
                    ${cellContent}
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    return {
        init: init,
        analyze: analyze
    };

})();
