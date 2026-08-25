# -*- coding: utf-8 -*-
import json

def stage_history(stages_with_offsets, base_iso):
    # stages_with_offsets: list of (stage, minutes_after_base)
    from datetime import datetime, timedelta
    base = datetime.fromisoformat(base_iso)
    out = []
    for stage, mins in stages_with_offsets:
        t = base + timedelta(minutes=mins)
        out.append({"stage": stage, "at": t.strftime("%Y-%m-%dT%H:%M:00")})
    return out

def loss_history(years, claims, incurred, largest, premium):
    """과거 손해 이력 — 빈도(건수)·심도(금액)·손해율. 전부 더미."""
    return {
        "observedYears": years,
        "claimCount": claims,
        "avgClaimsPerYear": round(claims / years, 2) if years else 0,
        "totalIncurredKRW": incurred,
        "avgSeverityKRW": round(incurred / claims) if claims else 0,
        "largestLossKRW": largest,
        "earnedPremiumKRW": premium,
        "lossRatioPercent": round(incurred / premium * 100, 1) if premium else 0,
    }

def contract(policyNumber, product, policyholder, start, end, status,
             held, sharePct, sumInsured, lol, perBuilding, perPerson, perOccurrence,
             deductible, reins, pastLoss, coinsurance, uw_name, uw_phone, uw_email,
             isNew=False, sinceYear=None, renewalCount=0, lossHistory=None):
    return {
        "policyNumber": policyNumber,
        "product": product,
        "policyholder": policyholder,
        "policyPeriod": {"start": start, "end": end},
        "status": status,
        "samsungShare": {"held": held, "percentOfTotalPremium": sharePct},
        "sumInsured": sumInsured,
        "lol": lol,
        "coverage": {"perBuilding": perBuilding, "perPerson": perPerson, "perOccurrence": perOccurrence},
        "coinsurance": coinsurance,
        "deductible": deductible,
        "reinsuranceCededPercent": reins,
        "pastLossCount": pastLoss,
        "contractType": {"isNew": isNew, "sinceYear": sinceYear, "renewalCount": renewalCount},
        "lossHistory": lossHistory,
        "underwriter": {"name": uw_name, "phone": uw_phone, "email": uw_email},
    }

def alert_log(at, name, email):
    """담당 언더라이터에게 알림이 나간 기록 (더미)."""
    return [{"at": at, "text": f"{name}({email})에게 알림 발송됨"}]

def incident(id, occurredAt, title, itype, industry, address, region, lat, lng,
             dead, injured, missing, lossType, estimatedLossKRW, damageNote,
             stage, history, sourceNote, entityName, bizRegNo,
             matched, confidence, contracts, reviewed=False, reviewedBy=None, reviewedAt=None,
             assignedTo=None, notes=None, alertSent=False, alertLog=None,
             lifecycle=None, country="KR"):
    return {
        "id": id,
        "country": country,          # "KR" | "US" — 지도 전환 단위
        "occurredAt": occurredAt,
        "title": title,
        "type": itype,
        "industry": industry,
        "location": {"address": address, "region": region, "lat": lat, "lng": lng},
        "casualties": {"dead": dead, "injured": injured, "missing": missing},
        "propertyDamage": {"lossType": lossType, "estimatedLossKRW": estimatedLossKRW, "note": damageNote},
        "responseStage": stage,
        "stageHistory": history,
        "sourceNote": sourceNote,
        "relatedEntity": {"name": entityName, "bizRegNo": bizRegNo},
        "samsungMatch": {"matched": matched, "confidence": confidence, "contracts": contracts},
        # 조치완료 + (연관건이면) 보험금 지급완료 => 종결. 종결되면 지도/피드에서 빠지고 이력에만 남는다.
        "lifecycle": lifecycle or {
            "actionCompleted": False, "actionCompletedAt": None,
            "claimPaid": False, "claimPaidAt": None, "claimAmountKRW": None,
        },
        "workflow": {
            "reviewed": reviewed, "reviewedBy": reviewedBy, "reviewedAt": reviewedAt,
            "assignedTo": assignedTo, "notes": notes or [], "alertSent": alertSent,
            "alertLog": alertLog or [],
        },
    }

incidents = []

# 1. Incheon logistics warehouse fire (matched, coinsured)
incidents.append(incident(
    id="INC-20260817-01",
    occurredAt="2026-08-17T03:12:00",
    title="인천 서구 정왕물류센터 화재",
    itype="화재", industry="물류창고",
    address="인천광역시 서구 정왕대로 128", region="인천광역시", lat=37.5326, lng=126.6392,
    dead=2, injured=11, missing=0,
    lossType="전손 추정", estimatedLossKRW=48000000000, damageNote="지상 4층 냉동·냉장 물류동 전소, 인접 사무동 일부 소실",
    stage="후속조치", history=stage_history([
        ("신고접수", 0), ("소방출동", 4), ("진압중", 25), ("진화완료", 260), ("현장통제", 300), ("원인조사", 1440), ("후속조치", 4320),
    ], "2026-08-17T03:12:00"),
    sourceNote="연합뉴스(더미)", entityName="㈜정왕로지스틱스", bizRegNo="128-81-4XXXX",
    matched=True, confidence="높음",
    contracts=[
        contract("SF-2026-FR-118820", "화재보험(재산종합)", "㈜정왕로지스틱스",
                 "2026-03-01", "2027-02-28", "유효",
                 True, 45, 52000000000, 52000000000, 30000000000, None, 52000000000,
                 500000000, 20, 3,
                 [{"company": "삼성화재", "percent": 45}, {"company": "DB손해보험", "percent": 35}, {"company": "현대해상", "percent": 20}],
                 "송규석 프로", "02-1234-5601", "gyuseok.song@dummy-samsungfire.example",
                 sinceYear=2018, renewalCount=8,
                 lossHistory=loss_history(8, 3, 820000000, 510000000, 2450000000)),
    ],
    alertSent=True,
    alertLog=alert_log("2026-08-17T03:41:00", "송규석 프로", "gyuseok.song@dummy-samsungfire.example"),
))

