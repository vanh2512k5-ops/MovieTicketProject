import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput } from "react-native";
import axiosClient from "@/utils/axiosClient";

export default function AdminCinemas() {
  const [cinemas, setCinemas] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: "", address: "" });

  useEffect(() => {
    fetchCinemas();
  }, []);

  const fetchCinemas = async () => {
    try {
      const res = await axiosClient.get("/Cinemas");
      setCinemas(res.data);
    } catch (error) {
      console.log(error);
    }
  };

  const openForm = (cinema?: any) => {
    if (cinema) {
      setEditingId(cinema.id);
      setFormData({ name: cinema.name, address: cinema.address });
    } else {
      setEditingId(null);
      setFormData({ name: "", address: "" });
    }
    setModalVisible(true);
  };

  const saveCinema = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (editingId) {
        await axiosClient.put(`/Cinemas/${editingId}`, formData);
        Alert.alert("Thành công", "Cập nhật rạp thành công!");
      } else {
        await axiosClient.post("/Cinemas", formData);
        Alert.alert("Thành công", "Thêm rạp mới thành công!");
      }
      setModalVisible(false);
      fetchCinemas();
    } catch (error) {
      console.log(error);
      Alert.alert("Lỗi", "Không thể lưu rạp");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCinema = (id: number) => {
    Alert.alert("Xác nhận", "Xóa rạp này?", [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: "destructive", onPress: async () => {
          try {
            await axiosClient.delete(`/Cinemas/${id}`);
            Alert.alert("Thành công", "Đã xóa rạp!");
            fetchCinemas();
          } catch (error: any) {
            Alert.alert("Lỗi", error.response?.data || "Không thể xóa");
          }
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>QUẢN LÝ RẠP CHIẾU</Text>
      
      <TouchableOpacity style={styles.addBtn} onPress={() => openForm()}>
        <Text style={styles.addBtnText}>+ THÊM RẠP MỚI</Text>
      </TouchableOpacity>

      <FlatList
        data={cinemas}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.address}>{item.address}</Text>
              <Text style={styles.subInfo}>Phòng chiếu: {item.roomCount}</Text>
            </View>
            <View style={styles.actionCol}>
              <TouchableOpacity style={styles.editBtn} onPress={() => openForm(item)}><Text style={styles.btnText}>Sửa</Text></TouchableOpacity>
              <TouchableOpacity style={styles.delBtn} onPress={() => deleteCinema(item.id)}><Text style={styles.btnText}>Xóa</Text></TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal visible={modalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingId ? "SỬA RẠP" : "THÊM RẠP"}</Text>
            <TextInput style={styles.input} placeholder="Tên rạp" placeholderTextColor="#A0AEC0" value={formData.name} onChangeText={t => setFormData({...formData, name: t})} />
            <TextInput style={styles.input} placeholder="Địa chỉ" placeholderTextColor="#A0AEC0" value={formData.address} onChangeText={t => setFormData({...formData, address: t})} multiline />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}><Text style={styles.btnText}>HỦY</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveCinema} disabled={isSaving}>
                <Text style={styles.btnText}>{isSaving ? "ĐANG LƯU..." : "LƯU"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1A202C", padding: 20, paddingTop: 50 },
  title: { color: "#FFF", fontSize: 20, fontWeight: "bold", textAlign: "center", marginBottom: 20 },
  addBtn: { backgroundColor: "#3182CE", padding: 12, borderRadius: 8, alignItems: "center", marginBottom: 20 },
  addBtnText: { color: "#FFF", fontWeight: "bold" },
  card: { flexDirection: "row", backgroundColor: "#2D3748", borderRadius: 12, padding: 15, marginBottom: 15 },
  info: { flex: 1 },
  name: { color: "#FFF", fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  address: { color: "#A0AEC0", fontSize: 13, marginBottom: 8 },
  subInfo: { color: "#4299E1", fontSize: 12, fontWeight: "bold" },
  actionCol: { justifyContent: "space-between", gap: 10 },
  editBtn: { backgroundColor: "#D69E2E", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, alignItems: "center" },
  delBtn: { backgroundColor: "#E53E3E", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, alignItems: "center" },
  btnText: { color: "#FFF", fontSize: 12, fontWeight: "bold" },
  
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", padding: 20 },
  modalContent: { backgroundColor: "#2D3748", padding: 20, borderRadius: 12 },
  modalTitle: { color: "#FFF", fontSize: 18, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  input: { backgroundColor: "#1A202C", color: "#FFF", padding: 12, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: "#4A5568" },
  modalActions: { flexDirection: "row", gap: 15, marginTop: 10 },
  cancelBtn: { flex: 1, backgroundColor: "#718096", padding: 15, borderRadius: 8, alignItems: "center" },
  saveBtn: { flex: 1, backgroundColor: "#3182CE", padding: 15, borderRadius: 8, alignItems: "center" }
});
