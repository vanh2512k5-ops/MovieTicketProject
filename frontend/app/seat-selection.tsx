import axiosClient from "@/utils/axiosClient";
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

interface Seat {
  id: number;
  rowName: string | null;
  seatNumber: number;
  type: string;
  isBooked: boolean;
  gridRow: number;
  gridColumn: number;
  isActive: boolean;
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

  // 👇 STATE QUẢN LÝ MỨC ĐỘ ZOOM 👇
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const fetchSeats = async () => {
      try {
        const response = await axiosClient.get(`/Seats/showtime/${showtimeId}`);

        const mappedSeats: Seat[] = response.data.map((s: any) => {
          let typeStr = "Normal";
          if (s.type === 1) typeStr = "VIP";
          else if (s.type === 2) typeStr = "Couple";
          else if (s.type === 3) typeStr = "Empty";

          return {
            id: s.id,
            rowName:
              s.rowName !== undefined
                ? s.rowName
                : s.row !== undefined
                  ? s.row
                  : null,
            seatNumber:
              s.seatNumber !== undefined
                ? s.seatNumber
                : s.number !== undefined
                  ? s.number
                  : 0,
            type: typeStr,
            isBooked: s.isBooked,
            gridRow: s.gridRow !== undefined ? s.gridRow : 0,
            gridColumn: s.gridColumn !== undefined ? s.gridColumn : 0,
            isActive: s.isActive !== undefined ? s.isActive : true,
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

  const groupedByGridRow = seats.reduce(
    (acc, seat) => {
      if (!acc[seat.gridRow]) acc[seat.gridRow] = [];
      acc[seat.gridRow].push(seat);
      return acc;
    },
    {} as Record<number, Seat[]>,
  );

  const toggleSeatSelection = (seat: Seat) => {
    if (seat.isBooked || seat.type === "Empty" || !seat.isActive) return;

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

  const handleContinue = () => {
    let isInvalid = false;
    let errorMsg = "";
    const rowIndexes = Object.keys(groupedByGridRow);

    for (const rIndex of rowIndexes) {
      const rowNum = parseInt(rIndex);
      const isCoupleRow = groupedByGridRow[rowNum].some(
        (s) => s.type === "Couple",
      );
      if (isCoupleRow) continue;

      const validSeatsInRow = [...groupedByGridRow[rowNum]]
        .filter((s) => s.type !== "Empty" && s.isActive)
        .sort((a, b) => a.gridColumn - b.gridColumn);

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
            errorMsg = `Hàng ${currentSeat.rowName} có ghế trống số ${currentSeat.seatNumber} bị cô lập. Vui lòng không để trống đúng 1 ghế.`;
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
        pathname: "/movie/concessions" as any,
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

    const ageString = ageRestriction as string;
    if (
      ageString &&
      ageString !== "P" &&
      ageString !== "Mọi lứa tuổi" &&
      ageString !== "Không"
    ) {
      Alert.alert(
        "Cảnh báo độ tuổi",
        `Bộ phim này có quy định độ tuổi: ${ageString}.\n\nRạp sẽ kiểm tra giấy tờ tùy thân. Bạn đã đủ tuổi?`,
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

  // 👇 HÀM XỬ LÝ NÚT BẤM ZOOM 👇
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 2)); // Tối đa zoom 2x
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5)); // Tối thiểu thu nhỏ 0.5x

  const maxRow =
    seats.length > 0 ? Math.max(...seats.map((s) => s.gridRow)) : 0;
  const maxCol =
    seats.length > 0 ? Math.max(...seats.map((s) => s.gridColumn)) : 0;

  const renderSeatMatrix = () => {
    let matrixUI = [];

    // 👇 TÍNH TOÁN KÍCH THƯỚC ĐỘNG DỰA TRÊN ZOOM 👇
    const seatW = 32 * zoom;
    const coupleW = 72 * zoom;
    const marginH = 4 * zoom;
    const fontS = 10 * zoom;
    const iconS = 8 * zoom;
    const radius = 6 * zoom;
    const labelW = 25 * zoom;
    const labelFontS = 14 * zoom;
    const rowMarginB = 8 * zoom;

    for (let r = 0; r <= maxRow; r++) {
      const rowSeats = seats.filter((s) => s.gridRow === r);
      if (rowSeats.length === 0) continue;

      const realSeat = rowSeats.find((s) => s.rowName);
      const rowLabel = realSeat ? realSeat.rowName : "";

      let rowColumnsUI = [];

      for (let c = 0; c <= maxCol; c++) {
        const seat = rowSeats.find((s) => s.gridColumn === c);

        if (!seat || seat.type === "Empty") {
          rowColumnsUI.push(
            <View
              key={`empty-${r}-${c}`}
              style={{ width: seatW, height: seatW, marginHorizontal: marginH }}
            />,
          );
          continue;
        }

        const isLocked = !seat.isActive;
        const isSelected = selectedSeatIds.includes(seat.id);
        const isOccupied = seat.isBooked;
        const isVip = seat.type === "VIP";
        const isCouple = seat.type === "Couple";

        rowColumnsUI.push(
          <TouchableOpacity
            key={seat.id}
            activeOpacity={0.7}
            disabled={isLocked || isOccupied}
            onPress={() => toggleSeatSelection(seat)}
            style={[
              styles.seatCell,
              {
                width: seatW,
                height: seatW,
                marginHorizontal: marginH,
                borderRadius: radius,
              },
              isVip && styles.seatVip,
              isCouple && {
                width: coupleW,
                backgroundColor: "#805AD5",
                borderRadius: radius,
              },
              isOccupied && styles.seatBooked,
              isLocked && styles.seatLocked,
              isSelected && styles.seatSelected,
            ]}
          >
            <Text
              style={[
                { fontSize: fontS, fontWeight: "bold", color: "#4A5568" },
                (isOccupied || isSelected || isCouple || isLocked || isVip) && {
                  color: "#FFF",
                },
              ]}
            >
              {seat.rowName}
              {seat.seatNumber}
            </Text>
            {isVip && !isSelected && !isOccupied && !isLocked && (
              <Text
                style={[
                  styles.iconStar,
                  { fontSize: iconS, bottom: -2 * zoom },
                ]}
              >
                ☆
              </Text>
            )}
            {isCouple && !isSelected && !isOccupied && !isLocked && (
              <Text
                style={[
                  styles.iconHeart,
                  { fontSize: iconS, bottom: -2 * zoom },
                ]}
              >
                ♡
              </Text>
            )}
          </TouchableOpacity>,
        );
      }

      matrixUI.push(
        <View
          key={`matrixRow-${r}`}
          style={[styles.matrixRow, { marginBottom: rowMarginB }]}
        >
          <View
            style={[
              styles.rowLabelBox,
              { width: labelW, marginRight: 10 * zoom },
            ]}
          >
            <Text style={[styles.rowLabelText, { fontSize: labelFontS }]}>
              {rowLabel}
            </Text>
          </View>
          {rowColumnsUI}
        </View>,
      );
    }
    return matrixUI;
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

        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View style={styles.matrixContainer}>{renderSeatMatrix()}</View>
        </ScrollView>

        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.seatLegend, { backgroundColor: "#E2E8F0" }]} />
            <Text style={styles.legendText}>Thường</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.seatLegend, styles.seatVip]} />
            <Text style={styles.legendText}>VIP</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.seatLegend,
                { backgroundColor: "#805AD5", width: 30 },
              ]}
            />
            <Text style={styles.legendText}>Couple</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.seatLegend, styles.seatSelected]} />
            <Text style={styles.legendText}>Đang chọn</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.seatLegend, styles.seatLocked]} />
            <Text style={styles.legendText}>Bảo trì</Text>
          </View>
        </View>
      </ScrollView>

      {/* 👇 THANH ĐIỀU KHIỂN ZOOM (FLOATING) 👇 */}
      <View style={styles.zoomControls}>
        <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomIn}>
          <Text style={styles.zoomBtnText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.zoomBtn, { borderBottomWidth: 0 }]}
          onPress={handleZoomOut}
        >
          <Text style={styles.zoomBtnText}>−</Text>
        </TouchableOpacity>
      </View>

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
  screenContainer: { alignItems: "center", marginTop: 20, marginBottom: 30 },
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

  matrixContainer: {
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    minWidth: "100%",
  },
  matrixRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowLabelBox: {
    alignItems: "center",
  },
  rowLabelText: {
    color: "#FFF",
    fontWeight: "bold",
  },
  seatCell: {
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  seatVip: { backgroundColor: "#ED8936" },
  seatSelected: { backgroundColor: "#E53E3E" },
  seatBooked: { backgroundColor: "#718096", opacity: 0.6 },
  seatLocked: {
    backgroundColor: "#1A202C",
    borderColor: "#4A5568",
    borderWidth: 1,
    opacity: 0.8,
  },
  iconStar: { position: "absolute", color: "#FFF" },
  iconHeart: { position: "absolute", color: "#FFF" },

  legendContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 15,
    marginTop: 30,
    paddingHorizontal: 10,
  },
  legendItem: { flexDirection: "row", alignItems: "center" },
  seatLegend: { width: 16, height: 16, borderRadius: 3 },
  legendText: { color: "#A0AEC0", fontSize: 12, marginLeft: 6 },

  // ==========================================
  // CSS NÚT ZOOM (MỚI THÊM)
  // ==========================================
  zoomControls: {
    position: "absolute",
    right: 20,
    bottom: 120, // Nằm nổi ngay trên Footer
    backgroundColor: "rgba(45, 55, 72, 0.9)",
    borderRadius: 8,
    padding: 2,
    zIndex: 10,
    elevation: 5, // Đổ bóng cho Android
    shadowColor: "#000", // Đổ bóng cho iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  zoomBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#1A202C",
  },
  zoomBtnText: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "bold",
    marginTop: -2, // Căn giữa dấu + và -
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