# 2. Seoul overpass collapse (matched, liability)
incidents.append(incident(
    id="INC-20260819-02",
    occurredAt="2026-08-19T14:47:00",
    title="서울 서소문고가차도 상판 붕괴",
    itype="붕괴", industry="교량/토목시설",
    address="서울특별시 중구 서소문로 인근 고가차도", region="서울특별시", lat=37.5595, lng=126.9669,
    dead=1, injured=6, missing=0,
    lossType="분손", estimatedLossKRW=3200000000, damageNote="상판 약 40m 구간 붕괴, 차량 3대 매몰",
    stage="구조/수습", history=stage_history([
        ("신고접수", 0), ("소방·구조대출동", 3), ("구조/수습", 40), ("교통통제", 45), ("정밀안전진단", 720),
    ], "2026-08-19T14:47:00"),
    sourceNote="YTN (더미)", entityName="서울시설공단", bizRegNo="-",
    matched=True, confidence="중간",
    contracts=[
        contract("SF-2025-CL-330441", "시설물배상책임보험", "서울시설공단",
                 "2025-11-01", "2026-10-31", "유효",
                 True, 100, 10000000000, 10000000000, None, 500000000, 10000000000,
                 100000000, 0, 0,
                 [{"company": "삼성화재", "percent": 100}],
                 "송채원 프로", "02-1234-5622", "chaewon.song@dummy-samsungfire.example",
                 sinceYear=2015, renewalCount=11,
                 lossHistory=loss_history(11, 0, 0, 0, 3300000000)),
    ],
    alertSent=True,
    alertLog=alert_log("2026-08-19T15:02:00", "송채원 프로", "chaewon.song@dummy-samsungfire.example"),
))

# 3. Geoje shipyard flood (matched, held small share)
incidents.append(incident(
    id="INC-20260820-03",
    occurredAt="2026-08-20T06:05:00",
    title="거제 장평산단 조선기자재 공장 침수",
    itype="수재", industry="제조공장",
    address="경상남도 거제시 장평동 산업단지", region="경상남도", lat=34.8806, lng=128.6212,
    dead=0, injured=2, missing=0,
    lossType="분손(추정중)", estimatedLossKRW=8500000000, damageNote="집중호우로 1층 생산설비 침수, 원자재 재고 손실",
    stage="피해조사", history=stage_history([
        ("호우특보", -180), ("침수신고", 0), ("배수작업", 20), ("응급복구", 300), ("피해조사", 1200),
    ], "2026-08-20T06:05:00"),
    sourceNote="경남신문 (더미)", entityName="㈜거제마린텍", bizRegNo="616-81-2XXXX",
    matched=True, confidence="높음",
    contracts=[
        contract("SF-2026-PK-552091", "재산종합보험(패키지)", "㈜거제마린텍",
                 "2026-05-15", "2027-05-14", "유효",
                 True, 30, 15000000000, 15000000000, 15000000000, None, 15000000000,
                 300000000, 15, 2,
                 [{"company": "삼성화재", "percent": 30}, {"company": "메리츠화재", "percent": 40}, {"company": "KB손해보험", "percent": 30}],
                 "김민석 프로", "02-1234-5633", "minseok.kim@dummy-samsungfire.example",
                 sinceYear=2021, renewalCount=5,
                 lossHistory=loss_history(5, 2, 460000000, 380000000, 910000000)),
    ],
    alertSent=True,
    alertLog=alert_log("2026-08-20T06:22:00", "김민석 프로", "minseok.kim@dummy-samsungfire.example"),
))

# 4. Hwaseong industrial complex fire (not matched)
incidents.append(incident(
    id="INC-20260821-04",
    occurredAt="2026-08-21T22:30:00",
    title="화성 향남산단 정밀부품 공장 화재",
    itype="화재", industry="제조공장",
    address="경기도 화성시 향남읍 산업단지", region="경기도", lat=37.1998, lng=126.8312,
    dead=0, injured=1, missing=0,
    lossType="분손", estimatedLossKRW=2100000000, damageNote="생산동 일부 소실",
    stage="진화완료", history=stage_history([
        ("신고접수", 0), ("소방출동", 5), ("진압중", 30), ("진화완료", 95),
    ], "2026-08-21T22:30:00"),
    sourceNote="뉴시스 (더미)", entityName="㈜향남프리시전", bizRegNo="128-86-1XXXX",
    matched=False, confidence="낮음", contracts=[],
))

# 5. Yeosu chemical plant explosion (matched, held, high LOL)
incidents.append(incident(
    id="INC-20260822-05",
    occurredAt="2026-08-22T11:18:00",
    title="여수국가산단 화학물질 저장탱크 폭발",
    itype="폭발", industry="화학공장",
    address="전라남도 여수시 화치동 여수국가산업단지", region="전라남도", lat=34.7604, lng=127.6622,
    dead=3, injured=14, missing=1,
    lossType="전손 추정", estimatedLossKRW=76000000000, damageNote="저장탱크 2기 폭발·화재, 인근 배관시설 손상",
    stage="진압/수습", history=stage_history([
        ("신고접수", 0), ("소방·화학구조대출동", 6), ("진압/수습", 50), ("주민대피", 55), ("환경영향조사", 1440),
    ], "2026-08-22T11:18:00"),
    sourceNote="MBC (더미)", entityName="㈜여수케미칼", bizRegNo="230-81-7XXXX",
    matched=True, confidence="높음",
    contracts=[
        contract("SF-2024-EN-770213", "기업종합위험보험(재물+배상)", "㈜여수케미칼",
                 "2026-01-01", "2026-12-31", "유효",
                 True, 20, 120000000000, 100000000000, 60000000000, 1000000000, 100000000000,
                 1000000000, 40, 3,
                 [{"company": "삼성화재", "percent": 20}, {"company": "코리안리(재보험)", "percent": 0},
                  {"company": "현대해상", "percent": 30}, {"company": "DB손해보험", "percent": 25}, {"company": "KB손해보험", "percent": 25}],
                 "원아현 프로", "02-1234-5644", "ahyeon.won@dummy-samsungfire.example",
                 sinceYear=2012, renewalCount=14,
                 lossHistory=loss_history(14, 3, 11200000000, 7800000000, 26800000000)),
    ],
))

