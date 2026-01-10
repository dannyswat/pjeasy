import { useMutation } from "@tanstack/react-query";
import type { UserResponse } from "../auth/userResponse";
import { postApi } from "../apis/fetch";

interface RegisterRequest {
  loginId: string;
  name: string;
  password: string;
}

export function useRegisterApi() {
  const mutation = useMutation({
    mutationFn: (req: RegisterRequest) =>
      postApi<UserResponse>("/api/users/register", req),
  });

  return {
    register: (loginId: string, name: string, password: string) =>
      mutation.mutateAsync({ loginId, name, password }),
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
