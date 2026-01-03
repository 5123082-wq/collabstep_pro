import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { StateStorage } from 'zustand/middleware';

// Memory storage fallback for SSR
const memoryStore: Record<string, string> = {};

const memoryStorage: StateStorage = {
  getItem: (name) => (name in memoryStore ? memoryStore[name]! : null),
  setItem: (name, value) => {
    memoryStore[name] = value;
  },
  removeItem: (name) => {
    delete memoryStore[name];
  }
};

// Organization type from API
export type Organization = {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  ownerId: string;
  isPrimary: boolean;
  userRole: 'owner' | 'admin' | 'member' | 'viewer';
  memberCount?: number;
  type?: 'open' | 'closed';
  status?: 'active' | 'archived' | 'deleted';
  createdAt?: string;
};

export type UserSubscription = {
  planCode: 'free' | 'pro' | 'max';
  maxOrganizations: number; // -1 means unlimited
  expiresAt?: string | null;
};

type OrganizationState = {
  // Data
  organizations: Organization[];
  currentOrgId: string | null;
  subscription: UserSubscription | null;
  isLoading: boolean;
  isInitialized: boolean;
  
  // Computed getters
  getCurrentOrganization: () => Organization | null;
  getPrimaryOrganization: () => Organization | null;
  getOwnedOrganizations: () => Organization[];
  getMemberOrganizations: () => Organization[];
  canCreateNewOrganization: () => boolean;
  getOrganizationLimit: () => number;
  
  // Actions
  setOrganizations: (orgs: Organization[]) => void;
  setSubscription: (sub: UserSubscription | null) => void;
  switchOrganization: (orgId: string) => void;
  setCurrentOrgId: (orgId: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  setIsInitialized: (initialized: boolean) => void;
  addOrganization: (org: Organization) => void;
  updateOrganization: (orgId: string, updates: Partial<Organization>) => void;
  removeOrganization: (orgId: string) => void;
  reset: () => void;
};

const initialState = {
  organizations: [],
  currentOrgId: null,
  subscription: null,
  isLoading: false,
  isInitialized: false,
};

export const useOrganizationStore = create<OrganizationState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Computed getters
      getCurrentOrganization: () => {
        const { organizations, currentOrgId } = get();
        if (!currentOrgId) {
          // Return primary organization if no current selected
          return organizations.find(org => org.isPrimary) ?? organizations[0] ?? null;
        }
        return organizations.find(org => org.id === currentOrgId) ?? null;
      },

      getPrimaryOrganization: () => {
        const { organizations } = get();
        return organizations.find(org => org.isPrimary) ?? null;
      },

      getOwnedOrganizations: () => {
        const { organizations } = get();
        return organizations.filter(org => org.userRole === 'owner');
      },

      getMemberOrganizations: () => {
        const { organizations } = get();
        return organizations.filter(org => org.userRole !== 'owner');
      },

      canCreateNewOrganization: () => {
        const { subscription } = get();
        const ownedOrgs = get().getOwnedOrganizations();
        
        if (!subscription) {
          // No subscription info - assume free plan (1 org limit)
          return ownedOrgs.length < 1;
        }

        // -1 means unlimited
        if (subscription.maxOrganizations === -1) {
          return true;
        }

        // Check if subscription is expired
        if (subscription.expiresAt) {
          const expiresAt = new Date(subscription.expiresAt);
          if (expiresAt < new Date()) {
            // Expired - fall back to free limits
            return ownedOrgs.length < 1;
          }
        }

        return ownedOrgs.length < subscription.maxOrganizations;
      },

      getOrganizationLimit: () => {
        const { subscription } = get();
        
        if (!subscription) {
          return 1; // Free plan default
        }

        if (subscription.expiresAt) {
          const expiresAt = new Date(subscription.expiresAt);
          if (expiresAt < new Date()) {
            return 1; // Expired - free limits
          }
        }

        return subscription.maxOrganizations;
      },

      // Actions
      setOrganizations: (organizations) => {
        const { currentOrgId } = get();
        
        // If current org is not in list, reset to primary or first
        const currentOrgExists = organizations.some(org => org.id === currentOrgId);
        const newCurrentOrgId = currentOrgExists 
          ? currentOrgId 
          : (organizations.find(org => org.isPrimary)?.id ?? organizations[0]?.id ?? null);

        set({ 
          organizations, 
          currentOrgId: newCurrentOrgId,
          isInitialized: true 
        });
      },

      setSubscription: (subscription) => set({ subscription }),

      switchOrganization: (orgId) => {
        const { organizations } = get();
        const org = organizations.find(o => o.id === orgId);
        if (org) {
          set({ currentOrgId: orgId });
        }
      },

      setCurrentOrgId: (currentOrgId) => set({ currentOrgId }),

      setIsLoading: (isLoading) => set({ isLoading }),

      setIsInitialized: (isInitialized) => set({ isInitialized }),

      addOrganization: (org) => {
        const { organizations } = get();
        set({ organizations: [...organizations, org] });
      },

      updateOrganization: (orgId, updates) => {
        const { organizations } = get();
        set({
          organizations: organizations.map(org => 
            org.id === orgId ? { ...org, ...updates } : org
          )
        });
      },

      removeOrganization: (orgId) => {
        const { organizations, currentOrgId } = get();
        const newOrgs = organizations.filter(org => org.id !== orgId);
        
        // If removed org was current, switch to primary or first
        let newCurrentOrgId = currentOrgId;
        if (currentOrgId === orgId) {
          newCurrentOrgId = newOrgs.find(org => org.isPrimary)?.id ?? newOrgs[0]?.id ?? null;
        }

        set({ organizations: newOrgs, currentOrgId: newCurrentOrgId });
      },

      reset: () => set(initialState),
    }),
    {
      name: 'cv-organization',
      storage: createJSONStorage(() =>
        typeof window === 'undefined' ? memoryStorage : (window.localStorage as unknown as StateStorage)
      ),
      // Only persist these fields
      partialize: (state) => ({
        currentOrgId: state.currentOrgId,
      }),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState as Partial<OrganizationState>) ?? {};
        
        return {
          ...currentState,
          currentOrgId: typeof persisted.currentOrgId === 'string' ? persisted.currentOrgId : null,
        };
      }
    }
  )
);

// Selector hooks for common patterns
export const useCurrentOrganization = () => {
  const getCurrentOrganization = useOrganizationStore(state => state.getCurrentOrganization);
  // Subscribe to organizations and currentOrgId to re-compute when they change
  useOrganizationStore(state => state.organizations);
  useOrganizationStore(state => state.currentOrgId);
  
  return getCurrentOrganization();
};

export const useCurrentOrgId = () => {
  return useOrganizationStore(state => {
    if (state.currentOrgId) return state.currentOrgId;
    // Fallback to primary or first org
    const primary = state.organizations.find(org => org.isPrimary);
    return primary?.id ?? state.organizations[0]?.id ?? null;
  });
};

export const useCanCreateOrganization = () => {
  const canCreate = useOrganizationStore(state => state.canCreateNewOrganization);
  return canCreate();
};

