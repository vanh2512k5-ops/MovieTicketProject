import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput, ScrollView } from "react-native";
import axiosClient from "@/utils/axiosClient";

export default function AdminCombos() {
  const [combos, setCombos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "", price: "0", imageUrl: "" });

  useEffect(() => {
    fetchCombos();
  }, []);

  const fetchCombos = async () => {
    try {
      const res = await axiosClient.get("/Combos");
      setCombos(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const openForm = (combo?: any) => {
    if (combo) {
      setEditingId(combo.id);
      setFormData({
        name: combo.name,
        description: combo.description,
        price: combo.price.toString(),
        imageUrl: combo.imageUrl || ""
      });
    } else {
      setEditingId(null);
      setFormData({ name: "", description: "", price: "0", imageUrl: "" });
    }
    setModalVisible(true);
  };

  const saveCombo = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        imageUrl: formData.imageUrl
      };

      if (editingId) {
        await axiosClient.put(`/Combos/${editingId}`, payload);
        Alert.alert("Thành công", "Cập nhật combo thành công!");
      } else {
        await axiosClient.post("/Combos", payload);
        Alert.alert("Thành công", "Thêm combo mới thành công!");
      }
      setModalVisible(false);
      fetchCombos();
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data || "Không thể lưu combo");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCombo = (id: number) => {
    Alert.alert("Xác nhận", "Bạn có chắc muốn xóa combo này?", [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: "destructive", onPress: async () => {
          try {
            await axiosClient.delete(`/Combos/${id}`);
            Alert.alert("Thành công", "Đã xóa combo!");
            fetchCombos();
          } catch (error: any) {
            Alert.alert("Lỗi", error.response?.data || "Không thể xóa combo này");
          }
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>QUẢN LÝ COMBO</Text>
      
      <TouchableOpacity style={styles.addBtn} onPress={() => openForm()}>
        <Text style={styles.addBtnText}>+ THÊM COMBO MỚI</Text>
      </TouchableOpacity>

      <FlatList
        data={combos}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.info}>
              <Text style={styles.comboName}>{item.name}</Text>
              <Text style={styles.comboDesc}>{item.description}</Text>
              <Text style={styles.comboPrice}>{item.price.toLocaleString()} đ</Text>
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.editBtn} onPress={() => openForm(item)}>
                  <Text style={styles.btnText}>Sửa</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.delBtn} onPress={() => deleteCombo(item.id)}>
                  <Text style={styles.btnText}>Xóa</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />

      {/* Modal Thêm/Sửa */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingId ? "SỬA COMBO" : "THÊM COMBO"}</Text>
            <ScrollView>
              <Text style={styles.label}>Tên Combo</Text>
              <TextInput style={styles.input} placeholder="Tên Combo" placeholderTextColor="#A0AEC0" value={formData.name} onChangeText={t => setFormData({...formData, name: t})} />
              
              <Text style={styles.label}>Mô tả</Text>
              <TextInput style={styles.input} placeholder="Mô tả" placeholderTextColor="#A0AEC0" value={formData.description} onChangeText={t => setFormData({...formData, description: t})} />
              
              <Text style={styles.label}>Giá (VND)</Text>
              <TextInput style={styles.input} placeholder="Giá" placeholderTextColor="#A0AEC0" keyboardType="numeric" value={formData.price} onChangeText={t => setFormData({...formData, price: t})} />
              
              <Text style={styles.label}>Link Ảnh (nếu có)</Text>
              <TextInput style={styles.input} placeholder="Link ảnh" placeholderTextColor="#A0AEC0" value={formData.imageUrl} onChangeText={t => setFormData({...formData, imageUrl: t})} />
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}><Text style={styles.btnText}>HỦY</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveCombo} disabled={isSaving}>
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
  card: { flexDirection: "row", backgroundColor: "#2D3748", borderRadius: 12, overflow: "hidden", marginBottom: 15, padding: 15 },
  info: { flex: 1 },
  comboName: { color: "#FFF", fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  comboDesc: { color: "#A0AEC0", fontSize: 13, marginBottom: 8 },
  comboPrice: { color: "#F6E05E", fontSize: 15, fontWeight: "bold" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  editBtn: { backgroundColor: "#D69E2E", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  delBtn: { backgroundColor: "#E53E3E", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  btnText: { color: "#FFF", fontSize: 12, fontWeight: "bold" },
  
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", padding: 20 },
  modalContent: { backgroundColor: "#2D3748", padding: 20, borderRadius: 12, maxHeight: "80%" },
  modalTitle: { color: "#FFF", fontSize: 18, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  label: { color: "#A0AEC0", fontSize: 12, marginBottom: 5 },
  input: { backgroundColor: "#1A202C", color: "#FFF", padding: 12, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: "#4A5568" },
  modalActions: { flexDirection: "row", gap: 15, marginTop: 10 },
  cancelBtn: { flex: 1, backgroundColor: "#718096", padding: 15, borderRadius: 8, alignItems: "center" },
  saveBtn: { flex: 1, backgroundColor: "#3182CE", padding: 15, borderRadius: 8, alignItems: "center" }
});
