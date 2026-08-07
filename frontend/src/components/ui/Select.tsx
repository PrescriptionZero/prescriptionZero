import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface Option {
  label: string;
  value: string | number;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Option[];
}

const Select: React.FC<SelectProps> = ({
  label,
  options = [],
  className = '',
  ...props
}) => {
  return (
    <div className="flex flex-col w-full">
      {label && (
        <label className="text-sm font-semibold text-zinc-700 mb-1.5 ml-1">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          className={`appearance-none flex w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-4 py-3.5 text-sm text-zinc-900 transition-all focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-50 pr-10 ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {/* Ícono de flecha personalizado */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">
          <ChevronDown className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
};

export default Select;