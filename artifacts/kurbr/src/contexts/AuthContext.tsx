import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useUser, useClerk } from "@clerk/react";
import { apiGet } from "@/lib/apiClient";

interface AuthContextType {
  userId: string | null;
  loading: boolean;
  isAdmin: boolean;
  isSignedIn: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  userId: null,
  loading: true,
  isAdmin: false,
  isSignedIn: false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { user, isLoaded } = useUser();
  const { signOut: clerkSignOut } = useClerk();

  const isAdmin = user?.publicMetadata?.role === "admin";

  // JIT-provision profile row whenever a user is authenticated
  useEffect(() => {
    if (isLoaded && user) {
      apiGet("/profile/me").catch(() => {
        // Silent — profile provisioning is best-effort; auth still works
      });
    }
  }, [isLoaded, user?.id]);

  const signOut = async () => {
    await clerkSignOut();
  };

  return (
    <AuthContext.Provider
      value={{
        userId: user?.id ?? null,
        loading: !isLoaded,
        isAdmin,
        isSignedIn: !!user,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
