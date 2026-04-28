import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Lấy domain từ file .env (Không fix cứng trong code nữa)
const baseURL = process.env.EXPO_PUBLIC_API_URL;

const axiosClient = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// THÊM INTERCEPTOR: Tự động đính kèm Token trước khi gửi request
axiosClient.interceptors.request.use(
  async (config) => {
    try {
      const userDataString = await AsyncStorage.getItem('user');
      if (userDataString) {
        const user = JSON.parse(userDataString);
        // Nếu backend sếp có JWT Token thì lấy user.token, ở đây tạm dùng thông tin user
        if (user && user.token) {
          config.headers.Authorization = `Bearer ${user.token}`;
        }
      }
    } catch (error) {
      console.error("Lỗi khi đính kèm token:", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor cho Response (Tùy chọn: Xử lý lỗi 401 hết hạn token ở đây)
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosClient;