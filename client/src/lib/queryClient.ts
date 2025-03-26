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
  
  // Trong môi trường production, luôn sử dụng URL trực tiếp đến Render backend
  if (import.meta.env.PROD) {
    // Lấy baseUrl từ biến môi trường VITE_API_URL
    const apiBaseUrl = 'https://vocab-learning-api2.onrender.com';
    
    // Loại bỏ dấu / ở cuối URL nếu có
    const baseUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
    
    // Xây dựng URL API đầy đủ
    const fullApiUrl = normalizedEndpoint.startsWith('/api/') 
      ? `${baseUrl}${normalizedEndpoint}` // Giữ nguyên /api/ nếu đã có
      : `${baseUrl}/api${normalizedEndpoint}`; // Thêm /api/ nếu chưa có
      
    console.log(`Direct API call to: ${fullApiUrl}`);
    return fullApiUrl;
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
    } : {},
    body: data ? JSON.stringify(data) : undefined,
    // Trong production, loại bỏ credentials để tránh vấn đề CORS
    credentials: import.meta.env.PROD ? "omit" : "include", 
    // Thêm mode: "cors" để đảm bảo CORS hoạt động chính xác
    mode: "cors"
  };
  
  try {
    console.log(`Sending ${method} request to: ${apiUrl}`);
    const res = await fetch(apiUrl, fetchOptions);
    await throwIfResNotOk(res);
    return res;
  } catch (error: any) {
    console.error(`API request error (${method} ${apiUrl}):`, error.message);
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
      // Trong production, loại bỏ credentials để tránh vấn đề CORS
      credentials: import.meta.env.PROD ? "omit" as const : "include" as const,
      mode: "cors" as const,
      headers: {
        "Accept": "application/json"
      }
    };
    
    try {
      console.log(`Sending GET request to: ${apiUrl}`);
      const res = await fetch(apiUrl, fetchOptions);
  
      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }
  
      await throwIfResNotOk(res);
      return await res.json();
    } catch (error: any) {
      console.error(`Query error (${endpoint}):`, error.message);
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
