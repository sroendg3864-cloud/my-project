'use client';

import React from 'react';

interface Props {
  currentStep: number;
  totalSteps: number;
  nextWaypointName: string;
  onCompleteStep: () => void;
}

export const LiveBottomHUD: React.FC<Props> = ({ currentStep, totalSteps, nextWaypointName, onCompleteStep }) => {
  const progressPercent = (currentStep / totalSteps) * 100;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#dddddd] shadow-[0_-2px_10px_rgba(0,0,0,0.05)] px-6 py-4 z-40">
      <div className="max-w-xl mx-auto flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[12px] font-bold text-[#ff385c] tracking-tight">STEP {currentStep}/{totalSteps}</span>
            <span className="text-[14px] font-semibold text-[#222222] truncate">{nextWaypointName}</span>
          </div>
          <div className="w-full bg-[#f2f2f2] h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#ff385c] h-full transition-all duration-300 rounded-full" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
        <button
          onClick={onCompleteStep}
          className="h-12 px-6 bg-[#ff385c] hover:bg-[#e00b41] active:scale-[0.98] text-white rounded-[8px] font-medium text-[15px] transition-colors shrink-0 shadow-sm"
        >
          체크 완료
        </button>
      </div>
    </div>
  );
};

export default LiveBottomHUD;
