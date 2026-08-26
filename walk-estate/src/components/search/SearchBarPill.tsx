'use client';

import React from 'react';
import { Search } from 'lucide-react';

export type SearchSegment = 'location' | 'transactionType' | 'budget' | 'duration';

interface Props {
  location: string;
  transactionType: string;
  budgetText: string;
  durationText: string;
  onSearch: () => void;
  /** 블루프린트 원본 대비 추가: 각 세그먼트를 눌러 상세 입력 패널을 여는 훅 */
  onSegmentClick?: (segment: SearchSegment) => void;
  activeSegment?: SearchSegment | null;
}

export const SearchBarPill: React.FC<Props> = ({
  location, transactionType, budgetText, durationText, onSearch, onSegmentClick, activeSegment
}) => {
  const segmentClass = (segment: SearchSegment) =>
    activeSegment === segment ? 'bg-[#f7f7f7] rounded-full' : '';

  return (
    <div className="flex items-center bg-white h-16 rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.1)] border border-[#dddddd] px-2 py-1 max-w-3xl w-full mx-auto">
      <div
        onClick={() => onSegmentClick?.('location')}
        className={`flex-1 px-4 border-r border-[#ebebeb] text-left cursor-pointer ${segmentClass('location')}`}
      >
        <span className="block text-[11px] font-semibold text-[#222222] uppercase">지역</span>
        <span className="text-[14px] text-[#222222] font-medium truncate block">{location || '어디든 추천'}</span>
      </div>
      <div
        onClick={() => onSegmentClick?.('transactionType')}
        className={`flex-1 px-4 border-r border-[#ebebeb] text-left cursor-pointer hidden md:block ${segmentClass('transactionType')}`}
      >
        <span className="block text-[11px] font-semibold text-[#222222] uppercase">유형</span>
        <span className="text-[14px] text-[#222222] font-medium truncate block">{transactionType || '매매'}</span>
      </div>
      <div
        onClick={() => onSegmentClick?.('budget')}
        className={`flex-1 px-4 border-r border-[#ebebeb] text-left cursor-pointer ${segmentClass('budget')}`}
      >
        <span className="block text-[11px] font-semibold text-[#222222] uppercase">가용 예산</span>
        <span className="text-[14px] text-[#6a6a6a] truncate block">{budgetText || '자산 입력'}</span>
      </div>
      <div
        onClick={() => onSegmentClick?.('duration')}
        className={`flex-1 px-4 text-left cursor-pointer hidden sm:block ${segmentClass('duration')}`}
      >
        <span className="block text-[11px] font-semibold text-[#222222] uppercase">소요 시간</span>
        <span className="text-[14px] text-[#6a6a6a] truncate block">{durationText || '60분'}</span>
      </div>
      <button
        onClick={onSearch}
        aria-label="임장 후보지 검색"
        className="w-12 h-12 bg-[#ff385c] hover:bg-[#e00b41] active:scale-95 transition-all rounded-full flex items-center justify-center text-white shrink-0 ml-1"
      >
        <Search size={20} strokeWidth={2.5} />
      </button>
    </div>
  );
};

export default SearchBarPill;
