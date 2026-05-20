import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import axiosClient from '@/utils/axiosClient';

interface Cinema {
  id: number;
  name: string;
  address: string;
  roomCount: number;
  imageUrl?: string; 
}

const CITIES = ["Tất cả", "Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng", "Thái Nguyên"];

export default function CinemasScreen() {
  const router = useRouter();
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState("Tất cả");

  const fetchCinemas = async () => {
    setIsLoading(true);
    try {
      const response = await axiosClient.get('/Cinemas');
      setCinemas(response.data);
    } catch (error) {
      console.error("Lỗi khi tải danh sách rạp:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCinemas();
  }, []);

  // ĐÃ FIX: Đổi link ảnh mặc định ổn định hơn
  const getCinemaImage = (path?: string) => {
    if (!path) return "https://placehold.co/600x400/2D3748/FFFFFF/png?text=Hệ+Thống+Rạp";
    if (path.startsWith("http") || path.startsWith("data:image")) return path;
    const minioBaseUrl = process.env.EXPO_PUBLIC_MINIO_URL;
    return `${minioBaseUrl}${path}`;
  };

  // ĐÃ FIX: Logic lọc kết hợp cả Tên/Địa chỉ VÀ Thành phố
  const filteredCinemas = cinemas.filter(cinema => {
    // 1. Kiểm tra xem có khớp từ khóa tìm kiếm không
    const matchesSearch = cinema.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          cinema.address.toLowerCase().includes(searchQuery.toLowerCase());
    
    // 2. Kiểm tra xem có khớp thành phố không
    const matchesCity = selectedCity === "Tất cả" || 
                        cinema.address.toLowerCase().includes(selectedCity.toLowerCase());

    // Trả về true nếu thỏa mãn CẢ 2 điều kiện
    return matchesSearch && matchesCity;
  });

  const renderCinemaCard = ({ item }: { item: Cinema }) => (
    <TouchableOpacity style={styles.cinemaCard} activeOpacity={0.8}>
      <Image source={{ uri: getCinemaImage(item.imageUrl) }} style={styles.cinemaImage} />
      <View style={styles.cinemaInfo}>
        <Text style={styles.cinemaName}>{item.name}</Text>
        <Text style={styles.cinemaAddress} numberOfLines={2}>{item.address}</Text>
        
        <View style={styles.cardFooter}>
          <Text style={styles.roomText}>🎞️ Số phòng chiếu: {item.roomCount}</Text>
          <TouchableOpacity style={styles.mapBtn}>
            <Text style={styles.mapBtnText}>🗺️ Chỉ đường</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hệ thống rạp</Text>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput 
            style={styles.searchInput}
            placeholder="Tìm theo tên rạp, đường, quận..."
            placeholderTextColor="#A0AEC0"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearIcon}>✖</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CITIES}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.filterChip, selectedCity === item && styles.filterChipActive]}
              onPress={() => setSelectedCity(item)}
            >
              <Text style={[styles.filterText, selectedCity === item && styles.filterTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingHorizontal: 15 }}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E53E3E" />
          <Text style={styles.loadingText}>Đang tải danh sách rạp...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredCinemas}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderCinemaCard}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Không tìm thấy rạp nào phù hợp 😢</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A202C' },
  header: { padding: 20, paddingTop: 50, backgroundColor: '#2D3748', borderBottomWidth: 1, borderBottomColor: '#4A5568' },
  headerTitle: { color: '#FFF', fontSize: 24, fontWeight: 'bold', marginBottom: 15 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A202C', borderRadius: 10, paddingHorizontal: 15, height: 45, borderWidth: 1, borderColor: '#4A5568' },
  searchIcon: { color: '#A0AEC0', marginRight: 10 },
  clearIcon: { color: '#A0AEC0', fontSize: 16, paddingHorizontal: 5 },
  searchInput: { flex: 1, color: '#FFF', fontSize: 15 },
  
  filterContainer: { paddingVertical: 15, backgroundColor: '#1A202C' },
  filterChip: { backgroundColor: '#2D3748', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#4A5568' },
  filterChipActive: { backgroundColor: '#E53E3E', borderColor: '#E53E3E' },
  filterText: { color: '#A0AEC0', fontSize: 14, fontWeight: 'bold' },
  filterTextActive: { color: '#FFF' },

  listContainer: { padding: 15, paddingBottom: 30 },
  cinemaCard: { backgroundColor: '#2D3748', borderRadius: 12, overflow: 'hidden', marginBottom: 20, elevation: 3 },
  cinemaImage: { width: '100%', height: 160, resizeMode: 'cover', backgroundColor: '#4A5568' }, // Thêm màu nền dự phòng
  cinemaInfo: { padding: 15 },
  cinemaName: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  cinemaAddress: { color: '#A0AEC0', fontSize: 13, lineHeight: 20, marginBottom: 15 },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#4A5568', paddingTop: 15 },
  roomText: { color: '#48BB78', fontSize: 14, fontWeight: 'bold' },
  mapBtn: { backgroundColor: '#4A5568', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  mapBtnText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#A0AEC0', marginTop: 10 },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#A0AEC0', fontSize: 16 }
});