# models.py
from sqlalchemy import Column, String, Integer, ForeignKey, UniqueConstraint, Text
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()

# 1. 환자 정보 (기본 정보 + 성별)
class Patient(Base):
    __tablename__ = 'tb_patient'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    life_code = Column(String, nullable=False)
    resident_no = Column(String, nullable=False)
    name = Column(String)
    gender = Column(String(10)) 
    
    __table_args__ = (UniqueConstraint('life_code', 'resident_no', name='uix_identity'),)
    checkups = relationship("Checkup", back_populates="patient")

# 2. 검진 접수 (통계 및 상세 정보 대폭 추가)
class Checkup(Base):
    __tablename__ = 'tb_checkup'
    
    receipt_no = Column(String, primary_key=True)
    patient_id = Column(Integer, ForeignKey('tb_patient.id'))
    
    # [핵심 요청 항목]
    checkup_date = Column(String)     # 검진일 (YYYY-MM-DD 형식으로 변환 저장)
    package_name = Column(String)     # 패키지
    package_code = Column(String)     # 패키지코드
    send_type = Column(String)        # 발송구분
    remarks = Column(Text)            # 비고 (내용이 길 수 있으므로 Text 타입)
    
    # [통계 분석용]
    age = Column(Integer)
    company_name = Column(String)
    department = Column(String)
    checkup_type = Column(String)     # 검진종류
    
    # [금액]
    total_price = Column(Integer, default=0)
    user_price = Column(Integer, default=0)
    corp_price = Column(Integer, default=0)
    nhis_price = Column(Integer, default=0)
    
    patient = relationship("Patient", back_populates="checkups")
    details = relationship("CheckupDetail", back_populates="checkup")

# 3. 검진 상세
class CheckupDetail(Base):
    __tablename__ = 'tb_checkup_detail'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    receipt_no = Column(String, ForeignKey('tb_checkup.receipt_no'))
    medical_code = Column(String)
    
    checkup = relationship("Checkup", back_populates="details")

# 4. 검사 코드 마스터
class MedicalCode(Base):
    __tablename__ = 'tb_medical_code'
    code = Column(String, primary_key=True)
    name = Column(String)
    category = Column(String)

# 1. 사업장명 매핑 (예: "삼성전자" -> "Samsung Electronics")
class CompanyMap(Base):
    __tablename__ = 'tb_company_map'
    
    original_name = Column(String, primary_key=True) # 원본 (CSV에 적힌 이름)
    standard_name = Column(String, nullable=False)   # 표준 이름 (통계용)
    memo = Column(Text)

# 2. 코드 변경 매핑 (예: "G0012" -> "G0012-A")
class CodeMap(Base):
    __tablename__ = 'tb_code_map'
    
    old_code = Column(String, primary_key=True)      # 과거 코드
    new_code = Column(String, nullable=False)        # 현재 표준 코드
    description = Column(String)

# 3. 데이터 수동 보정 (특정 접수번호의 데이터를 강제 수정)
class DataCorrection(Base):
    __tablename__ = 'tb_data_correction'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    receipt_no = Column(String, nullable=False)      # 접수번호
    field_name = Column(String, nullable=False)      # 수정할 항목 (예: department)
    correct_value = Column(String, nullable=False)   # 올바른 값
    reason = Column(String)                          # 수정 사유

# 4. 회사 제외 목록 (통계 제외)
class CompanyExclude(Base):
    __tablename__ = 'tb_company_exclude'
    
    company_name = Column(String, primary_key=True)
    memo = Column(Text)