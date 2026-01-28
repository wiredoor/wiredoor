import { useQuery, useMutation, useQueryClient, QueryKey } from '@tanstack/react-query';

import axios from './axios';

export type User = {
  id: number;
  email: string;
  name: string;
};

type LoginInput = { username: string; password: string; rememberMe?: boolean };
type MeResponse = { user: User; mustChangePassword?: boolean; requireOtp?: boolean };
type LoginResponse = { user: User };
type LogoutResponse = { ok: true };

const authUserKey: QueryKey = ['auth', 'user'];

export function useUserQuery() {
  return useQuery({
    queryKey: authUserKey,
    queryFn: getUser,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      const status = error?.status ?? error?.response?.status;
      if (status === 401) return false;
      return failureCount < 2;
    },
  });
}

async function getUser(): Promise<MeResponse | null> {
  try {
    const { data } = await axios.get<MeResponse>('/api/auth/web/me');
    return data || null;
  } catch (err: any) {
    if (err.response?.status === 401) {
      return null;
    }
    throw err;
  }
}

async function loginWithEmailAndPassword(credentials: LoginInput): Promise<User> {
  const { data } = await axios.post<LoginResponse>('/api/auth/web/login', credentials);
  return data.user;
}

async function postLogout(): Promise<void> {
  await axios.post<LogoutResponse>('/api/auth/web/logout');
}

export function useAuth() {
  const qc = useQueryClient();
  const me = useUserQuery();

  const user = me.data?.user ?? null;
  const isLoading = me.isLoading;

  const login = useMutation({
    mutationFn: loginWithEmailAndPassword,
    onSuccess: (u) => {
      qc.setQueryData(authUserKey, { user: u });
    },
  });

  const logout = useMutation({
    mutationFn: postLogout,
    onSuccess: () => {
      qc.setQueryData(authUserKey, { user: null });
    },
  });

  return {
    user,
    isLoading,
    // flags para tus flows
    mustChangePassword: !!me.data?.mustChangePassword,
    requireOtp: !!me.data?.requireOtp,

    login: login.mutateAsync,
    logout: logout.mutateAsync,

    // estados útiles
    loginState: login,
    logoutState: logout,
    refetchMe: me.refetch,
  };
}
