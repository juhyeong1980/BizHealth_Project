
// --- Retention Module ---
// (Refactored to use Backend API)

const RetentionModule = (function () {

    function analyze() {
        if (STATE.selectedYears.size === 0) {
            // If no years selected, maybe try to select all? OR just return.
            // But we need to update UI to show empty or ask user to select.
            if (typeof renderYearFilter === 'function') {
                renderYearFilter(); // Ensure filter is visible
            }
            return;
        }

        const years = Array.from(STATE.selectedYears).sort();

        // Prepare Params
        const params = new URLSearchParams();
        years.forEach(y => params.append('years', y));

        fetch(`${API_BASE_URL}/api/stats/retention?${params}`)
            .then(res => res.json())
            .then(data => {
                // data: { waterfall, stickiness, total_users }
                render(years, data.waterfall, data.stickiness, data.total_users);
            })
            .catch(e => {
                console.error("Retention API Error:", e);
                // alert("재방문 분석 데이터를 불러오지 못했습니다.");
            });
    }

    function render(years, waterfall, stickiness, totalUsers) {
        if (!document.getElementById('retRateTotal')) return;

        const loyal = stickiness.slice(1).reduce((a, b) => a + b, 0); // 2회 이상 방문자
        const rate = totalUsers > 0 ? ((loyal / totalUsers) * 100).toFixed(1) : 0;
        const vvip = (stickiness[3] || 0) + (stickiness[4] || 0); // 4회, 5회 이상

        document.getElementById('retRateTotal').innerText = `${rate}%`;
        document.getElementById('retRateDesc').innerText = `총 ${totalUsers.toLocaleString()}명 중 ${loyal.toLocaleString()}명이 재방문`;
        document.getElementById('retLoyalTotal').innerText = `${vvip.toLocaleString()}명`;

        if (window.retWaterChartInst && typeof window.retWaterChartInst.destroy === 'function') window.retWaterChartInst.destroy();
        const ctxW = document.getElementById('retWaterfallChart');
        if (ctxW) {
            window.retWaterChartInst = new Chart(ctxW, {
                type: 'bar',
                data: {
                    labels: years.map(y => `${y}년`),
                    datasets: [
                        { label: 'New', data: years.map(y => waterfall[y]?.new || 0), backgroundColor: '#3498db' },
                        { label: 'Retained', data: years.map(y => waterfall[y]?.retained || 0), backgroundColor: '#27ae60' },
                        { label: 'Returned', data: years.map(y => waterfall[y]?.returned || 0), backgroundColor: '#f1c40f' }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { x: { stacked: true }, y: { stacked: true } }
                }
            });
        }

        if (window.retPieChartInst && typeof window.retPieChartInst.destroy === 'function') window.retPieChartInst.destroy();
        const ctxP = document.getElementById('retPieChart');
        if (ctxP) {
            window.retPieChartInst = new Chart(ctxP, {
                type: 'doughnut',
                data: {
                    labels: ['1회', '2회', '3회', '4회', '5회+'],
                    datasets: [{
                        data: stickiness,
                        backgroundColor: ['#ecf0f1', '#bdc3c7', '#95a5a6', '#7f8c8d', '#2c3e50']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'right' } }
                }
            });
        }
    }

    return {
        analyze: analyze
    };
})();
