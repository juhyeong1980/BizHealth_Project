# main.py (Version 1.1 - Deployment Ready)
import os
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import create_engine, func, case, desc, distinct
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel

# Import models
from models import Base, Checkup, CompanyMap, CodeMap, Patient, CompanyExclude

# ---------------------------------------------------------
# 1. 데이터베이스 설정
# ---------------------------------------------------------
db_path = "healthcare.db"
if not os.path.exists(db_path):
    print("⚠️ 경고: healthcare.db 파일이 없습니다. init_db.py를 먼저 실행해주세요!")

engine = create_engine(f'sqlite:///{db_path}', connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ---------------------------------------------------------
# 2. FastAPI 앱 설정
# ---------------------------------------------------------
app = FastAPI(title="JinHealth Admin API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# [Modified] Update paths for 'frontend/backend' structure
app.mount("/js", StaticFiles(directory="../frontend/js"), name="js")
app.mount("/images", StaticFiles(directory="../frontend/images"), name="images")
app.mount("/views", StaticFiles(directory="../frontend/views"), name="views")

@app.get("/")
async def read_root():
    return FileResponse("../frontend/index.html")

@app.get("/style.css")
async def read_style():
    return FileResponse("../frontend/style.css")

# ---------------------------------------------------------
# 3. API 엔드포인트
# ---------------------------------------------------------

@app.get("/admin", response_class=HTMLResponse)
async def admin_page():
    # 간단한 관리자 UI
    return """
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <title>진헬스 데이터 관리자</title>
        <style>
            body { font-family: 'Malgun Gothic', sans-serif; padding: 30px; background: #f0f2f5; }
            .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); max-width: 800px; margin: 0 auto; }
            h2 { color: #007bff; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
            .row { display: flex; gap: 10px; margin-bottom: 15px; background: #f9f9f9; padding: 15px; border-radius: 5px; }
            input { flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
            button { background: #007bff; color: white; border: none; padding: 10px 20px; cursor: pointer; border-radius: 4px; font-weight: bold; }
            button:hover { background: #0056b3; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border-bottom: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background: #f8f9fa; color: #555; }
        </style>
    </head>
    <body>
        <div class="card">
            <h2>🏢 사업장명 표준화 관리</h2>
            <div class="row">
                <input type="text" id="origin" placeholder="원본 이름 (CSV에 적힌 이름)">
                <span style="align-self: center;">➡️</span>
                <input type="text" id="standard" placeholder="통계용 표준 이름">
                <button onclick="saveRule()">규칙 저장</button>
            </div>
            <table>
                <thead><tr><th>원본 이름</th><th>➡️ 변환될 이름</th><th>관리</th></tr></thead>
                <tbody id="list"></tbody>
            </table>
        </div>
        <script>
            const API_URL = ""; 
            async function loadList() {
                const res = await fetch(API_URL + "/api/company-map");
                const data = await res.json();
                const tbody = document.getElementById("list");
                tbody.innerHTML = "";
                data.forEach(item => {
                    tbody.innerHTML += `<tr><td>${item.original_name}</td><td style="color:blue;font-weight:bold;">${item.standard_name}</td><td><button onclick="deleteRule('${item.original_name}')" style="background:#dc3545;padding:5px 10px;">삭제</button></td></tr>`;
                });
            }
            async function saveRule() {
                const origin = document.getElementById("origin").value;
                const standard = document.getElementById("standard").value;
                if(!origin || !standard) return alert("값을 입력하세요");
                await fetch(API_URL + "/api/company-map", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ original_name: origin, standard_name: standard }) });
                alert("저장 완료!");
                document.getElementById("origin").value = "";
                loadList();
            }
            async function deleteRule(origin) {
                if(!confirm("삭제하시겠습니까?")) return;
                await fetch(API_URL + "/api/company-map/" + origin, { method: "DELETE" });
                loadList();
            }
            loadList();
        </script>
    </body>
    </html>
    """

@app.get("/api/years")
def get_years(db: Session = Depends(get_db)):
    """DB에 존재하는 검진 연도 목록 반환"""
    years = db.query(func.substr(Checkup.checkup_date, 1, 4)).distinct().all()
    # Flatten result [('2021',), ('2022',)] -> [2021, 2022]
    return sorted([int(y[0]) for y in years if y[0] and y[0].isdigit()], reverse=True)

class CompanyMapDTO(BaseModel):
    original_name: str
    standard_name: str

class CompanyExcludeDTO(BaseModel):
    company_name: str
    memo: Optional[str] = None

class CompanyExcludeDTO(BaseModel):
    company_name: str
    memo: Optional[str] = None

@app.get("/api/company-map")
def get_maps(db: Session = Depends(get_db)):
    return db.query(CompanyMap).all()

@app.post("/api/company-map")
def create_map(dto: CompanyMapDTO, db: Session = Depends(get_db)):
    existing = db.query(CompanyMap).filter_by(original_name=dto.original_name).first()
    if existing:
        existing.standard_name = dto.standard_name
    else:
        new_map = CompanyMap(original_name=dto.original_name, standard_name=dto.standard_name)
        db.add(new_map)
    db.commit()
    return {"status": "ok"}

@app.delete("/api/company-map/{original_name}")
def delete_map(original_name: str, db: Session = Depends(get_db)):
    db.query(CompanyMap).filter_by(original_name=original_name).delete()
    db.commit()
    return {"status": "deleted"}

# --- Company Exclude Endpoints ---
@app.get("/api/company-exclude")
def get_excludes(db: Session = Depends(get_db)):
    """제외된 회사 목록 반환"""
    return [c.company_name for c in db.query(CompanyExclude).all()]

@app.post("/api/company-exclude")
def add_exclude(dto: CompanyExcludeDTO, db: Session = Depends(get_db)):
    """회사 제외 추가"""
    existing = db.query(CompanyExclude).filter_by(company_name=dto.company_name).first()
    if not existing:
        db.add(CompanyExclude(company_name=dto.company_name, memo=dto.memo))
        db.commit()
    return {"status": "added"}

@app.delete("/api/company-exclude/{company_name}")
def delete_exclude(company_name: str, db: Session = Depends(get_db)):
    """회사 제외 취소"""
    db.query(CompanyExclude).filter_by(company_name=company_name).delete()
    db.commit()
    return {"status": "deleted"}

# --- Company Exclude Endpoints ---
@app.get("/api/company-exclude")
def get_excludes(db: Session = Depends(get_db)):
    """제외된 회사 목록 반환"""
    return [c.company_name for c in db.query(CompanyExclude).all()]

@app.post("/api/company-exclude")
def add_exclude(dto: CompanyExcludeDTO, db: Session = Depends(get_db)):
    """회사 제외 추가"""
    existing = db.query(CompanyExclude).filter_by(company_name=dto.company_name).first()
    if not existing:
        db.add(CompanyExclude(company_name=dto.company_name, memo=dto.memo))
        db.commit()
    return {"status": "added"}

@app.delete("/api/company-exclude/{company_name}")
def delete_exclude(company_name: str, db: Session = Depends(get_db)):
    """회사 제외 취소"""
    db.query(CompanyExclude).filter_by(company_name=company_name).delete()
    db.commit()
    return {"status": "deleted"}

@app.get("/api/stats")
def get_dashboard_stats(
    start_date: Optional[str] = None, 
    end_date: Optional[str] = None,   
    years: Optional[List[int]] = Query(None),
    exclude_companies: Optional[List[str]] = Query(None),
    db: Session = Depends(get_db)
):
    company_expr = func.coalesce(CompanyMap.standard_name, Checkup.company_name).label("final_name")
    
    def apply_filters(query):
        if start_date: query = query.filter(Checkup.checkup_date >= start_date)
        if end_date: query = query.filter(Checkup.checkup_date <= end_date)
        if years: query = query.filter(func.substr(Checkup.checkup_date, 1, 4).in_([str(y) for y in years]))
        if exclude_companies: query = query.filter(company_expr.not_in(exclude_companies))
        return query

    # (1) YT
    q_yt = db.query(
        func.substr(Checkup.checkup_date, 1, 4).label("year"),
        func.sum(Checkup.total_price).label("rev"),
        func.count(Checkup.receipt_no).label("cnt")
    ).outerjoin(CompanyMap, Checkup.company_name == CompanyMap.original_name)
    q_yt = apply_filters(q_yt)
    q_yt = q_yt.group_by("year")
    yt_results = q_yt.all()
    YT = {int(r.year): {"rev": r.rev or 0, "cnt": r.cnt or 0} for r in yt_results if r.year}

    # (2) MO
    q_mo = db.query(
        func.substr(Checkup.checkup_date, 1, 4).label("year"),
        func.substr(Checkup.checkup_date, 6, 2).label("month"),
        func.sum(Checkup.total_price).label("rev")
    ).outerjoin(CompanyMap, Checkup.company_name == CompanyMap.original_name)
    q_mo = apply_filters(q_mo)
    q_mo = q_mo.group_by("year", "month")
    mo_results = q_mo.all()
    MO = {y: [0]*12 for y in YT.keys()}
    for r in mo_results:
        if r.year and r.month:
            y, m, rev = int(r.year), int(r.month), r.rev or 0
            if y not in MO: MO[y] = [0]*12
            if 1 <= m <= 12: MO[y][m-1] = rev

    # (3) CL
    q_cl = db.query(
        company_expr.label("name"),
        func.substr(Checkup.checkup_date, 1, 4).label("year"),
        func.sum(Checkup.total_price).label("amt"),
        func.count(Checkup.receipt_no).label("cnt")
    ).outerjoin(CompanyMap, Checkup.company_name == CompanyMap.original_name)
    q_cl = apply_filters(q_cl)
    q_cl = q_cl.group_by("name", "year")
    cl_results = q_cl.all()
    CL = {}
    for r in cl_results:
        name = r.name or "기타"
        year = int(r.year) if r.year else 0
        amt = r.amt or 0
        cnt = r.cnt or 0
        if name not in CL: CL[name] = {"t": 0, "y": {}, "c": {}}
        CL[name]["t"] += amt
        CL[name]["y"][year] = amt
        CL[name]["c"][year] = cnt

    return {"CL": CL, "MO": MO, "YT": YT}

@app.get("/api/company/{name}/stats")
def get_company_stats(name: str, years: Optional[List[int]] = Query(None), db: Session = Depends(get_db)):
    related_names = [name]
    mapped = db.query(CompanyMap.original_name).filter(CompanyMap.standard_name == name).all()
    for m in mapped: related_names.append(m.original_name)
        
    q = db.query(Checkup).filter(Checkup.company_name.in_(related_names))
    if years:
        str_years = [str(y) for y in years]
        q = q.filter(func.substr(Checkup.checkup_date, 1, 4).in_(str_years))

    results = q.all()

    cY = {}
    cM = {} 
    cPkg = {} 
    
    total_rev = 0
    total_cnt = 0
    
    for r in results:
        s_date = str(r.checkup_date).strip()
        if len(s_date) >= 10:
            y = int(s_date[:4])
            m = int(s_date[5:7]) - 1
        else: continue
            
        amt = r.total_price or 0
        total_rev += amt
        total_cnt += 1
        
        if y not in cY: cY[y] = {'r': 0, 'c': 0}
        cY[y]['r'] += amt
        cY[y]['c'] += 1
        
        if y not in cM: cM[y] = [0]*12
        if 0 <= m < 12: cM[y][m] += amt
            
        if r.package_code:
            for p in r.package_code.split(','):
                p = p.strip()
                if p: cPkg[p] = (cPkg.get(p, 0)) + 1
    
    cDemo = {'20': {'M': 0, 'F': 0}, '30': {'M': 0, 'F': 0}, '40': {'M': 0, 'F': 0}, '50': {'M': 0, 'F': 0}, '60': {'M': 0, 'F': 0}}
    
    q_demo = db.query(Checkup.age, Patient.gender, func.count(Checkup.receipt_no))\
        .join(Patient, Checkup.patient_id == Patient.id)\
        .filter(Checkup.company_name.in_(related_names))
    
    if years: q_demo = q_demo.filter(func.substr(Checkup.checkup_date, 1, 4).in_(str_years))
        
    demo_res = q_demo.group_by(Checkup.age, Patient.gender).all()
    
    max_age_group = '-' 
    
    for age, sex, cnt in demo_res:
        if not age: age = 0
        a_key = '60'
        if age < 30: a_key = '20'
        elif age < 40: a_key = '30'
        elif age < 50: a_key = '40'
        elif age < 60: a_key = '50'
        s_key = 'M'
        if sex and ('여' in sex or 'F' in sex.upper()): s_key = 'F'
        cDemo[a_key][s_key] += cnt

    age_totals = {k: v['M'] + v['F'] for k, v in cDemo.items()}
    if age_totals:
        max_k = max(age_totals, key=age_totals.get)
        max_age_group = max_k + "대" if age_totals[max_k] > 0 else "-"


    return {
        "summary": {"rev": total_rev, "cnt": total_cnt, "max_age": max_age_group},
        "annual": cY,
        "monthly": cM,
        "packages": cPkg,
        "demographics": cDemo
    }

# ---------------------------------------------------------
# [NEW] Period Analysis Endpoint
# ---------------------------------------------------------
@app.get("/api/stats/period")
def get_period_stats(
    start_date: str, 
    end_date: str, 
    db: Session = Depends(get_db)
):
    """
    특정 기간(start_date ~ end_date) 동안의 통계
    - total: {count, amount}
    - byType: 검진 종류별 {count, amount}
    - byBiz: 매출 상위 기업 리스트
    """
    company_expr = func.coalesce(CompanyMap.standard_name, Checkup.company_name).label("final_name")
    
    # 1. Base Query
    q = db.query(
        Checkup.checkup_type,
        company_expr.label('company_name'),
        Checkup.total_price
    ).outerjoin(CompanyMap, Checkup.company_name == CompanyMap.original_name)\
     .filter(Checkup.checkup_date >= start_date)\
     .filter(Checkup.checkup_date <= end_date)
     
    rows = q.all()
    
    total_count = 0
    total_amount = 0
    by_type = {}
    by_biz = {}
    
    # Predefined priority keys (optional, but good for frontend consistency)
    PRIORITY_KEYS = ["종합검진", "기업검진", "특수검진", "공단검진", "암검진", "공단구강", "추가영상", "기타"]
    for k in PRIORITY_KEYS:
        by_type[k] = {"count": 0, "amount": 0}
        
    for r in rows:
        amt = r.total_price or 0
        total_count += 1
        total_amount += amt
        
        # Type Aggregation
        c_type = (r.checkup_type or "기타").strip()
        # Simple keywords mapping (Backend Logic)
        # If the DB already has correct checkup_type, use it. 
        # Otherwise, we might need logic here. Assuming DB has raw type string.
        # Let's map it roughly to standard keys or just use the DB string if it matches our standard.
        # For now, we will use the raw string, but if frontend sent "raw" csv data, it might need normalization.
        # Let's assume the DB 'checkup_type' column is already reasonably clean or we will group by raw.
        # Actually, let's try to normalize using simple contains if not in keys.
        
        found_key = "기타"
        for k in PRIORITY_KEYS:
            if k in c_type: 
                found_key = k
                break
        
        if found_key not in by_type: by_type[found_key] = {"count": 0, "amount": 0}
        by_type[found_key]["count"] += 1
        by_type[found_key]["amount"] += amt
        
        # Company Aggregation
        c_name = r.company_name or "미지정"
        if c_name not in by_biz: by_biz[c_name] = {"count": 0, "amount": 0}
        by_biz[c_name]["count"] += 1
        by_biz[c_name]["amount"] += amt

    # Sort Biz by amount
    sorted_biz = dict(sorted(by_biz.items(), key=lambda item: item[1]['amount'], reverse=True)[:50])

    return {
        "total": {"count": total_count, "amount": total_amount},
        "byType": by_type,
        "byBiz": sorted_biz
    }

# ---------------------------------------------------------
# [NEW] Retention Analysis Endpoint
# ---------------------------------------------------------
@app.get("/api/stats/retention")
def get_retention_stats(years: List[int] = Query(...), db: Session = Depends(get_db)):
    """
    선택된 연도들에 대한 재방문(Retention/Waterfall) 분석
    """
    str_years = [str(y) for y in sorted(years)]
    
    # Query: Patient LifeCode + Year
    # Group by Patient to get their visit history
    q = db.query(
        Patient.life_code, 
        func.substr(Checkup.checkup_date, 1, 4).label('year')
    ).join(Patient, Checkup.patient_id == Patient.id)\
     .filter(func.substr(Checkup.checkup_date, 1, 4).in_(str_years))\
     .distinct()
     
    rows = q.all()
    
    user_history = {}
    for r in rows:
        uid = r.life_code
        y = int(r.year)
        if uid not in user_history: user_history[uid] = set()
        user_history[uid].add(y)
        
    waterfall = {y: {"new": 0, "retained": 0, "returned": 0} for y in years}
    stickiness = [0] * 5 # 1~5+ visits
    
    for uid, visited_set in user_history.items():
        visited = sorted(list(visited_set))
        first_visit = visited[0]
        visit_count = len(visited)
        
        # Stickiness (1 to 5+)
        idx = min(visit_count, 5) - 1
        if idx >= 0:
            stickiness[idx] += 1
            
        # Waterfall
        for i, y in enumerate(visited):
            if y not in waterfall: continue
            
            if y == first_visit:
                waterfall[y]["new"] += 1
            else:
                # Retained if visited previous year in the *selected set*? 
                # Or previous chronological year? 
                # Usually Retained = Visited in (Y-1). Returned = Visited before (Y-1) but not (Y-1).
                # But we only have limited years in `years` arg.
                # If a user visited in 2021 and 2023 (and we selected both), 2023 is Returned?
                # Let's assume strictly based on history within limit or global?
                # For accurate stats, we likely need global history, but query is filtered.
                # Let's simple check: Is (y-1) in visited_set?
                if (y - 1) in visited_set:
                    waterfall[y]["retained"] += 1
                else:
                    waterfall[y]["returned"] += 1
                    
    return {
        "waterfall": waterfall,
        "stickiness": stickiness,
        "total_users": len(user_history)
    }

# ---------------------------------------------------------
# [NEW] Config & Helper Endpoints
# ---------------------------------------------------------

@app.get("/api/company-list")
def get_all_companies(db: Session = Depends(get_db)):
    """DB에 존재하는 모든 회사명(company_name) 목록 반환"""
    # 단순하게 모든 checkup의 company_name을 distinct로 가져옴
    # 성능 최적화를 위해 CompanyMap에 있는 것도 고려해야 하나?
    # 일단 Checkup 테이블 기준.
    rows = db.query(distinct(Checkup.company_name)).all()
    # [('Samsung',), ('LG',)] -> ['Samsung', 'LG']
    return sorted([r[0] or "미지정" for r in rows if r[0]])

class ConfigSyncDTO(BaseModel):
    maps: List[CompanyMapDTO]
    excludes: List[str] # List of company names
    exam_config: Optional[Dict[str, Any]] = None # Future use

@app.post("/api/config/sync")
def sync_config(dto: ConfigSyncDTO, db: Session = Depends(get_db)):
    """
    설정 동기화 (Bulk Update)
    - 기존 매핑/제외 목록을 모두 지우고 요청된 내용으로 덮어씌움 (Full Sync)
    """
    # 1. Clear existing
    db.query(CompanyMap).delete()
    db.query(CompanyExclude).delete()
    
    # 2. Add Maps
    for m in dto.maps:
        db.add(CompanyMap(original_name=m.original_name, standard_name=m.standard_name))
        
    # 3. Add Excludes
    for e in dto.excludes:
        db.add(CompanyExclude(company_name=e))
        
    db.commit()
    return {"status": "synced", "maps": len(dto.maps), "excludes": len(dto.excludes)}
