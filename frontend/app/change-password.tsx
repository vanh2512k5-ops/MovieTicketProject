import { useState } from "react";
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
import axiosClient from "../utils/axiosClient";

const PasswordField = ({
  label,
  value,
  onChangeText,
  show,
  onToggle,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder: string;
}) => (
  <View style={styles.fieldGroup}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.inputRow}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#718096"
        secureTextEntry={!show}
        autoCapitalize="none"
      />
      <TouchableOpacity style={styles.eyeBtn} onPress={onToggle}>
        <Text style={styles.eyeText}>{show ? "🙈" : "👁️"}</Text>
      </TouchableOpacity>
    </View>
  </View>
);

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ tất cả các trường!");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Lỗi", "Mật khẩu mới phải có ít nhất 6 ký tự!");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Lỗi", "Xác nhận mật khẩu không khớp!");
      return;
    }

    try {
      setIsLoading(true);
      await axiosClient.post("/Users/change-password", {
        currentPassword,
        newPassword,
      });

      Alert.alert(
        "Thành công",
        "Đổi mật khẩu thành công!\nVui lòng đăng nhập lại nếu cần.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message ||
          error.response?.data ||
          "Không thể đổi mật khẩu lúc này."
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
        <Text style={styles.headerTitle}>Đổi mật khẩu</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Bảo mật tài khoản</Text>

          <PasswordField
            label="Mật khẩu hiện tại *"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            show={showCurrent}
            onToggle={() => setShowCurrent((v) => !v)}
            placeholder="Nhập mật khẩu hiện tại"
          />

          <View style={styles.divider} />

          <PasswordField
            label="Mật khẩu mới *"
            value={newPassword}
            onChangeText={setNewPassword}
            show={showNew}
            onToggle={() => setShowNew((v) => !v)}
            placeholder="Ít nhất 6 ký tự"
          />

          <PasswordField
            label="Xác nhận mật khẩu mới *"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            show={showConfirm}
            onToggle={() => setShowConfirm((v) => !v)}
            placeholder="Nhập lại mật khẩu mới"
          />

          {/* Strength indicator */}
          {newPassword.length > 0 && (
            <View style={styles.strengthRow}>
              <View
                style={[
                  styles.strengthBar,
                  {
                    backgroundColor:
                      newPassword.length >= 10
                        ? "#48BB78"
                        : newPassword.length >= 6
                        ? "#F6E05E"
                        : "#E53E3E",
                  },
                ]}
              />
              <Text style={styles.strengthText}>
                {newPassword.length >= 10
                  ? "Mạnh"
                  : newPassword.length >= 6
                  ? "Trung bình"
                  : "Yếu"}
              </Text>
            </View>
          )}

          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <Text style={styles.mismatchText}>⚠️ Mật khẩu không khớp</Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
          onPress={handleChangePassword}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>🔒 Đổi mật khẩu</Text>
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
  divider: { height: 1, backgroundColor: "#4A5568", marginVertical: 16 },

  fieldGroup: { marginBottom: 12 },
  label: { color: "#A0AEC0", fontSize: 14, marginBottom: 6 },
  inputRow: { flexDirection: "row", alignItems: "center" },
  input: {
    flex: 1,
    backgroundColor: "#1A202C",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#FFF",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#4A5568",
  },
  eyeBtn: { position: "absolute", right: 12, padding: 4 },
  eyeText: { fontSize: 18 },

  strengthRow: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 8 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthText: { color: "#A0AEC0", fontSize: 12, width: 70 },

  mismatchText: { color: "#FC8181", fontSize: 13, marginTop: 8 },

  saveButton: {
    backgroundColor: "#E53E3E",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveButtonDisabled: { backgroundColor: "#4A5568" },
  saveButtonText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
});
