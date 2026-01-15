
// --- Retention Module ---
// (Refactored to use Backend API)

const RetentionModule = (function () {

    function analyze() {
        fetch(`${API_BASE_URL}/api/stats/revisit/person`)
            .then(res => res.json())
            .then(data => {
                render(data);
            })
            .catch(e => console.error(e));
    }

    function render(data) {
        const container = document.getElementById('retListsContainer');
        if (!container) return;

        // data keys: { frequency_distribution, biennial_visitors, total_people, yearly_retention }
        const freqDist = data.frequency_distribution;
        const biennial = data.biennial_visitors;
        const total = data.total_people;
        const yearlyStats = data.yearly_retention || [];

        // Calculate 3, 4, 5+ counts
        const cnt5 = Object.keys(freqDist).reduce((sum, k) => (parseInt(k) >= 5 ? sum + freqDist[k] : sum), 0);
        const cnt4 = freqDist[4] || 0;
        const cnt3 = freqDist[3] || 0;

        let html = `
        <!-- Top Summary Cards (Row 1) -->
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-bottom:20px;">
            <div class="glass-panel" style="padding:25px; display:flex; align-items:center; background:white; border-radius:15px; box-shadow:0 5px 20px rgba(0,0,0,0.05);">
                <div style="background:linear-gradient(135deg, #3498db, #2980b9); width:70px; height:70px; border-radius:20px; display:flex; justify-content:center; align-items:center; margin-right:25px; box-shadow:0 4px 10px rgba(52, 152, 219, 0.3);">
                    <i class="fas fa-users" style="color:white; font-size:32px;"></i>
                </div>
                <div>
                    <div style="font-size:15px; color:#95a5a6; font-weight:600; margin-bottom:5px; letter-spacing:0.5px;">총 고유 수검자 (Unique)</div>
                    <div style="font-size:32px; font-weight:800; color:#2c3e50;">${total.toLocaleString()}<span style="font-size:16px; color:#bdc3c7; font-weight:500; margin-left:5px;">명</span></div>
                </div>
            </div>
            
            <div class="glass-panel" style="padding:25px; display:flex; align-items:center; background:white; border-radius:15px; box-shadow:0 5px 20px rgba(0,0,0,0.05);">
                <div style="background:linear-gradient(135deg, #9b59b6, #8e44ad); width:70px; height:70px; border-radius:20px; display:flex; justify-content:center; align-items:center; margin-right:25px; box-shadow:0 4px 10px rgba(155, 89, 182, 0.3);">
                    <i class="fas fa-history" style="color:white; font-size:32px;"></i>
                </div>
                <div>
                    <div style="font-size:15px; color:#95a5a6; font-weight:600; margin-bottom:5px; letter-spacing:0.5px;">격년 방문 경험자 (Biennial)</div>
                    <div style="font-size:32px; font-weight:800; color:#2c3e50;">${biennial.toLocaleString()}<span style="font-size:16px; color:#bdc3c7; font-weight:500; margin-left:5px;">명</span></div>
                </div>
            </div>
        </div>

        <!-- Top Summary Cards (Row 2: Loyalty Counts) -->
        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:20px; margin-bottom:30px;">
            <!-- 5+ -->
            <div class="glass-panel" style="padding:20px; display:flex; align-items:center; background:white; border-radius:15px; box-shadow:0 5px 20px rgba(0,0,0,0.05);">
                <div style="background:linear-gradient(135deg, #f1c40f, #d4ac0d); width:50px; height:50px; border-radius:15px; display:flex; justify-content:center; align-items:center; margin-right:20px; box-shadow:0 4px 10px rgba(241, 196, 15, 0.3);">
                    <span style="color:white; font-size:20px; font-weight:bold;">5+</span>
                </div>
                <div>
                    <div style="font-size:13px; color:#7f8c8d; font-weight:600; margin-bottom:2px;">5회 이상 방문</div>
                    <div style="font-size:24px; font-weight:800; color:#2c3e50;">${cnt5.toLocaleString()}<span style="font-size:14px; color:#bdc3c7; font-weight:500; margin-left:2px;">명</span></div>
                </div>
            </div>
            <!-- 4 -->
            <div class="glass-panel" style="padding:20px; display:flex; align-items:center; background:white; border-radius:15px; box-shadow:0 5px 20px rgba(0,0,0,0.05);">
                <div style="background:linear-gradient(135deg, #bdc3c7, #95a5a6); width:50px; height:50px; border-radius:15px; display:flex; justify-content:center; align-items:center; margin-right:20px; box-shadow:0 4px 10px rgba(189, 195, 199, 0.3);">
                    <span style="color:white; font-size:20px; font-weight:bold;">4</span>
                </div>
                <div>
                    <div style="font-size:13px; color:#7f8c8d; font-weight:600; margin-bottom:2px;">4회 방문</div>
                    <div style="font-size:24px; font-weight:800; color:#2c3e50;">${cnt4.toLocaleString()}<span style="font-size:14px; color:#bdc3c7; font-weight:500; margin-left:2px;">명</span></div>
                </div>
            </div>
            <!-- 3 -->
            <div class="glass-panel" style="padding:20px; display:flex; align-items:center; background:white; border-radius:15px; box-shadow:0 5px 20px rgba(0,0,0,0.05);">
                <div style="background:linear-gradient(135deg, #e67e22, #d35400); width:50px; height:50px; border-radius:15px; display:flex; justify-content:center; align-items:center; margin-right:20px; box-shadow:0 4px 10px rgba(230, 126, 34, 0.3);">
                    <span style="color:white; font-size:20px; font-weight:bold;">3</span>
                </div>
                <div>
                    <div style="font-size:13px; color:#7f8c8d; font-weight:600; margin-bottom:2px;">3회 방문</div>
                    <div style="font-size:24px; font-weight:800; color:#2c3e50;">${cnt3.toLocaleString()}<span style="font-size:14px; color:#bdc3c7; font-weight:500; margin-left:2px;">명</span></div>
                </div>
            </div>
        </div>
        
        <!-- Main Content Grid -->
        <div style="display:grid; grid-template-columns: 1.2fr 1fr; gap:30px;">
            <!-- Left: Yearly Retention Table -->
            <div class="glass-panel" style="padding:25px; background:white; border-radius:15px; box-shadow:0 5px 20px rgba(0,0,0,0.05); display:flex; flex-direction:column;">
                <h3 style="margin-top:0; color:#34495e; font-size:18px; font-weight:700; border-bottom:1px solid #eee; padding-bottom:15px; margin-bottom:15px;">
                    <i class="fas fa-calendar-alt" style="color:#2ecc71; margin-right:10px;"></i>연도별 유지율 현황
                </h3>
                <div style="flex:1; overflow-y:auto; overflow-x:hidden; border-radius:8px;">
                    <table style="width:100%; border-collapse:separate; border-spacing:0; font-size:14px;">
                        <thead style="background:#f8f9fa; position:sticky; top:0; z-index:1;">
                            <tr>
                                <th style="padding:15px; text-align:left; color:#7f8c8d; font-weight:600; border-bottom:2px solid #ecf0f1;">연도</th>
                                <th style="padding:15px; text-align:right; color:#7f8c8d; font-weight:600; border-bottom:2px solid #ecf0f1;">총 수검자</th>
                                <th style="padding:15px; text-align:right; color:#7f8c8d; font-weight:600; border-bottom:2px solid #ecf0f1;">전년도 재방문</th>
                                <th style="padding:15px; text-align:right; color:#7f8c8d; font-weight:600; border-bottom:2px solid #ecf0f1;">유지율</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${yearlyStats.map((stat, idx) => `
                                <tr style="transition:background 0.2s;" onmouseover="this.style.background='#fcfcfc'" onmouseout="this.style.background='transparent'">
                                    <td style="padding:15px; font-weight:700; color:#2c3e50; border-bottom:1px solid #f1f2f6;">${stat.year}년</td>
                                    <td style="padding:15px; text-align:right; color:#555; border-bottom:1px solid #f1f2f6;">${stat.total.toLocaleString()}</td>
                                    <td style="padding:15px; text-align:right; color:#27ae60; font-weight:700; border-bottom:1px solid #f1f2f6;">${stat.retained.toLocaleString()}</td>
                                    <td style="padding:15px; text-align:right; border-bottom:1px solid #f1f2f6;">
                                        <span style="background:${stat.retained_rate >= 50 ? '#d5f5e3' : '#fadbd8'}; color:${stat.retained_rate >= 50 ? '#1e8449' : '#c0392b'}; padding:4px 8px; border-radius:12px; font-weight:700; font-size:12px;">
                                            ${stat.retained_rate}%
                                        </span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Right: Frequency Chart -->
            <div class="glass-panel" style="padding:25px; background:white; border-radius:15px; box-shadow:0 5px 20px rgba(0,0,0,0.05); display:flex; flex-direction:column; min-height:500px;">
                <h3 style="margin-top:0; color:#34495e; font-size:18px; font-weight:700; border-bottom:1px solid #eee; padding-bottom:15px; margin-bottom:15px;">
                    <i class="fas fa-chart-bar" style="color:#3498db; margin-right:10px;"></i>방문 빈도
                </h3>
                <div style="flex:1; position:relative;">
                    <canvas id="revisitFreqChart"></canvas>
                </div>
            </div>
        </div>
        `;

        container.innerHTML = html;

        // Render Chart
        const ctx = document.getElementById('revisitFreqChart');
        if (ctx) {
            const labels = Object.keys(freqDist).map(k => `${k}회`);
            const values = Object.values(freqDist);

            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: '수검자 수',
                        data: values,
                        backgroundColor: '#3498db',
                        borderRadius: 6,
                        barPercentage: 0.6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    return `${context.parsed.y.toLocaleString()}명`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { borderDash: [2, 4] },
                            ticks: { callback: v => v.toLocaleString() }
                        },
                        x: {
                            grid: { display: false }
                        }
                    }
                }
            });
        }
    }

    // Stub chart function to overwrite old one if called
    function renderChart(years, waterfall) { }

    return {
        init: function () {
            console.log("Retention View Initialized");
            setTimeout(analyze, 100);
        },
        analyze
    };
})();
