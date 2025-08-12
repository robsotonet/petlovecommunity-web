'use client';

import React, { InputHTMLAttributes, ReactNode, forwardRef } from 'react';
import { useCorrelationContext } from '../enterprise/CorrelationProvider';

export type InputVariant = 'default' | 'search' | 'email' | 'password' | 'number';
export type InputSize = 'sm' | 'md' | 'lg';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'onChange'> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  variant?: InputVariant;
  size?: InputSize;
  fullWidth?: boolean;
  required?: boolean;
  showOptional?: boolean;
  loading?: boolean;
  className?: string;
  containerClassName?: string;
  onChange?: (value: string) => void;
}

const sizeStyles: Record<InputSize, string> = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-3 text-base',
  lg: 'px-5 py-4 text-lg',
};

const baseInputStyles = 'input-field transition-brand';

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({
    label,
    error,
    hint,
    leftIcon,
    rightIcon,
    variant = 'default',
    size = 'md',
    fullWidth = true,
    required = false,
    showOptional = false,
    loading = false,
    className = '',
    containerClassName = '',
    id,
    onChange,
    ...props
  }, ref) => {
    const correlation = useCorrelationContext();
    const inputId = id || `input-${correlation.currentContext.correlationId}-${Math.random().toString(36).substr(2, 9)}`;

    // Create custom onChange handler that passes value instead of event
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onChange) {
        onChange(e.target.value);
      }
    };

    const inputClasses = [
      baseInputStyles,
      sizeStyles[size],
      error ? 'error' : '',
      leftIcon ? 'pl-12' : '',
      rightIcon ? 'pr-12' : '',
      fullWidth ? 'w-full' : '',
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
          <label htmlFor={inputId} className="block text-sm font-medium text-midnight mb-2">
            {label}
            {required && <span className="text-error ml-1">*</span>}
            {!required && showOptional && (
              <span className="text-text-tertiary ml-1 font-normal">(optional)</span>
            )}
          </label>
        )}

        {/* Input Container */}
        <div className="relative">
          {/* Left Icon */}
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-tertiary">
              {leftIcon}
            </div>
          )}

          {/* Input Field */}
          <input
            {...props}
            ref={ref}
            id={inputId}
            className={inputClasses}
            onChange={handleChange}
            data-correlation-id={correlation.currentContext.correlationId}
            data-input-variant={variant}
            data-input-size={size}
            data-has-error={!!error}
            disabled={props.disabled || loading}
          />

          {/* Right Icon */}
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-text-tertiary">
              {rightIcon}
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
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
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <p className="mt-2 text-sm text-error" id={`${inputId}-error`}>
            {error}
          </p>
        )}

        {/* Hint */}
        {hint && !error && (
          <p className="mt-2 text-sm text-text-tertiary" id={`${inputId}-hint`}>
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// Specialized Input Components
export const SearchInput = forwardRef<HTMLInputElement, Omit<InputProps, 'variant' | 'leftIcon'>>(
  (props, ref) => {
    const searchIcon = (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    );

    return (
      <Input
        {...props}
        ref={ref}
        variant="search"
        leftIcon={searchIcon}
        placeholder="Search..."
      />
    );
  }
);

SearchInput.displayName = 'SearchInput';

export const EmailInput = forwardRef<HTMLInputElement, Omit<InputProps, 'variant' | 'type' | 'leftIcon'>>(
  (props, ref) => {
    const emailIcon = (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
      </svg>
    );

    return (
      <Input
        {...props}
        ref={ref}
        type="email"
        variant="email"
        leftIcon={emailIcon}
        placeholder="Enter your email"
      />
    );
  }
);

EmailInput.displayName = 'EmailInput';

export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputProps, 'variant' | 'type'>>(
  ({ rightIcon, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);

    const toggleIcon = (
      <button
        type="button"
        className="text-text-tertiary hover:text-midnight transition-colors"
        onClick={() => setShowPassword(!showPassword)}
        tabIndex={-1}
      >
        {showPassword ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        )}
      </button>
    );

    return (
      <Input
        {...props}
        ref={ref}
        type={showPassword ? 'text' : 'password'}
        variant="password"
        rightIcon={rightIcon || toggleIcon}
        placeholder="Enter your password"
      />
    );
  }
);

PasswordInput.displayName = 'PasswordInput';