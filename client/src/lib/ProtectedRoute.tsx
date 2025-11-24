import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface ProtectedRouteProps {
  component: React.ComponentType;
  requiredRole?: 'candidate' | 'company' | 'admin';
}

interface SessionData {
  userId?: number;
  role?: string;
}

export function ProtectedRoute({ component: Component, requiredRole }: ProtectedRouteProps) {
  const [, setLocation] = useLocation();
  const [isReady, setIsReady] = useState(false);

  // Check if user is authenticated
  const { data: session, isLoading } = useQuery<SessionData>({
    queryKey: ['/api/auth/me'],
    retry: 1,
  });

  useEffect(() => {
    if (!isLoading) {
      if (!session) {
        // Not authenticated - redirect to login
        setLocation('/auth');
      } else if (requiredRole && session.role !== requiredRole) {
        // Wrong role - redirect to home
        setLocation('/');
      } else {
        // Authenticated and authorized
        setIsReady(true);
      }
    }
  }, [session, isLoading, requiredRole, setLocation]);

  if (isLoading || !isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return <Component />;
}
