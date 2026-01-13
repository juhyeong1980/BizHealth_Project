
// --- Period Detailed Status Module (Multi-Year Support) ---
// (Refactored to use Backend API)

const PeriodStatusModule = (function () {

    const PRIORITY_ORDER = [
        "종합검진",
        "기업검진",
        "특수검진",
        "공단검진",
        "암검진",
        "공단구강",
        "추가영상",
        "기타"
    ];

    let charts = {};

    function init() {
        const now = new Date();
        const endA = new Date(now.getFullYear(), 11, 31); // End of current year
        const startA = new Date(now.getFullYear(), 0, 1); // Start of current year

        const endB = new Date(endA.getFullYear() - 1, 11, 31);
        const startB = new Date(startA.getFullYear() - 1, 0, 1);

        const toStr = (d) => {
            const pad = n => n < 10 ? '0' + n : n;
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        };

        const startEl = document.getElementById('ps-startDate');
        const endEl = document.getElementById('ps-endDate');
        const compStartEl = document.getElementById('ps-comp-startDate');
        const compEndEl = document.getElementById('ps-comp-endDate');

        if (startEl) startEl.value = toStr(startA);
        if (endEl) endEl.value = toStr(endA);
        if (compStartEl) compStartEl.value = toStr(startB);
        if (compEndEl) compEndEl.value = toStr(endB);
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

        try {
            // Parallel Fetch
            const [resA, resB] = await Promise.all([
                fetch(`${API_BASE_URL}/api/stats/period?start_date=${startVal}&end_date=${endVal}`),
                fetch(`${API_BASE_URL}/api/stats/period?start_date=${compStartVal}&end_date=${compEndVal}`)
            ]);

            if (!resA.ok || !resB.ok) throw new Error("Backend API Failed");

            const dataA = await resA.json();
            const dataB = await resB.json();

            renderPanel('a', startVal, endVal, dataA);
            renderPanel('b', compStartVal, compEndVal, dataB);

        } catch (e) {
            console.error(e);
            alert("기간 분석 데이터를 불러오지 못했습니다.");
        }
    }

    function renderPanel(suffix, sStr, eStr, data) {
        document.getElementById(`ps-period-label-${suffix}`).innerText = `${sStr} ~ ${eStr}`;
        document.getElementById(`ps-amt-${suffix}`).innerText = (data.total.amount || 0).toLocaleString() + " 원";
        document.getElementById(`ps-count-${suffix}`).innerText = (data.total.count || 0).toLocaleString() + " 명";

        renderCategoryChart(suffix, data.byType, data.total.amount);
        renderCategoryTable(suffix, data.byType, data.total.amount);
        renderBizTable(suffix, data.byBiz);
    }

    function renderCategoryChart(suffix, byType, totalAmt) {
        const ctx = document.getElementById(`ps-chart-${suffix}`).getContext('2d');
        if (charts[suffix]) charts[suffix].destroy();

        const p_data = [];
        const labels = [];
        const colors = [
            '#e74c3c', '#3498db', '#9b59b6', '#f1c40f', '#2ecc71', '#e67e22', '#95a5a6', '#34495e'
        ];

        PRIORITY_ORDER.forEach(key => {
            const item = byType[key];
            const amt = item ? item.amount : 0;
            if (amt > 0) {
                labels.push(key);
                p_data.push(amt);
            }
        });

        charts[suffix] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: p_data,
                    backgroundColor: colors,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10 } } }
                }
            }
        });
    }

    function renderCategoryTable(suffix, byType, totalAmt) {
        const container = document.getElementById(`ps-table-cat-${suffix}`);
        let html = '';
        PRIORITY_ORDER.forEach(key => {
            const item = byType[key];
            const amt = item ? item.amount : 0;
            if (amt > 0) {
                const ratio = totalAmt > 0 ? ((amt / totalAmt) * 100).toFixed(1) : 0;
                html += `
                    <div class="cat-item">
                        <span class="cat-name">${key}</span>
                        <span class="cat-val">
                            <b>${amt.toLocaleString()}</b> <span style="font-size:10px; color:#aaa;">(${ratio}%)</span>
                        </span>
                    </div>
                `;
            }
        });
        container.innerHTML = html;
    }

    function renderBizTable(suffix, byBiz) {
        const tbody = document.getElementById(`ps-biz-tbody-${suffix}`);
        tbody.innerHTML = '';

        const list = Object.entries(byBiz).map(([name, val]) => ({ name, ...val }));
        list.sort((a, b) => b.amount - a.amount);

        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" style="text-align:center; color:#aaa; padding:20px;">데이터 없음</td></tr>';
            return;
        }

        list.slice(0, 50).forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding:8px 10px; border-bottom:1px solid #eee; font-size:12px;">${item.name}</td>
                <td style="padding:8px 10px; border-bottom:1px solid #eee; text-align:right; font-size:12px; font-weight:bold; color:#2c3e50;">
                    ${item.amount.toLocaleString()}
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
