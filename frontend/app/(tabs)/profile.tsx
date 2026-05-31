import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router'; // Bổ sung useFocusEffect
import { useState, useCallback } from 'react'; // Bổ sung useCallback
import { IconSymbol } from '@/components/ui/icon-symbol';
import * as ImagePicker from 'expo-image-picker'; 
import axiosClient from '@/utils/axiosClient';

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const loadUser = async () => {
        try {
          const userData = await AsyncStorage.getItem('user');
          if (userData) {
            setUser(JSON.parse(userData));
          } else {
            setUser(null); // BẮT BUỘC: Reset về null nếu không có data
          }
        } catch (error) {
          console.error("Lỗi khi tải thông tin user:", error);
        }
      };
      loadUser();
    }, [])
  );

  // Hàm xử lý link ảnh thông minh
  const getAvatarUrl = (path?: string) => {
    if (!path) return "https://cdn-icons-png.flaticon.com/512/149/149071.png";
    if (path.startsWith("http") || path.startsWith("data:image")) return path;
    
    const minioBaseUrl = require('../../utils/config').MINIO_URL;
    return `${minioBaseUrl}${path}`;
  };

  // HÀM CHỌN VÀ TẢI ẢNH LÊN SERVER
  const handlePickAvatar = async () => {
    if (!user) {
      Alert.alert("Thông báo", "Vui lòng đăng nhập để đổi ảnh đại diện!");
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Lỗi", "Cần cấp quyền truy cập thư viện ảnh để đổi Avatar!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setIsUploading(true);
      
      const localUri = result.assets[0].uri;
      const filename = localUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename || '');
      const type = match ? `image/${match[1]}` : `image`;

      const formData = new FormData();
      formData.append('file', {
        uri: localUri,
        name: filename,
        type: type,
      } as any);

      try {
        const response = await axiosClient.post(`/Users/upload-avatar`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const newAvatarUrl = response.data.avatarUrl;
        const updatedUser = { ...user, avatarUrl: newAvatarUrl };
        
        setUser(updatedUser);
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        Alert.alert("Thành công", "Đã cập nhật ảnh đại diện xịn sò!");

      } catch (error: any) {
        Alert.alert("Lỗi tải ảnh", error.response?.data?.message || "Không thể kết nối đến server MinIO");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleLogout = async () => {
    Alert.alert("Đăng xuất", "Bạn có chắc chắn muốn rời đi?", [
      { text: "Hủy", style: "cancel" },
      { 
        text: "Đăng xuất", 
        style: "destructive", 
        onPress: async () => {
          await AsyncStorage.removeItem('user');
          setUser(null); // Xóa state ngay lập tức
          router.replace('/login' as any);
        } 
      }
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerSection}>
        <View style={styles.avatarContainer}>
          <Image 
            source={{ uri: getAvatarUrl(user?.avatarUrl) }} 
            style={styles.avatar} 
          />
          {isUploading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#FFF" />
            </View>
          )}
          <TouchableOpacity style={styles.cameraBtn} onPress={handlePickAvatar} disabled={isUploading}>
            <Text>📷</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.userName}>{user?.fullName || 'Khách'}</Text>
        <Text style={styles.userEmail}>{user?.email || 'Chưa đăng nhập'}</Text>
        {user && (
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.role === 'Admin' ? ' Quản Trị Viên' : ' Thành viên VIP'}</Text>
          </View>
        )}
      </View>

      {user?.role === 'Admin' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quản trị hệ thống</Text>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin/room-list' as any)}>
            <Text style={styles.menuText}>🛠 Quản lý Phòng chiếu</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin/pricing-rules' as any)}>
            <Text style={styles.menuText}>💰 Cấu hình Giá vé & Phụ thu</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quản lý tài khoản</Text>
        <TouchableOpacity style={styles.menuItem} onPress={() => !user && Alert.alert("Thông báo", "Vui lòng đăng nhập!")}>
          <Text style={styles.menuText}>Cập nhật thông tin</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => !user && Alert.alert("Thông báo", "Vui lòng đăng nhập!")}>
          <Text style={styles.menuText}> Đổi mật khẩu</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cài đặt & Hỗ trợ</Text>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>Gọi tổng đài CSKH</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>Điều khoản dịch vụ</Text>
        </TouchableOpacity>
      </View>

      {/*  LOGIC NÚT ĐĂNG XUẤT / ĐĂNG NHẬP THÔNG MINH */}
      {user ? (
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}> ĐĂNG XUẤT</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: '#3182CE' }]} onPress={() => router.push('/login' as any)}>
          <Text style={styles.logoutBtnText}> ĐĂNG NHẬP</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A202C' },
  headerSection: { alignItems: 'center', paddingVertical: 30, backgroundColor: '#2D3748', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  avatarContainer: { position: 'relative', marginBottom: 15, justifyContent: 'center', alignItems: 'center' },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#48BB78' },
  loadingOverlay: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  cameraBtn: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#FFF', padding: 8, borderRadius: 20, elevation: 5 },
  userName: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  userEmail: { color: '#A0AEC0', fontSize: 14, marginTop: 5 },
  roleBadge: { marginTop: 10, backgroundColor: '#E53E3E', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 15 },
  roleText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  
  section: { marginTop: 25, paddingHorizontal: 20 },
  sectionTitle: { color: '#718096', fontSize: 13, fontWeight: 'bold', marginBottom: 10, textTransform: 'uppercase' },
  menuItem: { backgroundColor: '#2D3748', padding: 15, borderRadius: 10, marginBottom: 10 },
  menuText: { color: '#E2E8F0', fontSize: 16 },

  logoutBtn: { backgroundColor: '#C53030', marginHorizontal: 20, marginTop: 30, marginBottom: 50, padding: 15, borderRadius: 10, alignItems: 'center' },
  logoutBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});