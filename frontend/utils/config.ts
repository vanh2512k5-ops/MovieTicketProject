import Constants from 'expo-constants';

let API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5284/api';
let MINIO_URL = process.env.EXPO_PUBLIC_MINIO_URL || 'http://localhost:9000';

// Trong môi trường DEV (dùng Expo Go), tự động dò IP máy tính
if (__DEV__ && Constants.expoConfig?.hostUri) {
  const hostIP = Constants.expoConfig.hostUri.split(':')[0];
  API_URL = `http://${hostIP}:5284/api`;
  MINIO_URL = `http://${hostIP}:9000`;
}

export { API_URL, MINIO_URL };
