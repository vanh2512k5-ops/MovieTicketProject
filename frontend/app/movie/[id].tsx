import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
// Axios
import axiosClient from "@/utils/axiosClient";

interface Actor {
  id: number;
  name: string;
  avatarUrl: string;
}

interface Review {
  id: number;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
  likeCount: number;
}

interface Movie {
  id: number;
  title: string;
  duration: number;
  posterUrl?: string;
  description?: string;
  ageRestriction?: string;
  genre?: string;
  language?: string;
  rating: number;
  totalReviews: number;
  actors: Actor[];
  reviews: Review[];
}

export default function MovieDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [movie, setMovie] = useState<Movie | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [newComment, setNewComment] = useState("");
  const [newRating, setNewRating] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  const fetchMovieDetail = async () => {
    try {
      // Dùng axiosClient lấy dữ liệu phim, cực kỳ ngắn gọn
      const response = await axiosClient.get(`/Movies/${id}`);
      setMovie(response.data);
    } catch (error) {
      console.error("❌ Lỗi lấy chi tiết phim:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMovieDetail();
    AsyncStorage.getItem("user").then((data) => {
      if (data) setUserData(JSON.parse(data));
    });
  }, [id]);

  const handleLike = async (reviewId: number) => {
    // 1. Cập nhật giao diện MÀN HÌNH NGAY LẬP TỨC
    setMovie((prevMovie) => {
      if (!prevMovie) return prevMovie;
      return {
        ...prevMovie,
        reviews: prevMovie.reviews.map((rev) =>
          rev.id === reviewId
            ? { ...rev, likeCount: (rev.likeCount || 0) + 1 }
            : rev,
        ),
      };
    });

    // Gửi lệnh lưu xuống Backend
    try {
      await axiosClient.post(`/Reviews/${reviewId}/like`);
    } catch (error) {
      console.error("Lỗi khi like:", error);
    }
  };

  const handleBooking = async () => {
    try {
      const userStr = await AsyncStorage.getItem("user");

      if (!userStr) {
        Alert.alert(
          "Yêu cầu đăng nhập",
          "Bạn cần đăng nhập tài khoản để có thể đặt vé xem phim nhé!",
          [
            { text: "Để sau", style: "cancel" },
            {
              text: "Đăng nhập ngay",
              onPress: () => router.push("/login" as any),
            },
          ],
        );
        return;
      }

      if (movie) {
        router.push({
          pathname: "/showtimes" as any,
          params: {
            movieId: movie.id,
            movieTitle: movie.title,
            ageRestriction: movie.ageRestriction,
            posterUrl: movie.posterUrl,
          },
        });
      }
    } catch (error) {
      console.error("Lỗi kiểm tra session:", error);
    }
  };

  const submitReview = async () => {
    if (!newComment.trim()) {
      return Alert.alert("Thông báo", "Vui lòng nhập nội dung đánh giá!");
    }

    setIsSubmitting(true);
    try {
      await axiosClient.post("/Reviews", {
        movieId: movie?.id,
        userName: userData.fullName || userData.email || "Khán giả",
        rating: newRating,
        comment: newComment,
      });

      Alert.alert("Thành công", "Cảm ơn bạn đã đánh giá bộ phim này!");
      setNewComment("");
      fetchMovieDetail(); // Load lại để hiện đánh giá mới
    } catch (error: any) {
      console.error(error);
      const errorMsg =
        error.response?.data || "Không thể gửi đánh giá lúc này.";
      Alert.alert(
        "Lỗi",
        typeof errorMsg === "string" ? errorMsg : "Lỗi từ server",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading)
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color="#E53E3E" />
      </View>
    );

  if (!movie)
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <Text style={{ color: "#FFF", textAlign: "center" }}>
          Không tìm thấy phim!
        </Text>
      </View>
    );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>⬅ Trở về</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.posterContainer}>
          <Image
            source={{
              uri:
                movie.posterUrl ||
                "https://via.placeholder.com/300x400.png?text=No+Image",
            }}
            style={styles.poster}
          />
          <LinearGradient
            colors={["transparent", "rgba(26, 32, 44, 1)"]}
            style={styles.gradient}
          >
            <Text style={styles.title}>{movie.title}</Text>
            <View style={styles.tagsRow}>
              {movie.ageRestriction && (
                <View style={styles.ageTag}>
                  <Text style={styles.ageTagText}>{movie.ageRestriction}</Text>
                </View>
              )}
              <Text style={styles.info}>⏳ {movie.duration} phút</Text>
              <Text style={styles.info}> • {movie.genre}</Text>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.detailsContainer}>
          <View style={styles.ratingRow}>
            <Text style={styles.ratingText}>
              ⭐ {movie.rating ? movie.rating.toFixed(1) : "0.0"}/10
            </Text>
            <Text style={styles.reviewCount}>
              ({movie.totalReviews || 0} đánh giá)
            </Text>
            <Text style={styles.languageText}>{movie.language}</Text>
          </View>

          <Text style={styles.sectionTitle}>Nội dung phim</Text>
          <Text style={styles.description}>
            {movie.description || "Đang cập nhật mô tả cho bộ phim này..."}
          </Text>

          {movie.actors && movie.actors.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Diễn viên</Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={movie.actors}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <View style={styles.actorCard}>
                    <Image
                      source={{ uri: item.avatarUrl }}
                      style={styles.actorImage}
                    />
                    <Text style={styles.actorName} numberOfLines={2}>
                      {item.name}
                    </Text>
                  </View>
                )}
              />
            </>
          )}

          <View style={styles.reviewsSection}>
            <Text style={[styles.sectionTitle, { marginBottom: 20 }]}>
              Đánh giá từ cộng đồng
            </Text>

            {userData ? (
              <View style={styles.inputContainer}>
                <Text
                  style={{
                    color: "#FFF",
                    marginBottom: 10,
                    fontWeight: "bold",
                  }}
                >
                  Bạn chấm phim này mấy sao?
                </Text>
                <View style={styles.ratingPicker}>
                  {[2, 4, 6, 8, 10].map((num) => (
                    <TouchableOpacity
                      key={num}
                      onPress={() => setNewRating(num)}
                    >
                      <Text
                        style={[
                          styles.starOption,
                          newRating === num && styles.starActive,
                        ]}
                      >
                        {num} ⭐
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="Chia sẻ cảm nhận của bạn về phim nhé..."
                  placeholderTextColor="#718096"
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                />
                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    isSubmitting && { backgroundColor: "#718096" },
                  ]}
                  onPress={submitReview}
                  disabled={isSubmitting}
                >
                  <Text style={styles.submitBtnText}>
                    {isSubmitting ? "Đang gửi..." : "GỬI ĐÁNH GIÁ"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.loginRemind}>
                Đăng nhập để chia sẻ cảm nhận của bạn với mọi người nhé!
              </Text>
            )}

            {movie.reviews && movie.reviews.length > 0 ? (
              movie.reviews
                .sort(
                  (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime(),
                )
                .map((rev) => (
                  <View key={rev.id} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <Text style={styles.userNameRev}>👤 {rev.userName}</Text>
                      <View style={styles.ratingBadge}>
                        <Text style={styles.ratingRev}>⭐ {rev.rating}/10</Text>
                      </View>
                    </View>
                    <Text style={styles.commentText}>{rev.comment}</Text>

                    <View style={styles.reviewFooter}>
                      <TouchableOpacity
                        style={styles.likeBtn}
                        onPress={() => handleLike(rev.id)}
                      >
                        <Text style={styles.likeBtnText}>
                          ❤️ {rev.likeCount || 0}
                        </Text>
                      </TouchableOpacity>
                      <Text style={styles.dateText}>
                        {new Date(rev.createdAt).toLocaleDateString("vi-VN")}
                      </Text>
                    </View>
                  </View>
                ))
            ) : (
              <Text style={{ color: "#A0AEC0", fontStyle: "italic" }}>
                Chưa có đánh giá nào. Hãy là người đầu tiên nhé!
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.bookButton} onPress={handleBooking}>
          <Text style={styles.bookButtonText}>ĐẶT VÉ NGAY</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1A202C" },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  backText: { fontSize: 14, color: "#FFF", fontWeight: "bold" },
  posterContainer: { width: "100%", height: 500 },
  poster: { width: "100%", height: "100%", resizeMode: "cover" },
  gradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "60%",
    justifyContent: "flex-end",
    padding: 20,
  },
  title: { fontSize: 28, fontWeight: "bold", color: "#FFF", marginBottom: 8 },
  tagsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  ageTag: {
    backgroundColor: "#E53E3E",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ageTagText: { color: "#FFF", fontSize: 12, fontWeight: "bold" },
  info: { fontSize: 15, color: "#CBD5E0" },
  detailsContainer: { padding: 20 },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#2D3748",
  },
  ratingText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#F6E05E",
    marginRight: 8,
  },
  reviewCount: { fontSize: 14, color: "#A0AEC0", flex: 1 },
  languageText: { fontSize: 14, color: "#CBD5E0", fontStyle: "italic" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    color: "#A0AEC0",
    lineHeight: 22,
    marginBottom: 25,
  },
  actorCard: { width: 90, marginRight: 15, alignItems: "center" },
  actorImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
    backgroundColor: "#2D3748",
  },
  actorName: { fontSize: 13, color: "#CBD5E0", textAlign: "center" },
  reviewsSection: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#2D3748",
  },
  inputContainer: {
    backgroundColor: "#2D3748",
    padding: 15,
    borderRadius: 12,
    marginBottom: 25,
  },
  ratingPicker: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 15,
    flexWrap: "wrap",
  },
  starOption: {
    color: "#A0AEC0",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#4A5568",
    borderRadius: 20,
    fontSize: 14,
  },
  starActive: {
    backgroundColor: "#F6E05E",
    color: "#000",
    borderColor: "#F6E05E",
    fontWeight: "bold",
  },
  textInput: {
    backgroundColor: "#1A202C",
    color: "#FFF",
    padding: 15,
    borderRadius: 8,
    height: 100,
    textAlignVertical: "top",
    fontSize: 15,
  },
  submitBtn: {
    backgroundColor: "#48BB78",
    marginTop: 15,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  submitBtnText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
  reviewCard: {
    backgroundColor: "#2D3748",
    padding: 18,
    borderRadius: 12,
    marginBottom: 15,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  userNameRev: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
  ratingBadge: {
    backgroundColor: "rgba(246, 224, 94, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ratingRev: { color: "#F6E05E", fontSize: 14, fontWeight: "bold" },
  commentText: { color: "#CBD5E0", lineHeight: 22, fontSize: 15 },
  reviewFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  likeBtn: {
    backgroundColor: "rgba(229, 62, 62, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(229, 62, 62, 0.3)",
  },
  likeBtnText: { color: "#E53E3E", fontSize: 13, fontWeight: "bold" },
  dateText: { color: "#718096", fontSize: 12 },
  loginRemind: {
    color: "#A0AEC0",
    fontStyle: "italic",
    marginBottom: 20,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: "#1A202C",
  },
  bookButton: {
    backgroundColor: "#E53E3E",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#E53E3E",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  bookButtonText: { color: "#FFF", fontSize: 18, fontWeight: "bold" },
});
