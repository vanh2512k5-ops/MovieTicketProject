import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosClient from "../utils/axiosClient";

export default function UpdateProfileScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Pre-fill từ AsyncStorage
  useEffect(() => {
    const loadUser = async () => {
      const userData = await AsyncStorage.getItem("user");
      if (userData) {
        const user = JSON.parse(userData);
        setFullName(user.fullName || "");
        setPhone(user.phone || "");
      }
    };
    loadUser();
  }, []);

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert("Lỗi", "Họ tên không được để trống!");
      return;
    }

    try {
      setIsLoading(true);
      const res = await axiosClient.put("/Users/me", {
        fullName: fullName.trim(),
        phone: phone.trim() || null,
      });

      // Cập nhật AsyncStorage với thông tin mới
      const userData = await AsyncStorage.getItem("user");
      if (userData) {
        const user = JSON.parse(userData);
        const updatedUser = { ...user, fullName: res.data.fullName, phone: res.data.phone };
        await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
      }

      Alert.alert("Thành công", "Cập nhật thông tin thành công!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Không thể cập nhật thông tin."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>⬅</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cập nhật hồ sơ</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Thông tin cá nhân</Text>

          <Text style={styles.label}>Họ và tên *</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Nhập họ và tên"
            placeholderTextColor="#718096"
            autoCapitalize="words"
          />

          <Text style={styles.label}>Số điện thoại</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Nhập số điện thoại (tuỳ chọn)"
            placeholderTextColor="#718096"
            keyboardType="phone-pad"
          />

          <Text style={styles.hint}>* Trường bắt buộc</Text>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>💾 Lưu thay đổi</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1A202C" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: "#2D3748",
  },
  backButton: { padding: 5, marginRight: 15 },
  backText: { fontSize: 20, color: "#FFF" },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#FFF" },

  content: { padding: 20, paddingBottom: 60 },

  card: {
    backgroundColor: "#2D3748",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    color: "#A0AEC0",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 18,
  },
  label: { color: "#A0AEC0", fontSize: 14, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: "#1A202C",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#FFF",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#4A5568",
  },
  hint: { color: "#718096", fontSize: 12, marginTop: 14 },

  saveButton: {
    backgroundColor: "#3182CE",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveButtonDisabled: { backgroundColor: "#4A5568" },
  saveButtonText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
});
