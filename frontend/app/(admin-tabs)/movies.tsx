import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Image, Modal, TextInput, ScrollView } from "react-native";
import axiosClient from "@/utils/axiosClient";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { API_URL } from "@/utils/config";

export default function AdminMovies() {
  const [movies, setMovies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: "", genre: "", duration: "120", releaseDate: "", director: "", language: "Tiếng Việt", ageRestriction: "P", description: ""
  });

  useEffect(() => {
    fetchMovies();
  }, []);

  const fetchMovies = async () => {
    try {
      const res = await axiosClient.get("/Movies");
      setMovies(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (path?: string) => {
    if (!path) return "https://via.placeholder.com/150";
    if (path.startsWith("http")) return path;
    const minioBaseUrl = require("../../utils/config").MINIO_URL;
    return `${minioBaseUrl}${path}`;
  };

  const openForm = (movie?: any) => {
    if (movie) {
      setEditingId(movie.id);
      setFormData({
        title: movie.title, genre: movie.genre || "", duration: movie.duration?.toString() || "120",
        releaseDate: movie.releaseDate?.split("T")[0] || "", director: movie.director || "", 
        language: movie.language || "Tiếng Việt", ageRestriction: movie.ageRestriction || "P", description: movie.description || ""
      });
    } else {
      setEditingId(null);
      setFormData({ title: "", genre: "", duration: "120", releaseDate: "", director: "", language: "Tiếng Việt", ageRestriction: "P", description: "" });
    }
    setModalVisible(true);
  };

  const saveMovie = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        duration: parseInt(formData.duration),
        releaseDate: formData.releaseDate ? new Date(formData.releaseDate).toISOString() : new Date().toISOString()
      };

      if (editingId) {
        await axiosClient.put(`/Movies/${editingId}`, payload);
        Alert.alert("Thành công", "Cập nhật phim thành công!");
      } else {
        await axiosClient.post("/Movies", payload);
        Alert.alert("Thành công", "Thêm phim mới thành công!");
      }
      setModalVisible(false);
      fetchMovies();
    } catch (error) {
      console.log(error);
      Alert.alert("Lỗi", "Không thể lưu thông tin phim");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteMovie = (id: number) => {
    Alert.alert("Xác nhận", "Bạn có chắc muốn xóa phim này?", [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: "destructive", onPress: async () => {
          try {
            await axiosClient.delete(`/Movies/${id}`);
            Alert.alert("Thành công", "Đã xóa phim!");
            fetchMovies();
          } catch (error: any) {
            Alert.alert("Lỗi", error.response?.data || "Không thể xóa phim này");
          }
        }
      }
    ]);
  };

  const uploadPoster = async (id: number) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1,
    });
    
    if (!result.canceled) {
      const localUri = result.assets[0].uri;
      const filename = localUri.split('/').pop() || 'poster.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      const formDataObj = new FormData();
      formDataObj.append('file', { uri: localUri, name: filename, type } as any);

      try {
        // Dùng axios thuần + lấy token từ storage để tránh interceptor ghi đè Content-Type
        const token = await AsyncStorage.getItem('accessToken');
        await axios.post(`${API_URL}/Movies/${id}/upload-poster`, formDataObj, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        });
        Alert.alert("Thành công", "Upload poster thành công!");
        fetchMovies();
      } catch (error: any) {
        console.log("Upload error:", JSON.stringify(error.response?.data || error.message));
        Alert.alert("Lỗi", error.response?.data || "Upload ảnh thất bại!");
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>QUẢN LÝ PHIM</Text>
      
      <TouchableOpacity style={styles.addBtn} onPress={() => openForm()}>
        <Text style={styles.addBtnText}>+ THÊM PHIM MỚI</Text>
      </TouchableOpacity>

      <FlatList
        data={movies}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image source={{ uri: getImageUrl(item.posterUrl) }} style={styles.poster} />
            <View style={styles.info}>
              <Text style={styles.movieTitle}>{item.title}</Text>
              <Text style={styles.movieSub}>{item.genre} | {item.duration} phút</Text>
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.editBtn} onPress={() => openForm(item)}>
                  <Text style={styles.btnText}>Sửa</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.imgBtn} onPress={() => uploadPoster(item.id)}>
                  <Text style={styles.btnText}>Ảnh</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.delBtn} onPress={() => deleteMovie(item.id)}>
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
            <Text style={styles.modalTitle}>{editingId ? "SỬA PHIM" : "THÊM PHIM"}</Text>
            <ScrollView>
              <TextInput style={styles.input} placeholder="Tên phim" placeholderTextColor="#A0AEC0" value={formData.title} onChangeText={t => setFormData({...formData, title: t})} />
              <TextInput style={styles.input} placeholder="Thể loại (VD: Hành động)" placeholderTextColor="#A0AEC0" value={formData.genre} onChangeText={t => setFormData({...formData, genre: t})} />
              <TextInput style={styles.input} placeholder="Đạo diễn" placeholderTextColor="#A0AEC0" value={formData.director} onChangeText={t => setFormData({...formData, director: t})} />
              <TextInput style={styles.input} placeholder="Thời lượng (phút)" placeholderTextColor="#A0AEC0" keyboardType="numeric" value={formData.duration} onChangeText={t => setFormData({...formData, duration: t})} />
              <TextInput style={styles.input} placeholder="Độ tuổi (VD: P, T13, T18)" placeholderTextColor="#A0AEC0" value={formData.ageRestriction} onChangeText={t => setFormData({...formData, ageRestriction: t})} />
              <TextInput style={styles.input} placeholder="Ngày khởi chiếu (YYYY-MM-DD)" placeholderTextColor="#A0AEC0" value={formData.releaseDate} onChangeText={t => setFormData({...formData, releaseDate: t})} />
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}><Text style={styles.btnText}>HỦY</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveMovie} disabled={isSaving}>
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
  card: { flexDirection: "row", backgroundColor: "#2D3748", borderRadius: 12, overflow: "hidden", marginBottom: 15 },
  poster: { width: 80, height: 120, resizeMode: "cover" },
  info: { flex: 1, padding: 10, justifyContent: "space-between" },
  movieTitle: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
  movieSub: { color: "#A0AEC0", fontSize: 12 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  editBtn: { backgroundColor: "#D69E2E", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  imgBtn: { backgroundColor: "#38A169", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  delBtn: { backgroundColor: "#E53E3E", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  btnText: { color: "#FFF", fontSize: 12, fontWeight: "bold" },
  
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", padding: 20 },
  modalContent: { backgroundColor: "#2D3748", padding: 20, borderRadius: 12, maxHeight: "80%" },
  modalTitle: { color: "#FFF", fontSize: 18, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  input: { backgroundColor: "#1A202C", color: "#FFF", padding: 12, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: "#4A5568" },
  modalActions: { flexDirection: "row", gap: 15, marginTop: 10 },
  cancelBtn: { flex: 1, backgroundColor: "#718096", padding: 15, borderRadius: 8, alignItems: "center" },
  saveBtn: { flex: 1, backgroundColor: "#3182CE", padding: 15, borderRadius: 8, alignItems: "center" }
});
