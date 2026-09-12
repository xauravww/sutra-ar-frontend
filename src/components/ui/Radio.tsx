"use client";

type RadioProps = {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onChange: (value: string) => void;
};

export default function Radio({ name, value, label, checked, onChange }: RadioProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="w-4 h-4 flex-none accent-navy"
      />
      <span
        className={`rounded-md border px-3 py-1.5 text-[13px] font-medium transition-colors ${
          checked
            ? "border-navy bg-tint text-navy"
            : "border-sutra-line bg-white text-sutra-ink-2"
        }`}
      >
        {label}
      </span>
    </label>
  );
}
