// --- Order Status Module ---

const OrderStatusModule = (function () {

    function init() {
        // [Default Select All]
        if (typeof STATE !== 'undefined' && STATE.years && STATE.years.size > 0) {
            STATE.selectedYears = new Set(STATE.years); // Force Select All
        }
        renderYearFilter();
    }

    function renderYearFilter() {
        const list = document.getElementById('yearDropList');
        if (!list) return;
        list.innerHTML = '';

        const itemStyle = "display: block; padding: 5px 0; border-bottom: 1px solid #eee; font-size: 13px;";

        const allDiv = document.createElement('div');
        allDiv.style.cssText = itemStyle + "font-weight:bold; color:#3498db; border-bottom: 2px solid #eee; margin-bottom:5px;";
        const isAll = (STATE.selectedYears.size === STATE.years.size);
        allDiv.innerHTML = `<label style="cursor:pointer; display:block;"><input type="checkbox" id="checkAllYears" ${isAll ? 'checked' : ''}> 전체 선택</label>`;
        list.appendChild(allDiv);

        if (typeof STATE !== 'undefined' && STATE.years) {
            Array.from(STATE.years).sort((a, b) => b - a).forEach(y => {
                const checked = STATE.selectedYears.has(y) ? 'checked' : '';
                const d = document.createElement('div');
                d.style.cssText = itemStyle;
                d.innerHTML = `<label style="cursor:pointer; display:block;"><input type="checkbox" class="y-chk" value="${y}" ${checked}> ${y}년</label>`;
                list.appendChild(d);
            });
        }

        const allChk = document.getElementById('checkAllYears');
        if (allChk) {
            allChk.addEventListener('change', (e) => {
                list.querySelectorAll('.y-chk').forEach(k => k.checked = e.target.checked);
                updateSelectedYears();
            });
        }

        list.querySelectorAll('.y-chk').forEach(chk => {
            chk.addEventListener('change', () => {
                if (!chk.checked && allChk) allChk.checked = false;
                updateSelectedYears();
            });
        });
    }

    function updateSelectedYears() {
        if (typeof STATE === 'undefined') return;
        STATE.selectedYears.clear();
        document.querySelectorAll('.y-chk').forEach(k => { if (k.checked) STATE.selectedYears.add(parseInt(k.value)); });
        analyze();
    }

    function analyze() {
        if (STATE.selectedYears.size < 1) return;

        const years = Array.from(STATE.selectedYears).sort((a, b) => b - a);

        const containers = {
            new: document.getElementById('os-container-new'),
            churn: document.getElementById('os-container-churn'),
            up: document.getElementById('os-container-increase'),
            down: document.getElementById('os-container-decrease')
        };

        Object.values(containers).forEach(c => { if (c) c.innerHTML = ''; });

        const params = new URLSearchParams();
        years.forEach(y => params.append('years', y));

        fetch(`${API_BASE_URL}/api/stats/retention?${params}`)
            .then(res => res.json())
            .then(data => {
                let yearlyStats = {};

                years.forEach(y => {
                    const detail = data.details[y];
                    if (!detail) return;

                    yearlyStats[y] = {
                        new: detail.new.length,
                        newAmt: detail.new.reduce((a, b) => a + (b.val || 0), 0),
                        churn: detail.churn.length,
                        churnAmt: detail.churn.reduce((a, b) => a + (b.val || 0), 0),
                        up: detail.up.length,
                        upAmt: detail.up.reduce((a, b) => a + (b.diff || 0), 0),
                        down: detail.down.length,
                        downAmt: detail.down.reduce((a, b) => a + (b.diff || 0), 0)
                    };

                    renderYearSection(containers.new, y, detail.new, 'val', '매출', '#e74c3c');
                    renderYearSection(containers.churn, y, detail.churn, 'val', '전년매출', '#2980b9');
                    renderYearSectionDiff(containers.up, y, detail.up);
                    renderYearSectionDiff(containers.down, y, detail.down);
                });

                renderYearlySummary(yearlyStats, years);
            })
            .catch(e => console.error(e));
    }

    function renderYearSection(container, year, list, valKey, valLabel, amtColor = '#333') {
        if (!container) return;

        const totalAmt = list.reduce((a, b) => a + (b[valKey] || 0), 0);

        const html = `
            <div style="margin-bottom:20px;">
                <div style="background:#f8f9fa; padding:12px 15px; border-left:4px solid ${amtColor}; border-radius:4px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:15px;">
                        <span style="font-size:17px; font-weight:bold; color:#333;">${year}년</span>
                        <span style="font-size:17px; font-weight:bold; color:#555;">${list.length}개소</span>
                    </div>
                    <span style="font-size:17px; font-weight:bold; color:${amtColor};">${totalAmt.toLocaleString()}원</span>
                </div>
                <table class="os-table">
                     ${list.length > 0 ?
                `<thead><tr><th class="text-left">사업장명</th><th style="text-align:right;">${valLabel}</th></tr></thead><tbody>` +
                list.map(item => `<tr><td class="text-left" title="${item.name}"><div style="width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${item.name}</div></td><td style="text-align:right; font-weight:bold;">${(item[valKey] || 0).toLocaleString()}</td></tr>`).join('') +
                `</tbody>`
                : `<tbody><tr><td colspan="2" style="text-align:center; padding:10px; color:#ccc;">-</td></tr></tbody>`}
                </table>
            </div>`;

        container.innerHTML += html;
    }

    function renderYearSectionDiff(container, year, list) {
        if (!container) return;

        const totalDiff = list.reduce((a, b) => a + (b.diff || 0), 0);
        const color = totalDiff > 0 ? '#e74c3c' : (totalDiff < 0 ? '#2980b9' : '#333');
        const sign = totalDiff > 0 ? '+' : '';

        const html = `
            <div style="margin-bottom:20px;">
                <div style="background:#f8f9fa; padding:12px 15px; border-left:4px solid ${color}; border-radius:4px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:15px;">
                        <span style="font-size:17px; font-weight:bold; color:#333;">${year}년</span>
                        <span style="font-size:17px; font-weight:bold; color:#555;">${list.length}개소</span>
                    </div>
                    <span style="font-size:17px; font-weight:bold; color:${color};">${sign}${totalDiff.toLocaleString()}원</span>
                </div>
                <table class="os-table">
                     ${list.length > 0 ?
                `<thead><tr><th class="text-left">사업장명</th><th>금액</th><th>증감</th></tr></thead><tbody>` +
                list.map(item => {
                    const c = item.diff > 0 ? '#e74c3c' : '#2980b9';
                    const s = item.diff > 0 ? '+' : '';
                    return `<tr><td class="text-left" title="${item.name}"><div style="width:100px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${item.name}</div></td><td style="text-align:right; color:#888; font-size:11px;">${(item.val || 0).toLocaleString()}</td><td style="text-align:right; font-weight:bold; color:${c};">${s}${(item.diff || 0).toLocaleString()}</td></tr>`;
                }).join('') +
                `</tbody>`
                : `<tbody><tr><td colspan="3" style="text-align:center; padding:10px; color:#ccc;">-</td></tr></tbody>`}
                </table>
            </div>`;
        container.innerHTML += html;
    }

    function renderYearlySummary(stats, years) {
        const el = document.getElementById('os-summary-cards');
        if (!el) return;
        const fmt = (n) => n.toLocaleString();

        const buildRows = (key, keyAmt, color, sign = '') => {
            return years.map(y => {
                const s = stats[y] || { [key]: 0, [keyAmt]: 0 };
                return `<div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:6px; padding-bottom:6px; border-bottom:1px solid #f0f0f0;">
                    <span style="font-weight:bold; color:#555;">${y}년</span>
                    <div style="text-align:right;">
                        <span style="display:inline-block; margin-right:8px; font-weight:bold; color:${color};">${s[key]}개</span>
                        <span style="color:#666; font-size:12px;">${sign}${fmt(s[keyAmt])}</span>
                    </div>
                </div>`;
            }).join('');
        };

        el.innerHTML = `
        <div class="os-card" style="border-left: 5px solid #27ae60; padding:15px; height:auto; min-height:120px;">
            <div class="os-card-title" style="margin-bottom:12px; font-size:15px; color:#2c3e50;"><span style="display:flex; align-items:center; gap:5px;"><i class="fas fa-leaf" style="color:#27ae60;"></i> 신규 유입</span></div>
            <div class="os-card-content" style="display:block;">${buildRows('new', 'newAmt', '#27ae60', '+')}</div>
        </div>
        <div class="os-card" style="border-left: 5px solid #e74c3c; padding:15px; height:auto; min-height:120px;">
            <div class="os-card-title" style="margin-bottom:12px; font-size:15px; color:#2c3e50;"><span style="display:flex; align-items:center; gap:5px;"><i class="fas fa-sign-out-alt" style="color:#e74c3c;"></i> 이탈 사업장</span></div>
            <div class="os-card-content" style="display:block;">${buildRows('churn', 'churnAmt', '#e74c3c', '-')}</div>
        </div>
        <div class="os-card" style="border-left: 5px solid #2980b9; padding:15px; height:auto; min-height:120px;">
            <div class="os-card-title" style="margin-bottom:12px; font-size:15px; color:#2c3e50;"><span style="display:flex; align-items:center; gap:5px;"><i class="fas fa-arrow-up" style="color:#2980b9;"></i> 매출 증가</span></div>
            <div class="os-card-content" style="display:block;">${buildRows('up', 'upAmt', '#2980b9', '+')}</div>
        </div>
        <div class="os-card" style="border-left: 5px solid #f39c12; padding:15px; height:auto; min-height:120px;">
            <div class="os-card-title" style="margin-bottom:12px; font-size:15px; color:#2c3e50;"><span style="display:flex; align-items:center; gap:5px;"><i class="fas fa-arrow-down" style="color:#f39c12;"></i> 매출 감소</span></div>
            <div class="os-card-content" style="display:block;">${buildRows('down', 'downAmt', '#f39c12', '')}</div>
        </div>`;
    }

    return {
        init: init,
        analyze: analyze
    };
})();
