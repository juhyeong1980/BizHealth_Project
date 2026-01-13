
// --- 2026 Business Plan Module (Korean Style) ---

// --- 2026 Business Plan Module (Refactored for Sub-menus) ---

const BusinessPlanModule = (function () {

    // Main Init Function: Routes to specific render function
    function init(viewId) {
        addStyles();
        const container = document.getElementById('bp-container');
        if (!container) return;

        let content = '';
        if (viewId === 'businessPlan') {
            content = `
                <div style="margin-bottom: 50px;">${renderPerformance()}</div>
                <div style="margin-bottom: 50px;">${renderTargets()}</div>
                <div style="margin-bottom: 50px;">${renderStrategy1()}</div>
                <div style="margin-bottom: 50px;">${renderStrategy2()}</div>
                <div style="margin-bottom: 50px;">${renderThreats()}</div>
            `;
        } else {
            switch (viewId) {
                case 'bp_performance': content = renderPerformance(); break;
                case 'bp_targets': content = renderTargets(); break;
                case 'bp_strategy1': content = renderStrategy1(); break;
                case 'bp_strategy2': content = renderStrategy2(); break;
                case 'bp_threats': content = renderThreats(); break;
                default: content = '<div style="padding:50px; text-align:center;">페이지를 찾을 수 없습니다.</div>';
            }
        }

        container.innerHTML = `
            <div class="bp-wrapper fadeIn">
                <div class="bp-slide-body" style="padding: 30px;">
                    ${content}
                </div>
            </div>
        `;
    }

    // --- Render Functions ---

    function renderPerformance() {
        // Calculation Logic for 2025 Status
        let goal2025 = 8059000000;   // 80.59억
        let actual2025 = 8592000000; // 85.92억 (User Input)
        let actual2024 = 7231000000; // 72.31억

        let wonSites = [];

        if (typeof RAW_ROWS !== 'undefined') {
            const mergeMap = {};
            if (STATE.rules && STATE.rules.merge) {
                for (const [target, sources] of Object.entries(STATE.rules.merge)) {
                    sources.forEach(src => mergeMap[src] = target);
                }
            }
            const getRef = (name) => mergeMap[name] || name;

            const years = Array.from(new Set(RAW_ROWS.map(r => r._year))).sort((a, b) => b - a);
            const targetYear = years.includes(2025) ? 2025 : years[0];
            const rows = RAW_ROWS.filter(r => r._year === targetYear);

            const prevSites = new Set();
            RAW_ROWS.forEach(r => {
                if (r._year < targetYear) prevSites.add(getRef(r._name));
            });

            const siteRev = {};
            rows.forEach(r => {
                const finalName = getRef(r._name);
                if (!prevSites.has(finalName)) {
                    siteRev[finalName] = (siteRev[finalName] || 0) + r._amt;
                }
            });

            wonSites = Object.entries(siteRev)
                .map(([name, val]) => ({ name, val }))
                .sort((a, b) => b.val - a.val)
                .slice(0, 5);
        }

        if (actual2025 === 0) {
            actual2025 = 10500000000;
            wonSites = [
                { name: '(주)테크솔루션', val: 1200000000 },
                { name: '글로벌에너지', val: 850000000 },
                { name: '미래금융그룹', val: 620000000 },
                { name: '에이치물류', val: 450000000 },
                { name: '넥스트아이티', val: 380000000 }
            ];
        }

        const achieveRate = ((actual2025 / goal2025) * 100).toFixed(1);
        const yoyGrowth = (((actual2025 - actual2024) / actual2024) * 100).toFixed(1);
        const maxVal = Math.max(goal2025, actual2025) * 1.15;
        const goalWidth = ((goal2025 / maxVal) * 100).toFixed(1);
        const actualWidth = ((actual2025 / maxVal) * 100).toFixed(1);

        return `
            <div class="bp-slide-layout two-col">
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
                        <div class="sub-text" style="font-size:12px; color:#999; margin-bottom:15px;">* 2025년 신규 발생 및 병합 기준</div>
                        <ul class="bp-list-rank">
                            ${wonSites.map((s, i) => `
                                <li>
                                    <span class="rank">${i + 1}</span>
                                    <span class="name">${s.name}</span>
                                    <span class="amt">${(s.val / 1000000).toLocaleString()}백만</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }

    function renderTargets() {
        return `
            <div class="bp-slide-layout">
                <div class="bp-target-grid">
                    <div class="bp-target-main">
                        <div style="margin-bottom:20px;">
                            <h2 style="margin:0; font-size:24px; color:#2c3e50;">2026 핵심 목표 사업장</h2>
                            <span style="font-size:14px; color:#7f8c8d; font-weight:600;">KEY TARGET ACCOUNTS</span>
                        </div>
                        <div class="target-card-grid">
                            <div class="target-card">
                                <div class="card-bg" style="background-image: url('images/celltrion_web.png');"></div>
                                <div class="card-overlay">
                                    <div class="card-content">
                                        <span class="ko">셀트리온</span>
                                        <span class="en">Celltrion</span>
                                    </div>
                                </div>
                            </div>
                            <div class="target-card">
                                <div class="card-bg" style="background-image: url('images/sk_bio_web.png?v=${new Date().getTime()}');"></div>
                                <div class="card-overlay">
                                    <div class="card-content">
                                        <span class="ko">SK바이오사이언스</span>
                                        <span class="en">SK Bioscience</span>
                                    </div>
                                </div>
                            </div>
                            <div class="target-card">
                                <div class="card-bg" style="background-image: url('images/lotte_bio_web.png');"></div>
                                <div class="card-overlay">
                                    <div class="card-content">
                                        <span class="ko">롯데바이오로직스</span>
                                        <span class="en">Lotte Biologics</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <p class="strategy-note">
                            <i class="fas fa-bullseye"></i> 바이오/헬스케어 클러스터 집중 공략을 통해 산업 특화 검진 점유율 확대
                        </p>
                    </div>
                    <div class="bp-target-sub">
                        <h3>기타 목표 (Pipeline)</h3>
                        <ul class="bp-check-list">
                            <li>삼성바이오로직스 (2공장)</li>
                            <li>인천국제공항공사 자회사</li>
                            <li>송도 스마트밸리 입주 기업</li>
                            <li>남동공단 우수기업 협의회</li>
                        </ul>
                        <div class="pipeline-status">
                            <span>협상 중: 3건</span>
                            <span>제안 단계: 5건</span>
                        </div>
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
            <div class="bp-slide-layout single-col">
                <div class="bp-card highlight-red h-100" style="padding:50px;">
                    <div class="threat-container">
                        <div class="threat-item">
                            <div class="th-header"><i class="fas fa-bolt"></i> 과열 경쟁</div>
                            <div class="th-body">
                                <strong>나은병원, 아인병원 등 인근 거점 병원</strong>
                                <p>단가 경쟁 심화 및 마케팅 공세 강화</p>
                            </div>
                            <div class="th-action">
                                <span>대응: 기업 맞춤형 특화 검진 패키지 개발로 가격 경쟁 회피</span>
                            </div>
                        </div>
                        <div class="threat-item major">
                            <div class="th-header"><i class="fas fa-hospital-alt"></i> 건강관리협회 신규 오픈 (CRITICAL)</div>
                            <div class="th-body">
                                <strong>7,500평 규모 (지상7층/지하5층) 오픈 예정</strong>
                                <p>최신 시설과 대규모 수용 능력을 앞세운 공격적 영업 예상</p>
                            </div>
                            <div class="th-action">
                                <span>대응: 시설보다는 '신속한 결과 처리'와 '사후 관리' 등 소프트웨어적 강점 부각</span>
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

    return {
        init: init
    };

})();
