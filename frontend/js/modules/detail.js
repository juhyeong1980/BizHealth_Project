// --- Detail Module (Refactored v19.0) ---
const DetailModule = (function () {

    let ALL_YEARS = [];
    let SELECTED_YEARS = new Set();
    let ALL_COMPANIES = [];
    let CACHED_DATA = null;

    async function init() {
        console.log("DetailModule Init v20.1 Loaded");
        try {
            // 1. Fetch Years
            const yRes = await fetch(`${API_BASE_URL}/api/years`);
            ALL_YEARS = await yRes.json();
            SELECTED_YEARS = new Set(ALL_YEARS); // Default All
            renderYearToggles();

            // 2. Fetch Companies (Standardized Names with Revenue)
            const sRes = await fetch(`${API_BASE_URL}/api/stats`);
            const stats = await sRes.json();

            // Transform CL object {Name: {t: 100...}} to [{name, rev}]
            ALL_COMPANIES = Object.entries(stats.CL || {}).map(([name, data]) => ({
                name: name,
                rev: data.t || 0
            })).sort((a, b) => b.rev - a.rev); // Sort by revenue desc

            // No need to render datalist init

        } catch (e) {
            console.error("Init Error:", e);
        }
    }

    // --- UI Rendering ---

    function renderYearToggles() {
        const c = document.getElementById('dtYearFilter');
        if (!c) return;
        c.innerHTML = '';

        // 'All' Toggle (Virtual)
        const btnAll = document.createElement('button');
        btnAll.className = 'year-toggle active';
        btnAll.innerText = '전체';
        btnAll.onclick = () => toggleAllYears(btnAll);
        c.appendChild(btnAll);

        ALL_YEARS.forEach(y => {
            const btn = document.createElement('button');
            btn.className = 'year-toggle active'; // Default On
            btn.innerText = y;
            btn.dataset.year = y;
            btn.onclick = () => toggleYear(y, btn);
            c.appendChild(btn);
        });
    }

    // --- Custom Dropdown Logic ---

    function showSearchDropdown() {
        // Show default list (Top revenue)
        filterSearchDropdown("");
    }

    function hideSearchDropdown() {
        const dd = document.getElementById('dtSearchDropdown');
        if (dd) dd.style.display = 'none';
    }

    function filterSearchDropdown(keyword) {
        const dd = document.getElementById('dtSearchDropdown');
        if (!dd) return;

        keyword = (keyword || "").toLowerCase().trim();

        // Filter
        let matches = ALL_COMPANIES;
        if (keyword) {
            matches = ALL_COMPANIES.filter(c => c.name.toLowerCase().includes(keyword));
        }

        // Show All Results
        const results = matches;

        dd.innerHTML = '';
        if (results.length === 0) {
            dd.innerHTML = '<div style="padding:10px; color:#aaa; font-size:12px;">검색 결과가 없습니다.</div>';
        } else {
            results.forEach(c => {
                const item = document.createElement('div');
                item.className = 'custom-dropdown-item';
                item.innerHTML = `<span>${c.name}</span><span class="rev">${(c.rev || 0).toLocaleString()}원</span>`;
                item.onmousedown = function () { // use mousedown to fire before blur
                    const input = document.getElementById('dtSearchInput');
                    if (input) input.value = c.name;
                    hideSearchDropdown();
                    renderDetailView();
                };
                dd.appendChild(item);
            });
        }
        dd.style.display = 'block';
    }

    // --- Interaction ---

    function toggleYear(year, btn) {
        if (SELECTED_YEARS.has(year)) {
            SELECTED_YEARS.delete(year);
            btn.classList.remove('active');
        } else {
            SELECTED_YEARS.add(year);
            btn.classList.add('active');
        }
        // Update All Btn State check
        checkAllBtnState();
        // Auto refresh? Maybe wait for click? User requested click based?
        // Let's optimize: refresh if already viewing
        if (document.getElementById('dtDetailContent').style.display !== 'none') {
            renderDetailView();
        }
    }

    function toggleAllYears(btn) {
        const isActive = btn.classList.contains('active');
        if (isActive) {
            // Turn off all
            SELECTED_YEARS.clear();
            btn.classList.remove('active');
            document.querySelectorAll('.year-toggle[data-year]').forEach(b => b.classList.remove('active'));
        } else {
            // Turn on all
            ALL_YEARS.forEach(y => SELECTED_YEARS.add(y));
            btn.classList.add('active');
            document.querySelectorAll('.year-toggle[data-year]').forEach(b => b.classList.add('active'));
        }
        if (document.getElementById('dtDetailContent').style.display !== 'none') {
            renderDetailView();
        }
    }

    function checkAllBtnState() {
        // If all selected, activate All btn
        const allBtn = document.querySelector('#dtYearFilter button.year-toggle:first-child'); // heuristic
        if (!allBtn) return;
        if (SELECTED_YEARS.size === ALL_YEARS.length) allBtn.classList.add('active');
        else allBtn.classList.remove('active');
    }

    // --- Main Analysis ---

    async function renderDetailView() {
        const input = document.getElementById('dtSearchInput');
        const name = input ? input.value.trim() : '';

        if (!name) { alert('사업장명을 입력해주세요.'); return; }
        // Optional: validate if in ALL_COMPANIES

        // Show Loading?

        try {
            // Prepare Params
            const params = new URLSearchParams();
            if (SELECTED_YEARS.size === 0) {
                // If None, maybe alert? Or show 0
            } else {
                SELECTED_YEARS.forEach(y => params.append('years', y));
            }

            const res = await fetch(`${API_BASE_URL}/api/company/${encodeURIComponent(name)}/stats?${params}`);
            if (!res.ok) throw new Error("API Failed");
            const data = await res.json();
            CACHED_DATA = data;

            // Show Content
            document.getElementById('dtPlaceholder').style.display = 'none';
            document.getElementById('dtDetailContent').style.display = 'block';

            // 1. KPI Cards
            document.getElementById('dtKpiRev').innerText = (data.summary.rev || 0).toLocaleString() + '원';
            document.getElementById('dtKpiCnt').innerText = (data.summary.cnt || 0).toLocaleString() + '건'; // Changed unit
            document.getElementById('dtKpiAvg').innerText = (data.summary.avg_price || 0).toLocaleString() + '원';
            document.getElementById('dtKpiAge').innerText = data.summary.max_age;

            // 2. Charts & Table
            renderTrendChart(data.annual);
            renderExamTypeChart(data.exam_types);
            renderAnnualTable(data.annual); // [NEW] Table
            renderMonthlyCharts(data.monthly); // [NEW] Monthly Charts

        } catch (e) {
            console.error(e);
            alert('데이터 조회 중 오류가 발생했습니다.');
        }
    }

    // --- Chart Renderers ---

    function renderAnnualTable(annualData) {
        const div = document.getElementById('dtAnnualTable');
        if (!div) return;

        const years = Array.from(SELECTED_YEARS).sort((a, b) => a - b);
        if (years.length === 0) { div.innerHTML = ''; return; }

        let html = `
        <table style="width:100%; border-collapse:collapse; font-size:13px; text-align:center;">
            <thead>
                <tr style="background:#f8f9fa; border-bottom:1px solid #ddd; color:#555;">
                    <th style="padding:8px;">연도</th>
                    <th style="padding:8px;">매출액</th>
                    <th style="padding:8px; font-size:11px; color:#888;">(전년대비)</th>
                    <th style="padding:8px;">수검인원</th>
                    <th style="padding:8px; font-size:11px; color:#888;">(전년대비)</th>
                </tr>
            </thead>
            <tbody>`;

        let prevR = 0;
        let prevC = 0;

        years.forEach((y, i) => {
            const d = annualData[y] || { r: 0, c: 0 };
            let diffRStr = '<span style="color:#ccc;">-</span>';
            let diffCStr = '<span style="color:#ccc;">-</span>';

            if (i > 0) {
                const diffR = d.r - prevR;
                const diffC = d.c - prevC;

                const colorR = diffR > 0 ? '#E74C3C' : (diffR < 0 ? '#3498DB' : '#999');
                const signR = diffR > 0 ? '▲' : (diffR < 0 ? '▼' : '');
                if (diffR !== 0) diffRStr = `<span style="color:${colorR}; font-weight:bold;">${signR} ${Math.abs(diffR).toLocaleString()}</span>`;

                const colorC = diffC > 0 ? '#E74C3C' : (diffC < 0 ? '#3498DB' : '#999');
                const signC = diffC > 0 ? '▲' : (diffC < 0 ? '▼' : '');
                if (diffC !== 0) diffCStr = `<span style="color:${colorC}; font-weight:bold;">${signC} ${Math.abs(diffC).toLocaleString()}</span>`;
            }

            html += `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:8px; font-weight:bold; color:#444;">${y}년</td>
                    <td style="padding:8px;">${d.r.toLocaleString()}</td>
                    <td style="padding:8px;">${diffRStr}</td>
                    <td style="padding:8px;">${d.c.toLocaleString()}</td>
                    <td style="padding:8px;">${diffCStr}</td>
                </tr>`;

            prevR = d.r;
            prevC = d.c;
        });

        html += `</tbody></table>`;
        div.innerHTML = html;
    }

    function renderTrendChart(annualData) {
        const ctx = document.getElementById('dtTrendChart');
        if (!ctx) return;
        if (window.dtTrendChartInstance) window.dtTrendChartInstance.destroy();

        // Sort years
        const years = Array.from(SELECTED_YEARS).sort((a, b) => a - b);

        const revs = years.map(y => annualData[y]?.r || 0);
        const cnts = years.map(y => annualData[y]?.c || 0);
        const avgs = years.map(y => annualData[y]?.avg || 0);

        window.dtTrendChartInstance = new Chart(ctx, {
            type: 'bar', // Mixed
            data: {
                labels: years.map(y => `${y}년`),
                datasets: [
                    {
                        type: 'line',
                        label: '평균단가',
                        data: avgs,
                        borderColor: '#E74C3C',
                        borderWidth: 2,
                        tension: 0.3,
                        yAxisID: 'y1',
                        pointBackgroundColor: 'white',
                        pointBorderColor: '#E74C3C'
                    },
                    {
                        type: 'bar',
                        label: '검진 건수',
                        data: cnts,
                        backgroundColor: '#3498DB',
                        yAxisID: 'y',
                        barPercentage: 0.5
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                onClick: (e, activeEls, chart) => {
                    if (activeEls.length > 0) {
                        const idx = activeEls[0].index;
                        const label = chart.data.labels[idx];
                        const year = parseInt(label.replace('년', ''));
                        // Filter Monthly Chart
                        if (CACHED_DATA) renderMonthlyCharts(CACHED_DATA.monthly, year);
                    } else {
                        // Reset
                        if (CACHED_DATA) renderMonthlyCharts(CACHED_DATA.monthly, null);
                    }
                },
                plugins: {
                    tooltip: {
                        padding: 18,
                        titleFont: { size: 18 },
                        bodyFont: { size: 14 },
                        callbacks: {
                            afterBody: function (tooltipItems) {
                                // Show Total Revenue
                                const idx = tooltipItems[0].dataIndex;
                                const r = revs[idx]; // From scope
                                return '\n총 매출: ' + r.toLocaleString() + '원';
                            }
                        }
                    }
                },
                scales: {
                    y: { position: 'left', title: { display: true, text: '건수' } },
                    y1: { position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: '단가(원)' } }
                }
            }
        });
    }

    function renderExamTypeChart(typeData) {
        const ctx = document.getElementById('dtTypeChart');
        if (!ctx) return;
        if (window.dtTypeChartInstance) window.dtTypeChartInstance.destroy();

        // Prepare data sorted by count
        const labels = Object.keys(typeData);
        const values = Object.values(typeData);

        window.dtTypeChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: ['#3498DB', '#E74C3C', '#2ECC71', '#F1C40F', '#9B59B6', '#95A5A6', '#34495E'],
                    borderWidth: 2,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%', // Thinner doughnut
                layout: {
                    padding: 20
                },
                plugins: {
                    legend: {
                        position: 'bottom', // Move to bottom to prevent overflow
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            font: { size: 11 }
                        }
                    }
                }
            }
        });
    }

    function renderMonthlyCharts(monthlyData) {
        const ctxRev = document.getElementById('dtMonthRevChart');
        const ctxCnt = document.getElementById('dtMonthCntChart');
        if (!ctxRev || !ctxCnt) return;

        if (window.dtMonthRevInst) window.dtMonthRevInst.destroy();
        if (window.dtMonthCntInst) window.dtMonthCntInst.destroy();

        const years = Array.from(SELECTED_YEARS).sort((a, b) => a - b);
        const labels = Array.from({ length: 12 }, (_, i) => `${i + 1}월`);
        const colors = ['#3498DB', '#E74C3C', '#2ECC71', '#F1C40F', '#9B59B6'];

        // Rev Datasets
        const dsRev = years.map((y, i) => ({
            label: `${y}년`,
            data: monthlyData[y]?.r || Array(12).fill(0),
            borderColor: colors[i % colors.length],
            backgroundColor: colors[i % colors.length],
            tension: 0.3,
            fill: false
        }));

        // Cnt Datasets
        const dsCnt = years.map((y, i) => ({
            label: `${y}년`,
            data: monthlyData[y]?.c || Array(12).fill(0),
            borderColor: colors[i % colors.length],
            backgroundColor: colors[i % colors.length],
            tension: 0.3,
            fill: false
        }));

        // Render Rev
        window.dtMonthRevInst = new Chart(ctxRev, {
            type: 'line',
            data: { labels: labels, datasets: dsRev },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    tooltip: {
                        padding: 10,
                        callbacks: {
                            label: function (context) {
                                let label = context.dataset.label || '';
                                if (label) { label += ': '; }
                                if (context.parsed.y !== null) { label += context.parsed.y.toLocaleString() + '원'; }
                                return label;
                            }
                        }
                    }
                }
            }
        });

        // Render Cnt
        window.dtMonthCntInst = new Chart(ctxCnt, {
            type: 'line',
            data: { labels: labels, datasets: dsCnt },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    tooltip: { padding: 10 }
                }
            }
        });
    }

    return {
        init: init,
        renderDetailView: renderDetailView,
        showSearchDropdown: showSearchDropdown,
        hideSearchDropdown: hideSearchDropdown,
        filterSearchDropdown: filterSearchDropdown
    };

})();

window.DetailModule = DetailModule;
