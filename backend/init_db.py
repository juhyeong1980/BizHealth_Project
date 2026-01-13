import pandas as pd
import glob
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, Patient, Checkup, CheckupDetail, MedicalCode

# ---------------------------------------------------------
# [설정] DB 초기화
# ---------------------------------------------------------
if os.path.exists("healthcare.db"):
    os.remove("healthcare.db") # 기존 DB 삭제 후 재생성

engine = create_engine('sqlite:///healthcare.db')
Base.metadata.create_all(engine)
Session = sessionmaker(bind=engine)
session = Session()

# [유틸리티] 숫자 변환 (콤마, 따옴표 제거)
def parse_int(val):
    try:
        return int(str(val).replace(',', '').replace('"', '').split('.')[0])
    except:
        return 0

# [유틸리티] 날짜 변환 (YYYYMMDD -> YYYY-MM-DD)
def convert_date(val):
    s = str(val).strip()
    if len(s) == 8 and s.isdigit():
        return f"{s[:4]}-{s[4:6]}-{s[6:]}"
    return s

print("🚀 데이터베이스 구축을 시작합니다...")

# ---------------------------------------------------------
# [Step 1] 코드 마스터 등록 (code.csv)
# ---------------------------------------------------------
try:
    df_code = pd.read_csv('code.csv')
    df_code.columns = [c.strip() for c in df_code.columns]
    
    seen_code = set()
    codes_to_insert = []
    
    for _, row in df_code.iterrows():
        code = str(row['코드']).strip()
        if not code or code == 'nan' or code in seen_code: continue
        
        codes_to_insert.append(MedicalCode(
            code=code, 
            name=str(row['명칭']), 
            category=str(row['검진종류'])
        ))
        seen_code.add(code)
        
    session.bulk_save_objects(codes_to_insert)
    session.commit()
    print(f"✅ 검사 코드 {len(seen_code)}건 등록 완료")
except Exception as e:
    print(f"⚠️ 코드 파일 처리 중 오류: {e}")

# ---------------------------------------------------------
# [Step 2] 환자 및 검진 내역 등록 (csv2021 ~ 2025)
# ---------------------------------------------------------
csv_files = sorted(glob.glob("csv20*.csv"))
patient_cache = {} # 속도 최적화용 캐시

for file in csv_files:
    print(f"📂 {file} 분석 및 저장 중...")
    try:
        df = pd.read_csv(file)
        df.columns = [c.strip() for c in df.columns]
        
        for _, row in df.iterrows():
            lc = str(row['LifeCode']).strip()
            rn = str(row['주민번호']).strip()
            if lc.endswith('.0'): lc = lc[:-2]
            
            if not lc or lc == 'nan' or not rn or rn == 'nan': continue
            
            # 1. 환자 식별 (LifeCode + 주민번호)
            key = (lc, rn)
            if key not in patient_cache:
                p = session.query(Patient).filter_by(life_code=lc, resident_no=rn).first()
                if not p:
                    p = Patient(
                        life_code=lc, 
                        resident_no=rn, 
                        name=str(row.get('성명', row.get('가족성명', ''))),
                        gender=str(row.get('성별', ''))
                    )
                    session.add(p)
                    session.flush() # ID 생성
                patient_cache[key] = p.id
            
            p_id = patient_cache[key]
            
            # 2. 검진 접수 등록
            receipt = str(row['접수번호']).strip()
            # 중복 접수 방지
            if session.query(Checkup).filter_by(receipt_no=receipt).first(): continue

            checkup = Checkup(
                receipt_no=receipt,
                patient_id=p_id,
                
                # 날짜 및 패키지 정보
                checkup_date=convert_date(row.get('검진일', '')),
                package_name=str(row.get('패키지', '')),
                package_code=str(row.get('패키지코드', '')),
                send_type=str(row.get('발송구분', '')),
                remarks=str(row.get('비고', '')),
                
                # 통계용 정보
                age=parse_int(row.get('나이', 0)),
                company_name=str(row.get('거래처명', '')),
                department=str(row.get('부서', '')),
                checkup_type=str(row.get('검진종류', '')),
                
                # 금액 정보
                total_price=parse_int(row.get('검사금액', 0)),
                user_price=parse_int(row.get('본인금액', 0)),
                corp_price=parse_int(row.get('회사금액', 0)),
                nhis_price=parse_int(row.get('공단금액', 0))
            )
            session.add(checkup)
            
            # 3. 상세 내역 등록 (핵심 로직 변경!)
            # '검진항목메모'와 '패키지코드' 양쪽에서 코드를 긁어모읍니다.
            codes_to_add = set()
            
            # (A) 검진항목메모 파싱
            memo = str(row.get('검진항목메모', ''))
            if memo and memo != 'nan':
                for c in memo.split(','):
                    if c.strip(): codes_to_add.add(c.strip())
            
            # (B) 패키지코드 파싱 (추가된 부분)
            pkg_code_val = str(row.get('패키지코드', ''))
            if pkg_code_val and pkg_code_val != 'nan':
                for c in pkg_code_val.split(','): # 콤마로 연결된 코드들 분리
                    if c.strip(): codes_to_add.add(c.strip())
            
            # 중복 제거된 코드들을 DB에 저장
            for code in codes_to_add:
                session.add(CheckupDetail(receipt_no=receipt, medical_code=code))
        
        session.commit() # 파일 하나 끝날 때마다 커밋

    except Exception as e:
        print(f"⚠️ {file} 오류 발생: {e}")
        session.rollback()

print("🎉 모든 데이터 변환 완료! 이제 패키지 코드까지 완벽하게 통계에 잡힙니다.")