# 6. Changwon construction site collapse (matched, industrial accident liability)
incidents.append(incident(
    id="INC-20260823-06",
    occurredAt="2026-08-23T09:40:00",
    title="창원 신축 물류센터 건설현장 붕괴",
    itype="붕괴", industry="건설현장",
    address="경상남도 창원시 성산구 신축공사장", region="경상남도", lat=35.2280, lng=128.6811,
    dead=1, injured=4, missing=0,
    lossType="분손", estimatedLossKRW=1800000000, damageNote="타설 중 거푸집 동바리 붕괴, 3층 슬라브 낙하",
    stage="수사/조사", history=stage_history([
        ("신고접수", 0), ("구조대출동", 4), ("구조작업", 60), ("공사중지명령", 200), ("수사/조사", 600),
    ], "2026-08-23T09:40:00"),
    sourceNote="경남도민일보 (더미)", entityName="㈜대성건설", bizRegNo="609-81-9XXXX",
    matched=True, confidence="중간",
    contracts=[
        contract("SF-2026-CR-441002", "건설공사보험(CAR)", "㈜대성건설",
                 "2026-02-01", "2027-08-31", "유효",
                 True, 60, 22000000000, 22000000000, None, 300000000, 22000000000,
                 200000000, 10, 0,
                 [{"company": "삼성화재", "percent": 60}, {"company": "한화손해보험", "percent": 40}],
                 "손예진 프로", "02-1234-5655", "yejin.son@dummy-samsungfire.example",
                 isNew=True),
    ],
    alertSent=True,
    alertLog=alert_log("2026-08-23T09:55:00", "손예진 프로", "yejin.son@dummy-samsungfire.example"),
))

# 7. Daegu apartment fire (not matched)
incidents.append(incident(
    id="INC-20260824-07",
    occurredAt="2026-08-24T01:55:00",
    title="대구 수성구 아파트 지하주차장 화재",
    itype="화재", industry="공동주택",
    address="대구광역시 수성구 아파트 단지", region="대구광역시", lat=35.8714, lng=128.6014,
    dead=0, injured=8, missing=0,
    lossType="분손", estimatedLossKRW=950000000, damageNote="지하 1층 주차 차량 다수 소실, 연기 흡입 환자 다수",
    stage="후속조치", history=stage_history([
        ("신고접수", 0), ("소방출동", 5), ("진압중", 35), ("진화완료", 80), ("후속조치", 600),
    ], "2026-08-24T01:55:00"),
    sourceNote="대구MBC (더미)", entityName="OO아파트 입주자대표회의", bizRegNo="-",
    matched=False, confidence="낮음", contracts=[],
))

# 8. Pyeongchang tour bus rollover (not matched)
incidents.append(incident(
    id="INC-20260824-08",
    occurredAt="2026-08-24T16:20:00",
    title="평창 국도 관광버스 전도 사고",
    itype="교통사고", industry="여객운송",
    address="강원특별자치도 평창군 국도변", region="강원특별자치도", lat=37.3799, lng=128.3902,
    dead=0, injured=17, missing=0,
    lossType="해당없음", estimatedLossKRW=None, damageNote="커브길 빗길 미끄러짐으로 버스 전도, 다수 경상",
    stage="후속조치", history=stage_history([
        ("신고접수", 0), ("구급대출동", 6), ("구조/이송", 50), ("현장정리", 120),
    ], "2026-08-24T16:20:00"),
    sourceNote="강원일보 (더미)", entityName="OO관광 여객운송", bizRegNo="-",
    matched=False, confidence="낮음", contracts=[],
))

# 9. Pohang typhoon flooding (matched, coinsured, business interruption)
incidents.append(incident(
    id="INC-20260825-09",
    occurredAt="2026-08-25T04:30:00",
    title="포항 철강산단 태풍 침수 피해",
    itype="수재", industry="제조공장",
    address="경상북도 포항시 남구 철강산업단지", region="경상북도", lat=36.0190, lng=129.3435,
    dead=0, injured=0, missing=0,
    lossType="분손(추정중)", estimatedLossKRW=32000000000, damageNote="태풍 북상에 따른 폭우로 압연설비 침수, 가동 중단",
    stage="대응단계", history=stage_history([
        ("태풍특보", -360), ("침수신고", 0), ("배수/응급조치", 40), ("대응단계", 100),
    ], "2026-08-25T04:30:00"),
    sourceNote="포항MBC (더미)", entityName="㈜포항스틸웍스", bizRegNo="504-81-3XXXX",
    matched=True, confidence="높음",
    contracts=[
        contract("SF-2026-PK-118804", "재산종합보험(기업휴지 포함)", "㈜포항스틸웍스",
                 "2026-04-01", "2027-03-31", "유효",
                 True, 25, 90000000000, 90000000000, 90000000000, None, 90000000000,
                 1000000000, 30, 4,
                 [{"company": "삼성화재", "percent": 25}, {"company": "현대해상", "percent": 25},
                  {"company": "DB손해보험", "percent": 25}, {"company": "메리츠화재", "percent": 25}],
                 "이지훈 프로", "02-1234-5666", "jihoon.lee@dummy-samsungfire.example",
                 sinceYear=2016, renewalCount=10,
                 lossHistory=loss_history(10, 4, 9600000000, 6100000000, 15200000000)),
    ],
))

# 10. Cheongju commercial building partial collapse (matched, expired contract case)
incidents.append(incident(
    id="INC-20260825-10",
    occurredAt="2026-08-25T08:15:00",
    title="청주 상당구 노후 상가건물 외벽 붕괴",
    itype="붕괴", industry="상업시설",
    address="충청북도 청주시 상당구 상가건물", region="충청북도", lat=36.6424, lng=127.4890,
    dead=0, injured=3, missing=0,
    lossType="분손", estimatedLossKRW=420000000, damageNote="4층 건물 외벽 일부 낙하",
    stage="구조/수습", history=stage_history([
        ("신고접수", 0), ("소방출동", 5), ("구조/수습", 30), ("정밀진단", 300),
    ], "2026-08-25T08:15:00"),
    sourceNote="충청리뷰 (더미)", entityName="㈜상당스퀘어", bizRegNo="301-81-5XXXX",
    matched=True, confidence="낮음(계약만기 후 재검토 필요)",
    contracts=[
        contract("SF-2024-BD-990112", "건물종합보험", "㈜상당스퀘어",
                 "2024-09-01", "2025-08-31", "만기",
                 True, 50, 4000000000, 4000000000, 4000000000, None, 4000000000,
                 50000000, 0, 2,
                 [{"company": "삼성화재", "percent": 50}, {"company": "롯데손해보험", "percent": 50}],
                 "서우인 프로", "02-1234-5677", "wooin.seo@dummy-samsungfire.example",
                 sinceYear=2020, renewalCount=4,
                 lossHistory=loss_history(5, 2, 110000000, 70000000, 180000000)),
    ],
))

