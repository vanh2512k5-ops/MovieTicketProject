import axiosClient from "@/utils/axiosClient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface Room {
  id: number;
  name: string;
  type: number;
  isLayoutConfigured: boolean;
}

export default function AdminRoomList() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRooms = async () => {
    try {
      const response = await axiosClient.get("/Rooms");
      setRooms(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const renderRoomItem = ({ item }: { item: Room }) => (
    <View style={styles.roomCard}>
      <View>
        <Text style={styles.roomName}>{item.name}</Text>
        <Text style={styles.roomStatus}>
          {item.isLayoutConfigured ? "✅ Đã có sơ đồ" : "❌ Chưa có sơ đồ"}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.designBtn}
        onPress={() =>
          router.push({
            pathname: "/admin/design-room",
            params: { roomId: item.id, roomName: item.name }, // Truyền ID sang màn hình vẽ
          })
        }
      >
        <Text style={styles.designBtnText}>Thiết kế 🎨</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading)
    return (
      <ActivityIndicator style={{ flex: 1 }} size="large" color="#E53E3E" />
    );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>QUẢN LÝ PHÒNG CHIẾU</Text>
      <FlatList
        data={rooms}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderRoomItem}
        contentContainerStyle={{ padding: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1A202C", paddingTop: 50 },
  title: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  roomCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#2D3748",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  roomName: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
  roomStatus: { color: "#A0AEC0", fontSize: 12, marginTop: 4 },
  designBtn: {
    backgroundColor: "#3182CE",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  designBtnText: { color: "#FFF", fontWeight: "bold" },
});
