'use client';

import React, { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCorrelationContext } from '../enterprise/CorrelationProvider';

export interface NavItem {
  href: string;
  label: string;
  icon?: ReactNode;
  badge?: string | number;
  disabled?: boolean;
  children?: NavItem[];
}

interface NavigationProps {
  items: NavItem[];
  variant?: 'horizontal' | 'vertical' | 'mobile';
  showIcons?: boolean;
  showLabels?: boolean;
  collapsible?: boolean;
  className?: string;
}

export function Navigation({
  items,
  variant = 'horizontal',
  showIcons = true,
  showLabels = true,
  collapsible = false,
  className = '',
}: NavigationProps) {
  const pathname = usePathname();
  const correlation = useCorrelationContext();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const variantStyles = {
    horizontal: 'flex flex-row space-x-1',
    vertical: 'flex flex-col space-y-1',
    mobile: 'flex flex-col space-y-1 md:flex-row md:space-y-0 md:space-x-1',
  };

  const containerClasses = [
    variantStyles[variant],
    collapsed && variant === 'vertical' ? 'w-16' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <nav 
      className={containerClasses}
      data-correlation-id={correlation.currentContext.correlationId}
      data-nav-variant={variant}
      data-nav-collapsed={collapsed}
    >
      {collapsible && variant === 'vertical' && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-3 text-text-tertiary hover:text-coral transition-colors mb-4"
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {collapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            )}
          </svg>
        </button>
      )}

      {items.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          isActive={isActive(item.href)}
          collapsed={collapsed}
          showIcons={showIcons}
          showLabels={showLabels}
          variant={variant}
        />
      ))}
    </nav>
  );
}

interface NavLinkProps {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
  showIcons: boolean;
  showLabels: boolean;
  variant: 'horizontal' | 'vertical' | 'mobile';
}

