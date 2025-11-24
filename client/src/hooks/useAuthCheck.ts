import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

export function useAuthCheck() {
  const [location, setLocation] = useLocation();

  const { data: session, isLoading, error } = useQuery({
    queryKey: ['/api/auth/me'],
    retry: false,
  });

  useEffect(() => {
    if (!isLoading) {
      // If not authenticated and trying to access protected routes, redirect to auth
      if (!session && (
        location.startsWith('/candidate/dashboard') ||
        location.startsWith('/candidate/profile') ||
        location.startsWith('/company/portal') ||
        location.startsWith('/client') ||
        location.startsWith('/recruiting') ||
        location.startsWith('/researchers') ||
        location.startsWith('/admin')
      )) {
        setLocation('/auth');
      }
    }
  }, [session, isLoading, location, setLocation]);

  return { session, isLoading, isAuthenticated: !!session };
}
