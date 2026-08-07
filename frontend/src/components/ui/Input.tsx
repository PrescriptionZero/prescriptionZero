import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: boolean | string;
}

const Input: React.FC<InputProps> = ({
  label,
  className = '',
  error,
  ...props
}) => {
  return (
    <div className="flex flex-col w-full">
      {label && (
        <label className="text-sm font-semibold text-zinc-700 mb-1.5 ml-1">
          {label}
        </label>
      )}
      <input
        className={`flex w-full rounded-2xl border bg-zinc-50/50 px-4 py-3.5 text-sm text-zinc-900 transition-all placeholder:text-zinc-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-50 ${
          error 
            ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10' 
            : 'border-zinc-200'
        } ${className}`}
        {...props}
      />
      {typeof error === 'string' && (
        <span className="text-xs text-rose-500 font-medium ml-1 mt-1.5">
          {error}
        </span>
      )}
    </div>
  );
};

export default Input;