import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

import { API_URL } from './config';

const axiosClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Qequest interceptor
// Chặn mọi request TRƯỚC KHI gửi lên server
// Nhiệm vụ: tự động gắn Access Token vào
axiosClient.interceptors.request.use(
  async (config) => {
    try {
      // Lấy Access Token từ bộ nhớ điện thoại
      // (Đã được lưu ở login.tsx sau khi đăng nhập)
      const accessToken = await AsyncStorage.getItem('accessToken');

      if (accessToken) {
        // Gắn token vào header — server sẽ đọc chỗ này để biết bạn là ai
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    } catch (error) {
      console.error("Lỗi khi đính kèm token:", error);
    }
    return config; // Bắt buộc phải return — cho request đi tiếp
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Respone interceptor
// Chặn mọi response SAU KHI nhận từ server
// Nhiệm vụ: nếu Access Token hết hạn (lỗi 401) thì tự động xin token mới
axiosClient.interceptors.response.use(
  (response) => {
    // Response bình thường → cho qua, không làm gì
    return response;
  },
  async (error) => {

    // Lưu lại request bị lỗi để gửi lại sau
    const requestBiLoi = error.config;

    // Kiểm tra có phải lỗi 401 không (401 = token hết hạn hoặc không hợp lệ)
    // _daLamMoi là cờ để tránh vòng lặp vô tận (xin token mới → lại lỗi → xin tiếp → ...)
    if (error.response?.status === 401 && !requestBiLoi._daLamMoi) {

      // Đánh dấu đã thử làm mới token 1 lần rồi
      requestBiLoi._daLamMoi = true;

      try {
        // Lấy Refresh Token từ bộ nhớ điện thoại
        const refreshToken = await AsyncStorage.getItem('refreshToken');

        // Gửi Refresh Token lên server để xin Access Token mới
        const response = await axiosClient.post('/Users/refresh-token', {
          refreshToken: refreshToken
        });

        // Lấy Access Token mới từ server trả về
        const accessTokenMoi = response.data.accessToken;

        // Lưu Access Token mới vào bộ nhớ điện thoại (ghi đè cái cũ)
        await AsyncStorage.setItem('accessToken', accessTokenMoi);

        // Cập nhật token mới vào request bị lỗi lúc nãy
        requestBiLoi.headers.Authorization = `Bearer ${accessTokenMoi}`;

        // Gửi lại request bị lỗi — người dùng không biết gì hết!
        return axiosClient(requestBiLoi);

      } catch (loi) {
        // Refresh Token cũng hết hạn (sau 7 ngày) → bắt đăng nhập lại
        // Xóa toàn bộ thông tin đã lưu
        await AsyncStorage.removeItem('accessToken');
        await AsyncStorage.removeItem('refreshToken');
        await AsyncStorage.removeItem('user');

        return Promise.reject(loi);
      }
    }

    // Lỗi khác (500, 400...) → tự động hiển thị thông báo lỗi (LOẠI BỎ 404 vì 404 thường dùng cho UI trống)
    if (error.response && error.response.status !== 401 && error.response.status !== 404) {
      let message = "Đã xảy ra lỗi kết nối!";
      
      // ASP.NET có thể trả về string thẳng, hoặc JSON có thuộc tính message / Message / title
      if (typeof error.response.data === 'string') {
        message = error.response.data;
      } else if (error.response.data?.message) {
        message = error.response.data.message;
      } else if (error.response.data?.Message) {
        message = error.response.data.Message;
      } else if (error.response.data?.title) {
        message = error.response.data.title;
      }

      // TẮT CHỨC NĂNG TỰ ĐỘNG HIỂN THỊ ALERT TOÀN CỤC ĐỂ TRÁNH TRÙNG LẶP
      // Mọi component tự xử lý lỗi và hiển thị Alert riêng lẻ.
      /*
      if (!error.config._daHienThiLoi) {
        Alert.alert("Thông báo", message);
        error.config._daHienThiLoi = true;
      }
      */
    }

    return Promise.reject(error);
  }
);

export default axiosClient;