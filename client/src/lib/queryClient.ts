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
  
  // Trong môi trường production
  if (import.meta.env.PROD) {
    // Nếu endpoint đã bắt đầu với /api, không thêm đường dẫn
    if (normalizedEndpoint.startsWith('/api')) {
      return normalizedEndpoint; // Sử dụng Netlify proxy
    }
    
    // Nếu không, thêm /api vào đầu để sử dụng Netlify proxy
    return `/api${normalizedEndpoint}`;
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
    headers: data ? { 
      "Content-Type": "application/json",
      "Accept": "application/json"
    } : {
      "Accept": "application/json"
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "same-origin", // Thay đổi từ "include" sang "same-origin" vì đã sử dụng proxy từ Netlify
    mode: "cors"
  };
  
  console.log(`Sending ${method} request to ${apiUrl}`);
  const res = await fetch(apiUrl, fetchOptions);
  
  if (!res.ok) {
    console.error(`API Error: ${res.status} ${res.statusText}`);
    try {
      const errorText = await res.text();
      console.error(`Error details: ${errorText}`);
    } catch (e) {
      console.error('Could not read error details');
    }
  }

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
    
    console.log(`Query fetch from: ${apiUrl}`);
    
    const res = await fetch(apiUrl, {
      credentials: "same-origin", // Thay đổi từ "include" sang "same-origin" vì đã sử dụng proxy từ Netlify
      mode: "cors",
      headers: {
        "Accept": "application/json"
      }
    });
    
    if (!res.ok) {
      console.error(`Query API Error: ${res.status} ${res.statusText}`);
      try {
        const errorText = await res.text();
        console.error(`Error details: ${errorText}`);
      } catch (e) {
        console.error('Could not read error details');
      }
    }

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
