# main.py (Version 1.1 - Deployment Ready)
import os
from typing import List, Optional, Dict, Any
from collections import defaultdict

from fastapi import FastAPI, Depends, HTTPException, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import create_engine, func, case, desc, distinct
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel
import shutil
import sys
import traceback

# Import models
# Fix ModuleNotFoundError on server
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from models import Base, Checkup, CompanyMap, CodeMap, Patient, CompanyExclude, ExamRule

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "../frontend")

# Pydantic Models for Settings
class CompanyMapCreate(BaseModel):
    original_name: str
    standard_name: str
    memo: Optional[str] = None

class CompanyExcludeCreate(BaseModel):
    company_name: str
    memo: Optional[str] = None

# ---------------------------------------------------------
# 1. 데이터베이스 설정
# ---------------------------------------------------------
# ---------------------------------------------------------
# 1. 데이터베이스 설정
# ---------------------------------------------------------
db_path = os.path.join(BASE_DIR, "healthcare.db")
if not os.path.exists(db_path):
    print(f"⚠️ 경고: {db_path} 파일이 없습니다. init_db.py를 먼저 실행해주세요!")

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
if os.path.exists(os.path.join(FRONTEND_DIR, "js")):
    app.mount("/js", StaticFiles(directory=os.path.join(FRONTEND_DIR, "js")), name="js")
if os.path.exists(os.path.join(FRONTEND_DIR, "images")):
    app.mount("/images", StaticFiles(directory=os.path.join(FRONTEND_DIR, "images")), name="images")
if os.path.exists(os.path.join(FRONTEND_DIR, "views")):
    app.mount("/views", StaticFiles(directory=os.path.join(FRONTEND_DIR, "views")), name="views")

@app.get("/")
async def read_root():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

@app.get("/style.css")
async def read_style():
    return FileResponse(os.path.join(FRONTEND_DIR, "style.css"))

# ---------------------------------------------------------
# 3. API 엔드포인트
# ---------------------------------------------------------

@app.get("/admin")
async def admin_page():
    # [Redirect] Legacy admin page is removed. Redirect to main SPA.
    return RedirectResponse(url="/")

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
    return {"status": "ok", "message": "저장되었습니다"}

@app.delete("/api/company-map/{original_name}")
def delete_map(original_name: str, db: Session = Depends(get_db)):
    db.query(CompanyMap).filter_by(original_name=original_name).delete()
    db.commit()
    return {"status": "deleted", "message": "삭제되었습니다"}

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
    return {"status": "added", "message": "추가되었습니다"}

@app.delete("/api/company-exclude/{company_name}")
def delete_exclude(company_name: str, db: Session = Depends(get_db)):
    """회사 제외 취소"""
    db.query(CompanyExclude).filter_by(company_name=company_name).delete()
    db.commit()
    return {"status": "deleted"}

@app.get("/api/company-list")
def get_all_companies(db: Session = Depends(get_db)):
    """DB에 존재하는 모든 회사명(원본) 반환"""
    companies = db.query(distinct(Checkup.company_name)).all()
    # Flatten list
    return sorted([c[0] for c in companies if c[0]])



