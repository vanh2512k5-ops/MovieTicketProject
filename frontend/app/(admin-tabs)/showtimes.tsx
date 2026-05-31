import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput, ScrollView } from "react-native";
import axiosClient from "@/utils/axiosClient";

export default function AdminShowtimes() {
  const [movies, setMovies] = useState<any[]>([]);
  const [cinemas, setCinemas] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [showtimes, setShowtimes] = useState<any[]>([]);
  
  const [selectedMovie, setSelectedMovie] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ movieId: "", roomId: "", startDate: "", startTime: "", basePrice: "85000" });
  
  // Trạng thái cho dropdown chọn phòng/phim
  const [roomDropdownVisible, setRoomDropdownVisible] = useState(false);
  const [movieDropdownVisible, setMovieDropdownVisible] = useState(false);

  useEffect(() => {
    fetchMoviesAndCinemas();
  }, []);

  const fetchMoviesAndCinemas = async () => {
    try {
      const [mRes, cRes, rRes] = await Promise.all([
        axiosClient.get("/Movies"),
        axiosClient.get("/Cinemas"),
        axiosClient.get("/Rooms")
      ]);
      setMovies(mRes.data);
      setCinemas(cRes.data);
      setRooms(rRes.data);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchShowtimes = async (movieId: number) => {
    setSelectedMovie(movieId);
    try {
      const res = await axiosClient.get(`/Showtimes/movie/${movieId}`);
      // Lịch chiếu trả về dạng nhóm theo rạp, ta cần flat nó ra
      let flatShowtimes: any[] = [];
      res.data.forEach((cinemaGroup: any) => {
        cinemaGroup.schedules.forEach((s: any) => {
          flatShowtimes.push({ ...s, cinemaName: cinemaGroup.cinemaName });
        });
      });
      setShowtimes(flatShowtimes);
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        setShowtimes([]);
      } else {
        console.log(error);
      }
    }
  };

  const openForm = (st?: any) => {
    if (st) {
      setEditingId(st.showtimeId);
      const stDate = new Date(st.startTime);
      // Giữ nguyên múi giờ Local khi parse sang text
      const localDate = new Date(stDate.getTime() - (stDate.getTimezoneOffset() * 60000));
      const dateString = localDate.toISOString().split('T')[0];
      const timeString = localDate.toISOString().split('T')[1].substring(0, 5);
      
      setFormData({
        movieId: st.movieId.toString(),
        roomId: st.roomId.toString(),
        startDate: dateString,
        startTime: timeString,
        basePrice: st.basePrice.toString()
      });
    } else {
      setEditingId(null);
      setFormData({ movieId: selectedMovie ? selectedMovie.toString() : "", roomId: "", startDate: "", startTime: "", basePrice: "85000" });
    }
    setModalVisible(true);
  };

  const saveShowtime = async () => {
    if (isSaving) return;

    // Validate ngày và giờ
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^\d{2}:\d{2}$/;
    
    if (!dateRegex.test(formData.startDate)) {
        Alert.alert("Lỗi nhập liệu", "Vui lòng nhập Ngày chiếu đúng định dạng YYYY-MM-DD\nVí dụ: 2026-06-01");
        return;
    }
    if (!timeRegex.test(formData.startTime)) {
        Alert.alert("Lỗi nhập liệu", "Vui lòng nhập Giờ chiếu đúng định dạng HH:mm\nVí dụ: 19:30");
        return;
    }

    const combinedDateTime = `${formData.startDate}T${formData.startTime}:00`;
    const parsedDate = new Date(combinedDateTime);
    if (isNaN(parsedDate.getTime())) {
        Alert.alert("Lỗi nhập liệu", "Ngày giờ kết hợp không hợp lệ!");
        return;
    }

    setIsSaving(true);
    try {
      const payload = {
        movieId: parseInt(formData.movieId),
        roomId: parseInt(formData.roomId),
        startTime: combinedDateTime,
        basePrice: parseFloat(formData.basePrice)
      };

      if (editingId) {
        await axiosClient.put(`/Showtimes/${editingId}`, payload);
        Alert.alert("Thành công", "Cập nhật suất chiếu thành công!");
      } else {
        await axiosClient.post("/Showtimes", payload);
        Alert.alert("Thành công", "Tạo suất chiếu thành công!");
      }
      setModalVisible(false);
      if (selectedMovie === parseInt(formData.movieId)) {
        fetchShowtimes(selectedMovie);
      }
    } catch (error: any) {
      console.log(error);
      Alert.alert("Lỗi", error.response?.data || "Không thể tạo suất chiếu");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteShowtime = (id: number) => {
    Alert.alert("Xác nhận", "Bạn có chắc muốn xóa suất chiếu này?", [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: "destructive", onPress: async () => {
          try {
            await axiosClient.delete(`/Showtimes/${id}`);
            Alert.alert("Thành công", "Đã xóa suất chiếu!");
            if (selectedMovie) fetchShowtimes(selectedMovie);
          } catch (error: any) {
            Alert.alert("Lỗi", error.response?.data || "Không thể xóa");
          }
        }
      }
    ]);
  };

  return (
    <>
      <View style={styles.container}>
        <Text style={styles.title}>QUẢN LÝ SUẤT CHIẾU</Text>
        
        <Text style={{color: '#FFF', marginBottom: 10, fontWeight: 'bold'}}>1. Chọn phim để xem lịch chiếu:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.movieList}>
          {movies.map(m => (
            <TouchableOpacity 
              key={m.id} 
              style={[styles.movieChip, selectedMovie === m.id && styles.movieChipActive]}
              onPress={() => fetchShowtimes(m.id)}
            >
              <Text style={[styles.movieChipText, selectedMovie === m.id && styles.movieChipTextActive]}>{m.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.addBtn} onPress={() => openForm()}>
          <Text style={styles.addBtnText}>+ THÊM SUẤT CHIẾU</Text>
        </TouchableOpacity>

        <Text style={{color: '#FFF', marginBottom: 10, fontWeight: 'bold'}}>2. Danh sách suất chiếu:</Text>
        <FlatList
          data={showtimes}
          keyExtractor={(item) => item.showtimeId.toString()}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.info}>
                <Text style={styles.cinemaName}>{item.cinemaName} - {item.roomName}</Text>
                <Text style={styles.time}>{new Date(item.startTime).toLocaleString('vi-VN')}</Text>
                <Text style={styles.price}>Giá gốc: {item.basePrice.toLocaleString()} đ</Text>
              </View>
              <View style={{flexDirection: "row", gap: 10}}>
                <TouchableOpacity style={[styles.delBtn, {backgroundColor: '#D69E2E'}]} onPress={() => openForm(item)}>
                  <Text style={styles.btnText}>Sửa</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.delBtn} onPress={() => deleteShowtime(item.showtimeId)}>
                  <Text style={styles.btnText}>Xóa</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={{color: '#A0AEC0', textAlign: 'center'}}>Chưa có suất chiếu nào.</Text>}
        />
      </View>

      {/* Modal Thêm Suất Chiếu & Chọn Phòng/Phim */}
      <Modal visible={modalVisible || roomDropdownVisible || movieDropdownVisible} animationType="slide" transparent>
        {movieDropdownVisible ? (
          <View style={styles.dropdownModalOverlay}>
            <View style={styles.dropdownModalContent}>
              <Text style={styles.modalTitle}>CHỌN PHIM</Text>
              <ScrollView keyboardShouldPersistTaps="handled">
                {movies.map(m => (
                  <TouchableOpacity 
                    key={m.id} 
                    style={styles.dropdownItem}
                    onPress={() => {
                      setFormData(prev => ({...prev, movieId: m.id.toString()}));
                      setMovieDropdownVisible(false);
                    }}
                  >
                    <Text style={{color: '#FFF', fontSize: 16}}>{m.title}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={[styles.cancelBtn, {marginTop: 15}]} onPress={() => setMovieDropdownVisible(false)}>
                <Text style={styles.btnText}>ĐÓNG</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : roomDropdownVisible ? (
          <View style={styles.dropdownModalOverlay}>
            <View style={styles.dropdownModalContent}>
              <Text style={styles.modalTitle}>CHỌN PHÒNG CHIẾU</Text>
              <ScrollView keyboardShouldPersistTaps="handled">
                {rooms.map(r => {
                  const cinema = cinemas.find(c => c.id === r.cinemaId);
                  return (
                    <TouchableOpacity 
                      key={r.id} 
                      style={styles.dropdownItem}
                      onPress={() => {
                        setFormData(prev => ({...prev, roomId: r.id.toString()}));
                        setRoomDropdownVisible(false);
                      }}
                    >
                      <Text style={{color: '#FFF', fontSize: 16}}>{r.name}</Text>
                      <Text style={{color: '#A0AEC0', fontSize: 13, marginTop: 3}}>{cinema?.name || 'Rạp không xác định'}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity style={[styles.cancelBtn, {marginTop: 15}]} onPress={() => setRoomDropdownVisible(false)}>
                <Text style={styles.btnText}>ĐÓNG</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>THÊM SUẤT CHIẾU</Text>
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text style={styles.label}>Phim</Text>
                <TouchableOpacity 
                  style={styles.dropdownToggle} 
                  onPress={() => setMovieDropdownVisible(true)}
                >
                  <Text style={{color: formData.movieId ? '#FFF' : '#A0AEC0'}}>
                    {formData.movieId 
                      ? movies.find(m => m.id.toString() === formData.movieId)?.title 
                      : "Chạm để chọn phim..."}
                  </Text>
                </TouchableOpacity>
                
                <Text style={styles.label}>Phòng chiếu</Text>
                <TouchableOpacity 
                  style={styles.dropdownToggle} 
                  onPress={() => setRoomDropdownVisible(true)}
                >
                  <Text style={{color: formData.roomId ? '#FFF' : '#A0AEC0'}}>
                    {formData.roomId 
                      ? rooms.find(r => r.id.toString() === formData.roomId)?.name + " - " + cinemas.find(c => c.id === rooms.find(r => r.id.toString() === formData.roomId)?.cinemaId)?.name 
                      : "Chạm để chọn phòng chiếu..."}
                  </Text>
                </TouchableOpacity>
                
                <View style={{flexDirection: 'row', gap: 10}}>
                  <View style={{flex: 1}}>
                    <Text style={styles.label}>Ngày chiếu (Năm-tháng-ngày)</Text>
                    <TextInput style={styles.input} placeholder="VD: 2026-06-01" placeholderTextColor="#A0AEC0" value={formData.startDate} onChangeText={t => setFormData({...formData, startDate: t})} />
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={styles.label}>Giờ chiếu (Giờ:phút)</Text>
                    <TextInput style={styles.input} placeholder="VD: 19:30" placeholderTextColor="#A0AEC0" value={formData.startTime} onChangeText={t => setFormData({...formData, startTime: t})} />
                  </View>
                </View>
                
                <Text style={styles.label}>Giá gốc (VND)</Text>
                <TextInput style={styles.input} placeholder="Giá gốc" placeholderTextColor="#A0AEC0" value={formData.basePrice} onChangeText={t => setFormData({...formData, basePrice: t})} keyboardType="numeric" />
              </ScrollView>
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}><Text style={styles.btnText}>HỦY</Text></TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={saveShowtime} disabled={isSaving}>
                  <Text style={styles.btnText}>{isSaving ? "ĐANG LƯU..." : "LƯU"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1A202C", padding: 20, paddingTop: 50 },
  title: { color: "#FFF", fontSize: 20, fontWeight: "bold", textAlign: "center", marginBottom: 20 },
  movieList: { maxHeight: 50, marginBottom: 20 },
  movieChip: { backgroundColor: "#2D3748", paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginRight: 10, justifyContent: 'center' },
  movieChipActive: { backgroundColor: "#3182CE" },
  movieChipText: { color: "#A0AEC0", fontWeight: "bold" },
  movieChipTextActive: { color: "#FFF" },
  addBtn: { backgroundColor: "#3182CE", padding: 12, borderRadius: 8, alignItems: "center", marginBottom: 20 },
  addBtnText: { color: "#FFF", fontWeight: "bold" },
  card: { flexDirection: "row", backgroundColor: "#2D3748", borderRadius: 12, padding: 15, marginBottom: 15, alignItems: 'center' },
  info: { flex: 1 },
  cinemaName: { color: "#FFF", fontSize: 15, fontWeight: "bold", marginBottom: 4 },
  time: { color: "#F6E05E", fontSize: 14, fontWeight: "bold", marginBottom: 4 },
  price: { color: "#A0AEC0", fontSize: 13 },
  delBtn: { backgroundColor: "#E53E3E", paddingVertical: 8, paddingHorizontal: 15, borderRadius: 6 },
  btnText: { color: "#FFF", fontSize: 13, fontWeight: "bold" },
  
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", padding: 20 },
  modalContent: { backgroundColor: "#2D3748", padding: 20, borderRadius: 12, maxHeight: "80%" },
  modalTitle: { color: "#FFF", fontSize: 18, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  label: { color: "#A0AEC0", fontSize: 12, marginBottom: 5 },
  input: { backgroundColor: "#1A202C", color: "#FFF", padding: 12, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: "#4A5568" },
  dropdownToggle: { backgroundColor: "#1A202C", padding: 12, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: "#4A5568" },
  dropdownModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", padding: 20 },
  dropdownModalContent: { backgroundColor: "#1A202C", borderRadius: 12, padding: 20, maxHeight: "70%", borderWidth: 1, borderColor: "#4A5568" },
  dropdownItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: "#2D3748" },
  modalActions: { flexDirection: "row", gap: 15, marginTop: 10 },
  cancelBtn: { flex: 1, backgroundColor: "#718096", padding: 15, borderRadius: 8, alignItems: "center" },
  saveBtn: { flex: 1, backgroundColor: "#3182CE", padding: 15, borderRadius: 8, alignItems: "center" }
});
