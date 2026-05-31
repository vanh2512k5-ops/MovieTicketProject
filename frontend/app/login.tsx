import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
// Gọi axiosClient xịn sò của sếp vào đây
import axiosClient from "@/utils/axiosClient";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ Email và Mật khẩu!");
      return;
    }

    setIsLoading(true);
    try {
      // Dùng axiosClient, không cần gõ dài dòng IP nữa
      const response = await axiosClient.post("/Users/login", { email, password });
      const data = response.data;

      // Sửa lỗi undefined do khác biệt chữ hoa/thường (camelCase vs PascalCase)
      const user = data.user || data.User;
      const accessToken = data.accessToken || data.AccessToken;
      const refreshToken = data.refreshToken || data.RefreshToken;

      if (!user || !accessToken || !refreshToken) {
         throw new Error("Dữ liệu phản hồi không hợp lệ từ máy chủ.");
      }

      // Lưu thông tin user vào bộ nhớ máy (phải là string)
      await AsyncStorage.setItem("user", JSON.stringify(user));
      await AsyncStorage.setItem("accessToken", String(accessToken));
      await AsyncStorage.setItem("refreshToken", String(refreshToken));

      Alert.alert("Thành công", `Chào mừng ${user.fullName || user.FullName} quay lại!`);
      
      if (user.role === "Admin" || user.Role === "Admin") {
          router.replace("/(admin-tabs)" as any);
      } else {
          router.replace("/(tabs)" as any);
      }
    } catch (error: any) {
      // Bắt lỗi từ backend cẩn thận để không bị văng app (crash do truyền object vào Alert)
      let errorMsg = "Đăng nhập thất bại";
      if (typeof error.response?.data === 'string') {
        errorMsg = error.response.data;
      } else if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error.response?.data?.title) {
        errorMsg = error.response.data.title;
      } else if (error.message) {
        errorMsg = error.message;
      }
      Alert.alert("Lỗi đăng nhập", errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>🍿</Text>
        <Text style={styles.brandName}>Cinema Tickets</Text>
        <Text style={styles.subText}>Đăng nhập để đặt vé ngay</Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="Nhập email của bạn"
          placeholderTextColor="#718096"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Mật khẩu</Text>
        <TextInput
          style={styles.input}
          placeholder="Nhập mật khẩu"
          placeholderTextColor="#718096"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={[styles.loginButton, isLoading && { backgroundColor: "#4A5568" }]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.loginButtonText}>ĐĂNG NHẬP</Text>
          )}
        </TouchableOpacity>

        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>Chưa có tài khoản? </Text>
          <TouchableOpacity onPress={() => router.push("/register" as any)}>
            <Text style={styles.registerLink}>Đăng ký ngay</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1A202C", padding: 20, justifyContent: "center" },
  logoContainer: { alignItems: "center", marginBottom: 50 },
  logoText: { fontSize: 80, marginBottom: 10 },
  brandName: { fontSize: 28, fontWeight: "bold", color: "#FFF" },
  subText: { fontSize: 16, color: "#A0AEC0", marginTop: 5 },
  formContainer: { backgroundColor: "#2D3748", padding: 20, borderRadius: 16, elevation: 5 },
  label: { color: "#CBD5E0", fontSize: 14, fontWeight: "bold", marginBottom: 8, marginTop: 15 },
  input: { backgroundColor: "#1A202C", color: "#FFF", borderRadius: 8, paddingHorizontal: 15, height: 50, borderWidth: 1, borderColor: "#4A5568" },
  loginButton: { backgroundColor: "#E53E3E", borderRadius: 8, height: 50, justifyContent: "center", alignItems: "center", marginTop: 30 },
  loginButtonText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
  registerContainer: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  registerText: { color: "#A0AEC0", fontSize: 14 },
  registerLink: { color: "#4299E1", fontSize: 14, fontWeight: "bold" },
});