@app.get("/api/stats")
def get_dashboard_stats(
    start_date: Optional[str] = None, 
    end_date: Optional[str] = None,   
    years: Optional[List[int]] = Query(None),
    exclude_companies: Optional[List[str]] = Query(None),
    db: Session = Depends(get_db)
):
    company_expr = func.coalesce(CompanyMap.standard_name, Checkup.company_name).label("final_name")
    
    # [GLOBAL FILTER] Fetch Excludes from DB
    db_excludes = [r.company_name for r in db.query(CompanyExclude).all()]
    if exclude_companies: 
        db_excludes.extend(exclude_companies)
    
    def apply_filters(query):
        if start_date: query = query.filter(Checkup.checkup_date >= start_date)
        if end_date: query = query.filter(Checkup.checkup_date <= end_date)
        if years: query = query.filter(func.substr(Checkup.checkup_date, 1, 4).in_([str(y) for y in years]))
        if db_excludes: query = query.filter(company_expr.not_in(db_excludes))
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
    # Handle YYYYMMDD (len 8 or YYYYMMDD.0) and YYYY-MM-DD (len 10)
    # Check 5th char. If '-', '.', '/' -> Separated. Else -> YYYYMMDD
    c5 = func.substr(func.trim(Checkup.checkup_date), 5, 1)
    month_expr = case(
        (c5.in_(['-', '.', '/']), func.substr(func.trim(Checkup.checkup_date), 6, 2)),
        else_=func.substr(func.trim(Checkup.checkup_date), 5, 2)
    ).label("month")

    q_mo = db.query(
        func.substr(Checkup.checkup_date, 1, 4).label("year"),
        month_expr,
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

    # Fetch Rules for classification
    rules = db.query(ExamRule).order_by(ExamRule.priority).all()
    if not rules:
        rules = [
            ExamRule(category_name="종합검진", keywords="종합", priority=1),
            ExamRule(category_name="기타", keywords="", priority=99)
        ]

    cY = {}
    cM = {} 
    cPkg = {} 
    cType = {r.category_name: 0 for r in rules}
    if "기타" not in cType: cType["기타"] = 0
    
    total_rev = 0
    total_cnt = 0
    
    for r in results:
        s_date = str(r.checkup_date).strip()
        if s_date.endswith('.0'): s_date = s_date[:-2]
        
        y, m = 0, 0
        if len(s_date) == 8 and s_date.isdigit():
            y = int(s_date[:4])
            m = int(s_date[4:6]) - 1
        elif len(s_date) >= 10:
             if s_date[4] in ['-', '.', '/']:
                y = int(s_date[:4])
                m = int(s_date[5:7]) - 1
             else:
                y = int(s_date[:4])
                m = int(s_date[5:7]) - 1
        else: continue
            
        amt = r.total_price or 0
        total_rev += amt
        total_cnt += 1
        
        # Annual Stats
        if y not in cY: cY[y] = {'r': 0, 'c': 0}
        cY[y]['r'] += amt
        cY[y]['c'] += 1
        
        # Monthly Stats
        if y not in cM: cM[y] = {'r': [0]*12, 'c': [0]*12}
        if 0 <= m < 12: 
            cM[y]['r'][m] += amt
            cM[y]['c'][m] += 1
            
        # Package Stats
        if r.package_code:
            for p in r.package_code.split(','):
                p = p.strip()
                if p: cPkg[p] = (cPkg.get(p, 0)) + 1

        # Exam Type Classification
        c_check_type = (r.checkup_type or "").strip()
        found_key = "기타"
        if c_check_type: 
            for rule in rules:
                keywords = [k.strip() for k in rule.keywords.split(',') if k.strip()]
                match = False
                for k in keywords:
                    if k in c_check_type:
                        match = True
                        break
                if match:
                    found_key = rule.category_name
                    break
        cType[found_key] += 1
    
    # Calculate Avg Price per Year
    for y, d in cY.items():
        d['avg'] = int(d['r'] / d['c']) if d['c'] > 0 else 0

    # Demographics
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

    avg_price_total = int(total_rev / total_cnt) if total_cnt > 0 else 0

    return {
        "summary": {"rev": total_rev, "cnt": total_cnt, "avg_price": avg_price_total, "max_age": max_age_group},
        "annual": cY,
        "monthly": cM,
        "packages": cPkg,
        "exam_types": cType,
        "demographics": cDemo
    }

class ExamRuleDTO(BaseModel):
    category_name: str
    keywords: str
    priority: int

@app.get("/api/exam-types")
def get_exam_types(db: Session = Depends(get_db)):
    """DB에 존재하는 검진종류(checkup_type)를 쉼표로 분리하여 고유 키워드 목록 반환"""
    types = db.query(distinct(Checkup.checkup_type)).all()
    unique_keywords = set()
    for t in types:
        if t[0]:
            # Split by comma and strip
            parts = [k.strip() for k in t[0].split(',')]
            for p in parts:
                if p: unique_keywords.add(p)
    
    return sorted(list(unique_keywords))

@app.get("/api/config/exam-rules")
def get_exam_rules(db: Session = Depends(get_db)):
    # Ensure table exists
    Base.metadata.create_all(bind=engine)
    
    rules = db.query(ExamRule).order_by(ExamRule.priority).all()
    if not rules:
        # Seed Defaults (Modified per user request)
        defaults = [
            ExamRule(category_name="종합검진", keywords="종합", priority=1),
            ExamRule(category_name="기업검진", keywords="기업,채용", priority=2),
            ExamRule(category_name="특수검진", keywords="특수", priority=3),
            ExamRule(category_name="공단검진", keywords="공단,일반,생활", priority=4),
            ExamRule(category_name="기타", keywords="추가,기타", priority=99)
        ]
        db.add_all(defaults)
        db.commit()
        rules = defaults
    return rules

@app.post("/api/config/exam-rules")
def update_exam_rules(rules: List[ExamRuleDTO], db: Session = Depends(get_db)):
    # Clear existing
    db.query(ExamRule).delete()
    # Insert new
    new_rules = [
        ExamRule(category_name=r.category_name, keywords=r.keywords, priority=r.priority)
        for r in rules
    ]
    db.add_all(new_rules)
    db.commit()
    return {"status": "success"}

class ConfigSyncDTO(BaseModel):
    maps: List[CompanyMapDTO]
    excludes: List[str]

@app.post("/api/config/sync")
def sync_config(dto: ConfigSyncDTO, db: Session = Depends(get_db)):
    """
    Company Map/Exclude 일괄 동기화
    1. Update Maps: Delete all maps and re-insert
    2. Update Excludes: Delete all excludes and re-insert
    """
    try:
        # 1. Maps
        db.query(CompanyMap).delete()
        if dto.maps:
            new_maps = [
                CompanyMap(original_name=m.original_name, standard_name=m.standard_name) 
                for m in dto.maps
            ]
            db.add_all(new_maps)

        # 2. Excludes
        db.query(CompanyExclude).delete()
        if dto.excludes:
            new_excl = [CompanyExclude(company_name=e) for e in dto.excludes]
            db.add_all(new_excl)
            
        db.commit()
        return {"status": "synced"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------------------------------------
# [NEW] Period Analysis Endpoint
# ---------------------------------------------------------
@app.get("/api/stats/period")
def get_period_stats(
    start_date: str, 
    end_date: str,
    ignore_exclude: bool = False,
    db: Session = Depends(get_db)
):
    """
    특정 기간(start_date ~ end_date) 동안의 통계
    - Dynamic Exam Classification based on ExamRule
    """
    # Create tables if not exist (fail-safe for ExamRule)
    Base.metadata.create_all(bind=engine)

    company_expr = func.coalesce(CompanyMap.standard_name, Checkup.company_name).label("final_name")
    
    # [GLOBAL FILTER] Fetch Excludes from DB
    db_excludes = [r.company_name for r in db.query(CompanyExclude).all()]

    # 1. Base Query
    q = db.query(
        Checkup.checkup_type,
        company_expr.label('company_name'),
        Checkup.total_price
    ).outerjoin(CompanyMap, Checkup.company_name == CompanyMap.original_name)\
     .filter(Checkup.checkup_date >= start_date)\
     .filter(Checkup.checkup_date <= end_date)
     
    if db_excludes and not ignore_exclude:
        q = q.filter(company_expr.not_in(db_excludes))
     
    rows = q.all()
    
    # Fetch Classification Rules
    rules = db.query(ExamRule).order_by(ExamRule.priority).all()
    if not rules:
        # Fallback in memory if DB empty and not auto-seeded yet
         rules = [
            ExamRule(category_name="종합검진", keywords="종합", priority=1),
            ExamRule(category_name="기타", keywords="", priority=99)
         ]

    total_count = 0
    total_amount = 0
    by_type = {}
    by_biz = {}
    
    # Initialize buckets (to ensure order in JSON if frontend relies on keys)
    for r in rules:
        by_type[r.category_name] = {"count": 0, "amount": 0}
    if "기타" not in by_type: by_type["기타"] = {"count": 0, "amount": 0}
        
    for r in rows:
        amt = r.total_price or 0
        total_count += 1
        total_amount += amt
        
        # Type Aggregation
        c_type = (r.checkup_type or "").strip()
        
        found_key = "기타"
        if c_type: 
            for rule in rules:
                keywords = [k.strip() for k in rule.keywords.split(',') if k.strip()]
                match = False
                for k in keywords:
                    if k in c_type:
                        match = True
                        break
                if match:
                    found_key = rule.category_name
                    break
        
        if found_key not in by_type: by_type[found_key] = {"count": 0, "amount": 0}
        by_type[found_key]["count"] += 1
        by_type[found_key]["amount"] += amt
        
        # Company Aggregation
        c_name = r.company_name or "미지정"
        if c_name not in by_biz: by_biz[c_name] = {"count": 0, "amount": 0}
        by_biz[c_name]["count"] += 1
        by_biz[c_name]["amount"] += amt
        
    # Sort Biz by amount desc
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
    사업장(Company) 유지/이탈 분석 (Company Retention)
    - Threshold: Analyzed Year Revenue > 5,000,000 KRW
    """
    sorted_years = sorted(years)
    if not sorted_years:
        return {"waterfall": {}, "details": {}, "years": []}

    # Fetch (Min Year - 1) ~ Max Year to enable calculation for the first selected year
    min_y = min(sorted_years)
    max_y = max(sorted_years)
    target_years = [str(y) for y in range(min_y - 1, max_y + 1)]

    # Query Company Revenue by Year
    company_expr = func.coalesce(CompanyMap.standard_name, Checkup.company_name).label("name")
    
    q = db.query(
        func.substr(Checkup.checkup_date, 1, 4).label("year"),
        company_expr,
        func.sum(Checkup.total_price).label("rev")
    ).outerjoin(CompanyMap, Checkup.company_name == CompanyMap.original_name)\
     .filter(func.substr(Checkup.checkup_date, 1, 4).in_(target_years))\
     .group_by("year", company_expr)
     
    rows = q.all()
    
    # Organize Data: full_data[year][name] = revenue
    full_data = {} 
    for r in rows:
        y = int(r.year)
        name = r.name or "미지정"
        rev = int(r.rev or 0)
        
        if y not in full_data: full_data[y] = {}
        full_data[y][name] = rev
        
    threshold = 5000000 
    
    waterfall = {}
    details = {} 
    
    # Calculate Metrics for Selected Years
    for y in sorted_years:
        prev_y = y - 1
        
        curr_map = full_data.get(y, {})
        prev_map = full_data.get(prev_y, {})
        
        # Valid Companies (Above Threshold)
        curr_set = {k for k, v in curr_map.items() if v > threshold}
        prev_set = {k for k, v in prev_map.items() if v > threshold}
        
        maintained = list(curr_set & prev_set)
        
        # New & Churn with Amounts
        new_comps = [{"name": c, "val": curr_map[c]} for c in (curr_set - prev_set)]
        churn_comps = [{"name": c, "val": prev_map[c]} for c in (prev_set - curr_set)]
        
        # Revenue Change for Maintained
        up = []
        down = []
        for c in maintained:
            curr_r = curr_map.get(c, 0)
            prev_r = prev_map.get(c, 0)
            if curr_r > prev_r: up.append({"name": c, "diff": curr_r - prev_r, "val": curr_r})
            elif curr_r < prev_r: down.append({"name": c, "diff": curr_r - prev_r, "val": curr_r})
            
        # Sort Lists
        new_comps.sort(key=lambda x: x['val'], reverse=True)
        churn_comps.sort(key=lambda x: x['val'], reverse=True)
        up.sort(key=lambda x: x['diff'], reverse=True) 
        down.sort(key=lambda x: x['diff'])             
        
        details[y] = {
            "new": new_comps,
            "churn": churn_comps,
            "up": up,
            "down": down
        }
        
        waterfall[y] = {
            "new": len(new_comps),
            "churn": len(churn_comps),
            "retained": len(maintained)
        }
        
    return {
        "waterfall": waterfall,
        "details": details,
        "years": sorted_years,
        "stickiness": [], # Legacy
        "total_users": 0  # Legacy
    }

@app.get("/api/stats/revisit/person")
def get_revisit_person_stats(db: Session = Depends(get_db)):
    # 1. Fetch Key Identity Data (LifeCode, ResidentNo) and CheckupDate from all checkups
    #    (Assuming 1 checkup per year per person is the rule, we extract Year)
    
    # We need to join Patient to get life_code/resident_no if not in Checkup (Wait, Checkup has patient_id)
    # Models: Checkup -> patient_id -> Patient(life_code, resident_no)
    
    # Selecting relevant columns
    results = db.query(
        Patient.life_code, 
        Patient.resident_no, 
        func.substr(Checkup.checkup_date, 1, 4).label("year")
    ).join(Patient, Checkup.patient_id == Patient.id).distinct().all()
    
    # 2. Process in Python
    person_years = defaultdict(set)
    for lc, rn, y in results:
        if not y: continue
        try:
            y_int = int(y)
            pid = f"{lc}_{rn}" # Unique Person ID
            person_years[pid].add(y_int)
        except ValueError:
            # Handle cases where year is not a valid integer
            continue
            
    # 3. Analyze Frequency
    # Distribution of N-year visitors (How many people visited N distinct years?)
    # And Biennial patterns
    
    freq_dist = defaultdict(int) # {1: count, 2: count, ...}
    biennial_count = 0
    total_people = len(person_years)
    
    # Define Biennial Logic: 
    # "Visiting every other year" - e.g. 2021, 2023, 2025...
    # Strict definition: Gaps of exactly 2 years? Or just "Average gap ~2"?
    # User said: "격년으로 방문하는 사람" (People visiting biennially).
    # Simple heuristic: Check if sorted years have gaps of 2 frequently.
    # OR: people who have visited multiple times but NOT consecutively?
    # Let's count people who have at least one gap of 2 years and NO gap of 1 year? 
    # Or just people with pattern 2021, 2023?
    # Let's try: If 50% or more of their gaps are >= 2 ?
    # Let's stick to a simpler logic for now: "Users with at least one 2-year gap" or "Users who visited >1 times and never consecutive years".
    # User Requirement: "2개년도 3개년도... 방문자 수를 체크하고 격년으로 방문하는 사람을 표현"
    # So "Consecutive Visitors" (Every year) vs "Biennial Visitors" (Every 2 years).
    
    for pid, years in person_years.items():
        count = len(years)
        freq_dist[count] += 1
        
        if count > 1:
            sorted_years = sorted(list(years))
            gaps = [sorted_years[i+1] - sorted_years[i] for i in range(len(sorted_years)-1)]
            
            # Biennial check: predominantly gaps of 2?
            # E.g. 2021, 2023 (gap 2). 
            # 2021, 2022, 2024 (gap 1, 2) -> Mixed.
            # Strict Biennial: All gaps are >= 2?
            # This identifies people who SKIP years regularly
            if all(g >= 2 for g in gaps):
                biennial_count += 1
                
    # 4. Yearly Retention Analysis
    year_pids = defaultdict(set)
    for pid, years in person_years.items():
        for y in years:
            year_pids[y].add(pid)
            
    sorted_years = sorted(year_pids.keys(), reverse=True)
    yearly_stats = []
    
    for y in sorted_years:
        curr_pids = year_pids[y]
        prev_pids = year_pids.get(y-1, set())
        
        retained = len(curr_pids & prev_pids)
        total = len(curr_pids)
        
        yearly_stats.append({
            "year": y,
            "total": total,
            "retained": retained,
            "retained_rate": round(retained / total * 100, 1) if total > 0 else 0
        })
        
    # Sort freq keys
    sorted_freq = dict(sorted(freq_dist.items()))
    
    return {
        "total_people": total_people,
        "biennial_visitors": biennial_count,
        "frequency_distribution": sorted_freq,
        "yearly_retention": yearly_stats
    }

# ---------------------------------------------------------
# [NEW] Config & Helper Endpoints
# ---------------------------------------------------------

@app.get("/api/company-list")
def get_all_companies(db: Session = Depends(get_db)):
    """DB에 존재하는 모든 회사명과 총 매출 반환 (매출순 정렬)"""
    try:
        # Use Standard Name if mapped, else Original Name
        company_expr = func.coalesce(CompanyMap.standard_name, Checkup.company_name).label("final_name")
        
        # Aggregate Revenue
        q = db.query(
            company_expr, 
            func.sum(Checkup.total_price).label("rev")
        ).outerjoin(CompanyMap, Checkup.company_name == CompanyMap.original_name)\
         .group_by(company_expr)
              
        rows = q.all()
        
        # Format & Sort
        data = [{"name": r[0] or "미지정", "rev": int(r[1] or 0)} for r in rows if r[0]]
        data.sort(key=lambda x: x['rev'], reverse=True)
        
        return data

    except Exception as e:
        print("CRITICAL ERROR in /api/company-list:", file=sys.stderr)
        print(traceback.format_exc(), file=sys.stderr)
        raise HTTPException(status_code=500, detail=str(e))

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
    return {"status": "synced", "maps": len(dto.maps), "excludes": len(dto.excludes), "message": "동기화 완료"}

# ---------------------------------------------------------
# 4. 데이터 관리 API (Settings & Upload)
# ---------------------------------------------------------

# 4-1. 사업장명 병합 규칙 관리
@app.get("/api/company-map")
def get_company_maps(db: Session = Depends(get_db)):
    try:
        rows = db.query(CompanyMap).all()
        return [{"original_name": m.original_name, "standard_name": m.standard_name} for m in rows]
    except Exception as e:
        print("ERROR in /api/company-map:", file=sys.stderr)
        print(traceback.format_exc(), file=sys.stderr)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/company-map")
def create_company_map(rule: CompanyMapCreate, db: Session = Depends(get_db)):
    try:
        existing = db.query(CompanyMap).filter(CompanyMap.original_name == rule.original_name).first()
        if existing:
            existing.standard_name = rule.standard_name
        else:
            db.add(CompanyMap(original_name=rule.original_name, standard_name=rule.standard_name))
        db.commit()
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/company-map")
def delete_company_map(original_name: str, db: Session = Depends(get_db)):
    try:
        db.query(CompanyMap).filter(CompanyMap.original_name == original_name).delete()
        db.commit()
        return {"message": "규칙이 삭제되었습니다"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 4-2. 제외 사업장 관리
@app.get("/api/company-exclude")
def get_excludes(db: Session = Depends(get_db)):
    try:
        rows = db.query(CompanyExclude).all()
        return [r.company_name for r in rows]
    except Exception as e:
        print("ERROR in /api/company-exclude:", file=sys.stderr)
        print(traceback.format_exc(), file=sys.stderr)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/settings/exclude")
def add_exclude(item: CompanyExcludeCreate, db: Session = Depends(get_db)):
    existing = db.query(CompanyExclude).filter(CompanyExclude.company_name == item.company_name).first()
    if not existing:
        new_exclude = CompanyExclude(company_name=item.company_name, memo=item.memo)
        db.add(new_exclude)
        db.commit()
    return {"message": "제외 항목이 추가되었습니다"}

@app.delete("/api/settings/exclude/{company_name}")
def delete_exclude(company_name: str, db: Session = Depends(get_db)):
    item = db.query(CompanyExclude).filter(CompanyExclude.company_name == company_name).first()
    if not item:
        raise HTTPException(status_code=404, detail="항목을 찾을 수 없습니다")
    db.delete(item)
    db.commit()
    return {"message": "제외 항목이 삭제되었습니다"}

# 4-3. 파일 업로드 (DB 및 CSV)
@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    # 허용된 파일 확장자 확인
    if not (file.filename.endswith(".csv") or file.filename.endswith(".db")):
        raise HTTPException(status_code=400, detail=".csv 및 .db 파일만 업로드 가능합니다")
    
    # 저장 경로 설정 (현재 백엔드 디렉토리)
    file_location = f"./{file.filename}"
    
    # 파일 저장
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)
    
    return {"info": f"파일 '{file.filename}'이(가) '{file_location}'에 저장되었습니다"}
