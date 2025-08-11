'use client';

import React, { TextareaHTMLAttributes, forwardRef } from 'react';
import { useCorrelationContext } from '../enterprise/CorrelationProvider';

export type TextareaSize = 'sm' | 'md' | 'lg';
export type TextareaResize = 'none' | 'vertical' | 'horizontal' | 'both';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  size?: TextareaSize;
  resize?: TextareaResize;
  fullWidth?: boolean;
  required?: boolean;
  showOptional?: boolean;
  loading?: boolean;
  showCharCount?: boolean;
  maxLength?: number;
  minRows?: number;
  maxRows?: number;
  autoResize?: boolean;
  className?: string;
  containerClassName?: string;
}

const sizeStyles: Record<TextareaSize, string> = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-3 text-base',
  lg: 'px-5 py-4 text-lg',
};

const resizeStyles: Record<TextareaResize, string> = {
  none: 'resize-none',
  vertical: 'resize-y',
  horizontal: 'resize-x',
  both: 'resize',
};

const baseTextareaStyles = 'input-field transition-brand';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({
    label,
    error,
    hint,
    size = 'md',
    resize = 'vertical',
    fullWidth = true,
    required = false,
    showOptional = false,
    loading = false,
    showCharCount = false,
    maxLength,
    minRows = 3,
    maxRows,
    autoResize = false,
    className = '',
    containerClassName = '',
    id,
    value,
    onChange,
    ...props
  }, ref) => {
    const correlation = useCorrelationContext();
    const textareaId = id || `textarea-${correlation.currentContext.correlationId}-${Math.random().toString(36).substr(2, 9)}`;
    
    const [currentValue, setCurrentValue] = React.useState(value || '');
    const textareaRef = React.useRef<HTMLTextAreaElement>();
    
    // Combine refs
    const combinedRef = React.useCallback(
      (node: HTMLTextAreaElement) => {
        textareaRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref]
    );

    // Auto-resize functionality
    const adjustHeight = React.useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea || !autoResize) return;

      textarea.style.height = 'auto';
      let newHeight = textarea.scrollHeight;

      if (minRows) {
        const lineHeight = parseInt(getComputedStyle(textarea).lineHeight || '20', 10);
        const minHeight = lineHeight * minRows;
        newHeight = Math.max(newHeight, minHeight);
      }

      if (maxRows) {
        const lineHeight = parseInt(getComputedStyle(textarea).lineHeight || '20', 10);
        const maxHeight = lineHeight * maxRows;
        newHeight = Math.min(newHeight, maxHeight);
      }

      textarea.style.height = `${newHeight}px`;
    }, [autoResize, minRows, maxRows]);

    // Handle value changes
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setCurrentValue(newValue);
      onChange?.(e);
      
      if (autoResize) {
        requestAnimationFrame(adjustHeight);
      }
    };

    // Initialize auto-resize
    React.useEffect(() => {
      if (autoResize) {
        adjustHeight();
      }
    }, [adjustHeight, currentValue]);

    const textareaClasses = [
      baseTextareaStyles,
      sizeStyles[size],
      resizeStyles[resize],
      error ? 'error' : '',
      fullWidth ? 'w-full' : '',
      className,
    ].filter(Boolean).join(' ');

    const containerClasses = [
      'relative',
      fullWidth ? 'w-full' : '',
      containerClassName,
    ].filter(Boolean).join(' ');

    const currentLength = String(currentValue || value || '').length;
    const isOverLimit = maxLength ? currentLength > maxLength : false;

    return (
      <div className={containerClasses}>
        {/* Label */}
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium text-midnight mb-2">
            {label}
            {required && <span className="text-error ml-1">*</span>}
            {!required && showOptional && (
              <span className="text-text-tertiary ml-1 font-normal">(optional)</span>
            )}
          </label>
        )}

        {/* Textarea Container */}
        <div className="relative">
          <textarea
            {...props}
            ref={combinedRef}
            id={textareaId}
            value={value}
            onChange={handleChange}
            rows={autoResize ? minRows : props.rows || minRows}
            maxLength={maxLength}
            className={textareaClasses}
            data-correlation-id={correlation.currentContext.correlationId}
            data-textarea-size={size}
            data-has-error={!!error}
            disabled={props.disabled || loading}
          />

          {/* Loading Indicator */}
          {loading && (
            <div className="absolute top-3 right-3">
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

        {/* Character Count */}
        {showCharCount && (
          <div className="mt-2 flex justify-between items-center text-sm">
            <span></span>
            <span className={isOverLimit ? 'text-error' : 'text-text-tertiary'}>
              {currentLength}
              {maxLength && `/${maxLength}`}
            </span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <p className="mt-2 text-sm text-error" id={`${textareaId}-error`}>
            {error}
          </p>
        )}

        {/* Hint */}
        {hint && !error && (
          <p className="mt-2 text-sm text-text-tertiary" id={`${textareaId}-hint`}>
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// Rich Text Editor wrapper (would need additional library like TinyMCE or Quill)
interface RichTextEditorProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  placeholder?: string;
  required?: boolean;
  showOptional?: boolean;
  disabled?: boolean;
  className?: string;
}

export function RichTextEditor({
  label,
  value,
  onChange,
  error,
  hint,
  placeholder = 'Start typing...',
  required = false,
  showOptional = false,
  disabled = false,
  className = '',
}: RichTextEditorProps) {
  // This is a placeholder for a rich text editor integration
  // In a real implementation, you would integrate with a library like:
  // - Quill.js
  // - TinyMCE
  // - Draft.js
  // - Tiptap
  
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-midnight mb-2">
          {label}
          {required && <span className="text-error ml-1">*</span>}
          {!required && showOptional && (
            <span className="text-text-tertiary ml-1 font-normal">(optional)</span>
          )}
        </label>
      )}

      <div className="border border-border rounded-lg">
        {/* Toolbar */}
        <div className="border-b border-border px-4 py-2 bg-gray-50 rounded-t-lg">
          <div className="flex items-center space-x-2 text-sm">
            <button
              type="button"
              className="p-1 hover:bg-gray-200 rounded"
              disabled={disabled}
              title="Bold"
            >
              <strong>B</strong>
            </button>
            <button
              type="button"
              className="p-1 hover:bg-gray-200 rounded italic"
              disabled={disabled}
              title="Italic"
            >
              I
            </button>
            <button
              type="button"
              className="p-1 hover:bg-gray-200 rounded underline"
              disabled={disabled}
              title="Underline"
            >
              U
            </button>
          </div>
        </div>

        {/* Editor Area */}
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          minRows={6}
          resize="vertical"
          className="border-0 rounded-t-none"
        />
      </div>

      {error && (
        <p className="mt-2 text-sm text-error">{error}</p>
      )}

      {hint && !error && (
        <p className="mt-2 text-sm text-text-tertiary">{hint}</p>
      )}
    </div>
  );
}