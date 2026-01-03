'use client';

import { createContext, useContext, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { 
  useOrganizationStore, 
  useCurrentOrganization, 
  useCurrentOrgId,
  type Organization, 
  type UserSubscription 
} from '@/stores/organization-store';

type OrganizationContextValue = {
  // Current organization
  currentOrganization: Organization | null;
  currentOrgId: string | null;
  
  // All organizations
  organizations: Organization[];
  ownedOrganizations: Organization[];
  memberOrganizations: Organization[];
  
  // Subscription & limits
  subscription: UserSubscription | null;
  canCreateNewOrganization: boolean;
  organizationLimit: number;
  
  // State
  isLoading: boolean;
  isInitialized: boolean;
  
  // Actions
  switchOrganization: (orgId: string) => void;
  refreshOrganizations: () => Promise<void>;
};

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  // Extract individual actions from store to avoid reference changes
  const setIsLoading = useOrganizationStore(state => state.setIsLoading);
  const setOrganizations = useOrganizationStore(state => state.setOrganizations);
  const setSubscription = useOrganizationStore(state => state.setSubscription);
  const switchOrganization = useOrganizationStore(state => state.switchOrganization);
  const isInitialized = useOrganizationStore(state => state.isInitialized);
  const isLoading = useOrganizationStore(state => state.isLoading);
  const organizations = useOrganizationStore(state => state.organizations);
  const subscription = useOrganizationStore(state => state.subscription);
  const getOwnedOrganizations = useOrganizationStore(state => state.getOwnedOrganizations);
  const getMemberOrganizations = useOrganizationStore(state => state.getMemberOrganizations);
  const canCreateNewOrganization = useOrganizationStore(state => state.canCreateNewOrganization);
  const getOrganizationLimit = useOrganizationStore(state => state.getOrganizationLimit);
  
  const currentOrganization = useCurrentOrganization();
  const currentOrgId = useCurrentOrgId();
  
  // Track if we've already fetched to prevent double fetching
  const hasFetched = useRef(false);

  // Fetch organizations from API
  const fetchOrganizations = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/organizations');
      if (!response.ok) {
        throw new Error('Failed to fetch organizations');
      }
      
      const result = await response.json();
      const orgs: Organization[] = result.data?.organizations ?? result.organizations ?? [];
      
      setOrganizations(orgs);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      // Don't throw - just set empty array
      setOrganizations([]);
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, setOrganizations]);

  // Fetch user subscription
  const fetchSubscription = useCallback(async () => {
    try {
      const response = await fetch('/api/me/subscription');
      if (!response.ok) {
        // If endpoint doesn't exist yet, assume free plan
        setSubscription({
          planCode: 'free',
          maxOrganizations: 1,
          expiresAt: null,
        });
        return;
      }
      
      const result = await response.json();
      const sub: UserSubscription = result.data?.subscription ?? result.subscription ?? {
        planCode: 'free',
        maxOrganizations: 1,
        expiresAt: null,
      };
      
      setSubscription(sub);
    } catch (error) {
      // Fallback to free plan on error
      setSubscription({
        planCode: 'free',
        maxOrganizations: 1,
        expiresAt: null,
      });
    }
  }, [setSubscription]);

  // Load data on mount - only once
  useEffect(() => {
    if (!isInitialized && !hasFetched.current) {
      hasFetched.current = true;
      void fetchOrganizations();
      void fetchSubscription();
    }
  }, [isInitialized, fetchOrganizations, fetchSubscription]);

  // Refresh function
  const refreshOrganizations = useCallback(async () => {
    await Promise.all([fetchOrganizations(), fetchSubscription()]);
  }, [fetchOrganizations, fetchSubscription]);

  const value = useMemo<OrganizationContextValue>(() => ({
    currentOrganization,
    currentOrgId,
    organizations,
    ownedOrganizations: getOwnedOrganizations(),
    memberOrganizations: getMemberOrganizations(),
    subscription,
    canCreateNewOrganization: canCreateNewOrganization(),
    organizationLimit: getOrganizationLimit(),
    isLoading,
    isInitialized,
    switchOrganization,
    refreshOrganizations,
  }), [
    currentOrganization,
    currentOrgId,
    organizations,
    subscription,
    isLoading,
    isInitialized,
    getOwnedOrganizations,
    getMemberOrganizations,
    canCreateNewOrganization,
    getOrganizationLimit,
    switchOrganization,
    refreshOrganizations,
  ]);

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

/**
 * Hook to access organization context
 * Must be used within OrganizationProvider
 */
export function useOrganization(): OrganizationContextValue {
  const context = useContext(OrganizationContext);
  
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  
  return context;
}

/**
 * Optional hook - returns null if outside provider (for components that might be used outside app shell)
 */
export function useOrganizationOptional(): OrganizationContextValue | null {
  return useContext(OrganizationContext);
}