# 11. Jeonju market fire (not matched)
incidents.append(incident(
    id="INC-20260825-11",
    occurredAt="2026-08-25T05:50:00",
    title="전주 재래시장 점포 화재",
    itype="화재", industry="상업시설",
    address="전북특별자치도 전주시 재래시장", region="전북특별자치도", lat=35.8242, lng=127.1480,
    dead=0, injured=0, missing=0,
    lossType="분손", estimatedLossKRW=180000000, damageNote="점포 3칸 소실",
    stage="진화완료", history=stage_history([
        ("신고접수", 0), ("소방출동", 7), ("진압중", 25), ("진화완료", 60),
    ], "2026-08-25T05:50:00"),
    sourceNote="전주MBC (더미)", entityName="개인 점포주 다수", bizRegNo="-",
    matched=False, confidence="낮음", contracts=[],
))

# 12. Dangjin substation fire (matched, energy infra)
incidents.append(incident(
    id="INC-20260825-12",
    occurredAt="2026-08-25T02:05:00",
    title="당진 화력발전 변전설비 화재",
    itype="화재", industry="발전/에너지",
    address="충청남도 당진시 발전단지", region="충청남도", lat=36.8930, lng=126.6280,
    dead=0, injured=1, missing=0,
    lossType="분손(추정중)", estimatedLossKRW=6700000000, damageNote="변압기 1기 소손, 일부 발전블록 가동중단",
    stage="원인조사", history=stage_history([
        ("신고접수", 0), ("소방출동", 8), ("진압중", 40), ("진화완료", 90), ("원인조사", 400),
    ], "2026-08-25T02:05:00"),
    sourceNote="연합뉴스 (더미)", entityName="㈜당진파워", bizRegNo="312-81-6XXXX",
    matched=True, confidence="중간",
    contracts=[
        contract("SF-2025-EG-330771", "재산종합보험(발전설비)", "㈜당진파워",
                 "2025-12-01", "2026-11-30", "유효",
                 True, 35, 200000000000, 150000000000, 150000000000, None, 150000000000,
                 2000000000, 50, 6,
                 [{"company": "삼성화재", "percent": 35}, {"company": "코리안리(재보험)", "percent": 0},
                  {"company": "현대해상", "percent": 35}, {"company": "KB손해보험", "percent": 30}],
                 "신준용 프로", "02-1234-5688", "junyong.shin@dummy-samsungfire.example",
                 sinceYear=2009, renewalCount=17,
                 lossHistory=loss_history(17, 6, 18400000000, 9200000000, 61000000000)),
    ],
    alertSent=True,
    alertLog=alert_log("2026-08-25T02:31:00", "신준용 프로", "junyong.shin@dummy-samsungfire.example"),
))

# ---------------------------------------------------------------------------
# 대량 더미 사고 생성 — 지도를 채우고 날짜 필터를 쓸 수 있을 만큼의 물량.
# 시드를 고정해서 다시 돌려도 같은 결과가 나오게 한다.
# ---------------------------------------------------------------------------
import random
from datetime import datetime, timedelta

rng = random.Random(20260825)

# 17개 시도 전역 좌표 풀 (시군구 단위, 실제 대략 좌표)
SPOTS = [
    ("서울특별시", "강서구", 37.5590, 126.8300),
    ("서울특별시", "성동구", 37.5445, 127.0557),
    ("서울특별시", "금천구", 37.4790, 126.8827),
    ("부산광역시", "사상구", 35.1533, 128.9910),
    ("부산광역시", "강서구", 35.0960, 128.8560),
    ("부산광역시", "동구", 35.1160, 129.0420),
    ("대구광역시", "달서구", 35.8380, 128.5090),
    ("대구광역시", "북구", 35.9010, 128.5980),
    ("인천광역시", "남동구", 37.4020, 126.7180),
    ("인천광역시", "중구", 37.4600, 126.6200),
    ("광주광역시", "광산구", 35.1750, 126.7900),
    ("대전광역시", "대덕구", 36.4080, 127.4300),
    ("울산광역시", "남구", 35.5210, 129.3520),
    ("울산광역시", "동구", 35.5040, 129.4260),
    ("세종특별자치시", "전동면", 36.6260, 127.2800),
    ("경기도", "평택시", 36.9930, 126.8420),
    ("경기도", "안산시", 37.3040, 126.8300),
    ("경기도", "이천시", 37.2720, 127.4350),
    ("경기도", "파주시", 37.7130, 126.6980),
    ("경기도", "용인시", 37.2410, 127.1780),
    ("강원특별자치도", "원주시", 37.3180, 127.8180),
    ("강원특별자치도", "강릉시", 37.6120, 129.0350),
    ("강원특별자치도", "동해시", 37.4900, 129.1180),
    ("충청북도", "청주시", 36.7180, 127.4310),
    ("충청북도", "음성군", 36.9560, 127.5340),
    ("충청북도", "충주시", 36.9700, 127.9300),
    ("충청남도", "아산시", 36.7830, 127.0640),
    ("충청남도", "서산시", 37.0060, 126.4020),
    ("충청남도", "논산시", 36.1870, 127.0990),
    ("전북특별자치도", "군산시", 35.9640, 126.6400),
    ("전북특별자치도", "익산시", 35.9480, 126.9570),
    ("전라남도", "광양시", 34.9400, 127.7000),
    ("전라남도", "순천시", 34.9200, 127.5300),
    ("전라남도", "나주시", 35.0180, 126.7900),
    ("경상북도", "구미시", 36.1140, 128.3480),
    ("경상북도", "경주시", 35.7700, 129.2700),
    ("경상북도", "김천시", 36.1200, 128.1180),
    ("경상남도", "김해시", 35.2340, 128.8100),
    ("경상남도", "양산시", 35.3400, 129.0080),
    ("경상남도", "사천시", 35.0030, 128.0640),
    ("제주특별자치도", "제주시", 33.4630, 126.3300),
    ("제주특별자치도", "서귀포시", 33.2540, 126.5600),
]

# 업종에 맞는 장소 표현 — 아파트 화재가 "항공산업단지"에서 나는 일이 없게 한다
PLACE_BY_INDUSTRY = {
    "물류창고": "물류단지",
    "제조공장": "산업단지",
    "화학공장": "석유화학단지",
    "상업시설": "상가밀집지역",
    "공동주택": "아파트단지",
    "건설현장": "신축공사장",
    "발전/에너지": "발전단지",
    "여객운송": "국도변",
    "화물운송": "고속도로 나들목 인근",
}

