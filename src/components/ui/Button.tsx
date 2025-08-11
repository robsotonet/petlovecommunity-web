'use client';

import React, { ButtonHTMLAttributes, ReactNode } from 'react';
import { useCorrelationContext } from '../enterprise/CorrelationProvider';
import { IdempotentButton } from '../enterprise/IdempotencyGuard';

export type ButtonVariant = 'adoption' | 'service' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface BaseButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  className?: string;
}

interface RegularButtonProps extends BaseButtonProps {
  onClick?: () => void;
  idempotent?: false;
}

interface IdempotentButtonProps extends BaseButtonProps {
  onClick: () => Promise<unknown>;
  idempotent: true;
  operationName: string;
  operationParams?: Record<string, unknown>;
  expirationMinutes?: number;
  preventDoubleClick?: boolean;
  doubleClickDelay?: number;
}

export type ButtonProps = RegularButtonProps | IdempotentButtonProps;

const variantStyles: Record<ButtonVariant, string> = {
  adoption: 'btn-adoption',
  service: 'btn-service', 
  secondary: 'btn-secondary',
  outline: 'bg-transparent border-2 border-midnight text-midnight hover:bg-midnight hover:text-white',
  ghost: 'bg-transparent text-midnight hover:bg-gray-100',
  danger: 'bg-error hover:bg-red-600 active:bg-red-700 text-white',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
  xl: 'px-10 py-5 text-xl',
};

const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-brand focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

export function Button(props: ButtonProps) {
  const {
    children,
    variant = 'secondary',
    size = 'md',
    loading = false,
    icon,
    iconPosition = 'left',
    fullWidth = false,
    className = '',
    disabled,
    ..._restProps
  } = props;

  // Get correlation context for data attributes
  const correlation = useCorrelationContext();

  // Common button classes
  const buttonClasses = [
    baseStyles,
    variantStyles[variant],
    sizeStyles[size],
    fullWidth ? 'w-full' : '',
    className,
  ].filter(Boolean).join(' ');

  // Common data attributes
  const dataAttributes = {
    'data-correlation-id': correlation.currentContext.correlationId,
    'data-button-variant': variant,
    'data-button-size': size,
    'data-loading': loading,
  };

  // Loading spinner component
  const LoadingSpinner = () => (
    <svg
      className="animate-spin -ml-1 mr-3 h-5 w-5 text-current"
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
  );

  // Render content with optional icon
  const renderContent = () => (
    <>
      {loading && <LoadingSpinner />}
      {!loading && icon && iconPosition === 'left' && (
        <span className="mr-2">{icon}</span>
      )}
      <span>{children}</span>
      {!loading && icon && iconPosition === 'right' && (
        <span className="ml-2">{icon}</span>
      )}
    </>
  );

  // Handle idempotent buttons
  if ('idempotent' in props && props.idempotent) {
    const {
      onClick,
      operationName,
      operationParams = {},
      expirationMinutes = 60,
      preventDoubleClick = true,
      doubleClickDelay = 1000,
      idempotent: _idempotent,
      ...buttonProps
    } = props;

    return (
      <IdempotentButton
        {...buttonProps}
        onClick={onClick}
        operationName={operationName}
        operationParams={operationParams}
        expirationMinutes={expirationMinutes}
        preventDoubleClick={preventDoubleClick}
        doubleClickDelay={doubleClickDelay}
        className={buttonClasses}
        disabled={disabled || loading}
        {...dataAttributes}
      >
        {renderContent()}
      </IdempotentButton>
    );
  }

  // Handle regular buttons
  const { onClick, ...buttonProps } = props as RegularButtonProps;

  const handleClick = () => {
    if (loading || disabled) return;
    onClick?.();
  };

  return (
    <button
      {...buttonProps}
      onClick={handleClick}
      className={buttonClasses}
      disabled={disabled || loading}
      {...dataAttributes}
    >
      {renderContent()}
    </button>
  );
}

// Specialized button components for common use cases
export function AdoptionButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button {...props} variant="adoption" />;
}

export function ServiceButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button {...props} variant="service" />;
}

export function SecondaryButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button {...props} variant="secondary" />;
}

export function DangerButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button {...props} variant="danger" />;
}

// Button group component for related actions
interface ButtonGroupProps {
  children: ReactNode;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  spacing?: 'tight' | 'normal' | 'loose';
}

export function ButtonGroup({
  children,
  className = '',
  orientation = 'horizontal',
  spacing = 'normal',
}: ButtonGroupProps) {
  const spacingStyles = {
    tight: orientation === 'horizontal' ? 'space-x-1' : 'space-y-1',
    normal: orientation === 'horizontal' ? 'space-x-3' : 'space-y-3',
    loose: orientation === 'horizontal' ? 'space-x-6' : 'space-y-6',
  };

  const orientationStyles = {
    horizontal: 'flex flex-row',
    vertical: 'flex flex-col',
  };

  return (
    <div className={`${orientationStyles[orientation]} ${spacingStyles[spacing]} ${className}`}>
      {children}
    </div>
  );
}

// Icon button component for actions with just icons
interface IconButtonProps extends Omit<ButtonProps, 'children'> {
  icon: ReactNode;
  'aria-label': string;
  tooltip?: string;
}

export function IconButton({
  icon,
  'aria-label': ariaLabel,
  tooltip,
  size = 'md',
  className = '',
  ...props
}: IconButtonProps) {
  const iconSizeClasses = {
    sm: 'p-2',
    md: 'p-3',
    lg: 'p-4',
    xl: 'p-5',
  };

  return (
    <Button
      {...props}
      size={size}
      className={`${iconSizeClasses[size]} ${className}`}
      aria-label={ariaLabel}
      title={tooltip || ariaLabel}
    >
      {icon}
    </Button>
  );
}