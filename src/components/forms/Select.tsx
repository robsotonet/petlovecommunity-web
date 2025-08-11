'use client';

import React, { SelectHTMLAttributes, forwardRef } from 'react';
import { useCorrelationContext } from '../enterprise/CorrelationProvider';

export type SelectSize = 'sm' | 'md' | 'lg';

interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  size?: SelectSize;
  fullWidth?: boolean;
  required?: boolean;
  showOptional?: boolean;
  loading?: boolean;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  containerClassName?: string;
}

const sizeStyles: Record<SelectSize, string> = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-3 text-base',
  lg: 'px-5 py-4 text-lg',
};

const baseSelectStyles = 'input-field appearance-none bg-white transition-brand cursor-pointer';

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({
    label,
    error,
    hint,
    size = 'md',
    fullWidth = true,
    required = false,
    showOptional = false,
    loading = false,
    options,
    placeholder,
    className = '',
    containerClassName = '',
    id,
    ...props
  }, ref) => {
    const correlation = useCorrelationContext();
    const selectId = id || `select-${correlation.currentContext.correlationId}-${Math.random().toString(36).substr(2, 9)}`;

    const selectClasses = [
      baseSelectStyles,
      sizeStyles[size],
      error ? 'error' : '',
      fullWidth ? 'w-full' : '',
      'pr-12', // Space for dropdown arrow
      className,
    ].filter(Boolean).join(' ');

    const containerClasses = [
      'relative',
      fullWidth ? 'w-full' : '',
      containerClassName,
    ].filter(Boolean).join(' ');

    return (
      <div className={containerClasses}>
        {/* Label */}
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-midnight mb-2">
            {label}
            {required && <span className="text-error ml-1">*</span>}
            {!required && showOptional && (
              <span className="text-text-tertiary ml-1 font-normal">(optional)</span>
            )}
          </label>
        )}

        {/* Select Container */}
        <div className="relative">
          <select
            {...props}
            ref={ref}
            id={selectId}
            className={selectClasses}
            data-correlation-id={correlation.currentContext.correlationId}
            data-select-size={size}
            data-has-error={!!error}
            disabled={props.disabled || loading}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={`${option.value}`}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>

          {/* Dropdown Arrow */}
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
            {loading ? (
              <svg
                className="animate-spin h-4 w-4 text-teal"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
              <svg
                className="h-5 w-5 text-text-tertiary"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <p className="mt-2 text-sm text-error" id={`${selectId}-error`}>
            {error}
          </p>
        )}

        {/* Hint */}
        {hint && !error && (
          <p className="mt-2 text-sm text-text-tertiary" id={`${selectId}-hint`}>
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

// Multi-Select component (requires additional state management)
interface MultiSelectProps extends Omit<SelectProps, 'options' | 'value' | 'onChange'> {
  options: SelectOption[];
  value: (string | number)[];
  onChange: (values: (string | number)[]) => void;
  maxSelection?: number;
}

export function MultiSelect({
  value = [],
  onChange,
  maxSelection,
  options,
  ...props
}: MultiSelectProps) {
  const handleToggle = (optionValue: string | number) => {
    const isSelected = value.includes(optionValue);
    
    if (isSelected) {
      onChange(value.filter(v => v !== optionValue));
    } else {
      if (maxSelection && value.length >= maxSelection) {
        return; // Don't add if max reached
      }
      onChange([...value, optionValue]);
    }
  };

  return (
    <div className={props.containerClassName}>
      {props.label && (
        <label className="block text-sm font-medium text-midnight mb-2">
          {props.label}
          {props.required && <span className="text-error ml-1">*</span>}
          {!props.required && props.showOptional && (
            <span className="text-text-tertiary ml-1 font-normal">(optional)</span>
          )}
        </label>
      )}

      <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-lg p-3">
        {options.map((option) => {
          const isSelected = value.includes(option.value);
          const isDisabled = option.disabled || 
            (maxSelection && !isSelected && value.length >= maxSelection);

          return (
            <label
              key={`${option.value}`}
              className={`flex items-center space-x-3 p-2 rounded cursor-pointer transition-colors ${
                isDisabled 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-teal-bg'
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => !isDisabled && handleToggle(option.value)}
                disabled={isDisabled}
                className="rounded border-border text-teal focus:ring-teal focus:ring-offset-0"
              />
              <span className="text-sm text-midnight">{option.label}</span>
            </label>
          );
        })}
      </div>

      {maxSelection && (
        <p className="mt-2 text-xs text-text-tertiary">
          {value.length} of {maxSelection} selected
        </p>
      )}

      {props.error && (
        <p className="mt-2 text-sm text-error">{props.error}</p>
      )}

      {props.hint && !props.error && (
        <p className="mt-2 text-sm text-text-tertiary">{props.hint}</p>
      )}
    </div>
  );
}