# (사고유형, 업종, 제목템플릿) — 유형과 업종이 어울리게 묶는다
TEMPLATES = [
    ("화재", "물류창고", "{loc} 물류창고 화재"),
    ("화재", "제조공장", "{loc} 제조공장 화재"),
    ("화재", "상업시설", "{loc} 상가건물 화재"),
    ("화재", "공동주택", "{loc} 아파트 화재"),
    ("화재", "발전/에너지", "{loc} 발전설비 화재"),
    ("폭발", "화학공장", "{loc} 화학공장 폭발"),
    ("폭발", "제조공장", "{loc} 공장 집진설비 폭발"),
    ("붕괴", "건설현장", "{loc} 건설현장 붕괴"),
    ("붕괴", "상업시설", "{loc} 노후건물 외벽 붕괴"),
    ("수재", "제조공장", "{loc} 공장 침수"),
    ("수재", "물류창고", "{loc} 물류창고 침수"),
    ("교통사고", "여객운송", "{loc} 버스 추돌 사고"),
    ("교통사고", "화물운송", "{loc} 화물차 전도 사고"),
]

ENTITY_SUFFIX = ["로지스", "산업", "테크", "머티리얼즈", "케미칼", "정밀", "물산", "이엔지", "코퍼레이션", "에너지"]
ENTITY_PREFIX = ["대한", "한성", "동진", "세명", "우성", "삼우", "신라", "태창", "금호", "청우", "はな".replace("はな","한별"), "성진"]
# 삼성화재는 직급 대신 전원 "프로" 호칭을 쓴다.
UWS = [
    ("송규석 프로", "02-1234-5601", "gyuseok.song@dummy-samsungfire.example"),
    ("송채원 프로", "02-1234-5602", "chaewon.song@dummy-samsungfire.example"),
    ("김민석 프로", "02-1234-5603", "minseok.kim@dummy-samsungfire.example"),
    ("원아현 프로", "02-1234-5604", "ahyeon.won@dummy-samsungfire.example"),
    ("손예진 프로", "02-1234-5605", "yejin.son@dummy-samsungfire.example"),
    ("이지훈 프로", "02-1234-5606", "jihoon.lee@dummy-samsungfire.example"),
    ("서우인 프로", "02-1234-5607", "wooin.seo@dummy-samsungfire.example"),
    ("신준용 프로", "02-1234-5608", "junyong.shin@dummy-samsungfire.example"),
    ("신동재 프로", "02-1234-5609", "dongjae.shin@dummy-samsungfire.example"),
    ("정보현 프로", "02-1234-5610", "bohyeon.jung@dummy-samsungfire.example"),
    ("이중서 프로", "02-1234-5611", "jungseo.lee@dummy-samsungfire.example"),
    ("박정원 프로", "02-1234-5612", "jeongwon.park@dummy-samsungfire.example"),
    ("윤수정 프로", "02-1234-5613", "sujeong.yoon@dummy-samsungfire.example"),
    ("이호준 프로", "02-1234-5614", "hojun.lee@dummy-samsungfire.example"),
    ("김재호 프로", "02-1234-5615", "jaeho.kim@dummy-samsungfire.example"),
    ("권민지 프로", "02-1234-5616", "minji.kwon@dummy-samsungfire.example"),
    ("한유경 프로", "02-1234-5617", "yukyung.han@dummy-samsungfire.example"),
]
PRODUCTS = ["재산종합보험(패키지)", "화재보험(재산종합)", "기업종합위험보험", "건설공사보험(CAR)",
            "시설물배상책임보험", "건물종합보험", "재산종합보험(기업휴지 포함)"]
PARTNERS = ["DB손해보험", "현대해상", "KB손해보험", "메리츠화재", "한화손해보험", "롯데손해보험", "흥국화재"]
SOURCES = ["연합뉴스 (더미)", "YTN (더미)", "뉴시스 (더미)", "MBC (더미)", "KBS (더미)", "지역일보 (더미)"]

STAGE_SEQ = {
    "화재": ["신고접수", "소방출동", "진압중", "진화완료", "원인조사", "후속조치"],
    "폭발": ["신고접수", "소방·화학구조대출동", "진압/수습", "주민대피", "환경영향조사", "후속조치"],
    "붕괴": ["신고접수", "구조대출동", "구조/수습", "현장통제", "정밀안전진단", "후속조치"],
    "수재": ["침수신고", "배수작업", "응급복구", "피해조사", "후속조치"],
    "교통사고": ["신고접수", "구급대출동", "구조/이송", "현장정리", "후속조치"],
}

BASE_DAY = datetime(2026, 8, 25, 9, 0, 0)   # 데이터 기준 "현재"

def policy_period(occurred, rng):
    """사고 발생일 기준 보험기간을 만든다.
    대부분은 사고 시점에 유효하지만, 일부는 만기 후 사고이거나 사고 후 개시라
    '사고 시점에 담보가 살아 있었는지' 판정이 실제로 걸리는 케이스가 생긴다."""
    r = rng.random()
    if r < 0.10:        # 만기 후 사고 — 사고 전에 계약이 끝났다
        end = occurred - timedelta(days=rng.randint(5, 400))
        start = end - timedelta(days=365)
        status = "만기"
    elif r < 0.17:      # 사고 후 개시 — 사고 뒤에 계약이 시작됐다
        start = occurred + timedelta(days=rng.randint(3, 120))
        end = start + timedelta(days=365)
        status = "미개시"
    else:               # 사고 시점에 유효
        start = occurred - timedelta(days=rng.randint(20, 330))
        end = start + timedelta(days=365)
        status = "유효"
    return start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d"), status

