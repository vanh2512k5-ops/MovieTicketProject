import axiosClient from "@/utils/axiosClient";
import { useLocalSearchParams, useRouter } from "expo-router"; // Thêm useLocalSearchParams
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const TOTAL_ROWS = 10;
const TOTAL_COLS = 15;

const TOOLS = {
  NORMAL: { type: 0, color: "#E2E8F0", label: "Thường", isActive: true },
  VIP: { type: 1, color: "#E53E3E", label: "VIP", isActive: true },
  COUPLE: { type: 2, color: "#805AD5", label: "Couple", isActive: true },
  EMPTY: { type: 3, color: "#1A202C", label: "Lối đi", isActive: true },
  LOCKED: { type: 0, color: "#718096", label: "Bảo trì", isActive: false },
};

export default function DesignRoomScreen() {
  const router = useRouter();

  // NHẬN ID PHÒNG TỪ DANH SÁCH TRUYỀN SANG
  const { roomId, roomName } = useLocalSearchParams();

  const [currentTool, setCurrentTool] = useState(TOOLS.VIP);
  const [direction, setDirection] = useState("LTR");

  const [grid, setGrid] = useState(() => {
    let initialGrid = [];
    for (let r = 0; r < TOTAL_ROWS; r++) {
      for (let c = 0; c < TOTAL_COLS; c++) {
        initialGrid.push({
          gridRow: r,
          gridColumn: c,
          type: TOOLS.NORMAL.type,
          isActive: true,
          color: TOOLS.NORMAL.color,
        });
      }
    }
    return initialGrid;
  });

  const handleCellPress = (rowIndex: number, colIndex: number) => {
    setGrid((prevGrid) => {
      const newGrid = [...prevGrid];
      const cellIndex = newGrid.findIndex(
        (c) => c.gridRow === rowIndex && c.gridColumn === colIndex,
      );
      if (cellIndex !== -1) {
        newGrid[cellIndex] = {
          ...newGrid[cellIndex],
          type: currentTool.type,
          isActive: currentTool.isActive,
          color: currentTool.color,
        };
      }
      return newGrid;
    });
  };

  const handleSaveLayout = async () => {
    if (!roomId) return Alert.alert("Lỗi", "Không tìm thấy ID phòng!");

    try {
      const payloadCells = grid.map((cell) => ({
        gridRow: cell.gridRow,
        gridColumn: cell.gridColumn,
        type: cell.type,
        isActive: cell.isActive,
      }));

      const requestBody = { direction: direction, cells: payloadCells };

      //SỬ DỤNG roomId ĐỘNG
      const response = await axiosClient.post(
        `/AdminLayout/save-layout/${roomId}`,
        requestBody,
      );

      Alert.alert("Thành công!", response.data.message);
      router.back(); // Lưu xong tự động quay về danh sách phòng
    } catch (error) {
      console.error(error);
      Alert.alert("Lỗi", "Không thể lưu layout!");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>THIẾT KẾ RẠP PHIM</Text>

      {/* THANH CÔNG CỤ (TOOLBAR) */}
      <View style={styles.toolbar}>
        {Object.values(TOOLS).map((tool, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.toolBtn,
              currentTool.label === tool.label && styles.toolBtnActive,
            ]}
            onPress={() => setCurrentTool(tool)}
          >
            <View
              style={[styles.colorSample, { backgroundColor: tool.color }]}
            />
            <Text style={styles.toolText}>{tool.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* CHỌN HƯỚNG ĐÁNH SỐ */}
      <View style={styles.directionControl}>
        <Text style={styles.directionText}>Hướng đánh số:</Text>
        <TouchableOpacity
          style={[styles.dirBtn, direction === "LTR" && styles.dirBtnActive]}
          onPress={() => setDirection("LTR")}
        >
          <Text style={styles.dirBtnText}>Trái ➔ Phải</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.dirBtn, direction === "RTL" && styles.dirBtnActive]}
          onPress={() => setDirection("RTL")}
        >
          <Text style={styles.dirBtnText}>Phải ➔ Trái</Text>
        </TouchableOpacity>
      </View>

      {/* BẢN VẼ MA TRẬN */}
      <ScrollView horizontal contentContainerStyle={{ padding: 10 }}>
        <View style={styles.gridContainer}>
          {Array.from({ length: TOTAL_ROWS }).map((_, r) => (
            <View key={`row-${r}`} style={styles.row}>
              {grid
                .filter((c) => c.gridRow === r)
                .sort((a, b) => a.gridColumn - b.gridColumn)
                .map((cell) => (
                  <TouchableOpacity
                    key={`cell-${r}-${cell.gridColumn}`}
                    style={[styles.cell, { backgroundColor: cell.color }]}
                    onPress={() => handleCellPress(r, cell.gridColumn)}
                  />
                ))}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* NÚT LƯU */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveLayout}>
          <Text style={styles.saveBtnText}>💾 LƯU SƠ ĐỒ & ĐÁNH SỐ TỰ ĐỘNG</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#2D3748", paddingTop: 50 },
  title: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
  },
  toolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  toolBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4A5568",
    padding: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  toolBtnActive: { borderColor: "#48BB78" },
  colorSample: { width: 16, height: 16, borderRadius: 4, marginRight: 6 },
  toolText: { color: "#FFF", fontSize: 12, fontWeight: "bold" },
  directionControl: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginBottom: 15,
  },
  directionText: { color: "#A0AEC0", fontWeight: "bold" },
  dirBtn: {
    backgroundColor: "#4A5568",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  dirBtnActive: { backgroundColor: "#3182CE" },
  dirBtnText: { color: "#FFF", fontWeight: "bold", fontSize: 12 },
  gridContainer: { alignItems: "center", paddingBottom: 50 },
  row: { flexDirection: "row", gap: 4, marginBottom: 4 },
  cell: { width: 25, height: 25, borderRadius: 4 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 15,
    backgroundColor: "#1A202C",
  },
  saveBtn: {
    backgroundColor: "#48BB78",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  saveBtnText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
});
