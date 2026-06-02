import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
// IMPORT axiosClient chuẩn của dự án
import axiosClient from "../../utils/axiosClient";

interface Combo {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
}

export default function ConcessionsScreen() {
  const router = useRouter();

  const {
    showtimeId,
    movieTitle,
    selectedSeats,
    total: seatTotal,
    posterUrl,
    roomName,
    startTime,
  } = useLocalSearchParams();

  const [combos, setCombos] = useState<Combo[]>([]);
  const [quantities, setQuantities] = useState<{ [key: number]: number }>({});
  const [isLoading, setIsLoading] = useState(true);

  // 👇 HÀM XỬ LÝ GHÉP LINK ẢNH MINIO 👇
  const getImageUrl = (path?: string) => {
    if (!path) return "https://via.placeholder.com/150x150.png?text=No+Image";
    
    // Gọi IP MinIO từ file .env/config
    const minioBaseUrl = require('../../utils/config').MINIO_URL;

    // Sửa lỗi hardcode IP cũ trong DB (tránh ảnh trắng tinh khi đổi IP)
    if (path.includes(":9000/")) {
      const parts = path.split(":9000");
      return `${minioBaseUrl}${parts[1]}`;
    }

    if (path.startsWith("http") || path.startsWith("data:image")) return path;
    return path.startsWith("/") ? `${minioBaseUrl}${path}` : `${minioBaseUrl}/${path}`;
  };

  useEffect(() => {
    const fetchCombos = async () => {
      try {
        setIsLoading(true);
        const response = await axiosClient.get<Combo[]>("/Combos");
        setCombos(response.data);
      } catch (err) {
        console.error(err);
        Alert.alert("Lỗi", "Không tải được danh sách bắp nước");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCombos();
  }, []);

  const MAX_QUANTITY = 5;

  const updateQuantity = (id: number, delta: number) => {
    setQuantities((prev) => {
      const currentVal = prev[id] || 0;
      const newVal = currentVal + delta;
      if (newVal < 0) return prev;
      if (newVal > MAX_QUANTITY) {
        Alert.alert("Thông báo", `Tối đa ${MAX_QUANTITY} phần cho mỗi combo!`);
        return prev;
      }
      return { ...prev, [id]: newVal };
    });
  };

  const comboTotal = combos.reduce((sum, combo) => {
    const qty = quantities[combo.id] || 0;
    return sum + combo.price * qty;
  }, 0);

  const finalTotal = Number(seatTotal) + comboTotal;

  const renderCombo = ({ item }: { item: Combo }) => {
    const qty = quantities[item.id] || 0;
    return (
      <View style={styles.comboCard}>
        {/* 👇 ĐÃ BỌC HÀM GETIMAGEURL VÀO ĐÂY 👇 */}
        <Image
          source={{ uri: getImageUrl(item.imageUrl) }}
          style={styles.comboImage}
        />
        <View style={styles.comboInfo}>
          <Text style={styles.comboName}>{item.name}</Text>
          <Text style={styles.comboDesc} numberOfLines={2}>
            {item.description}
          </Text>
          <Text style={styles.comboPrice}>
            {item.price.toLocaleString("vi-VN")} đ
          </Text>
        </View>
        <View style={styles.quantityControls}>
          <TouchableOpacity
            style={styles.btnRound}
            onPress={() => updateQuantity(item.id, -1)}
          >
            <Text style={styles.btnText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.qtyText}>{qty}</Text>
          <TouchableOpacity
            style={[styles.btnRound, styles.btnAdd]}
            onPress={() => updateQuantity(item.id, 1)}
          >
            <Text style={styles.btnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color="#E53E3E" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>⬅</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.movieTitle} numberOfLines={1}>
            {movieTitle}
          </Text>
          <Text style={styles.subTitle}>Bắp Nước & Tráng Miệng</Text>
        </View>
      </View>

      <FlatList
        data={combos}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderCombo}
        contentContainerStyle={styles.listContainer}
      />

      <View style={styles.footer}>
        <View style={styles.priceContainer}>
          <Text style={styles.totalLabel}>Tổng cộng:</Text>
          <Text style={styles.totalPrice}>
            {finalTotal.toLocaleString("vi-VN")} đ
          </Text>
        </View>
        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={() => {
            router.push({
              pathname: "/movie/payment" as any,
              params: {
                showtimeId,
                movieTitle,
                selectedSeats,
                combosData: JSON.stringify(quantities),
                combosNames: JSON.stringify(
                  combos.reduce((acc, c) => ({ ...acc, [c.id]: c.name }), {} as Record<number, string>)
                ),
                total: finalTotal,
                posterUrl,
                roomName,
                startTime,
              },
            });
          }}
        >
          <Text style={styles.checkoutText}>TIẾP TỤC</Text>
        </TouchableOpacity>
      </View>
    </View>
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
  backButton: { padding: 5, marginRight: 10 },
  backText: { fontSize: 20, color: "#FFF" },
  headerTitleContainer: { flex: 1, alignItems: "center", marginRight: 30 },
  movieTitle: { fontSize: 18, fontWeight: "bold", color: "#FFF" },
  subTitle: { fontSize: 13, color: "#A0AEC0", marginTop: 2 },

  listContainer: { padding: 20, paddingBottom: 100 },
  comboCard: {
    flexDirection: "row",
    backgroundColor: "#2D3748",
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
    alignItems: "center",
  },
  comboImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: "#FFF",
    resizeMode: "contain",
  },
  comboInfo: { flex: 1, marginLeft: 15, marginRight: 10 },
  comboName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 4,
  },
  comboDesc: { fontSize: 12, color: "#A0AEC0", marginBottom: 6 },
  comboPrice: { fontSize: 15, fontWeight: "bold", color: "#F6E05E" },

  quantityControls: { flexDirection: "row", alignItems: "center" },
  btnRound: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#4A5568",
    justifyContent: "center",
    alignItems: "center",
  },
  btnAdd: { backgroundColor: "#E53E3E" },
  btnText: { color: "#FFF", fontSize: 18, fontWeight: "bold", marginTop: -2 },
  qtyText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
    marginHorizontal: 12,
    width: 20,
    textAlign: "center",
  },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#2D3748",
    flexDirection: "row",
    padding: 20,
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#4A5568",
  },
  priceContainer: { flex: 1 },
  totalLabel: { color: "#A0AEC0", fontSize: 14 },
  totalPrice: { color: "#F6E05E", fontSize: 22, fontWeight: "bold" },
  checkoutButton: {
    backgroundColor: "#E53E3E",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  checkoutText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
});
