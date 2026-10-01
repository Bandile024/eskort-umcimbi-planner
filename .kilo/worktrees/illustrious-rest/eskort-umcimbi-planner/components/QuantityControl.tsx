"use client";

interface QuantityControlProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  inputClassName?: string;
}

export default function QuantityControl({ value, onChange, min = 0, max = 999, inputClassName = "" }: QuantityControlProps) {
  const decrement = () => { if (value > min) onChange(value - 1); };
  const increment = () => { if (value < max) onChange(value + 1); };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "") {
      onChange(min);
      return;
    }
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) {
      onChange(Math.min(Math.max(parsed, min), max));
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button onClick={decrement} className="qty-btn-minus" aria-label="decrease">
        −
      </button>
      <input
        type="number"
        value={value === 0 ? 0 : value}
        onChange={handleInput}
        placeholder="0"
        min={min}
        max={max}
        className={`w-10 text-center font-semibold text-black text-sm bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-black ${inputClassName}`}
        aria-label="quantity"
      />
      <button onClick={increment} className="qty-btn-plus" aria-label="increase">
        +
      </button>
    </div>
  );
}
