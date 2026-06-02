import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import axiosClient from "../../utils/axiosClient";
import { GATEWAY_URL } from "../../utils/config";

export default function PaymentScreen() {
  const router = useRouter();
  const {
    showtimeId,
    movieTitle,
    selectedSeats,
    combosData,
    combosNames,
    total,
    posterUrl,
    roomName,
    startTime,
  } = useLocalSearchParams();

  // ─── States ───
  const [step, setStep] = useState<"confirm" | "qr" | "success">("confirm");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Map comboId → tên combo (truyền từ concessions.tsx)
  const comboNamesMap: Record<string, string> = (() => {
    try { return (combosNames as string) ? JSON.parse(combosNames as string) : {}; }
    catch { return {}; }
  })();

  // Dừng polling khi unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const getImageUrl = (path?: string) => {
    if (!path) return "https://via.placeholder.com/300x400.png?text=No+Poster";
    const minioBaseUrl = require("../../utils/config").MINIO_URL;
    
    if (path.includes(":9000/")) {
      const parts = path.split(":9000");
      return `${minioBaseUrl}${parts[1]}`;
    }

    if (path.startsWith("http") || path.startsWith("data:image")) return path;
    return path.startsWith("/") ? `${minioBaseUrl}${path}` : `${minioBaseUrl}/${path}`;
  };

  const formattedDate = startTime
    ? new Date(startTime as string).toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";

  // ─── Bước 1: Gọi API tạo booking & nhận QR ───
  const handleCreateBooking = async () => {
    try {
      setIsProcessing(true);

      const seatIds = JSON.parse(selectedSeats as string);
      const quantities = JSON.parse(combosData as string);

      const combosPayload = Object.entries(quantities)
        .filter(([_, qty]) => (qty as number) > 0)
        .map(([id, qty]) => ({
          comboId: parseInt(id),
          quantity: qty as number,
        }));

      const payload = {
        showtimeId: parseInt(showtimeId as string),
        seatIds,
        combos: combosPayload,
      };

      const res = await axiosClient.post("/Bookings", payload);
      const { bookingId: newId, qrUrl: newQr } = res.data;

      setBookingId(newId);
      setQrUrl(newQr);
      setStep("qr");

      // Bắt đầu polling mỗi 3 giây (timeout sau 10 phút)
      const maxRetries = 200;
      let attempts = 0;
      let consecutiveErrors = 0;
      pollingRef.current = setInterval(async () => {
        attempts++;
        if (attempts > maxRetries) {
          clearInterval(pollingRef.current!);
          Alert.alert("Thông báo", "Hết thời gian chờ thanh toán.");
          return;
        }
        try {
          const statusRes = await axiosClient.get(`/Bookings/${newId}/status`);
          consecutiveErrors = 0; // Reset khi kết nối thành công
          if (statusRes.data.status === "Paid") {
            clearInterval(pollingRef.current!);
            setStep("success");
          }
        } catch (pollError) {
          consecutiveErrors++;
          console.warn(`[Polling] Lỗi lần ${consecutiveErrors}:`, pollError);
          if (consecutiveErrors >= 5) {
            clearInterval(pollingRef.current!);
            Alert.alert(
              "Lỗi kết nối",
              "Không thể kiểm tra trạng thái thanh toán.\nVui lòng kiểm tra mục 'Vé của tôi' sau ít phút.",
              [{ text: "Xem vé của tôi", onPress: () => {
                  router.dismissAll();
                  router.replace("/(tabs)/tickets" as any);
              }}]
            );
          }
        }
      }, 3000);
    } catch (error: any) {
      if (!error.config?._daHienThiLoi) {
        Alert.alert(
          "Lỗi",
          error.response?.data?.message || "Không thể tạo booking lúc này."
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── Bước 2: Giả lập thanh toán ───
  const handleSimulatePayment = async () => {
    if (!bookingId) return;
    try {
      setIsSimulating(true);
      const response = await fetch(`${GATEWAY_URL}/simulate-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: bookingId }),
      });
      if (!response.ok) {
        const err = await response.json();
        Alert.alert("Lỗi", err.error || "Cổng thanh toán từ chối yêu cầu.");
      }
      // Polling sẽ tự phát hiện status = Paid
    } catch (error: any) {
      Alert.alert(
        "Lỗi kết nối",
        "Không thể kết nối đến cổng thanh toán. Hãy đảm bảo Gateway đang chạy."
      );
    } finally {
      setIsSimulating(false);
    }
  };

  // ─── Màn hình Thành công ───
  if (step === "success") {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>🎉</Text>
          <Text style={styles.successTitle}>Thanh toán thành công!</Text>
          <Text style={styles.successSub}>
            Vé của bạn đã được xác nhận. Chúc bạn xem phim vui vẻ!
          </Text>
          <TouchableOpacity
            style={styles.successBtn}
            onPress={() => {
              router.dismissAll();
              router.replace("/(tabs)/tickets");
            }}
          >
            <Text style={styles.successBtnText}>Xem vé của tôi</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Màn hình QR ───
  if (step === "qr") {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Thanh toán QR</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.qrCard}>
            <Text style={styles.qrTitle}>Quét mã QR để thanh toán</Text>
            <Text style={styles.qrAmount}>
              {Number(total).toLocaleString("vi-VN")} đ
            </Text>
            <Text style={styles.qrSub}>Booking #{bookingId}</Text>

            {qrUrl ? (
              <Image
                source={{ uri: qrUrl }}
                style={styles.qrImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.qrErrorBox}>
                <Text style={styles.qrErrorIcon}>⚠️</Text>
                <Text style={styles.qrErrorTitle}>Không thể tạo mã QR</Text>
                <Text style={styles.qrErrorDesc}>
                  Đặt vé thành công nhưng cổng thanh toán chưa phản hồi.{"\n"}
                  Vui lòng mang mã đơn{" "}
                  <Text style={styles.qrErrorHighlight}>#{bookingId}</Text>{" "}
                  đến quầy rạp để lấy vé.
                </Text>
                <TouchableOpacity
                  style={styles.qrErrorBtn}
                  onPress={() => {
                    router.dismissAll();
                    router.replace("/(tabs)/tickets" as any);
                  }}
                >
                  <Text style={styles.qrErrorBtnText}>Xem vé của tôi →</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.qrInfo}>
              <Text style={styles.qrInfoText}>
                🏦 MBBank · 2836250105
              </Text>
              <Text style={styles.qrInfoText}>👤 LE VIET ANH</Text>
            </View>
          </View>

          {/* Nút giả lập thanh toán */}
          <View style={styles.simulateCard}>
            <Text style={styles.simulateTitle}>
              🧪 Môi trường giả lập (Demo)
            </Text>
            <Text style={styles.simulateDesc}>
              Trong thực tế, bạn quét QR bằng app ngân hàng. Ở đây, bấm nút
              bên dưới để giả lập thanh toán thành công.
            </Text>
            <TouchableOpacity
              style={[
                styles.simulateBtn,
                isSimulating && styles.simulateBtnDisabled,
              ]}
              onPress={handleSimulatePayment}
              disabled={isSimulating}
            >
              {isSimulating ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.simulateBtnText}>✅ Đã thanh toán</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.pollingHint}>
            <ActivityIndicator size="small" color="#A0AEC0" />
            <Text style={styles.pollingHintText}>
              Đang chờ xác nhận thanh toán...
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─── Màn hình Xác nhận (mặc định) ───
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>⬅</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xác nhận đặt vé</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Thông tin phim */}
        <View style={styles.summaryCard}>
          <Image
            source={{ uri: getImageUrl(posterUrl as string) }}
            style={styles.poster}
          />
          <View style={styles.infoContainer}>
            <Text style={styles.movieTitle}>{movieTitle}</Text>
            <Text style={styles.infoText}>🎭 Phòng: {roomName}</Text>
            <Text style={styles.infoText}>🕐 {formattedDate}</Text>
          </View>
        </View>

        {/* Chi tiết */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Chi tiết đặt vé</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>🪑 Số ghế</Text>
            <Text style={styles.detailValue}>
              {JSON.parse(selectedSeats as string).length} ghế
            </Text>
          </View>

          {/* Hiển thị combo đã chọn */}
          {(() => {
            const quantities = JSON.parse(combosData as string);
            const hasCombo = Object.values(quantities).some((q) => (q as number) > 0);
            if (!hasCombo) return null;
            return (
              <>
                <View style={styles.divider} />
                <Text style={[styles.detailLabel, { marginBottom: 8 }]}>
                  🍿 Bắp nước
                </Text>
                {Object.entries(quantities)
                  .filter(([_, qty]) => (qty as number) > 0)
                  .map(([id, qty]) => (
                    <View key={id} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>  {comboNamesMap[id] || `Combo #${id}`}</Text>
                      <Text style={styles.detailValue}>x{qty as number}</Text>
                    </View>
                  ))}
              </>
            );
          })()}

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>💰 Tổng tiền</Text>
            <Text style={styles.totalPrice}>
              {Number(total).toLocaleString("vi-VN")} đ
            </Text>
          </View>
        </View>

        {/* Phương thức thanh toán */}
        <View style={styles.paymentMethodCard}>
          <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
          <View style={styles.methodRow}>
            <Text style={styles.methodIcon}>📱</Text>
            <View>
              <Text style={styles.methodName}>VietQR</Text>
              <Text style={styles.methodDesc}>
                Chuyển khoản ngân hàng qua mã QR
              </Text>
            </View>
            <Text style={styles.methodCheck}>✓</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.payButton, isProcessing && styles.payButtonDisabled]}
          onPress={handleCreateBooking}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.payButtonText}>
              Tiến hành thanh toán · {Number(total).toLocaleString("vi-VN")} đ
            </Text>
          )}
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
  backButton: { padding: 5, marginRight: 15 },
  backText: { fontSize: 20, color: "#FFF" },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#FFF" },

  content: { padding: 20, paddingBottom: 120 },

  // Summary card
  summaryCard: {
    flexDirection: "row",
    backgroundColor: "#2D3748",
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  poster: { width: 80, height: 120, borderRadius: 8, resizeMode: "cover" },
  infoContainer: { flex: 1, marginLeft: 15, justifyContent: "center" },
  movieTitle: { fontSize: 17, fontWeight: "bold", color: "#FFF", marginBottom: 10 },
  infoText: { fontSize: 14, color: "#A0AEC0", marginBottom: 5 },

  // Details card
  detailsCard: {
    backgroundColor: "#2D3748",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#FFF", marginBottom: 15 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  detailLabel: { fontSize: 14, color: "#A0AEC0" },
  detailValue: { fontSize: 14, color: "#FFF", fontWeight: "bold" },
  totalPrice: { fontSize: 18, color: "#F6E05E", fontWeight: "bold" },
  divider: { height: 1, backgroundColor: "#4A5568", marginVertical: 12 },

  // Payment method
  paymentMethodCard: {
    backgroundColor: "#2D3748",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  methodRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A202C",
    borderRadius: 10,
    padding: 12,
  },
  methodIcon: { fontSize: 28, marginRight: 12 },
  methodName: { color: "#FFF", fontWeight: "bold", fontSize: 15 },
  methodDesc: { color: "#A0AEC0", fontSize: 12 },
  methodCheck: { marginLeft: "auto", color: "#48BB78", fontSize: 20, fontWeight: "bold" },

  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: "#1A202C",
    borderTopWidth: 1,
    borderTopColor: "#2D3748",
  },
  payButton: {
    backgroundColor: "#E53E3E",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  payButtonDisabled: { backgroundColor: "#A0AEC0" },
  payButtonText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },

  // QR screen
  qrCard: {
    backgroundColor: "#2D3748",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
  },
  qrTitle: { color: "#FFF", fontSize: 16, fontWeight: "bold", marginBottom: 6 },
  qrAmount: { color: "#F6E05E", fontSize: 26, fontWeight: "bold", marginBottom: 4 },
  qrSub: { color: "#A0AEC0", fontSize: 13, marginBottom: 20 },
  qrImage: { width: 240, height: 240, borderRadius: 12, backgroundColor: "#FFF" },
  qrPlaceholder: {
    width: 240,
    height: 240,
    borderRadius: 12,
    backgroundColor: "#4A5568",
    justifyContent: "center",
    alignItems: "center",
  },
  qrPlaceholderText: { color: "#A0AEC0", marginTop: 10 },
  qrInfo: {
    marginTop: 20,
    backgroundColor: "#1A202C",
    borderRadius: 10,
    padding: 12,
    width: "100%",
    gap: 6,
  },
  qrInfoText: { color: "#A0AEC0", fontSize: 13, textAlign: "center" },

  // Simulate card
  simulateCard: {
    backgroundColor: "#744210",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#D69E2E",
  },
  simulateTitle: { color: "#F6E05E", fontWeight: "bold", fontSize: 15, marginBottom: 8 },
  simulateDesc: { color: "#ECC94B", fontSize: 13, marginBottom: 14, lineHeight: 20 },
  simulateBtn: {
    backgroundColor: "#38A169",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  simulateBtnDisabled: { backgroundColor: "#276749" },
  simulateBtnText: { color: "#FFF", fontWeight: "bold", fontSize: 15 },

  // Polling hint
  pollingHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
  },
  pollingHintText: { color: "#A0AEC0", fontSize: 13 },

  // Success screen
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  successIcon: { fontSize: 72, marginBottom: 20 },
  successTitle: { color: "#FFF", fontSize: 26, fontWeight: "bold", marginBottom: 12, textAlign: "center" },
  successSub: { color: "#A0AEC0", fontSize: 15, textAlign: "center", lineHeight: 22, marginBottom: 40 },
  successBtn: {
    backgroundColor: "#48BB78",
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  successBtnText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },

  // QR Error state (when gateway is down)
  qrErrorBox: {
    width: 240,
    minHeight: 240,
    borderRadius: 12,
    backgroundColor: "#4A5568",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  qrErrorIcon: { fontSize: 36, marginBottom: 10 },
  qrErrorTitle: { color: "#FFF", fontWeight: "bold", fontSize: 15, marginBottom: 8, textAlign: "center" },
  qrErrorDesc: { color: "#A0AEC0", fontSize: 13, textAlign: "center", lineHeight: 20, marginBottom: 16 },
  qrErrorHighlight: { color: "#F6E05E", fontWeight: "bold" },
  qrErrorBtn: {
    backgroundColor: "#3182CE",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  qrErrorBtnText: { color: "#FFF", fontWeight: "bold", fontSize: 14 },
});