def gen_bulk(n, start_seq):
    """최근 14일에 걸쳐 사고 n건을 생성한다."""
    out = []
    for k in range(n):
        region, city, lat, lng = rng.choice(SPOTS)
        itype, industry, title_tpl = rng.choice(TEMPLATES)
        address = f"{region} {city} {PLACE_BY_INDUSTRY[industry]}"

        # 좌표를 살짝 흩어서 같은 지점에 핀이 겹치지 않게
        lat = round(lat + rng.uniform(-0.06, 0.06), 4)
        lng = round(lng + rng.uniform(-0.06, 0.06), 4)

        # 최근 14일 안에서 시각을 뽑되, 최근일수록 조금 더 촘촘하게
        days_ago = min(13, int(abs(rng.gauss(0, 5))))
        occurred = BASE_DAY - timedelta(days=days_ago,
                                        hours=rng.randint(0, 23),
                                        minutes=rng.choice([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]))
        if occurred > BASE_DAY:
            occurred = BASE_DAY - timedelta(minutes=30)
        occ_iso = occurred.strftime("%Y-%m-%dT%H:%M:00")

        title = title_tpl.format(loc=city)

        # 오래된 사고일수록 대응단계가 더 진행돼 있다
        seq = STAGE_SEQ[itype]
        max_idx = min(len(seq) - 1, 1 + days_ago)
        stage_idx = rng.randint(1, max_idx) if max_idx >= 1 else 0
        offsets, acc = [], 0
        for i in range(stage_idx + 1):
            acc += 0 if i == 0 else rng.randint(5, 240) * (1 if i < 3 else 4)
            offsets.append((seq[i], acc))
        history = stage_history(offsets, occ_iso)

        # 인명피해 — 유형별로 규모를 다르게
        if itype == "폭발":
            dead, injured = rng.choice([0, 0, 1, 2, 3]), rng.randint(0, 18)
        elif itype == "붕괴":
            dead, injured = rng.choice([0, 0, 1, 2]), rng.randint(0, 9)
        elif itype == "교통사고":
            dead, injured = rng.choice([0, 0, 0, 1]), rng.randint(2, 22)
        elif itype == "수재":
            dead, injured = 0, rng.randint(0, 4)
        else:
            dead, injured = rng.choice([0, 0, 0, 1, 2]), rng.randint(0, 12)
        missing = rng.choice([0, 0, 0, 0, 1])

        # 재산피해
        if itype == "교통사고":
            loss_type, loss = "해당없음", None
        else:
            loss_type = rng.choice(["분손", "분손(추정중)", "분손", "전손 추정"])
            scale = {"화재": 40, "폭발": 90, "붕괴": 15, "수재": 30}[itype]
            loss = rng.randint(2, scale) * 100000000
        note = {
            "화재": "건물 일부 소실, 세부 피해규모 확인 중",
            "폭발": "설비 파손 및 인근 시설 손상, 원인 조사 중",
            "붕괴": "구조물 일부 붕괴, 안전진단 진행 중",
            "수재": "집중호우로 설비·재고 침수, 배수 및 복구 중",
            "교통사고": "차량 파손 및 다수 부상자 발생",
        }[itype]

        entity = f"㈜{rng.choice(ENTITY_PREFIX)}{rng.choice(ENTITY_SUFFIX)}"
        biz = f"{rng.randint(100,699)}-8{rng.randint(1,9)}-{rng.randint(1,9)}XXXX"

        # 약 45%가 삼성화재 계약과 매칭
        matched = rng.random() < 0.45
        contracts = []
        confidence = "낮음"
        if matched:
            confidence = rng.choice(["높음", "높음", "중간", "중간", "낮음(재확인 필요)"])
            is_new = rng.random() < 0.22
            since = None if is_new else rng.randint(2009, 2024)
            renewals = 0 if is_new else 2026 - since
            lh = None
            past = 0
            if not is_new:
                claims = rng.choice([0, 0, 1, 1, 2, 2, 3, 4, 5])
                premium = rng.randint(5, 700) * 100000000
                incurred = int(premium * rng.randint(8, 105) / 100) if claims else 0
                largest = int(incurred * rng.uniform(0.45, 0.92)) if claims else 0
                lh = loss_history(renewals, claims, incurred, largest, premium)
                past = claims
            held_pct = rng.randint(15, 100)
            partner = rng.choice(PARTNERS)
            coins = ([{"company": "삼성화재", "percent": held_pct}]
                     if held_pct == 100 else
                     [{"company": "삼성화재", "percent": held_pct},
                      {"company": partner, "percent": 100 - held_pct}])
            sum_insured = rng.randint(10, 1500) * 100000000
            uw = rng.choice(UWS)
            p_start, p_end, p_status = policy_period(occurred, rng)
            contracts = [contract(
                f"SF-{rng.randint(2024,2026)}-{rng.choice(['FR','PK','CL','CR','EG','BD'])}-{rng.randint(100000,999999)}",
                rng.choice(PRODUCTS), entity,
                p_start, p_end, p_status,
                True, held_pct, sum_insured, sum_insured,
                sum_insured if rng.random() < 0.5 else None, None, sum_insured,
                rng.randint(1, 20) * 100000000, rng.randint(0, 50), past,
                coins, uw[0], uw[1], uw[2],
                isNew=is_new, sinceYear=since, renewalCount=renewals, lossHistory=lh)]

        # 매칭 건 중 일부는 이미 알림이 나갔고 일부는 검토도 끝났다
        alert_sent, alerts, reviewed, reviewed_by, reviewed_at = False, [], False, None, None
        if matched and days_ago >= 1 and rng.random() < 0.6:
            alert_sent = True
            at = (occurred + timedelta(minutes=rng.randint(12, 90))).strftime("%Y-%m-%dT%H:%M:00")
            uw = contracts[0]["underwriter"]
            alerts = alert_log(at, uw["name"], uw["email"])
            if rng.random() < 0.5:
                reviewed = True
                reviewed_by = "기업보상팀 " + rng.choice(UWS)[0]
                reviewed_at = (occurred + timedelta(hours=rng.randint(2, 30))).strftime("%Y-%m-%dT%H:%M:00")

        # 오래된 사고일수록 조치가 끝나고 보험금까지 지급돼 종결된다.
        lc = {"actionCompleted": False, "actionCompletedAt": None,
              "claimPaid": False, "claimPaidAt": None, "claimAmountKRW": None}
        if days_ago >= 2 and rng.random() < min(0.85, 0.18 * days_ago):
            done_at = occurred + timedelta(days=rng.randint(1, max(1, days_ago)), hours=rng.randint(0, 20))
            if done_at > BASE_DAY:                      # 기준시각을 넘지 않게
                done_at = BASE_DAY - timedelta(hours=rng.randint(1, 12))
            if done_at < occurred:                      # 발생보다 앞설 수도 없다
                done_at = occurred + timedelta(hours=1)
            lc["actionCompleted"] = True
            lc["actionCompletedAt"] = done_at.strftime("%Y-%m-%dT%H:%M:00")
            # 연관 건은 보험금 지급까지 끝나야 종결로 본다. 지급은 반드시 조치완료 이후.
            room = (BASE_DAY - done_at).total_seconds() / 3600
            if matched and room >= 6 and rng.random() < 0.72:
                paid_at = done_at + timedelta(hours=rng.randint(4, max(5, int(room))))
                if paid_at > BASE_DAY:
                    paid_at = BASE_DAY
                lc["claimPaid"] = True
                lc["claimPaidAt"] = paid_at.strftime("%Y-%m-%dT%H:%M:00")
                # 자기부담금 제하고 삼성화재 보유비율만큼 지급
                ded = contracts[0]["deductible"]
                share = contracts[0]["samsungShare"]["percentOfTotalPremium"] / 100
                base = max(0, (loss or 0) - ded)
                lc["claimAmountKRW"] = int(base * share) if base else 0

        out.append(incident(
            id=f"INC-{occurred.strftime('%Y%m%d')}-{start_seq + k:03d}",
            occurredAt=occ_iso, title=title, itype=itype, industry=industry,
            address=address, region=region, lat=lat, lng=lng,
            dead=dead, injured=injured, missing=missing,
            lossType=loss_type, estimatedLossKRW=loss, damageNote=note,
            stage=history[-1]["stage"], history=history,
            sourceNote=rng.choice(SOURCES), entityName=entity, bizRegNo=biz,
            matched=matched, confidence=confidence, contracts=contracts,
            reviewed=reviewed, reviewedBy=reviewed_by, reviewedAt=reviewed_at,
            alertSent=alert_sent, alertLog=alerts, lifecycle=lc,
        ))
    return out

