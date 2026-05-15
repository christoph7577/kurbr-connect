import { useAuth } from "@clerk/expo";
import { useQueryClient } from "@tanstack/react-query";

export function useSignOut() {
  const { signOut } = useAuth();
  const queryClient = useQueryClient();

  return () => {
    queryClient.clear();
    return signOut();
  };
}
