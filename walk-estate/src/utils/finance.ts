import { UserFinancialProfile } from '@/types';

// 지역별 규제에 따라 달라지는 값 — 기본값은 예시이며 실제 서비스 시 지역 데이터 연동 필요
export const LTV_RATE = 0.70;          // 매물 예상가 대비 LTV 상한 비율
export const DSR_MULTIPLIER = 17.1;    // DSR 40% 연 상환액 → 대출 한도 환산 배수

export const calculateMaxAffordablePrice = (
  profile: UserFinancialProfile,
  estimatedPropertyPrice?: number // BUY일 때 LTV 상한액 계산용
): number => {
  const { availableCash, annualIncome, existingLoanAnnualRepayment, transactionType } = profile;

  if (transactionType === 'BUY') {
    const ltvLimit = (estimatedPropertyPrice ?? availableCash * 3) * LTV_RATE;
    const maxAnnualDebtService = Math.max(0, (annualIncome * 0.4) - existingLoanAnnualRepayment);
    const dsrLoanLimit = maxAnnualDebtService * DSR_MULTIPLIER;
    const loanLimit = Math.min(ltvLimit, dsrLoanLimit);
    return Math.floor((availableCash + loanLimit) * 0.965);
  }

  if (transactionType === 'JEONSE') {
    // 전세: 보증금의 80% vs 연소득×4.0 중 작은 값을 대출 한도로 사용
    const depositBasedLimit = availableCash * 0.8; // 보증금(가용현금 기준) 80%
    const incomeBasedLimit = annualIncome * 4.0;
    const loanLimit = Math.min(depositBasedLimit, incomeBasedLimit);
    return Math.floor(availableCash + loanLimit);
  }

  return availableCash;
};

/** 만원 단위 금액을 "6억 2,300만" 형태로 표기 */
export const formatKrwManwon = (manwon: number): string => {
  const safe = Math.max(0, Math.round(manwon));
  const eok = Math.floor(safe / 10000);
  const rest = safe % 10000;

  if (eok === 0) return `${rest.toLocaleString('ko-KR')}만`;
  if (rest === 0) return `${eok}억`;
  return `${eok}억 ${rest.toLocaleString('ko-KR')}만`;
};
