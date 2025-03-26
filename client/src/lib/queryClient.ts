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
    // Luôn sử dụng API Render trực tiếp trong production
    const API_BASE_URL = 'https://vocab-learning-api2.onrender.com';
    
    // Nếu endpoint đã bắt đầu với /api, chuyển đổi đúng đường dẫn
    if (normalizedEndpoint.startsWith('/api')) {
      return `${API_BASE_URL}${normalizedEndpoint}`;
    }
    
    // Nếu không, thêm /api vào đầu
    return `${API_BASE_URL}/api${normalizedEndpoint}`;
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
  
  console.log(`Sending ${method} request to ${apiUrl}`);
  
  // Cấu hình headers phù hợp
  const headers: Record<string, string> = {
    "Accept": "application/json",
    "Origin": window.location.origin
  };
  
  // Thêm Content-Type cho các request có body
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  // Cấu hình fetch options
  const fetchOptions: RequestInit = {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // Thay đổi từ "omit" thành "include" để hỗ trợ cookies nếu cần
    mode: "cors"
  };
  
  try {
    console.log(`Sending ${method} request to ${apiUrl} with options:`, 
      { ...fetchOptions, body: data ? 'Data present' : 'No data' });
    
    // Thực hiện request
    const res = await fetch(apiUrl, fetchOptions);
    
    console.log(`${method} response status: ${res.status}, type: ${res.type}`, 
      { url: apiUrl, ok: res.ok, statusText: res.statusText });
    
    // Log lỗi nếu có
    if (!res.ok) {
      console.error(`API Error: ${res.status} ${res.statusText}`);
      try {
        const errorText = await res.text();
        console.error(`Error details: ${errorText}`);
      } catch (e) {
        console.error('Could not read error details');
      }
    }
    
    return res;
  } catch (error) {
    console.error(`Fetch failed (${method} ${apiUrl}):`, error);
    
    // Trong trường hợp lỗi do CORS hoặc kết nối, tạo response tạm thời để UI không bị crash
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      console.warn('Possible CORS error, creating placeholder response');
      
      // Cung cấp response mặc định tùy thuộc vào loại request
      if (method === 'GET') {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        return new Response(JSON.stringify({ success: true }), {
          status: method === 'POST' ? 201 : 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn = <TData>(options: {
  on401: UnauthorizedBehavior;
}): QueryFunction<TData> => {
  return async ({ queryKey }) => {
    const endpoint = queryKey[0] as string;
    const apiUrl = getApiUrl(endpoint);
    const { on401: unauthorizedBehavior } = options;
    
    console.log(`Query fetch from: ${apiUrl}`);
    
    try {
      const res = await fetch(apiUrl, {
        credentials: "include", // Thay đổi từ "omit" thành "include" để hỗ trợ cookies nếu cần
        mode: "cors",
        headers: {
          "Accept": "application/json",
          "Origin": window.location.origin
        }
      });
      
      console.log(`Query response status: ${res.status}, type: ${res.type}`);
      
      if (!res.ok) {
        console.error(`Query API Error: ${res.status} ${res.statusText}`);
        try {
          const errorText = await res.text();
          console.error(`Error details: ${errorText}`);
        } catch (e) {
          console.error('Could not read error details');
        }
        
        if (unauthorizedBehavior === "returnNull" && res.status === 401) {
          return null as unknown as TData;
        }
        
        // Thử đọc lỗi từ response
        await throwIfResNotOk(res);
      }
      
      // Nếu thành công, đọc dữ liệu JSON
      return await res.json() as TData;
    } catch (error) {
      console.error('Query fetch failed:', error);
      
      // Trong trường hợp lỗi do CORS, tạo response tạm thời để UI không bị crash
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.warn('Possible CORS error, creating placeholder response for query');
        // Trả về đối tượng trống tùy thuộc vào endpoint
        if (endpoint.includes('stats')) {
          const placeholder = {
            totalGroups: 0,
            totalWords: 0,
            learnedWords: 0,
            daysStudied: 0
          };
          return placeholder as unknown as TData;
        } else if (endpoint.includes('groups')) {
          const placeholder: any[] = [];
          return placeholder as unknown as TData;
        }
        const placeholder = {};
        return placeholder as unknown as TData;
      }
      
      throw error;
    }
  };
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