# ---------------------------------------------------------------------------
# 미국 공장 사고 — 한국 기업의 미국 현지법인 공장을 삼성화재가 글로벌 프로그램으로
# 인수한 상황을 가정한다. 금액은 전부 원화 환산 기준(더미).
# ---------------------------------------------------------------------------

# (주, 도시, 위도, 경도) — 한국계 제조업이 실제로 몰려 있는 지역 위주
US_SITES = [
    ("Georgia", "West Point", 32.8779, -85.1830),
    ("Georgia", "Savannah", 32.0809, -81.0912),
    ("Georgia", "Cartersville", 34.1651, -84.8001),
    ("Alabama", "Montgomery", 32.3668, -86.3000),
    ("Alabama", "Auburn", 32.6099, -85.4808),
    ("Tennessee", "Clarksville", 36.5298, -87.3595),
    ("Tennessee", "Chattanooga", 35.0456, -85.3097),
    ("Texas", "Taylor", 30.5710, -97.4092),
    ("Texas", "Austin", 30.2672, -97.7431),
    ("Texas", "Houston", 29.7604, -95.3698),
    ("Michigan", "Holland", 42.7875, -86.1089),
    ("Michigan", "Detroit", 42.3314, -83.0458),
    ("Ohio", "Toledo", 41.6528, -83.5379),
    ("Ohio", "Columbus", 39.9612, -82.9988),
    ("Indiana", "Kokomo", 40.4864, -86.1336),
    ("Kentucky", "Bowling Green", 36.9685, -86.4808),
    ("Kentucky", "Glendale", 37.6001, -85.9036),
    ("South Carolina", "Greenville", 34.8526, -82.3940),
    ("North Carolina", "Charlotte", 35.2271, -80.8431),
    ("Arizona", "Casa Grande", 32.8795, -111.7574),
    ("Arizona", "Phoenix", 33.4484, -112.0740),
    ("California", "Fremont", 37.5485, -121.9886),
    ("Illinois", "Chicago", 41.8781, -87.6298),
    ("Wisconsin", "Milwaukee", 43.0389, -87.9065),
    ("Iowa", "Des Moines", 41.5868, -93.6250),
    ("Missouri", "Kansas City", 39.0997, -94.5786),
    ("Louisiana", "Baton Rouge", 30.4515, -91.1871),
    ("Washington", "Everett", 47.9790, -122.2021),
    ("Pennsylvania", "Pittsburgh", 40.4406, -79.9959),
    ("New York", "Buffalo", 42.8864, -78.8784),
]

# (사고유형, 업종, 제목 템플릿) — 공장 위주
US_TEMPLATES = [
    ("화재", "제조공장", "{city} 배터리 셀 공장 화재"),
    ("화재", "제조공장", "{city} 자동차 부품공장 화재"),
    ("화재", "물류창고", "{city} 물류센터 화재"),
    ("폭발", "화학공장", "{city} 화학플랜트 폭발"),
    ("폭발", "제조공장", "{city} 도장라인 분진 폭발"),
    ("수재", "제조공장", "{city} 공장 폭우 침수"),
    ("붕괴", "건설현장", "{city} 신축 공장동 붕괴"),
    ("화재", "발전/에너지", "{city} 변전설비 화재"),
]

US_ENTITIES = [
    "HanSung America Mfg.", "Dongjin USA Corp.", "Woosung Materials LLC",
    "Sema Electronics America", "Taechang Precision Inc.", "Kumho Auto Parts USA",
    "Cheongwoo Battery America", "Silla Chemical USA", "Hanbyul Energy Solutions",
    "Seongjin Logistics America",
]
US_SOURCES = ["Reuters (더미)", "AP (더미)", "Local News (더미)", "Bloomberg (더미)", "WSJ (더미)"]
US_PRODUCTS = ["해외재산종합보험(글로벌 프로그램)", "해외 기업종합위험보험",
               "해외 건설공사보험(CAR)", "해외 배상책임보험"]
US_FRONTING = ["AIG", "Chubb", "Zurich", "Liberty Mutual"]

