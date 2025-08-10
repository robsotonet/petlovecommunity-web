import { createApi } from '@reduxjs/toolkit/query/react';
import { createPetApiBaseQuery } from './enterpriseBaseQuery';
import type {
  Pet,
  GetPetsParams,
  PetSearchResponse,
  PetSearchParams,
  AdoptionApplication,
  CreateAdoptionApplicationRequest,
  UpdateAdoptionApplicationRequest,
  GetAdoptionApplicationsParams,
  GetFavoritesParams,
  PetCareGuide,
} from '@/types/api';

export const petApi = createApi({
  reducerPath: 'petApi',
  baseQuery: createPetApiBaseQuery(),
  tagTypes: ['Pet', 'Adoption', 'Favorite'],
  endpoints: (builder) => ({
    // Pet Discovery Endpoints
    getPets: builder.query<Pet[], GetPetsParams>({
      query: (params) => ({
        url: '',
        params: {
          page: params.page || 1,
          limit: params.limit || 20,
          type: params.type,
          breed: params.breed,
          age: params.age,
          size: params.size,
          location: params.location,
          available: params.available ?? true,
        },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Pet' as const, id })),
              { type: 'Pet', id: 'LIST' },
            ]
          : [{ type: 'Pet', id: 'LIST' }],
    }),

    getPetById: builder.query<Pet, string>({
      query: (id) => `/${id}`,
      providesTags: (result, error, id) => [{ type: 'Pet', id }],
    }),

    // Search pets with advanced filtering
    searchPets: builder.query<PetSearchResponse, PetSearchParams>({
      query: (params) => ({
        url: '/search',
        params: {
          q: params.query,
          filters: JSON.stringify(params.filters),
          sort: params.sort || 'relevance',
          page: params.page || 1,
          limit: params.limit || 20,
        },
      }),
      providesTags: [{ type: 'Pet', id: 'SEARCH' }],
    }),

    // Pet Adoption Endpoints (Mutations with Transactions)
    createAdoptionApplication: builder.mutation<AdoptionApplication, CreateAdoptionApplicationRequest>({
      query: (application) => ({
        url: `/${application.petId}/adopt`,
        method: 'POST',
        body: {
          applicantInfo: application.applicantInfo,
          livingSituation: application.livingSituation,
          experience: application.experience,
          references: application.references,
          message: application.message,
        },
      }),
      invalidatesTags: (result, error, { petId }) => [
        { type: 'Pet', id: petId },
        { type: 'Adoption', id: 'LIST' },
      ],
    }),

    updateAdoptionApplication: builder.mutation<AdoptionApplication, UpdateAdoptionApplicationRequest>({
      query: ({ applicationId, updates }) => ({
        url: `/adoptions/${applicationId}`,
        method: 'PATCH',
        body: updates,
      }),
      invalidatesTags: (result, error, { applicationId }) => [
        { type: 'Adoption', id: applicationId },
        { type: 'Adoption', id: 'LIST' },
      ],
    }),

    cancelAdoptionApplication: builder.mutation<void, string>({
      query: (applicationId) => ({
        url: `/adoptions/${applicationId}/cancel`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, applicationId) => [
        { type: 'Adoption', id: applicationId },
        { type: 'Adoption', id: 'LIST' },
      ],
    }),

    // Pet Favoriting (Idempotent operations)
    favoritePet: builder.mutation<void, string>({
      query: (petId) => ({
        url: `/${petId}/favorite`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, petId) => [
        { type: 'Pet', id: petId },
        { type: 'Favorite', id: 'LIST' },
      ],
    }),

    unfavoritePet: builder.mutation<void, string>({
      query: (petId) => ({
        url: `/${petId}/favorite`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, petId) => [
        { type: 'Pet', id: petId },
        { type: 'Favorite', id: 'LIST' },
      ],
    }),

    getFavorites: builder.query<Pet[], GetFavoritesParams>({
      query: (params) => ({
        url: '/favorites',
        params: {
          page: params.page || 1,
          limit: params.limit || 20,
        },
      }),
      providesTags: [{ type: 'Favorite', id: 'LIST' }],
    }),

    // Adoption Management
    getAdoptionApplications: builder.query<AdoptionApplication[], GetAdoptionApplicationsParams>({
      query: (params) => ({
        url: '/adoptions',
        params: {
          status: params.status,
          petId: params.petId,
          page: params.page || 1,
          limit: params.limit || 20,
        },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Adoption' as const, id })),
              { type: 'Adoption', id: 'LIST' },
            ]
          : [{ type: 'Adoption', id: 'LIST' }],
    }),

    getAdoptionApplicationById: builder.query<AdoptionApplication, string>({
      query: (id) => `/adoptions/${id}`,
      providesTags: (result, error, id) => [{ type: 'Adoption', id }],
    }),

    // Pet Care Information
    getPetCareGuide: builder.query<PetCareGuide, { petType: string; breed?: string }>({
      query: ({ petType, breed }) => ({
        url: '/care-guide',
        params: { petType, breed },
      }),
    }),
  }),
});

// Export hooks for components
export const {
  // Queries
  useGetPetsQuery,
  useGetPetByIdQuery,
  useSearchPetsQuery,
  useGetFavoritesQuery,
  useGetAdoptionApplicationsQuery,
  useGetAdoptionApplicationByIdQuery,
  useGetPetCareGuideQuery,
  
  // Mutations
  useCreateAdoptionApplicationMutation,
  useUpdateAdoptionApplicationMutation,
  useCancelAdoptionApplicationMutation,
  useFavoritePetMutation,
  useUnfavoritePetMutation,
  
  // Utilities
  util: petApiUtil,
} = petApi;