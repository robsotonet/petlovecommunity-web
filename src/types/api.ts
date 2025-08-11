// API Types for Pet Love Community Enterprise Application
// These types define the structure of data exchanged with the .NET backend

// ============================================================================
// Pet Types
// ============================================================================

export interface Pet {
  id: string;
  name: string;
  type: PetType;
  breed: string;
  age: number; // in months
  size: PetSize;
  gender: PetGender;
  description: string;
  photos: PetPhoto[];
  location: Location;
  characteristics: PetCharacteristics;
  medicalInfo: PetMedicalInfo;
  adoptionStatus: AdoptionStatus;
  adoptionFee: number;
  shelterInfo: ShelterInfo;
  createdAt: string;
  updatedAt: string;
  featured: boolean;
}

export type PetType = 'dog' | 'cat' | 'bird' | 'rabbit' | 'fish' | 'reptile' | 'other';
export type PetSize = 'small' | 'medium' | 'large' | 'extra_large';
export type PetGender = 'male' | 'female' | 'unknown';
export type AdoptionStatus = 'available' | 'pending' | 'adopted' | 'hold' | 'unavailable';

export interface PetPhoto {
  id: string;
  url: string;
  alt: string;
  isPrimary: boolean;
  order: number;
}

export interface Location {
  city: string;
  state: string;
  zipCode: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface PetCharacteristics {
  energyLevel: 1 | 2 | 3 | 4 | 5;
  friendlyWithKids: boolean;
  friendlyWithDogs: boolean;
  friendlyWithCats: boolean;
  houseTrained: boolean;
  specialNeeds: string[];
  temperament: string[];
}

export interface PetMedicalInfo {
  vaccinated: boolean;
  spayedNeutered: boolean;
  microchipped: boolean;
  medicalHistory: string[];
  currentMedications: string[];
  allergies: string[];
  lastVetVisit?: string;
}

export interface ShelterInfo {
  id: string;
  name: string;
  phone: string;
  email: string;
  website?: string;
  address: Location;
}

// ============================================================================
// Pet Search & Filtering Types
// ============================================================================

export interface GetPetsParams {
  page?: number;
  limit?: number;
  type?: PetType;
  breed?: string;
  age?: AgeRange;
  size?: PetSize;
  location?: string; // zip code or city, state
  available?: boolean;
}

export interface PetSearchParams {
  query: string;
  filters: PetSearchFilters;
  sort?: 'relevance' | 'newest' | 'oldest' | 'age_asc' | 'age_desc' | 'fee_asc' | 'fee_desc';
  page?: number;
  limit?: number;
}

export interface PetSearchFilters {
  type?: PetType[];
  breed?: string[];
  ageRange?: AgeRange;
  sizeRange?: PetSize[];
  gender?: PetGender[];
  location?: LocationFilter;
  characteristics?: CharacteristicsFilter;
  adoptionFee?: {
    min?: number;
    max?: number;
  };
  featured?: boolean;
}

export type AgeRange = 'puppy' | 'young' | 'adult' | 'senior'; // 0-6mo, 6mo-2yr, 2-7yr, 7yr+

export interface LocationFilter {
  zipCode?: string;
  city?: string;
  state?: string;
  radiusMiles?: number;
}

export interface CharacteristicsFilter {
  energyLevel?: [number, number]; // min, max (1-5)
  friendlyWithKids?: boolean;
  friendlyWithDogs?: boolean;
  friendlyWithCats?: boolean;
  houseTrained?: boolean;
  specialNeedsOk?: boolean;
}

export interface PetSearchResponse {
  pets: Pet[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  filters: {
    availableBreeds: string[];
    availableLocations: string[];
    priceRange: {
      min: number;
      max: number;
    };
  };
}

// ============================================================================
// Adoption Application Types
// ============================================================================

export interface AdoptionApplication {
  id: string;
  petId: string;
  pet?: Pet; // Populated in responses
  applicantInfo: ApplicantInfo;
  livingSituation: LivingSituation;
  experience: PetExperience;
  references: Reference[];
  message: string;
  status: ApplicationStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  meetingScheduled?: {
    date: string;
    location: string;
    notes?: string;
  };
}

export type ApplicationStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'withdrawn' | 'completed';

export interface ApplicantInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: Location;
  dateOfBirth: string;
  occupation: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
}

export interface LivingSituation {
  housingType: 'house' | 'apartment' | 'condo' | 'townhouse' | 'other';
  ownsOrRents: 'owns' | 'rents';
  landlordApproval?: boolean;
  hasYard: boolean;
  yardFenced?: boolean;
  householdMembers: HouseholdMember[];
  otherPets: OtherPet[];
  petAllergies: boolean;
  hoursAloneDaily: number;
}

export interface HouseholdMember {
  name: string;
  age: number;
  relationship: string;
  allergicToPets: boolean;
}

export interface OtherPet {
  type: PetType;
  breed: string;
  age: number;
  vaccinated: boolean;
  spayedNeutered: boolean;
}

export interface PetExperience {
  previousPets: PreviousPet[];
  experienceLevel: 'none' | 'beginner' | 'intermediate' | 'advanced';
  trainingPlan: string;
  veterinarian?: {
    name: string;
    phone: string;
    address: string;
  };
}

export interface PreviousPet {
  type: PetType;
  breed: string;
  yearsOwned: number;
  whatHappened: string; // lived full life, rehomed, etc.
}

export interface Reference {
  type: 'personal' | 'veterinary' | 'professional';
  name: string;
  phone: string;
  email?: string;
  relationship: string;
  yearsKnown: number;
}

export interface CreateAdoptionApplicationRequest {
  petId: string;
  applicantInfo: ApplicantInfo;
  livingSituation: LivingSituation;
  experience: PetExperience;
  references: Reference[];
  message: string;
}

export interface UpdateAdoptionApplicationRequest {
  applicationId: string;
  updates: Partial<Omit<AdoptionApplication, 'id' | 'petId' | 'submittedAt'>>;
}

export interface GetAdoptionApplicationsParams {
  status?: ApplicationStatus;
  petId?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// Favorites Types
// ============================================================================

export interface GetFavoritesParams {
  page?: number;
  limit?: number;
}

// ============================================================================
// Pet Care Types
// ============================================================================

export interface PetCareGuide {
  petType: PetType;
  breed?: string;
  sections: PetCareSection[];
  resources: PetCareResource[];
  emergencyInfo: EmergencyInfo;
}

export interface PetCareSection {
  title: string;
  content: string;
  importance: 'high' | 'medium' | 'low';
  category: 'nutrition' | 'exercise' | 'grooming' | 'health' | 'behavior' | 'safety';
}

export interface PetCareResource {
  title: string;
  url: string;
  type: 'article' | 'video' | 'guide' | 'product';
  description: string;
}

export interface EmergencyInfo {
  commonEmergencies: string[];
  emergencyContacts: {
    name: string;
    phone: string;
    available24h: boolean;
  }[];
  firstAidTips: string[];
}

// ============================================================================
// Service Booking Types (for serviceApi.ts)
// ============================================================================

export interface Service {
  id: string;
  name: string;
  category: ServiceCategory;
  description: string;
  duration: number; // in minutes
  price: number;
  provider: ServiceProvider;
  location: Location;
  availability: ServiceAvailability;
  requirements: string[];
  photos: string[];
  rating: number;
  reviewCount: number;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ServiceCategory = 
  | 'veterinary' 
  | 'grooming' 
  | 'boarding' 
  | 'daycare' 
  | 'walking' 
  | 'sitting' 
  | 'training' 
  | 'transportation';

export interface ServiceProvider {
  id: string;
  name: string;
  businessName?: string;
  phone: string;
  email: string;
  website?: string;
  bio: string;
  experience: number; // years
  certifications: string[];
  insurance: boolean;
  backgroundCheck: boolean;
  rating: number;
  reviewCount: number;
}

export interface ServiceAvailability {
  daysOfWeek: number[]; // 0-6 (Sunday-Saturday)
  timeSlots: TimeSlot[];
  exceptions: AvailabilityException[];
  advanceBookingDays: number;
  cancellationPolicy: string;
}

export interface TimeSlot {
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
}

export interface AvailabilityException {
  date: string; // YYYY-MM-DD
  available: boolean;
  note?: string;
}

export interface ServiceBooking {
  id: string;
  serviceId: string;
  service?: Service; // Populated in responses
  customerId: string;
  petInfo: BookingPetInfo;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  totalPrice: number;
  status: BookingStatus;
  specialInstructions?: string;
  bookedAt: string;
  confirmedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
}

export type BookingStatus = 
  | 'pending'
  | 'confirmed' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled' 
  | 'no_show';

export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';

export interface PaymentMethod {
  type: 'credit_card' | 'debit_card' | 'bank_account' | 'digital_wallet';
  last4: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
}

export interface BookingPetInfo {
  petId?: string; // If it's a registered pet
  name: string;
  type: PetType;
  breed: string;
  age: number;
  weight: number;
  specialNeeds: string[];
  vaccinated: boolean;
  medications: string[];
  emergencyContact: {
    name: string;
    phone: string;
  };
}

export interface CreateServiceBookingRequest {
  serviceId: string;
  petInfo: BookingPetInfo;
  scheduledDate: string;
  scheduledTime: string;
  specialInstructions?: string;
  paymentMethodId: string;
}

export interface UpdateServiceBookingRequest {
  bookingId: string;
  updates: {
    scheduledDate?: string;
    scheduledTime?: string;
    specialInstructions?: string;
    status?: BookingStatus;
  };
}

export interface GetServicesParams {
  category?: ServiceCategory;
  location?: string;
  date?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  page?: number;
  limit?: number;
}

export interface GetServiceBookingsParams {
  status?: BookingStatus;
  serviceCategory?: ServiceCategory;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface ServiceSearchParams {
  query: string;
  filters: ServiceSearchFilters;
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'distance';
  page?: number;
  limit?: number;
}

export interface ServiceSearchFilters {
  category?: ServiceCategory[];
  location?: LocationFilter;
  priceRange?: {
    min?: number;
    max?: number;
  };
  rating?: number; // minimum rating
  availability?: {
    date?: string;
    timeSlots?: TimeSlot[];
  };
  providerFeatures?: {
    certified?: boolean;
    insured?: boolean;
    backgroundChecked?: boolean;
  };
}

export interface ServiceSearchResponse {
  services: Service[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  filters: {
    availableCategories: ServiceCategory[];
    availableLocations: string[];
    priceRange: {
      min: number;
      max: number;
    };
    avgRating: number;
  };
}