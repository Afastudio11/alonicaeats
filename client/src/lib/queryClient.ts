import { QueryClient, QueryFunction } from "@tanstack/react-query";

interface ApiError {
  message: string;
  code?: string;
  details?: Array<{
    field: string;
    message: string;
    code?: string;
  }>;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      const errorData = await res.json();
      // Handle new structured error format from server
      if (errorData.code && errorData.details) {
        const error = new Error(errorData.message) as any;
        error.apiError = errorData as ApiError;
        throw error;
      }
      // Handle legacy error format
      const message = errorData.message || res.statusText;
      throw new Error(`${res.status}: ${message}`);
    } catch (jsonError) {
      // Fallback if response is not JSON
      const text = res.statusText || 'Unknown error';
      throw new Error(`${res.status}: ${text}`);
    }
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Check for structured API error
    const apiError = (error as any).apiError as ApiError | undefined;
    if (apiError?.details) {
      return `${apiError.message}: ${apiError.details.map(d => d.message).join(', ')}`;
    }
    return error.message;
  }
  return 'Terjadi kesalahan yang tidak diketahui';
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  customHeaders?: Record<string, string>,
): Promise<Response> {
  const headers: Record<string, string> = {
    ...(data ? { "Content-Type": "application/json" } : {}),
    ...customHeaders,
  };

  // No need to inject Authorization header - cookies are sent automatically
  // with credentials: "include" for secure, XSS-protected authentication

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // Important: sends httpOnly cookies
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;
    const headers: Record<string, string> = {};

    // No need to inject Authorization header - cookies are sent automatically
    // with credentials: "include" for secure, XSS-protected authentication

    const res = await fetch(url, {
      headers,
      credentials: "include", // Important: sends httpOnly cookies
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
