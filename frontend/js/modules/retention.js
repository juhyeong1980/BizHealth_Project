
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
            < !--Top Summary Cards (Row 1)-->
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-bottom:20px;">
            <div class="glass-panel" style="padding:20px; display:flex; align-items:center; background:white; border-radius:12px; box-shadow:0 4px 15px rgba(0,0,0,0.03); border:1px solid #eee;">
                <div style="background:linear-gradient(135deg, #3498db, #2980b9); width:60px; height:60px; border-radius:15px; display:flex; justify-content:center; align-items:center; margin-right:20px;">
                    <i class="fas fa-users" style="color:white; font-size:28px;"></i>
                </div>
                <div>
                    <div style="font-size:13px; color:#888; font-weight:bold; margin-bottom:5px;">총 고유 수검자</div>
                    <div style="font-size:28px; font-weight:800; color:#2c3e50;">${total.toLocaleString()}<span style="font-size:14px; color:#aaa; font-weight:500; margin-left:5px;">명</span></div>
                </div>
            </div>
            
            <div class="glass-panel" style="padding:20px; display:flex; align-items:center; background:white; border-radius:12px; box-shadow:0 4px 15px rgba(0,0,0,0.03); border:1px solid #eee;">
                <div style="background:linear-gradient(135deg, #9b59b6, #8e44ad); width:60px; height:60px; border-radius:15px; display:flex; justify-content:center; align-items:center; margin-right:20px;">
                    <i class="fas fa-history" style="color:white; font-size:28px;"></i>
                </div>
                <div>
                    <div style="font-size:13px; color:#888; font-weight:bold; margin-bottom:5px;">격년 방문 경험자</div>
                    <div style="font-size:28px; font-weight:800; color:#2c3e50;">${biennial.toLocaleString()}<span style="font-size:14px; color:#aaa; font-weight:500; margin-left:5px;">명</span></div>
                </div>
            </div>
        </div>

        <!--Top Summary Cards(Row 2: Loyalty Counts)-- >
        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:20px; margin-bottom:20px;">
            <!-- 5+ -->
            <div class="glass-panel" style="padding:15px; display:flex; align-items:center; background:white; border-radius:12px; box-shadow:0 4px 15px rgba(0,0,0,0.03); border:1px solid #eee;">
                <div style="background:#f1c40f; width:45px; height:45px; border-radius:12px; display:flex; justify-content:center; align-items:center; margin-right:15px;">
                    <span style="color:white; font-size:18px; font-weight:bold;">5+</span>
                </div>
                <div>
                    <div style="font-size:12px; color:#888; font-weight:bold;">5회 이상 방문</div>
                    <div style="font-size:20px; font-weight:800; color:#2c3e50;">${cnt5.toLocaleString()}</div>
                </div>
            </div>
            <!-- 4 -->
            <div class="glass-panel" style="padding:15px; display:flex; align-items:center; background:white; border-radius:12px; box-shadow:0 4px 15px rgba(0,0,0,0.03); border:1px solid #eee;">
                <div style="background:#bdc3c7; width:45px; height:45px; border-radius:12px; display:flex; justify-content:center; align-items:center; margin-right:15px;">
                    <span style="color:white; font-size:18px; font-weight:bold;">4</span>
                </div>
                <div>
                    <div style="font-size:12px; color:#888; font-weight:bold;">4회 방문</div>
                    <div style="font-size:20px; font-weight:800; color:#2c3e50;">${cnt4.toLocaleString()}</div>
                </div>
            </div>
            <!-- 3 -->
            <div class="glass-panel" style="padding:15px; display:flex; align-items:center; background:white; border-radius:12px; box-shadow:0 4px 15px rgba(0,0,0,0.03); border:1px solid #eee;">
                <div style="background:#e67e22; width:45px; height:45px; border-radius:12px; display:flex; justify-content:center; align-items:center; margin-right:15px;">
                    <span style="color:white; font-size:18px; font-weight:bold;">3</span>
                </div>
                <div>
                    <div style="font-size:12px; color:#888; font-weight:bold;">3회 방문</div>
                    <div style="font-size:20px; font-weight:800; color:#2c3e50;">${cnt3.toLocaleString()}</div>
                </div>
            </div>
        </div>
        
        <!--Main Content Grid-- >
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; height:500px;">
                <!-- Left: Yearly Retention Table -->
                <div class="glass-panel" style="padding:20px; background:white; border-radius:12px; box-shadow:0 4px 15px rgba(0,0,0,0.03); border:1px solid #eee; display:flex; flex-direction:column; overflow:hidden;">
                    <h3 style="margin-top:0; color:#2c3e50; font-size:16px; font-weight:bold; border-bottom:1px solid #eee; padding-bottom:10px; margin-bottom:10px;">
                        <i class="fas fa-calendar-alt" style="color:#2ecc71; margin-right:10px;"></i>연도별 유지율 현황
                    </h3>
                    <div style="flex:1; overflow-y:auto; overflow-x:hidden;">
                        <table style="width:100%; border-collapse:collapse; font-size:13px; text-align:center;">
                            <thead style="background:#f8f9fa; position:sticky; top:0; z-index:1;">
                                <tr style="color:#555;">
                                    <th style="padding:10px; border-bottom:1px solid #ddd;">연도</th>
                                    <th style="padding:10px; border-bottom:1px solid #ddd;">총 수검자</th>
                                    <th style="padding:10px; border-bottom:1px solid #ddd;">재방문</th>
                                    <th style="padding:10px; border-bottom:1px solid #ddd;">유지율</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${yearlyStats.map((stat, idx) => `
                                <tr style="border-bottom:1px solid #eee;">
                                    <td style="padding:10px; font-weight:bold; color:#444;">${stat.year}년</td>
                                    <td style="padding:10px;">${stat.total.toLocaleString()}</td>
                                    <td style="padding:10px; color:#2ecc71; font-weight:bold;">${stat.retained.toLocaleString()}</td>
                                    <td style="padding:10px;">
                                        <span style="background:${stat.retained_rate >= 50 ? '#d5f5e3' : '#fadbd8'}; color:${stat.retained_rate >= 50 ? '#1e8449' : '#c0392b'}; padding:3px 8px; border-radius:10px; font-weight:bold; font-size:11px;">
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
                <div class="glass-panel" style="padding:20px; background:white; border-radius:12px; box-shadow:0 4px 15px rgba(0,0,0,0.03); border:1px solid #eee; display:flex; flex-direction:column; overflow:hidden;">
                    <h3 style="margin-top:0; color:#2c3e50; font-size:16px; font-weight:bold; border-bottom:1px solid #eee; padding-bottom:10px; margin-bottom:10px;">
                        <i class="fas fa-chart-bar" style="color:#3498db; margin-right:10px;"></i>재방문 빈도 분포
                    </h3>
                    <div style="flex:1; position:relative; min-height:0;">
                        <canvas id="revisitFreqChart"></canvas>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Render Chart
        const ctx = document.getElementById('revisitFreqChart');
        if (ctx) {
            const labels = Object.keys(freqDist).map(k => `${k} 회`);
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
                                    return `${context.parsed.y.toLocaleString()} 명`;
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
