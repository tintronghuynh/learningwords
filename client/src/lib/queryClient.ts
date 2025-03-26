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
    const apiBaseUrl = import.meta.env.VITE_API_URL;
    
    // Nếu có VITE_API_URL được cấu hình (trỏ trực tiếp đến backend)
    if (apiBaseUrl) {
      // Loại bỏ dấu / ở cuối URL nếu có
      const baseUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
      // Đảm bảo endpoint không bắt đầu bằng /api nếu đã có trong baseUrl
      const cleanEndpoint = normalizedEndpoint.startsWith('/api/') 
        ? normalizedEndpoint.substring(4) 
        : normalizedEndpoint;
      return `${baseUrl}${cleanEndpoint}`;
    }
    
    // Nếu không có VITE_API_URL, sử dụng Netlify redirects
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
      // Thêm header cho API key nếu cần trong tương lai
    } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
    // Thêm mode: "cors" để đảm bảo CORS hoạt động chính xác
    mode: "cors"
  };
  
  // Thử gọi API với các options đã cấu hình
  try {
    const res = await fetch(apiUrl, fetchOptions);
    await throwIfResNotOk(res);
    return res;
  } catch (error: any) {
    // Log lỗi để debugging
    console.error(`API request error (${method} ${apiUrl}):`, error.message);
    
    // Nếu đang gọi qua Netlify proxy mà bị lỗi, có thể thử gọi trực tiếp đến API
    if (import.meta.env.PROD && !apiUrl.startsWith('http') && import.meta.env.VITE_API_URL) {
      console.log(`Retrying request directly to backend: ${import.meta.env.VITE_API_URL}`);
      const directApiUrl = `${import.meta.env.VITE_API_URL}${url.startsWith('/api/') ? url.substring(4) : url}`;
      
      const directRes = await fetch(directApiUrl, {
        ...fetchOptions,
        credentials: "include",
      });
      
      await throwIfResNotOk(directRes);
      return directRes;
    }
    
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const endpoint = queryKey[0] as string;
    const apiUrl = getApiUrl(endpoint);
    
    const fetchOptions = {
      credentials: "include" as const,
      mode: "cors" as const, // Thêm CORS mode
      headers: {
        "Accept": "application/json"
      }
    };
    
    try {
      // Thử gọi API với các options đã cấu hình
      const res = await fetch(apiUrl, fetchOptions);
  
      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }
  
      await throwIfResNotOk(res);
      return await res.json();
    } catch (error: any) {
      // Log lỗi để debugging
      console.error(`Query error (${endpoint}):`, error.message);
      
      // Nếu đang gọi qua Netlify proxy mà bị lỗi, có thể thử gọi trực tiếp đến API
      if (import.meta.env.PROD && !apiUrl.startsWith('http') && import.meta.env.VITE_API_URL) {
        console.log(`Retrying query directly to backend: ${import.meta.env.VITE_API_URL}`);
        const directApiUrl = `${import.meta.env.VITE_API_URL}${endpoint.startsWith('/api/') ? endpoint.substring(4) : endpoint}`;
        
        const directRes = await fetch(directApiUrl, fetchOptions);
        
        if (unauthorizedBehavior === "returnNull" && directRes.status === 401) {
          return null;
        }
        
        await throwIfResNotOk(directRes);
        return await directRes.json();
      }
      
      throw error;
    }
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
