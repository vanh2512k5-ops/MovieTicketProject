import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import axiosClient from "@/utils/axiosClient";
interface Movie {
  id: number;
  title: string;
  posterUrl?: string;
  genre?: string;
  rating: number;
  ageRestriction?: string;
}

const GENRES = [
  "Tất cả", "Tâm lý", "Tình cảm", "Hành động", 
  "Phiêu lưu", "Hoạt hình", "Gia đình", "Kinh dị", "Giật gân",
];

export default function HomeScreen() {
  const router = useRouter();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [userName, setUserName] = useState("Khách");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("Tất cả");

  const checkUserSession = async () => {
    try {
      const userDataString = await AsyncStorage.getItem("user");
      if (userDataString) {
        const user = JSON.parse(userDataString);
        setUserName(user.fullName);
        setIsLoggedIn(true);
        setUserRole(user.role);
      } else {
        setUserName("Khách");
        setIsLoggedIn(false);
        setUserRole(null);
      }
    } catch (error) {
      console.error("Lỗi khi đọc session:", error);
    }
  };

  // Dùng axiosClient và truyền params theo chuẩn Axios
  const fetchMovies = async (keyword = "", genre = "Tất cả") => {
    setIsLoading(true);
    try {
      const response = await axiosClient.get("/Movies/search", {
        params: {
          keyword: keyword,
          genre: genre === "Tất cả" ? "" : genre,
        },
      });
      // Axios tự động parse JSON nên chỉ cần gọi response.data
      setMovies(response.data);
    } catch (error) {
      console.error("Lỗi tải phim:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách phim.");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchMovies(searchQuery, selectedGenre);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, selectedGenre]);

  useEffect(() => {
    checkUserSession();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    checkUserSession();
    fetchMovies(searchQuery, selectedGenre);
  };

  const renderMovieCard = ({ item }: { item: Movie }) => (
    <TouchableOpacity
      style={styles.movieCard}
      activeOpacity={0.8}
      onPress={() => router.push(`/movie/${item.id}` as any)}
    >
      <View style={styles.posterContainer}>
        <Image
          source={{
            uri: item.posterUrl || "https://via.placeholder.com/300x450.png?text=No+Image",
          }}
          style={styles.poster}
        />
        {item.ageRestriction && (
          <View style={styles.ageTag}>
            <Text style={styles.ageTagText}>{item.ageRestriction}</Text>
          </View>
        )}
      </View>
      <View style={styles.movieInfo}>
        <Text style={styles.movieTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.movieGenre} numberOfLines={1}>{item.genre || "Đang cập nhật"}</Text>
        <View style={styles.ratingContainer}>
          <Text style={styles.ratingStar}>⭐</Text>
          <Text style={styles.ratingText}>{item.rating.toFixed(1)}/10</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.userInfo}
            activeOpacity={0.7}
            onPress={() => {
              if (!isLoggedIn) {
                router.push("/login" as any);
              } else {
                Alert.alert(
                  "Đăng xuất",
                  "Bạn có muốn đăng xuất khỏi tài khoản này?",
                  [
                    { text: "Hủy", style: "cancel" },
                    {
                      text: "Đăng xuất",
                      style: "destructive",
                      onPress: async () => {
                        await AsyncStorage.removeItem("user");
                        checkUserSession();
                        Alert.alert("Thành công", "Đã đăng xuất an toàn.");
                      },
                    },
                  ]
                );
              }
            }}
          >
            <Image
              source={{ uri: isLoggedIn ? "https://i.pravatar.cc/100?img=11" : "https://via.placeholder.com/100x100.png?text=Guest" }}
              style={styles.avatar}
            />
            <View>
              <Text style={styles.greeting}>Xin chào,</Text>
              <Text style={styles.userName}>{userName} </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.rightActions}>
            {userRole === "Admin" && (
              <TouchableOpacity style={styles.adminBtn} onPress={() => router.push("/admin-manage-movies" as any)}>
                <Text style={styles.adminBtnText}>⚙️ Quản trị</Text>
              </TouchableOpacity>
            )}
            {isLoggedIn && (
              <TouchableOpacity style={styles.myTicketBtn} onPress={() => router.push("/my-tickets" as any)}>
                <Text style={styles.myTicketText}>🎟️ Vé của tôi</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {!isLoggedIn && <Text style={styles.loginHint}>Đăng nhập / Đăng ký</Text>}

        <View style={styles.searchBar}>
          <Text style={{ color: "#A0AEC0", marginRight: 10 }}>🔍</Text>
          <TextInput
            placeholder="Tìm kiếm phim,..."
            placeholderTextColor="#A0AEC0"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Text style={{ color: "#A0AEC0", fontSize: 16, paddingHorizontal: 5 }}>✖</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.genreListContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={GENRES}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.genreChip, selectedGenre === item && styles.genreChipActive]}
                onPress={() => setSelectedGenre(item)}
              >
                <Text style={[styles.genreText, selectedGenre === item && styles.genreTextActive]}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E53E3E" />}
      >
        <View style={styles.bannerContainer}>
          <Image source={{ uri: "https://files.betacorp.vn/files/media%2Fimages%2F2024%2F04%2F04%2F1701399313271-920x420-1-094320-040424-95.png" }} style={styles.bannerImage} />
        </View>

        <Text style={styles.sectionTitle}>🎬 PHIM ĐANG CHIẾU</Text>

        {isLoading ? (
          <ActivityIndicator size="large" color="#E53E3E" style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.movieListContainer}>
            <FlatList
              data={movies}
              keyExtractor={(item) => item.id.toString()}
              numColumns={2}
              scrollEnabled={false}
              columnWrapperStyle={styles.row}
              renderItem={renderMovieCard}
              ListEmptyComponent={<Text style={styles.emptyText}>Mọt phim ơi, không tìm thấy kết quả nào! 🍿</Text>}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1A202C" },
  header: { paddingTop: 50, paddingHorizontal: 20, paddingBottom: 15, backgroundColor: "#2D3748", borderBottomWidth: 1, borderBottomColor: "#4A5568" },
  headerTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  userInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#E53E3E", marginRight: 12 },
  greeting: { color: "#A0AEC0", fontSize: 14 },
  userName: { color: "#FFF", fontSize: 18, fontWeight: "bold" },
  rightActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  adminBtn: { backgroundColor: "#4299E1", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  adminBtnText: { color: "#FFF", fontSize: 11, fontWeight: "bold" },
  myTicketBtn: { backgroundColor: "#E53E3E", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  myTicketText: { color: "#FFF", fontSize: 11, fontWeight: "bold" },
  loginHint: { color: "#4299E1", fontSize: 12, marginTop: -10, marginBottom: 15, fontWeight: "bold" },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#1A202C", borderRadius: 10, paddingHorizontal: 15, height: 45, borderWidth: 1, borderColor: "#4A5568", marginBottom: 15 },
  searchInput: { flex: 1, color: "#FFF", fontSize: 15 },
  genreListContainer: { height: 35 },
  genreChip: { backgroundColor: "#1A202C", paddingHorizontal: 15, paddingVertical: 8, borderRadius: 15, marginRight: 10, borderWidth: 1, borderColor: "#4A5568", justifyContent: "center" },
  genreChipActive: { backgroundColor: "#E53E3E", borderColor: "#E53E3E" },
  genreText: { color: "#A0AEC0", fontSize: 13, fontWeight: "bold" },
  genreTextActive: { color: "#FFF" },
  scrollContent: { paddingBottom: 30 },
  bannerContainer: { margin: 20, height: 160, borderRadius: 12, overflow: "hidden" },
  bannerImage: { width: "100%", height: "100%", resizeMode: "cover" },
  sectionTitle: { color: "#FFF", fontSize: 16, fontWeight: "bold", paddingHorizontal: 20, marginBottom: 15 },
  movieListContainer: { paddingHorizontal: 10 },
  row: { justifyContent: "space-between", paddingHorizontal: 10, marginBottom: 20 },
  movieCard: { width: "47%", backgroundColor: "#2D3748", borderRadius: 12, overflow: "hidden" },
  posterContainer: { width: "100%", height: 220, position: "relative" },
  poster: { width: "100%", height: "100%", resizeMode: "cover" },
  ageTag: { position: "absolute", top: 8, right: 8, backgroundColor: "#E53E3E", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  ageTagText: { color: "#FFF", fontSize: 10, fontWeight: "bold" },
  movieInfo: { padding: 12 },
  movieTitle: { color: "#FFF", fontSize: 15, fontWeight: "bold", marginBottom: 4 },
  movieGenre: { color: "#A0AEC0", fontSize: 12, marginBottom: 8 },
  ratingContainer: { flexDirection: "row", alignItems: "center" },
  ratingStar: { fontSize: 12, marginRight: 4 },
  ratingText: { color: "#F6E05E", fontSize: 13, fontWeight: "bold" },
  emptyText: { color: "#A0AEC0", textAlign: "center", marginTop: 20 },
});