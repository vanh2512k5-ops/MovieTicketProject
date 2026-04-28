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
import axiosClient from "@/utils/axiosClient";

export default function RegisterScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName || !email || !password) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin!");
      return;
    }

    setIsLoading(true);
    try {
      await axiosClient.post("/Users/register", { fullName, email, password });
      
      Alert.alert(
        "Thành công",
        "Đăng ký tài khoản thành công! Vui lòng đăng nhập.",
        [{ text: "OK", onPress: () => router.back() }] 
      );
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data || "Đăng ký thất bại";
      Alert.alert("Lỗi đăng ký", errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>⬅</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tạo Tài Khoản</Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.label}>Họ và Tên</Text>
        <TextInput
          style={styles.input}
          placeholder="VD: Việt Anh"
          placeholderTextColor="#718096"
          value={fullName}
          onChangeText={setFullName}
        />

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
          placeholder="Tạo mật khẩu (Ít nhất 6 ký tự)"
          placeholderTextColor="#718096"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={[styles.registerButton, isLoading && { backgroundColor: "#4A5568" }]}
          onPress={handleRegister}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.registerButtonText}>ĐĂNG KÝ</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1A202C", padding: 20 },
  header: { flexDirection: "row", alignItems: "center", marginTop: 40, marginBottom: 30 },
  backButton: { padding: 5, marginRight: 15 },
  backText: { fontSize: 24, color: "#FFF" },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#FFF" },
  formContainer: { backgroundColor: "#2D3748", padding: 20, borderRadius: 16, elevation: 5 },
  label: { color: "#CBD5E0", fontSize: 14, fontWeight: "bold", marginBottom: 8, marginTop: 15 },
  input: { backgroundColor: "#1A202C", color: "#FFF", borderRadius: 8, paddingHorizontal: 15, height: 50, borderWidth: 1, borderColor: "#4A5568" },
  registerButton: { backgroundColor: "#48BB78", borderRadius: 8, height: 50, justifyContent: "center", alignItems: "center", marginTop: 30 },
  registerButtonText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
});