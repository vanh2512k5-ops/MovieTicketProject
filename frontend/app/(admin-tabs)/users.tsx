import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from "react-native";
import axiosClient from "@/utils/axiosClient";

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axiosClient.get("/Users");
      setUsers(res.data);
    } catch (error) {
      console.log("Error fetching users", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = async (user: any) => {
    const newRole = user.role === "Admin" ? "User" : "Admin";
    Alert.alert(
      "Xác nhận đổi quyền",
      `Bạn có muốn cấp quyền ${newRole} cho người dùng ${user.fullName}?`,
      [
        { text: "Hủy", style: "cancel" },
        { 
          text: "Đồng ý", 
          onPress: async () => {
            try {
              await axiosClient.put(`/Users/${user.id}/role`, { role: newRole });
              Alert.alert("Thành công", "Đã cập nhật quyền");
              fetchUsers();
            } catch (error: any) {
              Alert.alert("Lỗi", error.response?.data || "Không thể cập nhật quyền");
            }
          }
        }
      ]
    );
  };

  const deleteUser = (id: number) => {
    Alert.alert("Xác nhận", "Xóa tài khoản này? Hành động này không thể hoàn tác.", [
      { text: "Hủy", style: "cancel" },
      { 
        text: "Xóa", 
        style: "destructive", 
        onPress: async () => {
          try {
            await axiosClient.delete(`/Users/${id}`);
            Alert.alert("Thành công", "Đã xóa người dùng!");
            fetchUsers();
          } catch (error: any) {
            Alert.alert("Lỗi", error.response?.data || "Không thể xóa (có thể người dùng đã mua vé)");
          }
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>QUẢN LÝ NGƯỜI DÙNG</Text>
      
      <FlatList
        data={users}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.info}>
              <Text style={styles.name}>{item.fullName}</Text>
              <Text style={styles.email}>{item.email}</Text>
              <Text style={styles.date}>Tham gia: {new Date(item.createdAt).toLocaleDateString('vi-VN')}</Text>
            </View>
            <View style={styles.actionCol}>
              <TouchableOpacity 
                style={[styles.roleBtn, item.role === "Admin" && styles.roleBtnAdmin]} 
                onPress={() => toggleRole(item)}
              >
                <Text style={styles.btnText}>{item.role}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.delBtn} onPress={() => deleteUser(item.id)}>
                <Text style={styles.btnText}>Xóa</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1A202C", padding: 20, paddingTop: 50 },
  title: { color: "#FFF", fontSize: 20, fontWeight: "bold", textAlign: "center", marginBottom: 20 },
  card: { flexDirection: "row", backgroundColor: "#2D3748", borderRadius: 12, padding: 15, marginBottom: 15 },
  info: { flex: 1, justifyContent: 'center' },
  name: { color: "#FFF", fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  email: { color: "#A0AEC0", fontSize: 13, marginBottom: 4 },
  date: { color: "#718096", fontSize: 12 },
  actionCol: { justifyContent: "space-between", gap: 10, alignItems: 'flex-end' },
  roleBtn: { backgroundColor: "#3182CE", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, width: 80, alignItems: "center" },
  roleBtnAdmin: { backgroundColor: "#805AD5" }, // Tím nếu là admin
  delBtn: { backgroundColor: "#E53E3E", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, width: 80, alignItems: "center" },
  btnText: { color: "#FFF", fontSize: 12, fontWeight: "bold" },
});
