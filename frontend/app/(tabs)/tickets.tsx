import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosClient from "@/utils/axiosClient";

interface ComboInfo {
  name: string;
  quantity: number;
  price: number;
}

interface Ticket {
  bookingId: number;
  movieTitle: string;
  posterUrl: string;
  cinemaName: string;
  roomName: string;
  showTime: string;
  seats: string[];
  combos: ComboInfo[];
  status: string;
  totalPrice: number;
}

export default function TicketsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Xử lý link ảnh Poster tuân thủ .env
  const getPosterUrl = (path?: string) => {
    if (!path) return "https://via.placeholder.com/300x450.png?text=No+Poster";
    if (path.startsWith("http") || path.startsWith("data:image")) return path;
    const minioBaseUrl = require('../../utils/config').MINIO_URL;
    return `${minioBaseUrl}${path}`;
  };

  const fetchMyTickets = async (userId: number) => {
    setIsLoading(true);
    try {
      const response = await axiosClient.get(`/Bookings/my-bookings`);
      setTickets(response.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        setTickets([]); // Không có vé
      } else {
        console.error("Lỗi lấy lịch sử vé:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const checkUserAndFetchTickets = async () => {
        const userData = await AsyncStorage.getItem("user");
        if (userData) {
          const user = JSON.parse(userData);
          setIsLoggedIn(true);
          fetchMyTickets(user.id);
        } else {
          setIsLoggedIn(false);
          setIsLoading(false);
        }
      };
      checkUserAndFetchTickets();
    }, []),
  );

  // Phân loại vé: So sánh giờ chiếu với giờ hiện tại
  const now = new Date();
  const displayedTickets = tickets.filter((ticket) => {
    const showTimeDate = new Date(ticket.showTime);
    if (activeTab === "upcoming") {
      return showTimeDate > now && ticket.status !== "Cancelled";
    } else {
      return showTimeDate <= now || ticket.status === "Cancelled";
    }
  });

  const renderTicketCard = ({ item }: { item: Ticket }) => {
    const formattedDate = new Date(item.showTime).toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    return (
      <View style={styles.ticketCard}>
        <View style={styles.ticketHeader}>
          <Image
            source={{ uri: getPosterUrl(item.posterUrl) }}
            style={styles.poster}
          />
          <View style={styles.ticketInfo}>
            <Text style={styles.movieTitle} numberOfLines={2}>
              {item.movieTitle}
            </Text>
            <Text style={styles.cinemaName}>{item.cinemaName}</Text>
            <View style={styles.dateTimeContainer}>
              <Text style={styles.dateTimeText}>🕒 {formattedDate}</Text>
            </View>
          </View>
        </View>

        <View style={styles.ticketDivider}>
          <View style={styles.cutoutLeft} />
          <View style={styles.dashedLine} />
          <View style={styles.cutoutRight} />
        </View>

        <View style={styles.ticketFooter}>
          <View style={styles.seatInfo}>
            <Text style={styles.label}>{item.roomName}</Text>
            <Text style={styles.value}>Ghế: {item.seats.join(", ")}</Text>
            {item.combos && item.combos.length > 0 && (
              <Text style={styles.valueCombo}>
                Bắp nước: {item.combos.map(c => `${c.quantity}x ${c.name}`).join(", ")}
              </Text>
            )}
          </View>

          {activeTab === "upcoming" ? (
            <TouchableOpacity style={styles.qrButton}>
              <Text style={styles.qrButtonText}>⬛ Mã QR</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.pastBadge}>
              <Text style={styles.pastBadgeText}>
                {item.status === "Cancelled" ? "Đã hủy" : "Đã hoàn thành"}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (!isLoggedIn) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>
          Vui lòng đăng nhập để xem vé của bạn!
        </Text>
        <TouchableOpacity
          style={styles.loginBtn}
          onPress={() => router.push("/login" as any)}
        >
          <Text style={styles.loginBtnText}>🔑 Đi đến Đăng nhập</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Vé của tôi</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "upcoming" && styles.tabButtonActive,
          ]}
          onPress={() => setActiveTab("upcoming")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "upcoming" && styles.tabTextActive,
            ]}
          >
            Sắp chiếu
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "past" && styles.tabButtonActive,
          ]}
          onPress={() => setActiveTab("past")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "past" && styles.tabTextActive,
            ]}
          >
            Đã xem
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#E53E3E" />
        </View>
      ) : (
        <FlatList
          data={displayedTickets}
          keyExtractor={(item) => item.bookingId.toString()}
          renderItem={renderTicketCard}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>
                {activeTab === "upcoming"
                  ? "Bạn chưa có lịch xem phim nào sắp tới 🍿"
                  : "Bạn chưa có lịch sử xem phim 🎬"}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1A202C" },
  header: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: "#2D3748",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#4A5568",
  },
  headerTitle: { color: "#FFF", fontSize: 20, fontWeight: "bold" },

  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#2D3748",
    padding: 10,
    justifyContent: "center",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
    marginHorizontal: 5,
  },
  tabButtonActive: { backgroundColor: "#E53E3E" },
  tabText: { color: "#A0AEC0", fontSize: 15, fontWeight: "bold" },
  tabTextActive: { color: "#FFF" },

  listContainer: { padding: 15, paddingBottom: 30 },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1A202C",
  },

  ticketCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginBottom: 20,
    overflow: "hidden",
  },
  ticketHeader: {
    flexDirection: "row",
    padding: 15,
    backgroundColor: "#2D3748",
  },
  poster: { width: 70, height: 100, borderRadius: 8, resizeMode: "cover" },
  ticketInfo: { flex: 1, marginLeft: 15, justifyContent: "center" },
  movieTitle: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  cinemaName: { color: "#A0AEC0", fontSize: 13, marginBottom: 8 },
  dateTimeContainer: {
    backgroundColor: "#1A202C",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  dateTimeText: { color: "#48BB78", fontSize: 12, fontWeight: "bold" },

  ticketDivider: {
    height: 20,
    backgroundColor: "#2D3748",
    flexDirection: "row",
    alignItems: "center",
  },
  cutoutLeft: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#1A202C",
    marginLeft: -10,
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: "#4A5568",
    borderStyle: "dashed",
    marginHorizontal: 10,
  },
  cutoutRight: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#1A202C",
    marginRight: -10,
  },

  ticketFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#2D3748",
  },
  seatInfo: { flex: 1 },
  label: {
    color: "#A0AEC0",
    fontSize: 11,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  value: { color: "#F6E05E", fontSize: 16, fontWeight: "bold" },
  valueCombo: { color: "#A0AEC0", fontSize: 13, marginTop: 4 },
  qrButton: {
    backgroundColor: "#FFF",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  qrButtonText: { color: "#1A202C", fontSize: 13, fontWeight: "bold" },
  pastBadge: {
    backgroundColor: "#4A5568",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pastBadgeText: { color: "#A0AEC0", fontSize: 12, fontWeight: "bold" },

  emptyText: { color: "#A0AEC0", fontSize: 16, marginBottom: 20 },
  loginBtn: {
    backgroundColor: "#3182CE",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginBtnText: { color: "#FFF", fontSize: 15, fontWeight: "bold" },
});
