// --- File Loader Module ---
// [REFACTORED] Now uses Backend API. No explicit file loading needed.

async function initFileLoader() {
    console.log("Initializing File Loader (Backend Mode)...");

    // Check Backend Connection
    try {
        const res = await fetch(`${API_BASE_URL}/api/years`);
        if (res.ok) {
            const years = await res.json();
            console.log("Backend Connected. Available Years:", years);

            // Update State
            STATE.years.clear();
            years.forEach(y => STATE.years.add(y));
            STATE.selectedYears = new Set(years);

            // Trigger UI Updates
            if (typeof renderYearFilter === 'function') renderYearFilter();
            if (typeof initDraftFromState === 'function') initDraftFromState();

            // Initial Data Load
            if (typeof recalcAll === 'function') {
                // Wait a bit to ensure other modules are ready
                setTimeout(recalcAll, 100);
            }

            // alert(`서버와 연결되었습니다.\n데이터 로드 완료 (총 ${years.length}개 연도)`);
        } else {
            console.error("Backend returned error:", res.status);
            alert("서버 연결 실패. 백엔드가 실행 중인지 확인하세요.");
        }
    } catch (e) {
        console.error("Failed to connect to backend:", e);
        alert("서버에 연결할 수 없습니다.\nBackend URL: " + API_BASE_URL);
    }
}

// [NEW] Global function to refresh data types when config changes
// In Backend mode, this might trigger a re-fetch or be a no-op if logic is server-side.
window.updateExamTypes = function () {
    console.log("updateExamTypes called - delegating to server (via recalcAll)");
    if (typeof recalcAll === 'function') recalcAll();
};
