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

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [moviesRes, cinemasRes, usersRes] = await Promise.all([
        axiosClient.get("/Movies"),
        axiosClient.get("/Cinemas"),
        axiosClient.get("/Users")
      ]);
      setStats({
        movies: moviesRes.data.length,
        cinemas: cinemasRes.data.length,
        users: usersRes.data.length,
      });
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

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.movies}</Text>
          <Text style={styles.statLabel}>Phim</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.cinemas}</Text>
          <Text style={styles.statLabel}>Cụm rạp</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.users}</Text>
          <Text style={styles.statLabel}>Người dùng</Text>
        </View>
      </View>
      
      <View style={styles.menuContainer}>
         <Text style={styles.menuTitle}>Chức năng mở rộng</Text>
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
  statLabel: { fontSize: 14, color: "#A0AEC0" },
  menuContainer: { paddingHorizontal: 20 },
  menuTitle: { fontSize: 18, color: '#FFF', fontWeight: 'bold', marginBottom: 15 },
  menuItem: { backgroundColor: '#2D3748', padding: 20, borderRadius: 12, marginBottom: 15 },
  menuItemText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
