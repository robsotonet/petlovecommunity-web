// Design system component types
export type ButtonVariant = 'adoption' | 'service' | 'secondary' | 'outline';
export type CardVariant = 'pet' | 'service' | 'event' | 'default';
export type ColorScheme = 'coral' | 'teal' | 'midnight' | 'beige';

export interface ComponentWithCorrelation {
  correlationId?: string;
}

export interface DesignSystemProps extends ComponentWithCorrelation {
  className?: string;
  children?: React.ReactNode;
}

// Pet Love Community specific component props
export interface PetCardProps extends DesignSystemProps {
  pet: {
    id: string;
    name: string;
    breed: string;
    age: string;
    description: string;
    imageUrl: string;
    isUrgent?: boolean;
  };
  onAdopt?: (petId: string) => void;
  onFavorite?: (petId: string) => void;
}

export interface ServiceCardProps extends DesignSystemProps {
  service: {
    id: string;
    title: string;
    provider: string;
    description: string;
    price: string;
    availability: string;
  };
  onBook?: (serviceId: string) => void;
}