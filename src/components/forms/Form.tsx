'use client';

import React, { FormHTMLAttributes, ReactNode } from 'react';
import { useCorrelationContext } from '../enterprise/CorrelationProvider';

interface FormProps extends FormHTMLAttributes<HTMLFormElement> {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  loading?: boolean;
  error?: string;
  success?: string;
  className?: string;
}

export function Form({
  children,
  title,
  subtitle,
  loading = false,
  error,
  success,
  className = '',
  onSubmit,
  ...props
}: FormProps) {
  const correlation = useCorrelationContext();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (loading) {
      e.preventDefault();
      return;
    }
    
    onSubmit?.(e);
  };

  return (
    <form
      {...props}
      onSubmit={handleSubmit}
      className={`space-y-6 ${className}`}
      data-correlation-id={correlation.currentContext.correlationId}
      data-form-loading={loading}
    >
      {/* Form Header */}
      {(title || subtitle) && (
        <div className="text-center">
          {title && (
            <h2 className="text-2xl font-bold text-midnight mb-2">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-text-secondary">
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Global Error */}
      {error && (
        <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        </div>
      )}

      {/* Global Success */}
      {success && (
        <div className="bg-success/10 border border-success/20 text-success px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {success}
          </div>
        </div>
      )}

      {/* Form Content */}
      <fieldset disabled={loading} className={loading ? 'opacity-60' : ''}>
        {children}
      </fieldset>
    </form>
  );
}

// Form Section component for grouping related fields
interface FormSectionProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
}

export function FormSection({
  children,
  title,
  subtitle,
  className = '',
}: FormSectionProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {(title || subtitle) && (
        <div className="border-b border-border pb-4">
          {title && (
            <h3 className="text-lg font-semibold text-midnight">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-text-secondary mt-1">
              {subtitle}
            </p>
          )}
        </div>
      )}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

// Form Group component for related fields in a row
interface FormGroupProps {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function FormGroup({
  children,
  columns = 2,
  gap = 'md',
  className = '',
}: FormGroupProps) {
  const columnStyles = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  const gapStyles = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
  };

  return (
    <div className={`grid ${columnStyles[columns]} ${gapStyles[gap]} ${className}`}>
      {children}
    </div>
  );
}

// Form Actions component for buttons
interface FormActionsProps {
  children: ReactNode;
  alignment?: 'left' | 'center' | 'right' | 'between';
  className?: string;
}

export function FormActions({
  children,
  alignment = 'right',
  className = '',
}: FormActionsProps) {
  const alignmentStyles = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div className={`flex items-center space-x-4 ${alignmentStyles[alignment]} ${className}`}>
      {children}
    </div>
  );
}

// Field Error component for individual field errors
interface FieldErrorProps {
  error?: string;
  className?: string;
}

export function FieldError({ error, className = '' }: FieldErrorProps) {
  if (!error) return null;

  return (
    <p className={`mt-1 text-sm text-error ${className}`} role="alert">
      {error}
    </p>
  );
}

// Field Hint component for help text
interface FieldHintProps {
  hint: string;
  className?: string;
}

export function FieldHint({ hint, className = '' }: FieldHintProps) {
  return (
    <p className={`mt-1 text-sm text-text-tertiary ${className}`}>
      {hint}
    </p>
  );
}

// Required indicator component
export function RequiredIndicator() {
  return <span className="text-error ml-1" aria-label="required">*</span>;
}

// Optional indicator component
export function OptionalIndicator() {
  return (
    <span className="text-text-tertiary ml-1 font-normal text-sm">
      (optional)
    </span>
  );
}