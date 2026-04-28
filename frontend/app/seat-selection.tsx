import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
// Gọi Trạm thu phí Axios
import axiosClient from "@/utils/axiosClient";

interface Seat {
  id: number;
  rowName: string;
  seatNumber: number;
  type: string;
  isBooked: boolean;
}

export default function SeatSelectionScreen() {
  const {
    showtimeId,
    movieTitle,
    ageRestriction,
    posterUrl,
    roomName,
    startTime,
  } = useLocalSearchParams();
  const router = useRouter();

  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSeats = async () => {
      try {
        // 1. Dùng axiosClient gọn gàng
        const response = await axiosClient.get(`/Seats/showtime/${showtimeId}`);

        // 2. Phiên dịch dữ liệu từ Backend (C#) sang ngôn ngữ Frontend (React)
        const mappedSeats: Seat[] = response.data.map((s: any) => {
          let typeStr = "Normal";
          if (s.type === 1) typeStr = "VIP";
          else if (s.type === 2) typeStr = "Couple";
          else if (s.type === 3) typeStr = "Empty"; // Aisle (Lối đi) bên C# map thành Empty

          return {
            id: s.id,
            rowName: s.row, // Đổi 'row' thành 'rowName'
            seatNumber: s.number, // Đổi 'number' thành 'seatNumber'
            type: typeStr, // Đổi số thành chữ
            isBooked: s.isBooked,
          };
        });

        setSeats(mappedSeats);
      } catch (error) {
        console.error(error);
        Alert.alert("Lỗi", "Không thể tải sơ đồ ghế lúc này.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSeats();
  }, [showtimeId]);

  // Biến thông minh nhận diện phòng có cầu thang/lối đi hay không
  const hasWalkway = seats.some((s) => s.type === "Empty");

  const groupedSeats = seats.reduce(
    (acc, seat) => {
      if (!acc[seat.rowName]) acc[seat.rowName] = [];
      acc[seat.rowName].push(seat);
      return acc;
    },
    {} as Record<string, Seat[]>,
  );

  const toggleSeatSelection = (seat: Seat) => {
    if (seat.isBooked || seat.type === "Empty") return;

    setSelectedSeatIds((prevIds) => {
      if (prevIds.includes(seat.id)) {
        return prevIds.filter((id) => id !== seat.id);
      } else {
        return [...prevIds, seat.id];
      }
    });
  };

  const totalPrice = selectedSeatIds.reduce((total, id) => {
    const seat = seats.find((s) => s.id === id);
    if (!seat) return total;
    const price =
      seat.type === "Couple" ? 210000 : seat.type === "VIP" ? 105000 : 85000;
    return total + price;
  }, 0);

  // LOGIC KHÔNG BỎ TRỐNG GHẾ CÔ LẬP (Đỉnh cao của sếp)
  const handleContinue = () => {
    let isInvalid = false;
    let errorMsg = "";
    const rowNames = Object.keys(groupedSeats);

    for (const rowName of rowNames) {
      const isCoupleRow = groupedSeats[rowName].some(
        (s) => s.type === "Couple",
      );
      if (isCoupleRow) continue;

      const validSeatsInRow = [...groupedSeats[rowName]]
        .filter((s) => s.type !== "Empty")
        .sort((a, b) => a.seatNumber - b.seatNumber);

      for (let i = 0; i < validSeatsInRow.length; i++) {
        const currentSeat = validSeatsInRow[i];
        const isOccupied =
          currentSeat.isBooked || selectedSeatIds.includes(currentSeat.id);

        if (!isOccupied) {
          const isLeftOccupied =
            i === 0
              ? true
              : validSeatsInRow[i - 1].isBooked ||
                selectedSeatIds.includes(validSeatsInRow[i - 1].id);

          const isRightOccupied =
            i === validSeatsInRow.length - 1
              ? true
              : validSeatsInRow[i + 1].isBooked ||
                selectedSeatIds.includes(validSeatsInRow[i + 1].id);

          if (isLeftOccupied && isRightOccupied) {
            isInvalid = true;
            errorMsg = `Hàng ${rowName} có ghế trống số ${currentSeat.seatNumber} bị cô lập. Vui lòng không để trống đúng 1 ghế.`;
            break;
          }
        }
      }
      if (isInvalid) break;
    }

    if (isInvalid) {
      Alert.alert("Không hợp lệ!", errorMsg);
      return;
    }

    const proceedToConcessions = () => {
      router.push({
        pathname: "/concessions" as any,
        params: {
          showtimeId: showtimeId,
          movieTitle: movieTitle,
          selectedSeats: JSON.stringify(selectedSeatIds),
          total: totalPrice,
          posterUrl: posterUrl,
          roomName: roomName,
          startTime: startTime,
        },
      });
    };

    // Cảnh báo độ tuổi
    const ageString = ageRestriction as string;

    if (
      ageString &&
      ageString !== "P" &&
      ageString !== "Mọi lứa tuổi" &&
      ageString !== "Không"
    ) {
      Alert.alert(
        "Cảnh báo độ tuổi",
        `Bộ phim này có quy định độ tuổi: ${ageString}.\n\nRạp sẽ kiểm tra giấy tờ tùy thân khi bạn nhận vé. Bạn có chắc chắn mình đã đủ tuổi?`,
        [
          { text: "Quay lại", style: "cancel" },
          {
            text: "Tôi đã đủ tuổi",
            style: "destructive",
            onPress: proceedToConcessions,
          },
        ],
      );
    } else {
      proceedToConcessions();
    }
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
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.screenContainer}>
          <View style={styles.screenCurve} />
          <Text style={styles.screenText}>MÀN HÌNH</Text>
        </View>

        <View style={styles.matrixContainer}>
          {Object.keys(groupedSeats).map((rowName) => {
            const isCoupleRow = groupedSeats[rowName].some(
              (s) => s.type === "Couple",
            );

            return (
              <View key={rowName} style={styles.rowContainer}>
                <Text style={styles.rowLabel}>
                  {isCoupleRow ? "Couple" : rowName}
                </Text>

                <View
                  style={[
                    styles.seatsRow,
                    isCoupleRow && [
                      styles.coupleRowStyle,
                      { justifyContent: "center" },
                    ],
                  ]}
                >
                  {(() => {
                    const sortedSeats = [...groupedSeats[rowName]].sort(
                      (a, b) => a.id - b.id,
                    );
                    const visibleSeats = sortedSeats.filter(
                      (s) => s.type !== "Empty",
                    );

                    return sortedSeats.map((seat) => {
                      if (seat.type === "Empty") {
                        return (
                          <View
                            key={seat.id}
                            style={[
                              styles.seat,
                              { backgroundColor: "transparent" },
                            ]}
                          />
                        );
                      }

                      const isSelected = selectedSeatIds.includes(seat.id);
                      const isVip = seat.type === "VIP";
                      const isCouple = seat.type === "Couple";

                      const dynamicSeatNumber =
                        visibleSeats.findIndex((s) => s.id === seat.id) + 1;

                      return (
                        <TouchableOpacity
                          key={seat.id}
                          activeOpacity={0.7}
                          onPress={() => toggleSeatSelection(seat)}
                          style={[
                            styles.seat,
                            isVip && styles.seatVip,
                            isCouple && styles.seatCouple,
                            seat.isBooked && styles.seatBooked,
                            isSelected && styles.seatSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.seatText,
                              (seat.isBooked || isSelected || isCouple) && {
                                color: "#FFF",
                              },
                            ]}
                          >
                            {rowName}
                            {dynamicSeatNumber}
                          </Text>
                          {isVip && !isSelected && !seat.isBooked && (
                            <Text style={styles.iconStar}>☆</Text>
                          )}
                          {isCouple && !isSelected && !seat.isBooked && (
                            <Text style={styles.iconHeart}>♡</Text>
                          )}
                        </TouchableOpacity>
                      );
                    });
                  })()}
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View
              style={[styles.seat, { width: 16, height: 16, borderRadius: 3 }]}
            />
            <Text style={styles.legendText}>Thường</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.seat,
                styles.seatVip,
                { width: 16, height: 16, borderRadius: 3 },
              ]}
            />
            <Text style={styles.legendText}>VIP</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.seat,
                styles.seatCouple,
                { width: 30, height: 16, borderRadius: 3 },
              ]}
            />
            <Text style={styles.legendText}>Couple</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.seat,
                styles.seatSelected,
                { width: 16, height: 16, borderRadius: 3 },
              ]}
            />
            <Text style={styles.legendText}>Chọn</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.priceContainer}>
          <Text style={styles.totalLabel}>Tổng cộng:</Text>
          <Text style={styles.totalPrice}>
            {totalPrice.toLocaleString("vi-VN")} đ
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.checkoutButton,
            selectedSeatIds.length === 0 && { backgroundColor: "#4A5568" },
          ]}
          disabled={selectedSeatIds.length === 0}
          onPress={handleContinue}
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
  scrollContent: { paddingBottom: 120 },
  screenContainer: { alignItems: "center", marginTop: 20, marginBottom: 40 },
  screenCurve: {
    width: "80%",
    height: 30,
    borderTopWidth: 4,
    borderTopColor: "#4299E1",
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    opacity: 0.8,
  },
  screenText: {
    color: "#A0AEC0",
    fontSize: 12,
    marginTop: 5,
    letterSpacing: 2,
    fontWeight: "bold",
  },
  matrixContainer: { paddingHorizontal: 5 },
  rowContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    paddingLeft: 55,
  },
  rowLabel: {
    position: "absolute",
    left: 0,
    color: "#A0AEC0",
    fontSize: 12,
    fontWeight: "bold",
    width: 55,
    textAlign: "center",
  },
  seatsRow: { flex: 1, flexDirection: "row", justifyContent: "space-between" },
  coupleRowStyle: { gap: 10 },
  seat: {
    width: 22,
    height: 22,
    backgroundColor: "#E2E8F0",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  seatVip: { backgroundColor: "#ED8936" },
  seatCouple: { width: 50, backgroundColor: "#805AD5", borderRadius: 6 },
  seatSelected: { backgroundColor: "#E53E3E" },
  seatBooked: { backgroundColor: "#718096", opacity: 0.6 },
  seatText: { fontSize: 8, fontWeight: "bold", color: "#4A5568" },
  iconStar: { position: "absolute", bottom: -3, fontSize: 6, color: "#FFF" },
  iconHeart: { position: "absolute", bottom: -3, fontSize: 6, color: "#FFF" },
  legendContainer: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginTop: 40,
    paddingHorizontal: 10,
  },
  legendItem: { flexDirection: "row", alignItems: "center" },
  legendText: { color: "#A0AEC0", fontSize: 12, marginLeft: 6 },
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
