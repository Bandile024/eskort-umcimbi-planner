"use client";

interface BudgetTrackerProps {
  budget: number;
  spent: number;
}

export default function BudgetTracker({ budget, spent }: BudgetTrackerProps) {
  const remaining = budget - spent;
  const usedPercent = Math.min((spent / budget) * 100, 100);

  return (
    <div className="budget-tracker mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-white text-sm font-medium">Budget tracker</span>
        <span className="text-white font-bold text-sm">
          R{remaining.toLocaleString()} LEFT
        </span>
      </div>
      <div className="w-full h-2.5 bg-green-900 rounded-full overflow-hidden mb-2">
        <div
          className="h-full bg-eskort-yellow rounded-full transition-all duration-500"
          style={{ width: `${usedPercent}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-green-300">
        <span>Cart: R{spent.toLocaleString()}</span>
        <span>Budget: R{budget.toLocaleString()}</span>
      </div>
    </div>
  );
}