def gen_us(n, start_seq):
    out = []
    for k in range(n):
        state, city, lat, lng = rng.choice(US_SITES)
        itype, industry, tpl = rng.choice(US_TEMPLATES)
        lat = round(lat + rng.uniform(-0.25, 0.25), 4)
        lng = round(lng + rng.uniform(-0.25, 0.25), 4)

        days_ago = min(13, int(abs(rng.gauss(0, 5))))
        occurred = BASE_DAY - timedelta(days=days_ago, hours=rng.randint(0, 23),
                                        minutes=rng.choice([0, 10, 20, 30, 40, 50]))
        if occurred > BASE_DAY:
            occurred = BASE_DAY - timedelta(minutes=45)
        occ_iso = occurred.strftime("%Y-%m-%dT%H:%M:00")

        seq = STAGE_SEQ[itype]
        max_idx = min(len(seq) - 1, 1 + days_ago)
        stage_idx = rng.randint(1, max_idx) if max_idx >= 1 else 0
        offsets, acc = [], 0
        for i in range(stage_idx + 1):
            acc += 0 if i == 0 else rng.randint(5, 240) * (1 if i < 3 else 4)
            offsets.append((seq[i], acc))
        history = stage_history(offsets, occ_iso)

        dead = rng.choice([0, 0, 0, 1, 2]) if itype in ("화재", "폭발", "붕괴") else 0
        injured = rng.randint(0, 14)
        loss_type = rng.choice(["분손", "분손(추정중)", "전손 추정"])
        loss = rng.randint(20, 1800) * 100000000     # 해외 공장이라 규모가 크다
        entity = rng.choice(US_ENTITIES)

        matched = rng.random() < 0.62                # 해외 진출기업 위주라 매칭률이 높다
        contracts, confidence = [], "낮음"
        if matched:
            confidence = rng.choice(["높음", "높음", "중간"])
            is_new = rng.random() < 0.25
            since = None if is_new else rng.randint(2012, 2024)
            renewals = 0 if is_new else 2026 - since
            lh, past = None, 0
            if not is_new:
                claims = rng.choice([0, 1, 1, 2, 3, 4])
                premium = rng.randint(20, 900) * 100000000
                incurred = int(premium * rng.randint(8, 100) / 100) if claims else 0
                largest = int(incurred * rng.uniform(0.5, 0.9)) if claims else 0
                lh = loss_history(renewals, claims, incurred, largest, premium)
                past = claims
            held_pct = rng.randint(10, 60)           # 프론팅사가 끼어 보유비율이 낮다
            fronting = rng.choice(US_FRONTING)
            coins = [{"company": "삼성화재", "percent": held_pct},
                     {"company": f"{fronting} (프론팅)", "percent": 100 - held_pct}]
            sum_insured = rng.randint(200, 4000) * 100000000
            uw = rng.choice(UWS)
            p_start, p_end, p_status = policy_period(occurred, rng)
            contracts = [contract(
                f"SF-GL-{rng.randint(2024,2026)}-{rng.randint(10000,99999)}",
                rng.choice(US_PRODUCTS), entity, p_start, p_end, p_status,
                True, held_pct, sum_insured, sum_insured,
                sum_insured if rng.random() < 0.5 else None, None, sum_insured,
                rng.randint(5, 50) * 100000000, rng.randint(20, 70), past,
                coins, uw[0], uw[1], uw[2],
                isNew=is_new, sinceYear=since, renewalCount=renewals, lossHistory=lh)]

        alert_sent, alerts, reviewed, reviewed_by, reviewed_at = False, [], False, None, None
        if matched and days_ago >= 1 and rng.random() < 0.6:
            alert_sent = True
            at = (occurred + timedelta(minutes=rng.randint(20, 180))).strftime("%Y-%m-%dT%H:%M:00")
            u = contracts[0]["underwriter"]
            alerts = alert_log(at, u["name"], u["email"])
            if rng.random() < 0.45:
                reviewed = True
                reviewed_by = "기업보상팀 " + rng.choice(UWS)[0]
                reviewed_at = (occurred + timedelta(hours=rng.randint(3, 40))).strftime("%Y-%m-%dT%H:%M:00")

        lc = {"actionCompleted": False, "actionCompletedAt": None,
              "claimPaid": False, "claimPaidAt": None, "claimAmountKRW": None}
        if days_ago >= 3 and rng.random() < min(0.7, 0.14 * days_ago):
            done_at = occurred + timedelta(days=rng.randint(1, max(1, days_ago)))
            if done_at > BASE_DAY:
                done_at = BASE_DAY - timedelta(hours=rng.randint(2, 14))
            if done_at < occurred:
                done_at = occurred + timedelta(hours=2)
            lc["actionCompleted"] = True
            lc["actionCompletedAt"] = done_at.strftime("%Y-%m-%dT%H:%M:00")
            room = (BASE_DAY - done_at).total_seconds() / 3600
            if matched and room >= 6 and rng.random() < 0.6:
                paid_at = done_at + timedelta(hours=rng.randint(4, max(5, int(room))))
                if paid_at > BASE_DAY:
                    paid_at = BASE_DAY
                lc["claimPaid"] = True
                lc["claimPaidAt"] = paid_at.strftime("%Y-%m-%dT%H:%M:00")
                ded = contracts[0]["deductible"]
                share = contracts[0]["samsungShare"]["percentOfTotalPremium"] / 100
                base = max(0, loss - ded)
                lc["claimAmountKRW"] = int(base * share) if base else 0

        out.append(incident(
            id=f"INC-US-{occurred.strftime('%Y%m%d')}-{start_seq + k:03d}",
            occurredAt=occ_iso, title=tpl.format(city=city), itype=itype, industry=industry,
            address=f"{city}, {state}, USA", region=state, lat=lat, lng=lng,
            dead=dead, injured=injured, missing=0,
            lossType=loss_type, estimatedLossKRW=loss,
            damageNote="현지 소방·당국 대응 중, 세부 피해규모 확인 중 (원화 환산 기준)",
            stage=history[-1]["stage"], history=history,
            sourceNote=rng.choice(US_SOURCES), entityName=entity,
            bizRegNo=f"EIN {rng.randint(10,99)}-{rng.randint(1000000,9999999)}",
            matched=matched, confidence=confidence, contracts=contracts,
            reviewed=reviewed, reviewedBy=reviewed_by, reviewedAt=reviewed_at,
            alertSent=alert_sent, alertLog=alerts, lifecycle=lc, country="US",
        ))
    return out

incidents.extend(gen_bulk(76, 100))
incidents.extend(gen_us(34, 500))
incidents.sort(key=lambda i: i["occurredAt"], reverse=True)

state = {
    "lastUpdated": "2026-08-25T09:00:00",
    "nextSeq": 200,
    "alertsUnread": 3,
    "incidents": incidents,
}

import os
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "initial_state.json")
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(state, f, ensure_ascii=False, indent=None)

print("incidents:", len(incidents))
print("json size:", len(json.dumps(state, ensure_ascii=False)))