function NavLink({ 
  item, 
  isActive, 
  collapsed, 
  showIcons, 
  showLabels,
  variant 
}: NavLinkProps) {
  const [showChildren, setShowChildren] = useState(false);

  const linkClasses = [
    'flex items-center px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium',
    isActive 
      ? 'bg-coral text-white shadow-sm' 
      : 'text-text-tertiary hover:text-coral hover:bg-coral/10',
    item.disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer',
    collapsed && variant === 'vertical' ? 'justify-center px-3' : '',
  ].filter(Boolean).join(' ');

  const hasChildren = item.children && item.children.length > 0;

  const handleClick = (e: React.MouseEvent) => {
    if (hasChildren) {
      e.preventDefault();
      setShowChildren(!showChildren);
    }
  };

  const LinkContent = () => (
    <>
      {showIcons && item.icon && (
        <span className={showLabels && !collapsed ? 'mr-3' : ''}>
          {item.icon}
        </span>
      )}
      
      {showLabels && !collapsed && (
        <span className="flex-1">{item.label}</span>
      )}

      {item.badge && !collapsed && (
        <span className="ml-2 px-2 py-1 bg-teal text-white text-xs rounded-full">
          {item.badge}
        </span>
      )}

      {hasChildren && !collapsed && (
        <svg
          className={`ml-2 w-4 h-4 transition-transform ${showChildren ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      )}
    </>
  );

  return (
    <div>
      {hasChildren ? (
        <button
          onClick={handleClick}
          className={linkClasses}
          title={collapsed ? item.label : undefined}
        >
          <LinkContent />
        </button>
      ) : (
        <Link
          href={item.href}
          className={linkClasses}
          title={collapsed ? item.label : undefined}
        >
          <LinkContent />
        </Link>
      )}

      {/* Sub-navigation */}
      {hasChildren && showChildren && !collapsed && (
        <div className="ml-6 mt-2 space-y-1">
          {item.children!.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              className={[
                'flex items-center px-3 py-2 rounded text-sm transition-colors',
                isActive 
                  ? 'text-coral bg-coral/10' 
                  : 'text-text-tertiary hover:text-coral hover:bg-coral/5',
                child.disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : '',
              ].filter(Boolean).join(' ')}
            >
              {child.icon && <span className="mr-2">{child.icon}</span>}
              <span>{child.label}</span>
              {child.badge && (
                <span className="ml-auto px-2 py-1 bg-teal text-white text-xs rounded-full">
                  {child.badge}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// Breadcrumb Navigation
interface BreadcrumbItem {
  href?: string;
  label: string;
  icon?: ReactNode;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: ReactNode;
  className?: string;
}

export function Breadcrumb({
  items,
  separator,
  className = '',
}: BreadcrumbProps) {
  const correlation = useCorrelationContext();

  const defaultSeparator = (
    <svg className="w-4 h-4 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );

  return (
    <nav
      className={`flex items-center space-x-2 text-sm ${className}`}
      data-correlation-id={correlation.currentContext.correlationId}
    >
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <span className="flex items-center">
              {separator || defaultSeparator}
            </span>
          )}
          
          {item.href ? (
            <Link
              href={item.href}
              className="flex items-center text-text-tertiary hover:text-coral transition-colors"
            >
              {item.icon && <span className="mr-1">{item.icon}</span>}
              {item.label}
            </Link>
          ) : (
            <span className="flex items-center text-midnight font-medium">
              {item.icon && <span className="mr-1">{item.icon}</span>}
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

// Tab Navigation
interface TabItem {
  id: string;
  label: string;
  icon?: ReactNode;
  content?: ReactNode;
  disabled?: boolean;
  badge?: string | number;
}

interface TabsProps {
  items: TabItem[];
  defaultActive?: string;
  onChange?: (activeTab: string) => void;
  variant?: 'default' | 'pills' | 'underline';
  className?: string;
}

export function Tabs({
  items,
  defaultActive,
  onChange,
  variant = 'default',
  className = '',
}: TabsProps) {
  const correlation = useCorrelationContext();
  const [activeTab, setActiveTab] = useState(defaultActive || items[0]?.id);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  const variantStyles = {
    default: 'border-b border-border',
    pills: 'bg-gray-100 rounded-lg p-1',
    underline: 'border-b-2 border-transparent',
  };

  const tabStyles = {
    default: (isActive: boolean) => 
      `px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
        isActive 
          ? 'border-coral text-coral' 
          : 'border-transparent text-text-tertiary hover:text-coral hover:border-coral/30'
      }`,
    pills: (isActive: boolean) =>
      `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
        isActive 
          ? 'bg-white text-coral shadow-sm' 
          : 'text-text-tertiary hover:text-coral hover:bg-white/50'
      }`,
    underline: (isActive: boolean) =>
      `px-4 py-2 font-medium text-sm transition-colors ${
        isActive 
          ? 'text-coral border-coral' 
          : 'text-text-tertiary hover:text-coral'
      }`,
  };

  const activeItem = items.find(item => item.id === activeTab);

  return (
    <div 
      className={className}
      data-correlation-id={correlation.currentContext.correlationId}
    >
      {/* Tab Headers */}
      <div className={`flex ${variantStyles[variant]}`}>
        {items.map((tab) => {
          const isActive = tab.id === activeTab;
          
          return (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && handleTabChange(tab.id)}
              className={`${tabStyles[variant](isActive)} ${
                tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
              disabled={tab.disabled}
            >
              <div className="flex items-center">
                {tab.icon && <span className="mr-2">{tab.icon}</span>}
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="ml-2 px-2 py-1 bg-teal text-white text-xs rounded-full">
                    {tab.badge}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeItem?.content && (
        <div className="mt-6">
          {activeItem.content}
        </div>
      )}
    </div>
  );
}

// Mobile Navigation Menu
interface MobileMenuProps {
  items: NavItem[];
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export function MobileMenu({
  items,
  isOpen,
  onClose,
  className = '',
}: MobileMenuProps) {
  const pathname = usePathname();
  const correlation = useCorrelationContext();

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 ${className}`}
      data-correlation-id={correlation.currentContext.correlationId}
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50" 
        onClick={onClose}
      />

      {/* Menu Panel */}
      <div className="fixed inset-y-0 left-0 w-80 bg-white shadow-xl overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-midnight">Menu</h2>
            <button
              onClick={onClose}
              className="p-2 text-text-tertiary hover:text-coral transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation Items */}
          <Navigation
            items={items}
            variant="vertical"
            className="space-y-2"
          />
        </div>
      </div>
    </div>
  );
}