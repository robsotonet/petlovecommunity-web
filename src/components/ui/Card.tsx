'use client';

import React, { ReactNode, HTMLAttributes } from 'react';
import { useCorrelationContext } from '../enterprise/CorrelationProvider';

export type CardVariant = 'pet' | 'service' | 'default' | 'feature' | 'testimonial';
export type CardSize = 'sm' | 'md' | 'lg' | 'xl';
export type CardShadow = 'none' | 'sm' | 'md' | 'lg' | 'xl';

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  children: ReactNode;
  variant?: CardVariant;
  size?: CardSize;
  shadow?: CardShadow;
  hoverable?: boolean;
  clickable?: boolean;
  loading?: boolean;
  className?: string;
}

const variantStyles: Record<CardVariant, string> = {
  pet: 'card-pet',
  service: 'card-service',
  default: 'card-default',
  feature: 'bg-gradient-to-br from-coral/5 to-teal/5 border border-teal/20 rounded-xl',
  testimonial: 'bg-white border-l-4 border-l-teal rounded-xl',
};

const sizeStyles: Record<CardSize, string> = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  xl: 'p-10',
};

const shadowStyles: Record<CardShadow, string> = {
  none: 'shadow-none',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
};

export function Card({
  children,
  variant = 'default',
  size = 'md',
  shadow = 'md',
  hoverable = false,
  clickable = false,
  loading = false,
  className = '',
  onClick,
  ...props
}: CardProps) {
  const correlation = useCorrelationContext();

  const cardClasses = [
    variantStyles[variant],
    sizeStyles[size],
    shadowStyles[shadow],
    hoverable ? 'hover:shadow-card-hover transform hover:scale-[1.02]' : '',
    clickable ? 'cursor-pointer' : '',
    loading ? 'animate-pulse' : '',
    className,
  ].filter(Boolean).join(' ');

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (clickable && onClick) {
      onClick(e);
    }
  };

  return (
    <div
      {...props}
      className={cardClasses}
      onClick={handleClick}
      data-correlation-id={correlation.currentContext.correlationId}
      data-card-variant={variant}
      data-card-clickable={clickable}
      data-card-loading={loading}
    >
      {loading ? <CardSkeleton /> : children}
    </div>
  );
}

// Card Header component
interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  );
}

// Card Title component
interface CardTitleProps {
  children: ReactNode;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
}

export function CardTitle({ children, level = 3, className = '' }: CardTitleProps) {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  const levelStyles = {
    1: 'text-3xl font-bold text-midnight',
    2: 'text-2xl font-bold text-midnight',
    3: 'text-xl font-semibold text-midnight',
    4: 'text-lg font-semibold text-midnight',
    5: 'text-base font-semibold text-midnight',
    6: 'text-sm font-semibold text-midnight',
  };

  return (
    <Tag className={`${levelStyles[level]} ${className}`}>
      {children}
    </Tag>
  );
}

// Card Content component
interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return (
    <div className={`text-text-secondary ${className}`}>
      {children}
    </div>
  );
}

// Card Footer component
interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div className={`mt-6 ${className}`}>
      {children}
    </div>
  );
}

// Card Actions component
interface CardActionsProps {
  children: ReactNode;
  className?: string;
  alignment?: 'left' | 'center' | 'right' | 'between';
}

export function CardActions({ 
  children, 
  className = '', 
  alignment = 'right' 
}: CardActionsProps) {
  const alignmentStyles = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div className={`flex items-center space-x-3 ${alignmentStyles[alignment]} ${className}`}>
      {children}
    </div>
  );
}

// Loading skeleton for cards
function CardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
      <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
      <div className="h-3 bg-gray-200 rounded w-2/3 mb-4"></div>
      <div className="h-8 bg-gray-200 rounded w-1/4"></div>
    </div>
  );
}

// Specialized Card components
export function PetCard({ 
  children, 
  ...props 
}: Omit<CardProps, 'variant'>) {
  return (
    <Card {...props} variant="pet" hoverable>
      {children}
    </Card>
  );
}

export function ServiceCard({ 
  children, 
  ...props 
}: Omit<CardProps, 'variant'>) {
  return (
    <Card {...props} variant="service" hoverable>
      {children}
    </Card>
  );
}

export function FeatureCard({ 
  children, 
  ...props 
}: Omit<CardProps, 'variant'>) {
  return (
    <Card {...props} variant="feature" hoverable>
      {children}
    </Card>
  );
}

export function TestimonialCard({ 
  children, 
  ...props 
}: Omit<CardProps, 'variant'>) {
  return (
    <Card {...props} variant="testimonial">
      {children}
    </Card>
  );
}

// Card Grid component for organizing multiple cards
interface CardGridProps {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4 | 6;
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  responsive?: boolean;
  className?: string;
}

export function CardGrid({
  children,
  columns = 3,
  gap = 'md',
  responsive = true,
  className = '',
}: CardGridProps) {
  const columnStyles = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
  };

  const gapStyles = {
    sm: 'gap-3',
    md: 'gap-6',
    lg: 'gap-8',
    xl: 'gap-10',
  };

  const gridClasses = responsive 
    ? columnStyles[columns] 
    : `grid-cols-${columns}`;

  return (
    <div className={`grid ${gridClasses} ${gapStyles[gap]} ${className}`}>
      {children}
    </div>
  );
}

// Statistics Card component for metrics display
interface StatsCardProps extends Omit<CardProps, 'children'> {
  label: string;
  value: string | number;
  change?: {
    value: string | number;
    type: 'increase' | 'decrease' | 'neutral';
  };
  icon?: ReactNode;
}

export function StatsCard({
  label,
  value,
  change,
  icon,
  ...props
}: StatsCardProps) {
  const changeColors = {
    increase: 'text-success',
    decrease: 'text-error',
    neutral: 'text-text-tertiary',
  };

  const changeIcons = {
    increase: '↗',
    decrease: '↘',
    neutral: '→',
  };

  return (
    <Card {...props}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <CardTitle level={4} className="text-text-tertiary font-medium mb-2">
            {label}
          </CardTitle>
          <div className="text-3xl font-bold text-midnight mb-1">
            {value}
          </div>
          {change && (
            <div className={`text-sm flex items-center ${changeColors[change.type]}`}>
              <span className="mr-1">{changeIcons[change.type]}</span>
              {change.value}
            </div>
          )}
        </div>
        {icon && (
          <div className="text-teal">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}