"use client";

interface StepProgressBarProps {
  currentStep: number; // 1, 2, or 3
  totalSteps?: number;
}

export default function StepProgressBar({ currentStep, totalSteps = 3 }: StepProgressBarProps) {
  const percentage = (currentStep / totalSteps) * 100;

  return (
    <div className="w-full mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="step-indicator">
          Step {currentStep} of {totalSteps}
        </span>
      </div>
      <div className="relative w-full h-2.5 bg-gray-700 rounded-full overflow-visible">
        {/* Red to yellow gradient fill */}
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${percentage}%`,
            background: "linear-gradient(to right, #CC0000, #F5A800)",
          }}
        />
        {/* Pig + cart mascot at the tip */}
        <div
          className="absolute -top-3.5 flex items-center"
          style={{ left: `calc(${percentage}% - 20px)` }}
        >
          <span className="text-2xl select-none" title="progress mascot">🐷🛒</span>
        </div>
      </div>
    </div>
  );
}
