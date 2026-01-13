// --- Cloud Manager Module ---

const CloudManager = {
    s3: null,
    fileName: 'bizhealth_full_state.json',

    init: function () {
        // [중요 수정] localStorage에서 가져올 때도 trim() 적용
        const ak = (localStorage.getItem('aws_ak') || '').trim();
        const sk = (localStorage.getItem('aws_sk') || '').trim();
        const bn = (localStorage.getItem('aws_bn') || '').trim();

        // 화면에 입력창이 있으면 채워주기
        const akInput = document.getElementById('awsAccessKey');
        if (akInput) {
            akInput.value = ak || '';
            document.getElementById('awsSecretKey').value = sk || '';
            document.getElementById('awsBucketName').value = bn || '';
        }

        if (ak && sk) {
            AWS.config.update({ accessKeyId: ak, secretAccessKey: sk, region: 'ap-northeast-2' });
            this.s3 = new AWS.S3();
        }
    },

    saveCreds: function () {
        const ak = document.getElementById('awsAccessKey').value.trim();
        const sk = document.getElementById('awsSecretKey').value.trim();
        const bn = document.getElementById('awsBucketName').value.trim();
        if (ak) localStorage.setItem('aws_ak', ak);
        if (sk) localStorage.setItem('aws_sk', sk);
        if (bn) localStorage.setItem('aws_bn', bn);
        this.init();
        this.updateStatus('인증 정보 저장 완료');
    },

    uploadProject: function () {
        if (!this.s3) { alert('AWS 키가 없습니다. 설정 탭에서 입력해주세요.'); return; }
        const bucket = localStorage.getItem('aws_bn');
        if (!bucket) { alert('버킷 이름이 없습니다.'); return; }
        if (RAW_ROWS.length === 0) { alert('저장할 데이터가 없습니다.'); return; }

        this.updateStatus('업로드 중...');
        const fullState = { timestamp: new Date().toISOString(), rows: RAW_ROWS, years: Array.from(STATE.years || []), rules: STATE.rules };
        const blob = new Blob([JSON.stringify(fullState)], { type: 'application/json' });

        this.s3.putObject({ Bucket: bucket, Key: this.fileName, Body: blob, ContentType: 'application/json' }, (err, data) => {
            if (err) { alert('업로드 실패: ' + err.message); this.updateStatus('업로드 실패'); }
            else { alert('✅ 클라우드 저장 완료!'); this.updateStatus('저장됨: ' + new Date().toLocaleTimeString()); }
        });
    },

    downloadProject: function (isAuto = false) {
        // [설정] 로딩바 요소 가져오기
        const overlay = document.getElementById('loadingOverlay');

        // 1. 로딩바 켜기 (화면 잠금)
        if (overlay) overlay.style.display = 'flex';

        // ★ [안전장치] 10초가 지나도 응답이 없으면 강제로 로딩바 끄기
        const safetyTimer = setTimeout(() => {
            if (overlay && overlay.style.display !== 'none') {
                overlay.style.display = 'none';
                if (!isAuto) alert('응답 시간이 초과되었습니다.\n인터넷 연결이나 AWS 설정을 확인해주세요.');
            }
        }, 10000); // 10000ms = 10초

        try {
            // 2. 입력값 검증 및 저장
            if (!isAuto) {
                const akInput = document.getElementById('awsAccessKey');
                if (akInput) this.saveCreds();
            }

            if (!this.s3) this.init(); // S3 초기화 시도
            if (!this.s3) {
                clearTimeout(safetyTimer); // 타이머 해제
                if (overlay) overlay.style.display = 'none'; // 로딩바 끄기
                if (!isAuto) alert('AWS 키가 없습니다. 설정 탭에서 입력해주세요.');
                return;
            }

            const bucket = localStorage.getItem('aws_bn');
            if (!bucket) {
                clearTimeout(safetyTimer);
                if (overlay) overlay.style.display = 'none';
                if (!isAuto) alert('버킷 이름이 설정되지 않았습니다.');
                return;
            }

            if (!isAuto) this.updateStatus('데이터 불러오는 중...');

            // 3. S3 데이터 요청
            this.s3.getObject({ Bucket: bucket, Key: this.fileName }, (err, data) => {
                // 응답이 왔으므로 안전장치 타이머 해제
                clearTimeout(safetyTimer);

                // 무조건 로딩바 끄기 (성공이든 실패든)
                if (overlay) overlay.style.display = 'none';

                if (err) {
                    console.error("S3 Load Error:", err);
                    if (!isAuto) alert('불러오기 실패: ' + err.message);
                } else {
                    try {
                        const jsonString = new TextDecoder('utf-8').decode(data.Body);
                        const loadedState = JSON.parse(jsonString);

                        RAW_ROWS = loadedState.rows;

                        STATE.years = new Set(loadedState.years);
                        STATE.selectedYears = new Set(loadedState.years);
                        STATE.rules = loadedState.rules;

                        if (typeof renderYearFilter === 'function') renderYearFilter();
                        if (typeof initDraftFromState === 'function' && document.getElementById('sourceList')) initDraftFromState();
                        if (typeof recalcAll === 'function') recalcAll();

                        const msg = `동기화 완료 (${RAW_ROWS.length}건)`;
                        this.updateStatus(msg);

                        if (isAuto) {
                            console.log('✅ ' + msg);
                        } else {
                            alert('✅ 복구 완료! ' + msg);
                        }

                    } catch (e) {
                        console.error("Parsing Error:", e);
                        if (!isAuto) alert('데이터 처리 중 오류가 발생했습니다.');
                    }
                }
            });
        } catch (globalErr) {
            // 코드 실행 중 예상치 못한 에러 발생 시
            clearTimeout(safetyTimer);
            if (overlay) overlay.style.display = 'none';
            console.error("Global Error:", globalErr);
            if (!isAuto) alert('시스템 오류: ' + globalErr.message);
        }
    },

    updateStatus: function (msg) {
        const el = document.getElementById('cloudStatus');
        if (el) el.innerText = msg;
    }
};
