import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Ép cứng dùng 127.0.0.1 cho Web để tránh lỗi CORS hoặc Proxy từ IP LAN (.env)
let API_URL = Platform.OS === 'web' ? 'http://127.0.0.1:5284/api' : (process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:5284/api');
let MINIO_URL = Platform.OS === 'web' ? 'http://127.0.0.1:9000' : (process.env.EXPO_PUBLIC_MINIO_URL || 'http://127.0.0.1:9000');
let GATEWAY_URL = Platform.OS === 'web' ? 'http://127.0.0.1:4000' : 'http://127.0.0.1:4000';

// Trong môi trường DEV (dùng Expo Go trên điện thoại), tự động dò IP mạng LAN
if (__DEV__ && Platform.OS !== 'web' && Constants.expoConfig?.hostUri) {
  const hostIP = Constants.expoConfig.hostUri.split(':')[0];
  API_URL = `http://${hostIP}:5284/api`;
  MINIO_URL = `http://${hostIP}:9000`;
  GATEWAY_URL = `http://${hostIP}:4000`;
}

export { API_URL, MINIO_URL, GATEWAY_URL };
