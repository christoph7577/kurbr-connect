import { createContext, useContext, type ReactNode } from "react";
import { useUser, useClerk } from "@clerk/react";

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
