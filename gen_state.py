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

def contract(policyNumber, product, policyholder, start, end, status,
             held, sharePct, sumInsured, lol, perBuilding, perPerson, perOccurrence,
             deductible, reins, pastLoss, coinsurance, uw_name, uw_phone, uw_email):
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
        "underwriter": {"name": uw_name, "phone": uw_phone, "email": uw_email},
    }

def alert_log(at, name, email):
    """담당 언더라이터에게 알림이 나간 기록 (더미)."""
    return [{"at": at, "text": f"{name}({email})에게 알림 발송됨"}]

def incident(id, occurredAt, title, itype, industry, address, region, lat, lng,
             dead, injured, missing, lossType, estimatedLossKRW, damageNote,
             stage, history, sourceNote, entityName, bizRegNo,
             matched, confidence, contracts, reviewed=False, reviewedBy=None, reviewedAt=None,
             assignedTo=None, notes=None, alertSent=False, alertLog=None):
    return {
        "id": id,
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
                 500000000, 20, 1,
                 [{"company": "삼성화재", "percent": 45}, {"company": "DB손해보험", "percent": 35}, {"company": "현대해상", "percent": 20}],
                 "김도윤 과장", "02-1234-5601", "doyoon.kim@dummy-samsungfire.example"),
    ],
    alertSent=True,
    alertLog=alert_log("2026-08-17T03:41:00", "김도윤 과장", "doyoon.kim@dummy-samsungfire.example"),
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
                 "이서연 대리", "02-1234-5622", "seoyeon.lee@dummy-samsungfire.example"),
    ],
    alertSent=True,
    alertLog=alert_log("2026-08-19T15:02:00", "이서연 대리", "seoyeon.lee@dummy-samsungfire.example"),
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
                 "박지훈 차장", "02-1234-5633", "jihoon.park@dummy-samsungfire.example"),
    ],
    alertSent=True,
    alertLog=alert_log("2026-08-20T06:22:00", "박지훈 차장", "jihoon.park@dummy-samsungfire.example"),
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
                 "최민석 부장", "02-1234-5644", "minseok.choi@dummy-samsungfire.example"),
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
                 "정하은 과장", "02-1234-5655", "haeun.jung@dummy-samsungfire.example"),
    ],
    alertSent=True,
    alertLog=alert_log("2026-08-23T09:55:00", "정하은 과장", "haeun.jung@dummy-samsungfire.example"),
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
                 1000000000, 30, 1,
                 [{"company": "삼성화재", "percent": 25}, {"company": "현대해상", "percent": 25},
                  {"company": "DB손해보험", "percent": 25}, {"company": "메리츠화재", "percent": 25}],
                 "한지민 차장", "02-1234-5666", "jimin.han@dummy-samsungfire.example"),
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
                 "오세훈 대리", "02-1234-5677", "sehoon.oh@dummy-samsungfire.example"),
    ],
))

# 11. Jeonju market fire (not matched)
incidents.append(incident(
    id="INC-20260825-11",
    occurredAt="2026-08-25T05:50:00",
    title="전주 재래시장 점포 화재",
    itype="화재", industry="상업시설",
    address="전라북도 전주시 재래시장", region="전라북도", lat=35.8242, lng=127.1480,
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
                 2000000000, 50, 1,
                 [{"company": "삼성화재", "percent": 35}, {"company": "코리안리(재보험)", "percent": 0},
                  {"company": "현대해상", "percent": 35}, {"company": "KB손해보험", "percent": 30}],
                 "윤서준 부장", "02-1234-5688", "seojun.yoon@dummy-samsungfire.example"),
    ],
    alertSent=True,
    alertLog=alert_log("2026-08-25T02:31:00", "윤서준 부장", "seojun.yoon@dummy-samsungfire.example"),
))

state = {
    "lastUpdated": "2026-08-25T09:00:00",
    "nextSeq": 13,
    "alertsUnread": 3,
    "incidents": incidents,
}

import os
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "initial_state.json")
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(state, f, ensure_ascii=False, indent=None)

print("incidents:", len(incidents))
print("json size:", len(json.dumps(state, ensure_ascii=False)))
