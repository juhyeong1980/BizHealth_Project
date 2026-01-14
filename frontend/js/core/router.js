// --- Router Logic ---

async function loadTab(viewName) {
    const container = document.getElementById('content-area');

    // 메뉴 활성화 UI 처리
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
    // (참고: active 클래스 추가 로직은 호출부에서 처리하거나 여기서 id로 찾아서 처리 가능)
    // 간단히 onclick에서 처리하던 것을 유지하거나, 여기서 viewName에 맞는 버튼에 active 추가
    const targetBtn = document.querySelector(`.menu-item[onclick*="${viewName}"]`);
    if (targetBtn) targetBtn.classList.add('active');

    try {
        let html = '';
        // [NEW] Virtual Views (No file fetch needed)
        if (viewName.startsWith('bp_') || viewName === 'businessPlan') {
            html = '<div id="bp-container" style="min-height:100%;"></div>'; // Placeholder
        } else {
            // 1. 해당 뷰 파일 Fetch (Cache Busting)
            const response = await fetch(`./views/${viewName}.html?v=${Date.now()}`);
            if (!response.ok) throw new Error(`View load failed: ${response.status}`);
            html = await response.text();
        }

        // 2. HTML 주입
        container.innerHTML = `<div id="${viewName}" class="view-page active" style="display:block; height:100%; overflow-y:auto; overflow-x:hidden;">${html}</div>`;

        // 3. 타이틀 업데이트
        updateTitle(viewName);

        // 4. 탭별 초기화 로직
        initTabScripts(viewName);

    } catch (error) {
        console.error('탭 로딩 실패:', error);

        // Determine if it's likely a CORS/Network issue or a Code Logic issue
        let isNetworkError = error.message.includes('Failed to fetch') || error.message.includes('View load failed');
        let errorMsg = error.toString();

        container.innerHTML = `<div style="padding:20px; color:red; font-weight:bold; white-space: pre-wrap;">
            <h3 style="border-bottom: 2px solid red; padding-bottom: 10px;">🛑 페이지 로드 중 오류 발생</h3>
            <p style="background: #fff0f0; padding: 10px; border: 1px solid #ffcccc;">${errorMsg}</p>
            
            ${isNetworkError ? `
            <div style="margin-top: 20px; color: #c0392b;">
                <strong>⚠️ CORS 또는 네트워크 오류 가능성</strong><br>
                1. <strong>http://localhost:8080</strong> 접속 여부를 확인하세요.<br>
                2. 서버(Live Server 등)가 실행 중인지 확인하세요.
            </div>
            ` : `
            <div style="margin-top: 20px; color: #d35400;">
                <strong>⚠️ 스크립트 실행 오류</strong><br>
                코드 실행 중 문제가 발생했습니다. 위 에러 메시지를 확인하세요.
            </div>
            `}
        </div>`;
    }
}

function updateTitle(viewName) {
    const titles = {
        'dashboard': '<i class="fas fa-chart-pie" style="color:#3498db;"></i> 연도별 현황',
        'periodStatus': '<i class="fas fa-calendar-check" style="color:#2ecc71;"></i> 기간별 상세 현황',
        'retentionView': '<i class="fas fa-sync-alt" style="color:#e67e22;"></i> 재방문 및 정착도 분석',
        'detail': '<i class="fas fa-search" style="color:#27ae60;"></i> 사업장 정밀 분석',
        'orderStatus': '<i class="fas fa-balance-scale" style="color:#9b59b6;"></i> 수주/이탈 분석',
        'config': '<i class="fas fa-cog" style="color:#7f8c8d;"></i> 설정',
        'bp_performance': '📊 2025 성과보고',
        'bp_targets': '🎯 핵심 목표 사업장',
        'bp_strategy1': '⚙️ 내부 프로세스 강화',
        'bp_strategy2': '👥 고객지원 효율화',
        'bp_threats': '🛡️ 위협 요소 대응',
        'businessPlan': '📅 2026 사업계획',
        'dataManager': '🛠️ 데이터 관리 센터'
    };
    const titleEl = document.getElementById('pageTitleText');
    if (titleEl) titleEl.innerHTML = titles[viewName] || 'BizHealth';
}

function initTabScripts(viewName) {
    // 탭이 DOM에 로드된 직후 실행해야 할 작업들
    if (viewName === 'dashboard') {
        if (typeof renderYearFilter === 'function') renderYearFilter();
        if (typeof recalcAll === 'function' && RAW_ROWS.length > 0) recalcAll();
    }
    else if (viewName === 'periodStatus') {
        if (typeof PeriodStatusModule !== 'undefined') PeriodStatusModule.init();
    }
    else if (viewName === 'retentionView') {
        if (typeof renderYearFilter === 'function') renderYearFilter();
        if (RAW_ROWS.length > 0 && typeof RetentionModule !== 'undefined') RetentionModule.analyze();
    }
    else if (viewName === 'detail') {
        if (typeof DetailModule !== 'undefined') DetailModule.init();
    }
    else if (viewName === 'orderStatus') {
        if (typeof renderYearFilter === 'function') renderYearFilter();
        if (typeof OrderStatusModule !== 'undefined') OrderStatusModule.init();
        if (RAW_ROWS.length > 0 && typeof OrderStatusModule !== 'undefined') OrderStatusModule.analyze();
    }
    else if (viewName === 'config') {
        if (typeof initDraftFromState === 'function') initDraftFromState();
        if (typeof CloudManager !== 'undefined') CloudManager.init();
        if (typeof CodeCheckApp !== 'undefined') {
            setTimeout(() => {
                const masterInput = document.getElementById('cc-file-master');
                const targetInput = document.getElementById('cc-file-target');
                if (masterInput) masterInput.addEventListener('change', (e) => CodeCheckApp.handleFileUpload(e, 'master'));
                if (targetInput) targetInput.addEventListener('change', (e) => CodeCheckApp.handleFileUpload(e, 'target'));
                CodeCheckApp.render();
            }, 50);
        }
    }
    // [NEW] Data Manager Initialization
    else if (viewName === 'dataManager') {
        if (typeof DataManager !== 'undefined') DataManager.init();
    }
    // [NEW] Business Plan Sub-menus or Main
    else if (viewName.startsWith('bp_') || viewName === 'businessPlan') {
        if (typeof BusinessPlanModule !== 'undefined') BusinessPlanModule.init(viewName);
    }
}
