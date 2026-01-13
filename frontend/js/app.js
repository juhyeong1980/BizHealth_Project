// --- Main Entry Point ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. 기본 탭 로드
    loadTab('dashboard');

    // 2. 파일 로더 초기화
    if (typeof initFileLoader === 'function') initFileLoader();

    // 3. AWS 키가 브라우저에 저장되어 있다면 자동으로 데이터 복구 실행
    const savedAk = localStorage.getItem('aws_ak');
    if (savedAk) {
        // 약간의 지연(1000ms)을 주어 AWS SDK가 로드될 시간을 확보
        setTimeout(() => {
            if (typeof CloudManager !== 'undefined') {
                CloudManager.init(); // 키 설정 초기화
                CloudManager.downloadProject(true); // true = '조용히(Alert 없이)' 실행
            }
        }, 1000);
    }
});

function toggleSubmenu(id) {
    const el = document.getElementById(id);
    const trigger = document.querySelector(`[onclick="toggleSubmenu('${id}')"]`);
    if (el.style.display === 'none') {
        el.style.display = 'block';
        if (trigger) trigger.classList.add('open');
    } else {
        el.style.display = 'none';
        if (trigger) trigger.classList.remove('open');
    }
}
