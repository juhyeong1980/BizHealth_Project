
// --- Survey Analysis Module ---
const SurveyAnalysisModule = (function () {

    function init() {
        render();
    }

    function render() {
        const container = document.getElementById('survey-container');
        if (!container) return;

        container.innerHTML = `
            <div style="padding: 30px; height: 100%; display: flex; flex-direction: column; overflow-y: auto;">
                <div style="background: white; padding: 30px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); max-width: 1000px; width: 100%; margin: 0 auto;">
                    
                    <!-- Header & API Key -->
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px;">
                        <div>
                            <h2 style="font-size: 24px; color: #2c3e50; margin: 0 0 10px 0;"><i class="fas fa-poll-h" style="color:#3498db; margin-right:10px;"></i>설문조사 데이터 분석</h2>
                            <p style="color: #7f8c8d; font-size: 14px; margin: 0;">
                                엑셀 파일을 업로드하면 <strong>Google Gemini Pro</strong>가 보건관리 데이터를 심층 분석합니다.
                            </p>
                        </div>
                        <div style="text-align: right;">
                            <label style="display: block; font-size: 12px; font-weight: bold; color: #7f8c8d; margin-bottom: 5px;">Gemini API Key</label>
                            <input type="password" id="gemini-api-key" placeholder="API Key 입력" style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; width: 200px; font-family: monospace;">
                        </div>
                    </div>

                    <!-- Layout: Left (Upload/List) | Right (Analysis) -->
                    <div style="display: flex; gap: 30px;">
                        
                        <!-- Left Column: Upload & Data Preview -->
                        <div style="flex: 4;">
                            <!-- Drop Zone -->
                            <div id="drop-zone" style="border: 2px dashed #bdc3c7; border-radius: 12px; padding: 30px; text-align: center; cursor: pointer; transition: 0.3s; background: #f9f9f9; margin-bottom: 20px;">
                                <i class="fas fa-file-excel" style="font-size: 32px; color: #27ae60; margin-bottom: 15px;"></i>
                                <div style="font-size: 16px; color: #34495e; font-weight: 600;">엑셀 파일(.xlsx) 드래그 앤 드롭</div>
                                <div style="font-size: 12px; color: #95a5a6; margin-top: 5px;">또는 클릭하여 파일 선택</div>
                                <input type="file" id="file-input" accept=".xlsx, .xls, .csv" style="display: none;">
                            </div>

                            <!-- Data Preview Table (Hidden initially) -->
                            <div id="data-preview-area" style="display: none;">
                                <h4 style="font-size: 16px; color: #2c3e50; margin-bottom: 10px; border-left: 4px solid #3498db; padding-left: 10px;">데이터 미리보기 (상위 5행)</h4>
                                <div style="overflow-x: auto; border: 1px solid #eee; border-radius: 8px;">
                                    <table id="preview-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
                                    <table id="preview-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
                                        <!-- Table Content Generated via JS -->
                                    </table>
                                </div>
                                <div style="margin-top: 15px; text-align: right;">
                                    <span id="row-count-badge" style="background: #ecf0f1; padding: 4px 8px; border-radius: 4px; font-size: 12px; color: #7f8c8d; margin-right: 10px;"></span>
                                    <button id="btn-analyze" disabled style="padding: 10px 20px; background: #bdc3c7; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: not-allowed; transition: 0.2s;">
                                        <i class="fas fa-magic"></i> AI 분석 시작
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Right Column: Analysis Result -->
                        <div style="flex: 6; border-left: 1px solid #eee; padding-left: 30px; min-height: 400px;">
                            <h4 style="font-size: 16px; color: #2c3e50; margin-bottom: 15px; display: flex; align-items: center; justify-content: space-between;">
                                <span><i class="fas fa-robot" style="color:#9b59b6; margin-right:8px;"></i>AI 분석 결과</span>
                                <span id="loading-spinner" style="display: none; font-size: 14px; color: #3498db;">
                                    <i class="fas fa-spinner fa-spin"></i> 분석 중...
                                </span>
                            </h4>
                            <div id="analysis-result" style="background: #f8f9fa; border-radius: 8px; padding: 20px; color: #7f8c8d; font-size: 14px; line-height: 1.6; min-height: 300px; overflow-y: auto; white-space: pre-wrap;">
                                데이터를 업로드하고 'AI 분석 시작' 버튼을 누르면<br>
                                Gemini가 데이터를 분석하여 이곳에 결과를 표시합니다.
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        `;

        setupEventListeners();
    }

    function setupEventListeners() {
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');

        if (dropZone && fileInput) {
            dropZone.addEventListener('click', () => fileInput.click());

            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.style.borderColor = '#3498db';
                dropZone.style.background = '#ebf5fb';
            });

            dropZone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                dropZone.style.borderColor = '#bdc3c7';
                dropZone.style.background = '#f9f9f9';
            });

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.style.borderColor = '#bdc3c7';
                dropZone.style.background = '#f9f9f9';
                const files = e.dataTransfer.files;
                if (files.length > 0) handleFile(files[0]);
            });

            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) handleFile(e.target.files[0]);
            });
        }

        // Analyze Button Event
        const btnAnalyze = document.getElementById('btn-analyze');
        if (btnAnalyze) {
            btnAnalyze.addEventListener('click', runAnalysis);
        }
    }

    function handleFile(file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const data = new Uint8Array(e.target.result);
            if (typeof XLSX === 'undefined') {
                alert('엑셀 처리 라이브러리(SheetJS)가 로드되지 않았습니다.');
                return;
            }
            const workbook = XLSX.read(data, { type: 'array' });

            // Assume first sheet
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            // Convert to JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }); // Header: 1 returns array of arrays

            if (jsonData.length === 0) {
                alert('데이터가 없는 파일입니다.');
                return;
            }

            uploadedData = jsonData;
            renderPreview(jsonData);
        };
        reader.readAsArrayBuffer(file);
    }

    function renderPreview(data) {
        const previewArea = document.getElementById('data-preview-area');
        const table = document.getElementById('preview-table');
        const badge = document.getElementById('row-count-badge');
        const btnAnalyze = document.getElementById('btn-analyze');

        if (!previewArea || !table) return;

        previewArea.style.display = 'block';
        table.innerHTML = ''; // Clear previous

        // Header
        const headers = data[0];
        let html = '<thead style="background:#f1f2f6; color:#2c3e50; font-weight:bold;"><tr>';
        headers.forEach(h => html += `< th style = "padding:8px; border:1px solid #ddd;" > ${h}</th > `);
        html += '</tr></thead>';

        // Body (First 5 rows)
        html += '<tbody>';
        const rows = data.slice(1, 6);
        rows.forEach(row => {
            html += '<tr>';
            headers.forEach((_, i) => { // Use headers length to align columns
                html += `< td style = "padding:8px; border:1px solid #ddd; text-align:center;" > ${row[i] || ''}</td > `;
            });
            html += '</tr>';
        });
        html += '</tbody>';

        table.innerHTML = html;
        if (badge) badge.innerText = `총 ${data.length - 1}행 데이터 감지됨`;

        // Enable Analyze Button
        if (btnAnalyze) {
            btnAnalyze.disabled = false;
            btnAnalyze.style.background = '#3498db';
            btnAnalyze.style.cursor = 'pointer';
        }
    }

    async function runAnalysis() {
        const apiKey = document.getElementById('gemini-api-key').value;
        if (!apiKey) {
            alert('Gemini API Key를 입력해주세요.');
            return;
        }

        const resultArea = document.getElementById('analysis-result');
        const spinner = document.getElementById('loading-spinner');

        if (spinner) spinner.style.display = 'inline-block';
        if (resultArea) resultArea.innerHTML = '데이터 분석 중입니다... 잠시만 기다려주세요.';

        try {
            // Prepare Data Prompt (Truncate if too large for token limits)
            // Converting data to CSV string for prompt
            const header = uploadedData[0].join(',');
            const rows = uploadedData.slice(1, 100).map(r => r.join(',')).join('\n'); // Analysis 100 rows preview
            const csvText = `${header} \n${rows} `;

            const prompt = `
        역할: 당신은 보건관리 전문 데이터 분석가입니다.
            작업: 아래 제공된 설문조사 데이터를 분석하여 핵심 인사이트, 문제점, 그리고 구체적인 개선 방안을 보고서 형태로 작성해주세요.
                형식:
        1. 📊 주요 발견(3가지 핵심 요약)
        2. ⚠️ 식별된 문제점 및 원인
        3. ✅ 개선 제안(실행 가능한 조치)
        4. 📈 결론

        데이터(상위 100행 샘플):
                ${csvText}
        `;

            // Call Gemini API (using a helper or fetch directly)
            // Note: Since we don't have a backend proxy, we call direct (Client-side key usage - WARNING: In production this is unsafe)
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            const data = await response.json();

            if (spinner) spinner.style.display = 'none';

            if (data.error) {
                resultArea.innerHTML = `<span style="color:red; font-weight:bold;">오류 발생: ${data.error.message}</span>`;
            } else {
                const textResponse = data.candidates[0].content.parts[0].text;
                // Convert simple Markdown to HTML just for display (Basic replacement)
                const formattedHtml = textResponse
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\n/g, '<br>');
                resultArea.innerHTML = formattedHtml;
            }

        } catch (error) {
            console.error(error);
            if (spinner) spinner.style.display = 'none';
            if (resultArea) resultArea.innerHTML = `<span style="color:red;">네트워크 또는 심각한 오류가 발생했습니다.<br>${error.message}</span>`;
        }
    }

    return {
        init: init
    };

})();
