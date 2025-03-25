import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Helper để xác định API URL
function getApiUrl(endpoint: string): string {
  // Nếu endpoint đã bắt đầu bằng http hoặc https, không cần thêm base URL
  if (endpoint.startsWith('http')) {
    return endpoint;
  }

  // Đảm bảo endpoint bắt đầu bằng / nếu chưa có
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Trong môi trường production, sử dụng API URL từ biến môi trường
  const apiBaseUrl = import.meta.env.VITE_API_URL || '';
  if (apiBaseUrl && import.meta.env.PROD) {
    return `${apiBaseUrl}${normalizedEndpoint}`;
  }
  
  // Trong môi trường development, sử dụng đường dẫn tương đối
  return normalizedEndpoint;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const apiUrl = getApiUrl(url);
  
  // Thêm options cấu hình CORS cho môi trường production
  const fetchOptions: RequestInit = {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
    // Thêm mode: "cors" để đảm bảo CORS hoạt động chính xác
    mode: "cors"
  };
  
  const res = await fetch(apiUrl, fetchOptions);

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const endpoint = queryKey[0] as string;
    const apiUrl = getApiUrl(endpoint);
    
    const res = await fetch(apiUrl, {
      credentials: "include",
      mode: "cors", // Thêm CORS mode
      headers: {
        "Accept": "application/json"
      }
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
