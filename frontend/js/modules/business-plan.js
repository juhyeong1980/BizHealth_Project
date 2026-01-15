
// --- 2026 Business Plan Module (Refactored for Sub-menus) ---

const BusinessPlanModule = (function () {
    let cachedData = null;

    async function init(viewId) {
        addStyles();
        const container = document.getElementById('bp-container');
        if (!container) return;

        // Ensure data
        if (!cachedData) {
            container.innerHTML = '<div style="padding:100px; text-align:center; color:#999;"><i class="fas fa-spinner fa-spin"></i> 데이터 분석 및 로딩 중...</div>';
            try {
                // Fetch new data (Always fetch to get MO and CL)
                const res = await fetch(`${API_BASE_URL}/api/stats?years=2024&years=2025`);
                if (res.ok) {
                    cachedData = await res.json();
                }
            } catch (e) {
                console.error("Data Load Error", e);
                container.innerHTML = '<div style="padding:50px; text-align:center; color:red;">데이터 로드 실패</div>';
                return;
            }
        }

        let content = '';
        if (viewId === 'businessPlan') {
            content = `
                <div style="margin-bottom: 30px;">${renderPerformance(cachedData)}</div>
                <div style="margin-bottom: 50px;">${renderTargets()}</div>
                <div style="margin-bottom: 50px;">${renderStrategy1()}</div>
                <div style="margin-bottom: 50px;">${renderStrategy2()}</div>
                <div style="margin-bottom: 50px;">${renderThreats()}</div>
            `;
        } else {
            switch (viewId) {
                case 'bp_performance': content = renderPerformance(cachedData); break;
                case 'bp_targets': content = renderTargets(); break;
                // Map 'Major Sales Strategy' to Threats/Competition context
                case 'bp_sales': content = renderThreats(); break;
                // Map 'Efficiency Plan' to Internal Process + Customer Support
                // Efficiency Plans
                case 'bp_eff_sales': content = renderEfficiencySales(); break;
                case 'bp_eff_support': content = renderEfficiencySupport(); break;
                case 'bp_eff_results': content = renderEfficiencyResults(); break;
                // [NEW] Interactive Flowchart
                case 'bp_reservation_flow': content = renderReservationFlow(); break;
                // [NEW] Fighting
                case 'bp_fighting': content = renderFighting(); break;
                // Keep backward compatibility if needed, or removable
                case 'bp_strategy1': content = renderStrategy1(); break;
                case 'bp_strategy2': content = renderStrategy2(); break;
                case 'bp_threats': content = renderThreats(); break;
                default: content = '<div style="padding:50px; text-align:center;">페이지를 찾을 수 없습니다.</div>';
            }
        }

        const isFullPage = viewId === 'bp_reservation_flow' || viewId === 'bp_fighting';
        const wrapperStyle = isFullPage ? "padding: 0; height: 100%; width: 100%; max-width: none;" : "padding: 30px;";
        // Use 100vh to ensure it fills the viewport if parents fail
        const outerStyle = isFullPage ? "height: calc(100vh - 80px); width: 100%; max-width: none; overflow: hidden;" : "";

        container.innerHTML = `
            <div class="bp-wrapper fadeIn" style="${outerStyle}">
                <div class="bp-slide-body" style="${wrapperStyle}">
                    ${content}
                </div>
            </div>
        `;

        // Draw Chart if Performance View
        if (viewId === 'businessPlan' || viewId === 'bp_performance') {
            setTimeout(() => {
                if (cachedData && cachedData.MO) {
                    drawMonthlyChart(cachedData.MO);
                }
            }, 100);
        }

        // Animate Targets if Targets View
        if (viewId === 'businessPlan' || viewId === 'bp_targets') {
            setTimeout(() => animateTargets(), 300);
        }
    }

    function renderPerformance(data) {
        const clData = data ? data.CL : null;

        let goal2025 = 8059000000;
        let actual2025 = 8590000000; // Fixed: 85.9억
        let actual2024 = 7231000000;

        let wonSites = [];

        // Logic: Prioritize New Sites (2025 revenue > 0, 2024 == 0)
        // Then fill with Top Revenue sites.
        if (clData) {
            const allSites = [];
            let total2025 = 0;
            let total2024 = 0;

            Object.entries(clData).forEach(([name, data]) => {
                const r2025 = data.y[2025] || 0;
                const r2024 = data.y[2024] || 0;

                total2025 += r2025;
                total2024 += r2024;

                if (r2025 > 0) {
                    allSites.push({ name, val: r2025, isNew: r2024 === 0 });
                }
            });

            // Update Actuals with real data if available
            // if (total2025 > 0) actual2025 = total2025; // User Request: Fixed to 85.9억
            if (total2024 > 0) actual2024 = total2024;

            // Sort: New sites first, then by Revenue desc
            allSites.sort((a, b) => {
                if (a.isNew && !b.isNew) return -1;
                if (!a.isNew && b.isNew) return 1;
                return b.val - a.val;
            });

            wonSites = allSites.slice(0, 5);
        }

        // Fallback for demo if absolutely no data (should not happen with DB)
        if (wonSites.length === 0) {
            wonSites = [{ name: '데이터 없음', val: 0 }];
        }

        const achieveRate = ((actual2025 / goal2025) * 100).toFixed(1);
        const yoyGrowth = actual2024 > 0 ? (((actual2025 - actual2024) / actual2024) * 100).toFixed(1) : '100';
        const maxVal = Math.max(goal2025, actual2025) * 1.15;
        const goalWidth = ((goal2025 / maxVal) * 100).toFixed(1);
        const actualWidth = ((actual2025 / maxVal) * 100).toFixed(1);

        return `
            <div class="bp-slide-layout two-col" style="margin-bottom: 20px;">
                <div class="bp-col left">
                    <div class="bp-card highlight">
                        <h3>📊 2025년 실적 요약</h3>
                        <div class="bp-kpi-sub" style="text-align:center; font-size:12px; color:#666; margin-bottom:15px;">
                            (2024년 실적: ${(actual2024 / 100000000).toFixed(1)}억)
                        </div>
                        <div class="bp-kpi-group">
                            <div class="bp-kpi-item">
                                <div class="label">목표 (Goal)</div>
                                <div class="value">${(goal2025 / 100000000).toFixed(1)}억</div>
                            </div>
                            <div class="bp-kpi-item">
                                <div class="label">실적 (Actual)</div>
                                <div class="value accent">${(actual2025 / 100000000).toFixed(1)}억</div>
                            </div>
                            <div class="bp-kpi-item">
                                <div class="label">달성률</div>
                                <div class="value ${achieveRate >= 100 ? 'good' : 'bad'}">${achieveRate}%</div>
                            </div>
                        </div>
                        
                        <div style="display:flex; justify-content:center; align-items:center; gap:10px; margin-bottom:20px; padding:10px; background:#f0f8ff; border-radius:8px;">
                            <span style="font-size:13px; font-weight:600; color:#2c3e50;">전년 대비 성장률 (YoY):</span>
                            <span style="font-size:16px; font-weight:800; color:#27ae60;">+${yoyGrowth}% 📈</span>
                        </div>

                        <div class="bp-chart-placeholder">
                            <div class="bar-container">
                                <div class="bar-label">2025 목표 (${(goal2025 / 100000000).toFixed(1)}억)</div>
                                <div class="bar-track"><div class="bar-fill gray" style="width: ${goalWidth}%"></div></div>
                            </div>
                            <div class="bar-container">
                                <div class="bar-label">2025 실적 (${(actual2025 / 100000000).toFixed(1)}억)</div>
                                <div class="bar-track"><div class="bar-fill blue" style="width: ${actualWidth}%"></div></div>
                            </div>
                            <style>.bar-fill { transition: width 1s ease-out; }</style>
                        </div>
                    </div>
                </div>
                <div class="bp-col right">
                    <div class="bp-card">
                        <h3>🏆 핵심 수주 사업장 (Top 5)</h3>
                        <div class="sub-text" style="font-size:12px; color:#999; margin-bottom:15px;">* 2025년 매출 상위 (신규 우선)</div>
                        <ul class="bp-list-rank">
                            ${wonSites.map((s, i) => `
                                <li>
                                    <span class="rank">${i + 1}</span>
                                    <span class="name">${s.name} ${s.isNew ? '<span style="font-size:10px; color:red; border:1px solid red; border-radius:4px; padding:0 3px; margin-left:5px;">N</span>' : ''}</span>
                                    <span class="amt">${(s.val / 1000000).toLocaleString()}백만</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
            </div>

            <!-- New Monthly Chart Section -->
            <div class="bp-slide-layout single-col">
                <div class="bp-card">
                    <h3 style="margin-bottom: 15px;">📈 월별 매출 추이 (2024 vs 2025)</h3>
                    <div style="height: 300px; position: relative;">
                        <canvas id="perfChart"></canvas>
                    </div>
                </div>
            </div>
        `;
    }

    function drawMonthlyChart(moData) {
        const ctx = document.getElementById('perfChart');
        if (!ctx || !moData) return;

        // Data Prep
        const d2024 = moData[2024] || Array(12).fill(0);
        const d2025 = moData[2025] || Array(12).fill(0);
        const labels = Array.from({ length: 12 }, (_, i) => `${i + 1}월`);

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        type: 'line',
                        label: '2025 추세',
                        data: d2025,
                        borderColor: '#2980b9',
                        borderWidth: 2,
                        tension: 0.4,
                        pointBackgroundColor: '#2980b9',
                        order: 0
                    },
                    {
                        label: '2024년',
                        data: d2024,
                        backgroundColor: '#bdc3c7',
                        borderRadius: 4,
                        order: 2,
                        barPercentage: 0.6
                    },
                    {
                        label: '2025년',
                        data: d2025,
                        backgroundColor: '#3498db',
                        borderRadius: 4,
                        order: 1,
                        barPercentage: 0.6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: { position: 'top', align: 'end' },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                let label = context.dataset.label || '';
                                if (label) { label += ': '; }
                                if (context.parsed.y !== null) {
                                    label += new Intl.NumberFormat('ko-KR').format(context.parsed.y) + '원';
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { borderDash: [2, 4], color: '#f0f0f0' },
                        ticks: {
                            callback: function (value) {
                                return (value / 100000000).toFixed(1) + '억';
                            }
                        }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    }

    function animateTargets() {
        // Helper for counting up
        const countUp = (id, target, suffix = '') => {
            const el = document.getElementById(id);
            if (!el) return;
            const duration = 1500; // ms
            const start = 0;
            const startTime = performance.now();

            function update(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // EaseOutQuart
                const ease = 1 - Math.pow(1 - progress, 4);

                const current = start + (target - start) * ease;
                el.innerText = current.toFixed(2) + suffix;

                if (progress < 1) {
                    requestAnimationFrame(update);
                } else {
                    el.innerText = target.toFixed(id === 'val-growth' ? 2 : 1) + suffix;
                }
            }
            requestAnimationFrame(update);
        };

        countUp('val-2025', 85.9, '억');
        countUp('val-2026', 90.1, '억');
        countUp('val-growth', 4.16, '억 🚀');
    }

    function renderTargets() {
        return `
            <div class="bp-slide-layout" style="flex-direction: column;">
                <!-- New Revenue KPI Section -->
                <div class="bp-card highlight-blue" style="margin-bottom: 30px; background: linear-gradient(to right, #fdfbfb, #ebedee); padding: 25px 40px;">
                    <div style="display: flex; justify-content: space-around; align-items: center; width: 100%;">
                        
                        <!-- 2025 -->
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <span style="font-size: 16px; color: #7f8c8d; font-weight: 700;">2025년 실적</span>
                            <div style="display: flex; align-items: baseline; gap: 8px;">
                                <span id="val-2025" style="font-size: 32px; font-weight: 800; color: #555;">0</span>
                                <span style="font-size: 14px; color: #95a5a6;">(8,592백만원)</span>
                            </div>
                        </div>

                        <!-- Arrow -->
                        <div style="color: #bdc3c7; font-size: 24px;"><i class="fas fa-chevron-right"></i></div>

                        <!-- 2026 -->
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <span style="font-size: 16px; color: #2980b9; font-weight: 700;">2026년 목표</span>
                            <div style="display: flex; align-items: baseline; gap: 8px;">
                                <span id="val-2026" style="font-size: 36px; font-weight: 800; color: #2980b9;">0</span>
                                <span style="font-size: 14px; color: #3498db;">(9,008백만원)</span>
                            </div>
                        </div>

                        <!-- Divider -->
                        <div style="width: 1px; height: 40px; background: #ddd; margin: 0 10px;"></div>

                        <!-- Growth -->
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <span style="font-size: 16px; color: #27ae60; font-weight: 700;">성장</span>
                            <div style="display: flex; align-items: baseline; gap: 8px;">
                                <span id="val-growth" style="font-size: 32px; font-weight: 800; color: #27ae60;">0</span>
                                <span style="font-size: 14px; color: #27ae60; background: rgba(39, 174, 96, 0.1); padding: 2px 8px; border-radius: 4px;">+4.8%</span>
                            </div>
                        </div>

                    </div>
                </div>

                <div class="bp-target-grid" style="display: flex; gap: 30px; width: 100%;">
                    <!-- Key Targets (Left) -->
                    <div class="bp-target-main">
                        <div style="margin-bottom:20px;">
                            <h2 style="margin:0; font-size:24px; color:#2c3e50;">2026 핵심 목표 사업장</h2>
                        </div>
                        <div class="target-card-grid" style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:20px; margin:30px 0; height:300px;">
                            <div class="target-card" style="height: 100%; min-height: 160px;">
                                <div class="card-bg" style="background-image: url('images/celltrion_building.png');"></div>
                                <div class="card-overlay">
                                    <div class="card-content">
                                        <span class="ko" style="font-size: 24px;">셀트리온</span>
                                        <span class="en">Celltrion</span>
                                    </div>
                                </div>
                            </div>
                            <div class="target-card" style="height: 100%; min-height: 160px;">
                                <div class="card-bg" style="background-image: url('images/sk_bio_web.png?v=${new Date().getTime()}');"></div>
                                <div class="card-overlay">
                                    <div class="card-content">
                                        <span class="ko" style="font-size: 24px;">SK바이오사이언스</span>
                                        <span class="en">SK Bioscience</span>
                                    </div>
                                </div>
                            </div>
                            <div class="target-card" style="height: 100%; min-height: 160px;">
                                <div class="card-bg" style="background-image: url('images/lotte_bio_building.png');"></div>
                                <div class="card-overlay">
                                    <div class="card-content">
                                        <span class="ko" style="font-size: 24px;">롯데바이오로직스</span>
                                        <span class="en">Lotte Biologics</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div style="text-align: center; margin-top: 20px; font-size: 18px; font-weight: 700; color: #2c3e50; background: #e8f6f3; padding: 15px; border-radius: 8px; border-left: 5px solid #1abc9c;">
                            셀트리온, SK바이오사이언스, 롯데바이오로직스 약 4억원의 매출 발생 예상
                        </div>
                    </div>

                    <!-- Pipeline (Right, Scrollable) -->
                    <div class="bp-target-sub" style="background: white; border-radius: 16px; padding: 25px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); display: flex; flex-direction: column; height: 480px;">
                        
                        ${(() => {
                const rawList = [
                    { name: '인천교통공사', count: 180, rev: 50000000 },
                    { name: '스태츠칩팩코리아', count: 50, rev: 20000000 },
                    { name: '오스템', count: 50, rev: 20000000 },
                    { name: '아이센스', count: 200, rev: 50000000 },
                    { name: '대봉그룹', count: 50, rev: 20000000 },
                    { name: '헨켈코리아', count: 50, rev: 20000000 },
                    { name: '두산산업차량 협력사', count: 270, rev: 90000000 },
                    { name: '스태츠칩팩코리아(2)', count: 50, rev: 20000000 },
                    { name: '리탈', count: 100, rev: 40000000 },
                    { name: '인천시사회서비스원', count: 48, rev: 15000000 },
                    { name: '재영솔루텍', count: 180, rev: 50000000 },
                    { name: '얀센백신', count: 50, rev: 20000000 },
                    { name: '재외동포청', count: 50, rev: 20000000 },
                    { name: '한전KPS', count: 100, rev: 40000000 },
                    { name: '삼성화재서비스손해사정', count: 100, rev: 40000000 },
                    { name: '한국가스공사', count: 50, rev: 20000000 },
                    { name: '다운포스', count: 40, rev: 15000000 },
                    { name: '인천대교', count: 30, rev: 10000000 },
                    { name: '91컴퍼니', count: 50, rev: 20000000 },
                    { name: '제이어스랩', count: 20, rev: 8000000 },
                    { name: '현대사이트솔루션', count: 60, rev: 25000000 },
                    { name: '생고뱅코리아', count: 100, rev: 40000000 },
                    { name: '인천항보안공사', count: 200, rev: 60000000 },
                    { name: '국립수의과학검역원', count: 20, rev: 6000000 },
                    { name: '국립환경과학원', count: 20, rev: 5500000 },
                    { name: '선광신컨테이너터미널', count: 20, rev: 7000000 },
                    { name: '스마트항만', count: 20, rev: 7000000 },
                    { name: '쏠트리', count: 20, rev: 7000000 },
                    { name: '인천공항에너지', count: 20, rev: 7000000 },
                    { name: '인천스마트시티', count: 20, rev: 7000000 },
                    { name: '한진인천컨테이너터미널', count: 20, rev: 7000000 },
                    { name: '인천항시설관리센터', count: 230, rev: 50000000 },
                    { name: '인천도시공사', count: 30, rev: 10000000 },
                    { name: '희성촉매', count: 30, rev: 10000000 },
                    { name: 'K-Water', count: 40, rev: 12000000 },
                    { name: '삼천리', count: 40, rev: 16000000 },
                    { name: '인천중구문화재단', count: 40, rev: 14000000 },
                    { name: '한국생산기술연구원', count: 40, rev: 10000000 },
                    { name: '한국전력공사', count: 420, rev: 48000000 },
                    { name: '아이리스', count: 50, rev: 30000000 },
                    { name: '에이치엘클레무브', count: 50, rev: 17000000 },
                    { name: '인천테크노파크', count: 50, rev: 15000000 },
                    { name: '인천하이테크서비스', count: 50, rev: 15000000 },
                    { name: '한국철도공사', count: 50, rev: 10000000 },
                    { name: '에코엘이디', count: 70, rev: 4500000 },
                    { name: 'E1 컨테이너터미널', count: 100, rev: 21000000 },
                    { name: 'SSG랜더스', count: 50, rev: 25000000 }
                ];

                const totalRev = rawList.reduce((acc, cur) => acc + cur.rev, 0);
                const totalRevStr = (totalRev / 100000000).toFixed(1) + '억원'; // e.g. 10.5억원

                return `
                                <div style="margin-bottom: 10px; border-bottom: 2px solid #eee; padding-bottom: 10px;">
                                    <h3 style="margin: 0; font-size: 18px; color: #34495e;">기타 목표 (Pipeline)</h3>
                                    <div style="font-size: 14px; color: #27ae60; margin-top: 5px; font-weight: 600;">
                                        총 ${rawList.length}개소, ${totalRevStr} 규모
                                    </div>
                                </div>
                                <div style="flex: 1; overflow-y: auto; padding-right: 5px;" class="custom-scrollbar">
                                    <table style="width: 100%; border-collapse: collapse;">
                                        <thead style="position: sticky; top: 0; background: white;">
                                            <tr style="border-bottom: 2px solid #ddd; font-size: 12px; color: #7f8c8d;">
                                                <th style="text-align: left; padding: 6px;">사업장명</th>
                                                <th style="text-align: center; padding: 6px;">인원</th>
                                                <th style="text-align: right; padding: 6px;">매출</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${rawList.map(item => `
                                                <tr style="border-bottom: 1px solid #f0f0f0; font-size: 13px;">
                                                    <td style="padding: 8px 6px; font-weight: 600; color: #2c3e50;">${item.name}</td>
                                                    <td style="padding: 8px 6px; text-align: center; color: #7f8c8d;">${item.count}</td>
                                                    <td style="padding: 8px 6px; text-align: right; color: #3498db;">${(item.rev / 10000).toLocaleString()}만</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            `;
            })()}
                    </div>
                </div>
            </div>
        `;
    }

    function renderStrategy1() {
        return `
            <div class="bp-slide-layout single-col">
                <div class="bp-card highlight-blue h-100" style="display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; padding:60px;">
                    <div class="card-icon blue large" style="margin-bottom:40px;"><i class="fas fa-cogs"></i></div>
                    <h3 style="font-size:36px; margin-bottom:40px;">내부 프로세스 강화</h3>
                    <ul class="strategy-list large">
                        <li>
                            <span class="tag">효용성 증대</span>
                            <span class="desc">검진 프로세스 병목 구간 분석 및 해소로 건당 처리 시간 15% 단축</span>
                        </li>
                        <li>
                            <span class="tag">약점 보완</span>
                            <span class="desc">고객 VOC(Voice of Customer) 실시간 분석을 통한 불만 요인 사전 제거</span>
                        </li>
                        <li>
                            <span class="tag">시장 확대</span>
                            <span class="desc">기존 고객 외 활동 영역 확장을 통한 새로운 니치 마켓(Niche Market) 발굴</span>
                        </li>
                    </ul>
                </div>
            </div>
        `;
    }

    function renderStrategy2() {
        return `
            <div class="bp-slide-layout single-col">
                <div class="bp-card highlight-green h-100" style="display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; padding:60px;">
                    <div class="card-icon green large" style="margin-bottom:40px;"><i class="fas fa-users-cog"></i></div>
                    <h3 style="font-size:36px; margin-bottom:40px;">고객지원 효율화</h3>
                    <div class="support-grid">
                        <div class="support-box">
                            <div class="icon"><i class="far fa-calendar-check"></i></div>
                            <h4>예약 시스템 개발</h4>
                            <p>정보 전달 자동화로 '쉽고 정확한 예약' 구현</p>
                            <span class="effect">예약 부도율 20% 감소 기대</span>
                        </div>
                        <div class="arrow"><i class="fas fa-arrow-right"></i></div>
                        <div class="support-box">
                            <div class="icon"><i class="fas fa-laptop-medical"></i></div>
                            <h4>결과 시스템(유젠스) 확장</h4>
                            <p>결과 처리 리소스 30% 절감 및 수검자 조회 편의성 증대</p>
                            <span class="effect">행정 업무 시간 월 40시간 절약</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function renderThreats() {
        return `
            <div class="bp-slide-layout" style="background:#f3f4f6; padding: 40px; height: 100%; box-sizing: border-box; font-family: 'Noto Sans KR', sans-serif;">
                <!-- Header Section -->
                <header style="margin-bottom: 30px; border-left: 8px solid #16a34a; padding-left: 24px; display: flex; flex-direction: column; justify-content: center;">
                    <h1 style="font-size: 36px; font-weight: 900; color: #111827; margin: 0 0 10px 0; letter-spacing: -0.025em; line-height: 1.3;">주요 영업활동 전략 :<br>경쟁 극복 및 성장 가속화</h1>
                    <p style="font-size: 20px; color: #15803d; font-weight: 500; margin: 0;">"체계적인 시장 분석과 공격적인 영업 전략으로 위기를 기회로 전환"</p>
                </header>

                <!-- Main Content Grid (2 Columns Full Height for Strategy) -->
                <div style="display: flex; gap: 24px; height: calc(100% - 130px);">
                    
                    <!-- Left: Market Situation -->
                    <div style="flex: 1; background-color: #f0fdf4; border-radius: 0.75rem; padding: 24px; border: 1px solid #bbf7d0; display: flex; flex-direction: column; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">
                        <div style="display: flex; align-items: center; margin-bottom: 24px;">
                            <div style="width: 48px; height: 48px; background-color: #dcfce7; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #16a34a; margin-right: 16px; font-size: 20px;">
                                <i class="fas fa-search-dollar"></i>
                            </div>
                            <h2 style="font-size: 22px; font-weight: 700; color: #14532d; margin: 0;">시장 상황</h2>
                        </div>
                        
                        <div style="display: flex; flex-direction: column; gap: 16px; flex: 1;">
                           <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #bbf7d0; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                                <div style="display: flex; align-items: center; margin-bottom: 6px;">
                                    <i class="fas fa-exclamation-circle" style="color:#ef4444; margin-right: 8px;"></i>
                                    <strong style="color:#1f2937; font-size: 16px;">과열 경쟁</strong>
                                </div>
                                <p style="color:#4b5563; font-size:14px; margin:0; line-height:1.5;">나은병원, 아인병원 등 관내 거점 병원의 활동과 출혈경쟁 심화</p>
                           </div>
                           <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #bbf7d0; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                                <div style="display: flex; align-items: center; margin-bottom: 6px;">
                                    <i class="fas fa-hospital-alt" style="color:#ef4444; margin-right: 8px;"></i>
                                    <strong style="color:#1f2937; font-size: 16px;">신규 기관</strong>
                                </div>
                                <p style="color:#4b5563; font-size:14px; margin:0; line-height:1.5;">건강관리협회 확장이전 (7,500평 규모 지상7층/지하5층)</p>
                           </div>
                            <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #bbf7d0; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                                <div style="display: flex; align-items: center; margin-bottom: 6px;">
                                    <i class="fas fa-user-minus" style="color:#ef4444; margin-right: 8px;"></i>
                                    <strong style="color:#1f2937; font-size: 16px;">인력 유출</strong>
                                </div>
                                <p style="color:#4b5563; font-size:14px; margin:0; line-height:1.5;">핵심 영업인력의 이동과 검진플랫폼 출신인력의 영입</p>
                           </div>
                           <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #bbf7d0; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                                <div style="display: flex; align-items: center; margin-bottom: 6px;">
                                    <i class="fas fa-users-slash" style="color:#ef4444; margin-right: 8px;"></i>
                                    <strong style="color:#1f2937; font-size: 16px;">고객 이탈</strong>
                                </div>
                                <p style="color:#4b5563; font-size:14px; margin:0; line-height:1.5;">불만사항 반복 및 혜택 민감도 증가로 인한 충성도 하락</p>
                           </div>
                        </div>
                    </div>

                    <!-- Right: Sales Strategy -->
                    <div style="flex: 1; background-color: white; border-radius: 0.75rem; padding: 24px; border: 1px solid #e5e7eb; display: flex; flex-direction: column; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                        <div style="display: flex; align-items: center; margin-bottom: 24px;">
                            <div style="width: 48px; height: 48px; background-color: #dcfce7; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #16a34a; margin-right: 16px; font-size: 20px;">
                                <i class="fas fa-chess-knight"></i>
                            </div>
                            <h2 style="font-size: 22px; font-weight: 700; color: #1f2937; margin: 0;">영업 전략</h2>
                        </div>
                        
                        <div style="display: flex; flex-direction: column; gap: 20px; flex: 1;">
                            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 12px; border: 1px solid #dcfce7; display: flex; flex-direction: column;">
                                <h3 style="font-weight: 700; color: #15803d; font-size: 18px; margin: 0 0 8px 0; display:flex; align-items:center;">
                                    <span style="background:#16a34a; color:white; font-size:12px; padding:2px 8px; border-radius:99px; margin-right:10px;">Retention</span>
                                    이탈 방지
                                </h3>
                                <p style="color: #374151; line-height: 1.6; font-size: 15px; margin: 0;">VOC 분석을 통해 불만 요인을 근본적으로 해결하고, 파트별 선제적 대응 시스템을 구축하여 고객 만족도를 제고합니다.</p>
                            </div>
                             <div style="background-color: #f0fdf4; padding: 20px; border-radius: 12px; border: 1px solid #dcfce7; display: flex; flex-direction: column;">
                                <h3 style="font-weight: 700; color: #15803d; font-size: 18px; margin: 0 0 8px 0; display:flex; align-items:center;">
                                    <span style="background:#16a34a; color:white; font-size:12px; padding:2px 8px; border-radius:99px; margin-right:10px;">Profitability</span>
                                    체질 개선
                                </h3>
                                <p style="color: #374151; line-height: 1.6; font-size: 15px; margin: 0;">단순 물량 중심이 아닌 신규 및 고단가 검사 항목 제안으로 전환하여, 수익 중심의 건전한 영업 구조를 확립합니다.</p>
                            </div>
                             <div style="background-color: #f0fdf4; padding: 20px; border-radius: 12px; border: 1px solid #dcfce7; display: flex; flex-direction: column;">
                                <h3 style="font-weight: 700; color: #15803d; font-size: 18px; margin: 0 0 8px 0; display:flex; align-items:center;">
                                    <span style="background:#16a34a; color:white; font-size:12px; padding:2px 8px; border-radius:99px; margin-right:10px;">Expansion</span>
                                    영역 확대
                                </h3>
                                <p style="color: #374151; line-height: 1.6; font-size: 15px; margin: 0;">서울, 경기 서남부(안산, 시흥, 영종도), 충남 등 핵심 타겟 지역으로 영업 범위를 확장하여 신규 시장을 창출합니다.</p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        `;
    }

    function addStyles() {
        if (document.getElementById('bp-styles-korean')) return;
        const style = document.createElement('style');
        style.id = 'bp-styles-korean';
        style.textContent = `
            :root {
                --bp-bg: #F4F6F9;
                --bp-card-bg: #FFFFFF;
                --bp-primary: #2C3E50;
                --bp-accent: #3498DB;
                --bp-danger: #E74C3C;
                --bp-success: #27AE60;
                --bp-text: #333333;
                --bp-text-light: #7F8C8D;
            }

            .bp-wrapper {
                display: flex; flex-direction: column; min-height: 100%;
                background-color: var(--bp-bg);
                font-family: 'Inter', 'Pretendard', sans-serif;
            }

            .bp-slide-layout { display: flex; gap: 30px; padding-bottom: 50px; height: auto; }
            .bp-slide-layout.two-col { display: grid; grid-template-columns: 1fr 1fr; }
            
            .bp-card { background: var(--bp-card-bg); border-radius: 12px; padding: 25px; box-shadow: 0 4px 6px rgba(0,0,0,0.04); }
            .bp-card h3 { margin-top: 0; margin-bottom: 20px; font-size: 18px; color: var(--bp-primary); border-left: 4px solid var(--bp-accent); padding-left: 10px; }
            .bp-card.highlight { border: 1px solid var(--bp-accent); }
            .bp-card.h-100 { height: 100%; box-sizing: border-box; }

            .bp-kpi-group { display: flex; justify-content: space-around; margin-bottom: 30px; }
            .bp-kpi-item { text-align: center; }
            .bp-kpi-item .label { font-size: 13px; color: var(--bp-text-light); margin-bottom: 5px; }
            .bp-kpi-item .value { font-size: 24px; font-weight: 800; color: var(--bp-primary); }
            .bp-kpi-item .value.accent { color: var(--bp-accent); }
            .bp-kpi-item .value.good { color: var(--bp-success); }
            .bp-kpi-item .value.bad { color: var(--bp-danger); }

            .bp-chart-placeholder { padding: 20px; background: #f9f9f9; border-radius: 8px; }
            .bar-container { margin-bottom: 15px; }
            .bar-label { font-size: 12px; margin-bottom: 5px; color: #666; }
            .bar-track { height: 12px; background: #e0e0e0; border-radius: 6px; overflow: hidden; }
            .bar-fill { height: 100%; border-radius: 6px; }
            .bar-fill.gray { background: #bdc3c7; }
            .bar-fill.blue { background: var(--bp-accent); }

            .bp-list-rank { list-style: none; padding: 0; }
            .bp-list-rank li { display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #eee; }
            .bp-list-rank li .rank { width: 30px; height: 30px; background: var(--bp-primary); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; }
            .bp-list-rank li .name { flex: 1; font-weight: 600; font-size: 16px; }
            .bp-list-rank li .amt { font-weight: 700; color: var(--bp-accent); }

            .bp-target-grid { display: flex; gap: 30px; width: 100%; }
            .bp-target-main { flex: 2; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); text-align: center; }
            .bp-target-sub { flex: 1; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }

            .target-card-grid { display:grid; grid-template-columns: 1fr 1fr 1fr; gap:20px; margin:30px 0; height:300px; }
            .target-card { position:relative; border-radius:16px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.1); transition:transform 0.3s; cursor:pointer; }
            .target-card:hover { transform:translateY(-10px); box-shadow:0 15px 30px rgba(0,0,0,0.2); }
            .card-bg { width:100%; height:100%; background-size:cover; background-position:center; transition:transform 0.5s; }
            .target-card:hover .card-bg { transform:scale(1.1); }
            .card-overlay { position:absolute; bottom:0; left:0; width:100%; background:linear-gradient(to top, rgba(0,0,0,0.8), transparent); padding:20px; box-sizing:border-box; }
            .card-content { display:flex; flex-direction:column; align-items:flex-start; }
            .card-content .ko { color:white; font-size:20px; font-weight:800; text-shadow:0 2px 4px rgba(0,0,0,0.5); }
            .card-content .en { color:rgba(255,255,255,0.8); font-size:12px; margin-top:4px; font-weight:600; }
            
            .strategy-note { background: #f9f9f9; padding: 15px; border-radius: 8px; color: #555; font-size: 14px; }
            .bp-check-list { list-style: none; padding: 0; margin-top: 20px; text-align: left; }
            .bp-check-list li { margin-bottom: 12px; padding-left: 25px; position: relative; font-size: 15px; }
            .bp-check-list li::before { content: '✔️'; position: absolute; left: 0; color: var(--bp-success); font-size: 12px; top: 3px; }
            .pipeline-status { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; display: flex; justify-content: space-between; font-size: 13px; color: #666; font-weight: 600; }

            .card-icon { width: 50px; height: 50px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 24px; color: white; margin-bottom: 20px; }
            .card-icon.blue { background: var(--bp-accent); }
            .card-icon.red { background: var(--bp-danger); }
            .card-icon.green { background: var(--bp-success); }
            .card-icon.large { width:80px; height:80px; font-size:40px; border-radius:20px; }
            
            .bp-slide-layout.single-col { display:block; min-height:100%; }
            
            .strategy-list.large { list-style:none; padding:0; text-align:left; width:100%; max-width:800px; }
            .strategy-list.large li { margin-bottom:30px; background:#f9f9f9; padding:20px; border-radius:12px; display:flex; align-items:center; }
            .strategy-list.large .tag { background:var(--bp-primary); color:white; padding:8px 15px; border-radius:20px; font-weight:bold; margin-right:20px; white-space:nowrap; }
            .strategy-list.large .desc { font-size:18px; color:#555; font-weight:600; }

            .support-grid { display:flex; justify-content:center; align-items:center; gap:30px; margin-top:30px; }
            .support-box { background:white; border:2px solid #eee; padding:40px; border-radius:16px; width:300px; text-align:center; box-shadow:0 10px 20px rgba(0,0,0,0.05); }
            .support-box .icon { font-size:50px; color:var(--bp-success); margin-bottom:20px; }
            .support-box h4 { font-size:22px; margin:0 0 15px 0; color:var(--bp-primary); }
            .support-box p { color:#777; margin-bottom:20px; min-height:50px; }
            .support-box .effect { display:inline-block; background:#e8f8f5; color:#27ae60; padding:5px 15px; border-radius:15px; font-size:14px; font-weight:bold; }
            .arrow { font-size:30px; color:#ccc; }

            .threat-container { display:flex; flex-direction:column; gap:20px; max-width:900px; margin:0 auto; }
            .threat-item { background:white; border:1px solid #ddd; border-radius:12px; padding:25px; display:flex; flex-direction:column; text-align:left; }
            .threat-item.major { border:2px solid #e74c3c; background:#fffdfd; }
            .th-header { font-size:20px; font-weight:800; color:var(--bp-primary); margin-bottom:10px; display:flex; align-items:center; gap:10px; }
            .threat-item.major .th-header { color:#c0392b; }
            .th-body strong { font-size:16px; display:block; margin-bottom:5px; }
            .th-body p { margin:0; color:#666; }
            .th-action { margin-top:15px; padding-top:15px; border-top:1px dashed #eee; font-weight:bold; color:var(--bp-accent); }
            .threat-item.major .th-action { color:#c0392b; }

            .fadeIn { animation: fadeIn 0.5s ease-out; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        `;
        document.head.appendChild(style);
    }

    // [NEW] Efficiency Plan: Sales (Data-Driven)
    function renderEfficiencySales() {
        return `
            <div class="bp-slide-layout" style="background:#f3f4f6; padding: 40px; height: 100%; box-sizing: border-box; font-family: 'Noto Sans KR', sans-serif;">
                <!-- Header Section -->
                <header style="margin-bottom: 30px; border-left: 8px solid #1e40af; padding-left: 24px; display: flex; flex-direction: column; justify-content: center;">
                    <h1 style="font-size: 36px; font-weight: 900; color: #111827; margin: 0 0 10px 0; letter-spacing: -0.025em; line-height: 1.3;">데이터 기반 영업 효율화 :<br>사업장 정보 관리 시스템</h1>
                    <p style="font-size: 20px; color: #1d4ed8; font-weight: 500; margin: 0;">5개년 누적 데이터 분석을 통한 '타겟 마케팅' 및 '능동적 영업' 체계 구축</p>
                </header>

                <!-- Main Content Grid -->
                <div style="display: flex; flex-direction: column; gap: 24px; height: calc(100% - 130px);">
                    
                    <!-- Top Row: Infrastructure & Action Plan -->
                    <div style="display: flex; gap: 24px; flex: 2; min-height: 0;">
                        <!-- Left: Infrastructure -->
                        <div style="flex: 1; background-color: #eff6ff; border-radius: 0.75rem; padding: 24px; border: 1px solid #bfdbfe; display: flex; flex-direction: column; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">
                            <div style="display: flex; align-items: center; margin-bottom: 20px;">
                                <div style="width: 48px; height: 48px; background-color: #dbeafe; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #1e40af; margin-right: 16px; font-size: 20px;">
                                    <i class="fas fa-database"></i>
                                </div>
                                <h2 style="font-size: 22px; font-weight: 700; color: #1e3a8a; margin: 0;">핵심 기반</h2>
                            </div>
                            
                            <div style="display: flex; flex-direction: column; gap: 20px; flex: 1;">
                                <div style="background: white; padding: 20px; border-radius: 12px; border: 1px solid #bfdbfe; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                                    <h3 style="font-weight: 700; color: #1f2937; font-size: 18px; margin-bottom: 10px; display: flex; align-items: center;">
                                        <i class="fas fa-server" style="color: #3b82f6; margin-right: 10px; font-size: 16px;"></i> 5개년 검진 DB 구축
                                    </h3>
                                    <p style="color: #4b5563; line-height: 1.6; font-size: 15px; margin: 0;">지난 5년간의 검진 이력, 인원, 시기, 성향 등 방대한 사업장 데이터를 통합 관리합니다.</p>
                                </div>
                                <div style="background: white; padding: 20px; border-radius: 12px; border: 1px solid #bfdbfe; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                                    <h3 style="font-weight: 700; color: #1f2937; font-size: 18px; margin-bottom: 10px; display: flex; align-items: center;">
                                        <i class="fas fa-network-wired" style="color: #3b82f6; margin-right: 10px; font-size: 16px;"></i> 실시간 정보 공유
                                    </h3>
                                    <p style="color: #4b5563; line-height: 1.6; font-size: 15px; margin: 0;">영업팀 구성원 전체가 언제 어디서든 실시간으로 사업장 현황을 파악하는 시스템을 완비했습니다.</p>
                                </div>
                            </div>
                        </div>

                        <!-- Right: Action Plan -->
                        <div style="flex: 1; background-color: white; border-radius: 0.75rem; padding: 24px; border: 1px solid #e5e7eb; display: flex; flex-direction: column; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                            <div style="display: flex; align-items: center; margin-bottom: 20px;">
                                <div style="width: 48px; height: 48px; background-color: #eff6ff; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #2563eb; margin-right: 16px; font-size: 20px;">
                                    <i class="fas fa-bullseye"></i>
                                </div>
                                <h2 style="font-size: 22px; font-weight: 700; color: #1f2937; margin: 0;">실행 전략</h2>
                            </div>
                            
                            <div style="display: flex; flex-direction: column; gap: 20px; flex: 1;">
                                <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; display:flex; flex-direction:column; justify-content:center; flex:1;">
                                    <h3 style="font-weight: 700; color: #1e40af; font-size: 18px; margin: 0 0 8px 0;">맞춤형 제안 (Customization)</h3>
                                    <p style="color: #475569; line-height: 1.6; font-size: 15px; margin: 0;">데이터 통계를 기반으로 각 사업장 특성(검진 선호 시기, 유소견율 등)에 최적화된 상품을 제안합니다.</p>
                                </div>
                                <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; display:flex; flex-direction:column; justify-content:center; flex:1;">
                                    <h3 style="font-weight: 700; color: #1e40af; font-size: 18px; margin: 0 0 8px 0;">집중 관리 (Targeting)</h3>
                                    <p style="color: #475569; line-height: 1.6; font-size: 15px; margin: 0;">고객 유입/이탈 현황을 상시 모니터링하여 '이탈 위험군'을 선정해 선제적으로 대응합니다.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Bottom Row: Key Impact -->
                    <div style="flex: 1; background-color: #1e3a8a; border-radius: 0.75rem; padding: 24px; color: white; display: flex; align-items: center; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
                        <div style="width: 120px; border-right: 1px solid #60a5fa; margin-right: 30px; text-align: right; padding-right: 20px;">
                            <h3 style="font-size: 20px; font-weight: 800; margin: 0;">기대 효과</h3>
                        </div>
                        <div style="flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
                            <!-- Impact 1 -->
                            <div style="display: flex; align-items: center;">
                                <div style="width: 48px; height: 48px; background: #2563eb; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; margin-right: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.2);">
                                    <i class="fas fa-handshake"></i>
                                </div>
                                <div>
                                    <h4 style="font-size: 17px; font-weight: 700; margin: 0 0 4px 0; color: #bfdbfe;">영업 성공률 제고</h4>
                                    <p style="font-size: 13px; color: #dbeafe; margin: 0; line-height: 1.4;">데이터에 근거한 정교한 제안으로<br>계약 성사율 획기적 향상</p>
                                </div>
                            </div>
                            <!-- Impact 2 -->
                            <div style="display: flex; align-items: center;">
                                <div style="width: 48px; height: 48px; background: #2563eb; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; margin-right: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.2);">
                                    <i class="fas fa-user-clock"></i>
                                </div>
                                <div>
                                    <h4 style="font-size: 17px; font-weight: 700; margin: 0 0 4px 0; color: #bfdbfe;">업무 공백 최소화</h4>
                                    <p style="font-size: 13px; color: #dbeafe; margin: 0; line-height: 1.4;">실시간 정보 공유를 통해<br>담당자 부재 시에도 즉각 대응</p>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        `;
    }

    // [NEW] Efficiency Plan: Customer Support (Call Center)
    function renderEfficiencySupport() {
        return `
            <div class="bp-slide-layout" style="background:#f3f4f6; padding: 40px; height: 100%; box-sizing: border-box; font-family: 'Noto Sans KR', sans-serif;">
                <!-- Header Section -->
                <header style="margin-bottom: 30px; border-left: 8px solid #ea580c; padding-left: 24px; display: flex; flex-direction: column; justify-content: center;">
                    <h1 style="font-size: 36px; font-weight: 900; color: #111827; margin: 0 0 10px 0; letter-spacing: -0.025em; line-height: 1.3;">고객 지원(콜센터) 효율화 :<br>자체 예약 플랫폼 개발</h1>
                    <p style="font-size: 20px; color: #c2410c; font-weight: 500; margin: 0;">"예약 프로세스 자동화 및 에러 제로(Zero)화로 콜센터 업무 부하 획기적 감소"</p>
                </header>

                <!-- Main Content Grid -->
                <div style="display: flex; flex-direction: column; gap: 24px; height: calc(100% - 130px);">
                    
                    <!-- Top Row: Issues & Solutions -->
                    <div style="display: flex; gap: 24px; flex: 2; min-height: 0;">
                        <!-- Left: Issues -->
                        <div style="flex: 1; background-color: #fff7ed; border-radius: 0.75rem; padding: 24px; border: 1px solid #fed7aa; display: flex; flex-direction: column; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">
                            <div style="display: flex; align-items: center; margin-bottom: 20px;">
                                <div style="width: 48px; height: 48px; background-color: #ffedd5; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #ea580c; margin-right: 16px; font-size: 20px;">
                                    <i class="fas fa-exclamation-triangle"></i>
                                </div>
                                <h2 style="font-size: 22px; font-weight: 700; color: #7c2d12; margin: 0;">현황 및 과제</h2>
                            </div>
                            
                            <div style="display: flex; flex-direction: column; gap: 24px; flex: 1; justify-content: center;">
                                <div style="background: white; padding: 24px; border-radius: 12px; border: 1px solid #fed7aa; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                                    <h3 style="font-weight: 700; color: #1f2937; font-size: 20px; margin-bottom: 12px; display: flex; align-items: center;">
                                        <i class="fas fa-keyboard" style="color: #f97316; margin-right: 10px; font-size: 18px;"></i> 수기 입력의 한계
                                    </h3>
                                    <p style="color: #4b5563; line-height: 1.625; font-size: 16px; margin: 0;">상담원이 유선 통화 내용을 '새롬(EMR)'에 직접 타이핑하는 방식으로, <strong>업무 피로도</strong>가 높고 <strong>입력 오류</strong> 발생 가능성이 상존합니다.</p>
                                </div>
                            </div>
                        </div>

                        <!-- Right: Solutions -->
                        <div style="flex: 1; background-color: white; border-radius: 0.75rem; padding: 24px; border: 1px solid #e5e7eb; display: flex; flex-direction: column; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                            <div style="display: flex; align-items: center; margin-bottom: 20px;">
                                <div style="width: 48px; height: 48px; background-color: #fff7ed; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #ea580c; margin-right: 16px; font-size: 20px;">
                                    <i class="fas fa-tools"></i>
                                </div>
                                <h2 style="font-size: 22px; font-weight: 700; color: #1f2937; margin: 0;">개선 방안</h2>
                            </div>
                            
                            <div style="display: flex; flex-direction: column; gap: 20px; flex: 1;">
                                <div style="background-color: #fff7ed; padding: 20px; border-radius: 12px; border: 1px solid #ffedd5; display:flex; flex-direction:column; justify-content:center; flex:1;">
                                    <h3 style="font-weight: 700; color: #c2410c; font-size: 18px; margin: 0 0 8px 0;">고객 주도형 예약</h3>
                                    <p style="color: #4b5563; line-height: 1.6; font-size: 15px; margin: 0;">고객이 모바일/웹에서 정보를 직접 입력하고, 클릭만으로 검진 아이템을 세팅하는 직관적 UI 제공.</p>
                                </div>
                                <div style="background-color: #fff7ed; padding: 20px; border-radius: 12px; border: 1px solid #ffedd5; display:flex; flex-direction:column; justify-content:center; flex:1;">
                                    <h3 style="font-weight: 700; color: #c2410c; font-size: 18px; margin: 0 0 8px 0;">시스템 연동 고도화</h3>
                                    <p style="color: #4b5563; line-height: 1.6; font-size: 15px; margin: 0;">1단계: 입력 단순화 및 후처리 단축.<br>2단계: API 연동을 통한 자동 전송 구현.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Bottom Row: Key Impact -->
                    <div style="flex: 1; background-color: #7c2d12; border-radius: 0.75rem; padding: 24px; color: white; display: flex; align-items: center; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
                        <div style="width: 120px; border-right: 1px solid #9a3412; margin-right: 30px; text-align: right; padding-right: 20px;">
                            <h3 style="font-size: 20px; font-weight: 800; margin: 0;">기대 효과</h3>
                        </div>
                        <div style="flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
                            <!-- Impact 1 -->
                            <div style="display: flex; align-items: center;">
                                <div style="width: 48px; height: 48px; background: #ea580c; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; margin-right: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.2);">
                                    <i class="fas fa-check-circle"></i>
                                </div>
                                <div>
                                    <h4 style="font-size: 17px; font-weight: 700; margin: 0 0 4px 0; color: #fed7aa;">No-Show 방지</h4>
                                    <p style="font-size: 13px; color: #ffedd5; margin: 0; line-height: 1.4;">자동 알림 및 안내 발송으로<br>예약 이행률 제고 및 수익 보전</p>
                                </div>
                            </div>
                            <!-- Impact 2 -->
                            <div style="display: flex; align-items: center;">
                                <div style="width: 48px; height: 48px; background: #ea580c; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; margin-right: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.2);">
                                    <i class="fas fa-headset"></i>
                                </div>
                                <div>
                                    <h4 style="font-size: 17px; font-weight: 700; margin: 0 0 4px 0; color: #fed7aa;">상담 효율 극대화</h4>
                                    <p style="font-size: 13px; color: #ffedd5; margin: 0; line-height: 1.4;">단순 예약 업무 시간 단축,<br>고품질 상담 서비스 집중</p>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        `;
    }

    // [NEW] Efficiency Plan: Results Processing (Automation)
    function renderEfficiencyResults() {
        return `
            <div class="bp-slide-layout" style="background:#f3f4f6; padding: 40px; height: 100%; box-sizing: border-box; font-family: 'Noto Sans KR', sans-serif;">
                <!-- Header Section -->
                <header style="margin-bottom: 30px; border-left: 8px solid #6d28d9; padding-left: 24px; display: flex; flex-direction: column; justify-content: center;">
                    <h1 style="font-size: 36px; font-weight: 900; color: #111827; margin: 0 0 10px 0; letter-spacing: -0.025em; line-height: 1.3;">결과 처리 효율화 :<br>(주)유젠스 연동 자동화</h1>
                    <p style="font-size: 20px; color: #5b21b6; font-weight: 500; margin: 0;">"결과 전달 프로세스 외주/자동화를 통한 행정 리소스 최소화 및 고수익 창출"</p>
                </header>
                
                <!-- Main Content Grid -->
                <div style="display: flex; flex-direction: column; gap: 24px; height: calc(100% - 130px);">
                    
                    <!-- Top Row: Innovation & Success Case -->
                    <div style="display: flex; gap: 24px; flex: 2; min-height: 0;">
                        <!-- Left: Process Innovation -->
                        <div style="flex: 4; background-color: #f5f3ff; border-radius: 0.75rem; padding: 24px; border: 1px solid #ddd6fe; display: flex; flex-direction: column; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">
                            <h2 style="font-size: 22px; font-weight: 700; color: #4c1d95; margin-bottom: 20px; display: flex; align-items: center;">
                                <i class="fas fa-sync-alt" style="margin-right: 10px; color: #8b5cf6;"></i>프로세스 혁신
                            </h2>
                            <div style="display: flex; flex-direction: column; gap: 20px; flex: 1;">
                                <!-- Step 1 -->
                                <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #c4b5fd; position: relative; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                                    <h3 style="font-weight: 700; font-size: 16px; margin-bottom: 10px; color: #1f2937;">데이터 통합 공유</h3>
                                    <div style="display: flex; align-items: center; justify-content: space-between; background: #f9fafb; padding: 10px; border-radius: 6px; border: 1px solid #f3f4f6;">
                                        <div style="text-align: center; width: 40%;">
                                            <div style="font-size: 11px; color: #6b7280; margin-bottom: 2px;">본원</div>
                                            <div style="font-weight: 800; color: #1e3a8a; font-size: 13px;">예약 프로그램</div>
                                        </div>
                                        <div style="color: #8b5cf6;"><i class="fas fa-exchange-alt"></i></div>
                                        <div style="text-align: center; width: 40%;">
                                            <div style="font-size: 11px; color: #6b7280; margin-bottom: 2px;">외부</div>
                                            <div style="font-weight: 800; color: #5b21b6; font-size: 13px;">유젠스 플랫폼</div>
                                        </div>
                                    </div>
                                </div>
                                <!-- Arrow -->
                                <div style="display: flex; justify-content: center; color: #ddd6fe; font-size: 20px; margin: -10px 0;">
                                    <i class="fas fa-arrow-down"></i>
                                </div>
                                <!-- Step 2 -->
                                <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #c4b5fd; position: relative; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                                    <h3 style="font-weight: 700; font-size: 16px; margin-bottom: 10px; color: #1f2937;">결과 리포트 자동화</h3>
                                    <div style="display: flex; align-items: flex-start;">
                                        <div style="background: #ede9fe; padding: 8px; border-radius: 50%; margin-right: 12px; color: #8b5cf6;">
                                            <i class="fas fa-file-invoice"></i>
                                        </div>
                                        <div>
                                            <p style="font-size: 14px; font-weight: 600; color: #374151; margin: 0 0 4px 0;">본원 작성 업무 Zero화</p>
                                            <p style="font-size: 12px; color: #6b7280; line-height: 1.4; margin: 0;">모든 위탁/추가 검사 리포트를<br>유젠스 플랫폼에서 자동 발송</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Right: Success Case (Chart) -->
                        <div style="flex: 6; background-color: white; border-radius: 0.75rem; padding: 24px; border: 1px solid #e5e7eb; display: flex; flex-direction: column; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px;">
                                <h2 style="font-size: 22px; font-weight: 700; color: #1f2937; margin: 0; display: flex; align-items: center;">
                                    <i class="fas fa-chart-bar" style="margin-right: 10px; color: #10b981;"></i>성공 사례 : 유전자 검사 활성화
                                </h2>
                                <span style="background: #d1fae5; color: #059669; font-size: 12px; font-weight: 800; padding: 4px 12px; border-radius: 99px;">High Efficiency</span>
                            </div>
                            
                            <div style="display: flex; flex: 1; gap: 30px;">
                                <!-- Simple HTML/CSS Chart -->
                                <div style="flex: 2; display: flex; align-items: flex-end; justify-content: space-around; padding-bottom: 30px; border-bottom: 1px solid #eee; position: relative;">
                                    <!-- Bar 1 -->
                                    <div style="display: flex; flex-direction: column; align-items: center; width: 60px; height: 100%; justify-content: flex-end;">
                                        <div style="font-weight: 700; color: #6b7280; margin-bottom: 8px;">1,500</div>
                                        <div style="width: 100%; height: 20%; background: #e5e7eb; border-radius: 6px 6px 0 0;"></div>
                                        <div style="margin-top: 10px; font-weight: 600; font-size: 14px; color: #4b5563;">연동 전</div>
                                    </div>
                                    <!-- Arrow -->
                                    <div style="padding-bottom: 20px; font-size: 24px; color: #9ca3af;"><i class="fas fa-arrow-right"></i></div>
                                    <!-- Bar 2 -->
                                    <div style="display: flex; flex-direction: column; align-items: center; width: 60px; height: 100%; justify-content: flex-end; position: relative;">
                                        <div style="font-weight: 800; color: #2563eb; margin-bottom: 8px; font-size: 18px;">8,000</div>
                                        <div style="width: 100%; height: 90%; background: linear-gradient(to top, #3b82f6, #60a5fa); border-radius: 6px 6px 0 0; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);"></div>
                                        <div style="margin-top: 10px; font-weight: 700; font-size: 14px; color: #1e40af;">연동 후</div>
                                        <!-- Badge -->
                                        <div style="position: absolute; top: 0; right: -40px; background: #ef4444; color: white; font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">5.3배 🚀</div>
                                    </div>
                                </div>

                                <!-- Stats & Insight -->
                                <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; border-left: 1px solid #f3f4f6; padding-left: 20px;">
                                    <div style="text-align: center; margin-bottom: 20px;">
                                        <p style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">연간 검사 건수</p>
                                        <p style="font-size: 32px; font-weight: 900; color: #2563eb; line-height: 1;">8,000<span style="font-size: 16px; font-weight: 400; color: #9ca3af;">건</span></p>
                                        <p style="font-size: 13px; color: #10b981; font-weight: 700; margin-top: 5px;"><i class="fas fa-caret-up"></i> 전년 대비 급증</p>
                                    </div>
                                    <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
                                        <p style="font-size: 12px; color: #64748b; font-weight: 800; margin-bottom: 5px;">핵심 성과</p>
                                        <p style="font-size: 13px; color: #334155; line-height: 1.5; margin: 0;">
                                            검사 건수는 5배 늘었으나,<br>
                                            <span style="color: #2563eb; font-weight: 700; background: #dbeafe; padding: 0 2px;">내부 행정 업무는 감소</span>하는<br>
                                            이상적인 구조 달성
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Bottom Row: Key Impact -->
                    <div style="flex: 1; background-color: #1f2937; border-radius: 0.75rem; padding: 24px; color: white; display: flex; align-items: center; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
                        <div style="width: 120px; border-right: 1px solid #4b5563; margin-right: 30px; text-align: right; padding-right: 20px;">
                            <h3 style="font-size: 20px; font-weight: 800; margin: 0;">기대 효과</h3>
                        </div>
                        <div style="flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
                            <!-- Impact 1 -->
                            <div style="display: flex; align-items: center;">
                                <div style="width: 48px; height: 48px; background: #2563eb; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; margin-right: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.2);">
                                    <i class="fas fa-users-cog"></i>
                                </div>
                                <div>
                                    <h4 style="font-size: 17px; font-weight: 700; margin: 0 0 4px 0; color: #bfdbfe;">행정 리소스 절감</h4>
                                    <p style="font-size: 13px; color: #9ca3af; margin: 0; line-height: 1.4;">결과 처리 파트의 단순 반복 업무 획기적 축소,<br>인력 운영 효율화</p>
                                </div>
                            </div>
                            <!-- Impact 2 -->
                            <div style="display: flex; align-items: center;">
                                <div style="width: 48px; height: 48px; background: #059669; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; margin-right: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.2);">
                                    <i class="fas fa-hand-holding-usd"></i>
                                </div>
                                <div>
                                    <h4 style="font-size: 17px; font-weight: 700; margin: 0 0 4px 0; color: #a7f3d0;">수익성 극대화</h4>
                                    <p style="font-size: 13px; color: #9ca3af; margin: 0; line-height: 1.4;">행정 부담 없는 고단가 검사 적극 유치로<br>매출 구조 개선</p>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        `;
    }

    // [NEW] 3D Reservation Flowchart (Iframe)
    function renderReservationFlow() {
        // Use an iframe to isolate the complex React/Three.js environment
        return `
            <div class="bp-slide-layout" style="padding: 0; height: 100%; overflow: hidden; background: white;">
                <iframe src="views/reservation_flow.html" style="width: 100%; height: 100%; border: none;"></iframe>
            </div>
        `;
    }

    // [NEW] Fighting Slide
    function renderFighting() {
        return `
            <div class="bp-slide-layout" style="background: white; display: flex; align-items: center; justify-content: center; height: 100%; padding: 0;">
                <img src="images/fighting_2026.jpg" style="max-width: 80%; max-height: 80%; object-fit: contain;" alt="2026 Fighting">
            </div>
        `;
    }

    return {
        init: init,
        renderReservationFlow: renderReservationFlow,
        renderFighting: renderFighting
    };
})();
