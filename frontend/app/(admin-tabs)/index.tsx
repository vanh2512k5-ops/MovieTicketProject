import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Platform } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosClient from "@/utils/axiosClient";

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    movies: 0,
    cinemas: 0,
    users: 0,
  });

  const [bookingStats, setBookingStats] = useState({
    totalBookings: 0,
    totalRevenue: 0,
    bookingsToday: 0,
    revenueToday: 0,
    topMovies: [] as { movieTitle: string; ticketCount: number }[],
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [moviesRes, cinemasRes, usersRes, bookingRes] = await Promise.all([
        axiosClient.get("/Movies"),
        axiosClient.get("/Cinemas"),
        axiosClient.get("/Users"),
        axiosClient.get("/Bookings/admin-stats"),
      ]);
      setStats({
        movies: moviesRes.data.length,
        cinemas: cinemasRes.data.length,
        users: usersRes.data.length,
      });
      setBookingStats(bookingRes.data);
    } catch (error) {
      console.log("Error fetching stats", error);
    }
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm("Bạn có chắc chắn muốn đăng xuất?")) {
        await AsyncStorage.removeItem("user");
        await AsyncStorage.removeItem("accessToken");
        await AsyncStorage.removeItem("refreshToken");
        router.replace("/login" as any);
      }
    } else {
      Alert.alert("Đăng xuất", "Bạn có chắc chắn muốn đăng xuất?", [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đăng xuất",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.removeItem("user");
            await AsyncStorage.removeItem("accessToken");
            await AsyncStorage.removeItem("refreshToken");
            router.replace("/login" as any);
          },
        },
      ]);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>

      {/* Hàng stat cơ bản: Phim, Rạp, User */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.movies}</Text>
          <Text style={styles.statLabel}>🎬 Phim</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.cinemas}</Text>
          <Text style={styles.statLabel}>🏛️ Rạp</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.users}</Text>
          <Text style={styles.statLabel}>👥 Users</Text>
        </View>
      </View>

      {/* Doanh thu & Vé */}
      <View style={styles.revenueSection}>
        <Text style={styles.sectionTitle}>📊 Doanh thu & Vé</Text>
        <View style={styles.revenueRow}>
          <View style={[styles.revenueCard, { borderLeftColor: "#48BB78" }]}>
            <Text style={styles.revenueValue}>
              {(bookingStats.totalRevenue / 1_000_000).toFixed(1)}M
            </Text>
            <Text style={styles.revenueLabel}>Tổng doanh thu</Text>
          </View>
          <View style={[styles.revenueCard, { borderLeftColor: "#F6E05E" }]}>
            <Text style={styles.revenueValue}>
              {(bookingStats.revenueToday / 1_000_000).toFixed(1)}M
            </Text>
            <Text style={styles.revenueLabel}>Hôm nay</Text>
          </View>
        </View>
        <View style={styles.revenueRow}>
          <View style={[styles.revenueCard, { borderLeftColor: "#3182CE" }]}>
            <Text style={styles.revenueValue}>{bookingStats.totalBookings}</Text>
            <Text style={styles.revenueLabel}>Tổng vé bán</Text>
          </View>
          <View style={[styles.revenueCard, { borderLeftColor: "#E53E3E" }]}>
            <Text style={styles.revenueValue}>{bookingStats.bookingsToday}</Text>
            <Text style={styles.revenueLabel}>Vé hôm nay</Text>
          </View>
        </View>
      </View>

      {/* Top phim */}
      {bookingStats.topMovies.length > 0 && (
        <View style={styles.topMoviesSection}>
          <Text style={styles.sectionTitle}>🏆 Top phim bán chạy</Text>
          {bookingStats.topMovies.map((movie, idx) => (
            <View key={idx} style={styles.topMovieRow}>
              <Text style={styles.topMovieRank}>
                {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}
              </Text>
              <Text style={styles.topMovieTitle} numberOfLines={1}>
                {movie.movieTitle}
              </Text>
              <View style={styles.topMovieBadge}>
                <Text style={styles.topMovieBadgeText}>{movie.ticketCount} vé</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Menu chức năng */}
      <View style={styles.menuContainer}>
         <Text style={styles.sectionTitle}>Chức năng mở rộng</Text>
         <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => router.push("/admin/room-list" as any)}
         >
           <Text style={styles.menuItemText}>🎨 Cấu hình sơ đồ ghế phòng chiếu</Text>
         </TouchableOpacity>
         
         <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => router.push("/admin/pricing-rules" as any)}
         >
           <Text style={styles.menuItemText}>💵 Quản lý cấu hình giá vé (Phụ thu)</Text>
         </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1A202C", paddingTop: 50 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#FFF" },
  logoutBtn: {
    backgroundColor: "#E53E3E",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  logoutText: { color: "#FFF", fontWeight: "bold" },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 10,
    marginBottom: 40,
  },
  statCard: {
    backgroundColor: "#2D3748",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    width: "30%",
  },
  statValue: { fontSize: 24, fontWeight: "bold", color: "#3182CE", marginBottom: 5 },
  statLabel: { fontSize: 12, color: "#A0AEC0", textAlign: "center" },

  // Revenue section
  revenueSection: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 16, color: "#FFF", fontWeight: "bold", marginBottom: 14 },
  revenueRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  revenueCard: {
    flex: 1,
    backgroundColor: "#2D3748",
    borderRadius: 10,
    padding: 16,
    borderLeftWidth: 4,
  },
  revenueValue: { fontSize: 22, fontWeight: "bold", color: "#FFF", marginBottom: 4 },
  revenueLabel: { fontSize: 12, color: "#A0AEC0" },

  // Top movies
  topMoviesSection: { paddingHorizontal: 20, marginBottom: 24 },
  topMovieRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2D3748",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  topMovieRank: { fontSize: 22, width: 30 },
  topMovieTitle: { flex: 1, color: "#FFF", fontSize: 14, fontWeight: "600" },
  topMovieBadge: {
    backgroundColor: "#3182CE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  topMovieBadgeText: { color: "#FFF", fontSize: 12, fontWeight: "bold" },

  menuContainer: { paddingHorizontal: 20, marginBottom: 40 },
  menuItem: { backgroundColor: "#2D3748", padding: 20, borderRadius: 12, marginBottom: 15 },
  menuItemText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
});
