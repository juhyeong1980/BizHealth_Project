
// --- Order Status Module ---

const OrderStatusModule = (function () {

    function init() {
        renderYearFilter();
    }

    function renderYearFilter() {
        const list = document.getElementById('yearDropList');
        if (!list) return;
        list.innerHTML = '';

        const itemStyle = "display: block; padding: 5px 0; border-bottom: 1px solid #eee; font-size: 13px;";

        const allDiv = document.createElement('div');
        allDiv.style.cssText = itemStyle + "font-weight:bold; color:#3498db; border-bottom: 2px solid #eee; margin-bottom:5px;";
        allDiv.innerHTML = `<label style="cursor:pointer; display:block;"><input type="checkbox" id="checkAllYears" checked> 전체 선택</label>`;
        list.appendChild(allDiv);

        if (typeof STATE !== 'undefined' && STATE.years) {
            Array.from(STATE.years).sort((a, b) => b - a).forEach(y => {
                const d = document.createElement('div');
                d.style.cssText = itemStyle;
                d.innerHTML = `<label style="cursor:pointer; display:block;"><input type="checkbox" class="y-chk" value="${y}" checked> ${y}년</label>`;
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
        if (!AGG_DATA || Object.keys(AGG_DATA).length === 0) {
            // Data might not be loaded yet
            return;
        }

        const selectedYears = Array.from(STATE.selectedYears).sort((a, b) => b - a);
        if (selectedYears.length < 2) {
            // Need at least 2 years to compare
            // update UI to show empty or message?
            return;
        }
        const currYear = selectedYears[0];
        const prevYear = selectedYears[1];

        const lbl = document.getElementById('os-year-label');
        if (lbl) lbl.innerText = `기준: ${currYear}년 vs ${prevYear}년`;

        // Logic using AGG_DATA
        // AGG_DATA structure: { "Company Name": { t: total_amt, y: { 2023: amt, 2024: amt }, c: { ... } } }

        // Note: Exclusions are already handled by Backend for AGG_DATA based on dashboard load params.
        // But if `dashboard.js` loaded ALL data and handles exclusion locally (which the new backend dashboard endpoint does NOT, it filters at query time),
        // then AGG_DATA already excludes ignored companies if the dashboard query filtered them.
        // However, if the dashboard query included everything and we filter locally... 
        // Current dashboard implementation: `params.append('exclude_companies', ...)` is commented out in my `dashboard.js` plan? 
        // Wait, did I update dashboard.js? No, I only updated backend and period/retention.
        // `dashboard.js` L134 said `[REFACTORED] Exclusions are now handled by Backend automatically.`
        // Correct. So AGG_DATA is already clean. We just iterate it.

        const result = { new: [], churn: [], increase: [], decrease: [] };
        const summary = { new: { count: 0, amt: 0 }, churn: { count: 0, amt: 0 }, increase: { count: 0, amt: 0 }, decrease: { count: 0, amt: 0 } };

        Object.entries(AGG_DATA).forEach(([name, data]) => {
            const curr = data.y[currYear] || 0;
            const prev = data.y[prevYear] || 0;

            const diff = curr - prev;
            const item = { name: name, curr: curr, prev: prev, diff: diff };

            if (prev === 0 && curr > 0) {
                result.new.push(item);
                summary.new.count++; summary.new.amt += curr;
            } else if (prev > 0 && curr === 0) {
                result.churn.push(item);
                summary.churn.count++; summary.churn.amt += prev;
            } else if (diff > 0 && prev > 0) {
                result.increase.push(item);
                summary.increase.count++; summary.increase.amt += diff;
            } else if (diff < 0 && curr > 0) {
                result.decrease.push(item);
                summary.decrease.count++; summary.decrease.amt += diff;
            }
        });

        result.new.sort((a, b) => b.curr - a.curr);
        result.churn.sort((a, b) => b.prev - a.prev);
        result.increase.sort((a, b) => b.diff - a.diff);
        result.decrease.sort((a, b) => a.diff - b.diff);

        renderSummary(summary);
        renderList('os-list-new', result.new, 'curr');
        renderList('os-list-churn', result.churn, 'prev');
        renderListDiff('os-list-increase', result.increase);
        renderListDiff('os-list-decrease', result.decrease);
    }

    function renderSummary(s) {
        const el = document.getElementById('os-summary-cards');
        if (!el) return;
        const fmt = (n) => n.toLocaleString();
        el.innerHTML = `
        <div class="os-card" style="border-left: 5px solid #27ae60;">
            <div class="os-card-title"><span>🌱 신규 유입</span></div>
            <div class="os-card-content"><span class="os-card-count" style="color: #27ae60;">${s.new.count}개소</span><div class="os-card-amt">+${fmt(s.new.amt)}원</div></div>
        </div>
        <div class="os-card" style="border-left: 5px solid #e74c3c;">
            <div class="os-card-title"><span>⚠️ 이탈 사업장</span></div>
            <div class="os-card-content"><span class="os-card-count" style="color: #e74c3c;">${s.churn.count}개소</span><div class="os-card-amt">-${fmt(s.churn.amt)}원</div></div>
        </div>
        <div class="os-card" style="border-left: 5px solid #2980b9;">
            <div class="os-card-title"><span>📈 매출 증가</span></div>
            <div class="os-card-content"><span class="os-card-count" style="color: #2980b9;">${s.increase.count}개소</span><div class="os-card-amt">+${fmt(s.increase.amt)}원</div></div>
        </div>
        <div class="os-card" style="border-left: 5px solid #f39c12;">
            <div class="os-card-title"><span>📉 매출 감소</span></div>
            <div class="os-card-content"><span class="os-card-count" style="color: #f39c12;">${s.decrease.count}개소</span><div class="os-card-amt">${fmt(s.decrease.amt)}원</div></div>
        </div>`;
    }

    function renderList(id, list, valKey) {
        const tbody = document.getElementById(id);
        if (!tbody) return;
        if (!list.length) { tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:#ccc;padding:20px;">데이터 없음</td></tr>'; return; }
        tbody.innerHTML = list.map(item => `<tr><td class="text-left" title="${item.name}"><div style="width:110px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:500;">${item.name}</div></td><td style="font-weight:bold; text-align:right;">${item[valKey].toLocaleString()}</td></tr>`).join('');
    }

    function renderListDiff(id, list) {
        const tbody = document.getElementById(id);
        if (!tbody) return;
        if (!list.length) { tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#ccc;padding:20px;">데이터 없음</td></tr>'; return; }
        tbody.innerHTML = list.map(item => {
            const color = item.diff > 0 ? '#e74c3c' : '#2980b9'; const sign = item.diff > 0 ? '+' : '';
            return `<tr><td class="text-left" title="${item.name}"><div style="width:110px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:500;">${item.name}</div></td><td style="color:#888; font-size:11px; text-align:right;">${item.curr.toLocaleString()}</td><td style="font-weight:bold; color:${color}; text-align:right;">${sign}${item.diff.toLocaleString()}</td></tr>`;
        }).join('');
    }

    return {
        init: init,
        analyze: analyze
    };
})();
