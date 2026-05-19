import axiosClient from "@/utils/axiosClient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const TOOLS = {
  NORMAL: { type: 0, color: "#E2E8F0", label: "Thường", isActive: true },
  VIP: { type: 1, color: "#E53E3E", label: "VIP", isActive: true },
  COUPLE: { type: 2, color: "#805AD5", label: "Couple", isActive: true },
  EMPTY: { type: 3, color: "#1A202C", label: "Lối đi", isActive: true },
  LOCKED: { type: 0, color: "#718096", label: "Bảo trì", isActive: false },
};

export default function DesignRoomScreen() {
  const router = useRouter();
  const { roomId, roomName } = useLocalSearchParams();

  const [currentTool, setCurrentTool] = useState(TOOLS.VIP);
  const [direction, setDirection] = useState("LTR");
  const [isLoading, setIsLoading] = useState(true);

  const [inputRows, setInputRows] = useState("10");
  const [inputCols, setInputCols] = useState("15");
  const [grid, setGrid] = useState<any[]>([]);

  // State quản lý Zoom
  const [zoom, setZoom] = useState(1);

  const generateEmptyGrid = (numRows: number, numCols: number) => {
    let initialGrid = [];
    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        initialGrid.push({
          gridRow: r,
          gridColumn: c,
          type: TOOLS.NORMAL.type,
          isActive: TOOLS.NORMAL.isActive,
          color: TOOLS.NORMAL.color,
        });
      }
    }
    setGrid(initialGrid);
  };

  useEffect(() => {
    if (!roomId) return;
    const fetchExistingLayout = async () => {
      try {
        const response = await axiosClient.get(
          `/AdminLayout/get-layout/${roomId}`,
        );
        const savedCells = response.data.cells;

        if (savedCells && savedCells.length > 0) {
          const maxR = Math.max(...savedCells.map((c: any) => c.gridRow)) + 1;
          const maxC =
            Math.max(...savedCells.map((c: any) => c.gridColumn)) + 1;

          setInputRows(maxR.toString());
          setInputCols(maxC.toString());

          let loadedGrid = [];
          for (let r = 0; r < maxR; r++) {
            for (let c = 0; c < maxC; c++) {
              const savedCell = savedCells.find(
                (cell: any) => cell.gridRow === r && cell.gridColumn === c,
              );

              if (savedCell) {
                let toolColor = TOOLS.NORMAL.color;
                if (savedCell.type === 1) toolColor = TOOLS.VIP.color;
                if (savedCell.type === 2) toolColor = TOOLS.COUPLE.color;
                if (savedCell.type === 3) toolColor = TOOLS.EMPTY.color;
                if (!savedCell.isActive) toolColor = TOOLS.LOCKED.color;

                loadedGrid.push({
                  gridRow: r,
                  gridColumn: c,
                  type: savedCell.type,
                  isActive: savedCell.isActive,
                  color: toolColor,
                });
              } else {
                loadedGrid.push({
                  gridRow: r,
                  gridColumn: c,
                  type: TOOLS.NORMAL.type,
                  isActive: TOOLS.NORMAL.isActive,
                  color: TOOLS.NORMAL.color,
                });
              }
            }
          }
          setGrid(loadedGrid);
        } else {
          generateEmptyGrid(10, 15);
        }
      } catch (error) {
        console.error("Lỗi:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchExistingLayout();
  }, [roomId]);

  const handleApplyDimensions = () => {
    const r = parseInt(inputRows);
    const c = parseInt(inputCols);
    if (isNaN(r) || isNaN(c) || r <= 0 || c <= 0) {
      return Alert.alert("Lỗi", "Vui lòng nhập số hợp lệ lớn hơn 0!");
    }
    Alert.alert(
      "Xác nhận",
      "Việc tạo lưới mới sẽ xóa sạch bản nháp đang vẽ. Bạn có chắc chắn?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Tạo",
          style: "destructive",
          onPress: () => generateEmptyGrid(r, c),
        },
      ],
    );
  };

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
      const response = await axiosClient.post(
        `/AdminLayout/save-layout/${roomId}`,
        requestBody,
      );

      Alert.alert("Thành công!", response.data.message);
      router.back();
    } catch (error: any) {
      console.error(error);
      // BẮT VÀ HIỂN THỊ ĐÚNG LỜI CẢNH BÁO TỪ BACKEND
      const errorMsg =
        error.response?.data?.message || "Lỗi hệ thống: Không thể lưu layout!";
      Alert.alert("Lưu thất bại", errorMsg);
    }
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 2));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));

  const actualRows = parseInt(inputRows) || 10;
  const actualCols = parseInt(inputCols) || 15;

  // THUẬT TOÁN TÍNH TOÁN NHÃN A,B,C & SỐ TRỰC TIẾP TẠI FRONTEND
  // Giả lập lại logic của Backend để hiển thị Preview cho Admin
  const previewData = useMemo(() => {
    let rowLabels: { [key: number]: string } = {}; // Lưu trữ nhãn hàng (vd: {0: 'A', 1: 'B'})
    let cellLabels: { [key: string]: string } = {}; // Lưu trữ nhãn từng ô (vd: {'0-0': 'A1'})

    let currentRowCharCode = 65; // 65 là mã ASCII của chữ 'A'

    for (let r = 0; r < actualRows; r++) {
      const cellsInRow = grid.filter((c) => c.gridRow === r);
      // Lọc ra các ghế THỰC SỰ (không phải lối đi)
      const realSeats = cellsInRow.filter((c) => c.type !== TOOLS.EMPTY.type);

      if (realSeats.length > 0) {
        const rowChar = String.fromCharCode(currentRowCharCode);
        rowLabels[r] = rowChar;

        // Xếp theo đúng hướng Admin chọn để đánh số
        const sortedSeats =
          direction === "RTL"
            ? [...realSeats].sort((a, b) => b.gridColumn - a.gridColumn)
            : [...realSeats].sort((a, b) => a.gridColumn - b.gridColumn);

        sortedSeats.forEach((seat, index) => {
          cellLabels[`${seat.gridRow}-${seat.gridColumn}`] =
            `${rowChar}${index + 1}`;
        });

        currentRowCharCode++;
      } else {
        rowLabels[r] = ""; // Hàng toàn lối đi -> Không có chữ
      }
    }
    return { rowLabels, cellLabels };
  }, [grid, direction, actualRows]);

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color="#48BB78" />
        <Text style={{ color: "#FFF", textAlign: "center", marginTop: 10 }}>
          Đang tải bản thiết kế cũ...
        </Text>
      </View>
    );
  }

  // Kích thước động theo Zoom
  const seatSize = 35 * zoom;
  const marginH = 2 * zoom;
  const radius = 4 * zoom;
  const labelFontSize = 14 * zoom;
  const cellFontSize = 9 * zoom;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>THIẾT KẾ: {roomName}</Text>

      <View style={styles.dimensionConfig}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Số hàng ngang:</Text>
          <TextInput
            style={styles.dimensionInput}
            keyboardType="numeric"
            value={inputRows}
            onChangeText={setInputRows}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Số cột dọc:</Text>
          <TextInput
            style={styles.dimensionInput}
            keyboardType="numeric"
            value={inputCols}
            onChangeText={setInputCols}
          />
        </View>
        <TouchableOpacity
          style={styles.applyBtn}
          onPress={handleApplyDimensions}
        >
          <Text style={styles.applyBtnText}>🔄 Áp dụng</Text>
        </TouchableOpacity>
      </View>

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

      {/* BẢN VẼ MA TRẬN VỚI THƯỚC ĐO */}
      <ScrollView horizontal contentContainerStyle={{ padding: 10 }}>
        <View style={styles.matrixContainer}>
          {Array.from({ length: actualRows }).map((_, r) => {
            // Lấy nhãn hàng (A, B...) từ thuật toán Preview
            const rowLabel = previewData.rowLabels[r] || "";

            return (
              <View key={`row-${r}`} style={styles.matrixRow}>
                {/* 📏 THƯỚC ĐO TRỤC Y (Chữ cái) */}
                <View style={[styles.rowLabelBox, { width: 30 * zoom }]}>
                  <Text
                    style={[styles.rowLabelText, { fontSize: labelFontSize }]}
                  >
                    {rowLabel}
                  </Text>
                </View>

                {/* CÁC Ô GHẾ */}
                {grid
                  .filter((c) => c.gridRow === r)
                  .sort((a, b) => a.gridColumn - b.gridColumn)
                  .map((cell) => {
                    const cellKey = `${cell.gridRow}-${cell.gridColumn}`;
                    const cellText = previewData.cellLabels[cellKey] || "";
                    const isEmpty = cell.type === TOOLS.EMPTY.type;

                    return (
                      <TouchableOpacity
                        key={`cell-${cell.gridColumn}`}
                        style={[
                          styles.seatCell,
                          {
                            width: seatSize,
                            height: seatSize,
                            marginHorizontal: marginH,
                            borderRadius: radius,
                            backgroundColor: cell.color,
                            // Nếu là lối đi thì tàng hình viền, ngược lại có viền mờ cho dễ nhìn
                            borderWidth: isEmpty ? 0 : 1,
                            borderColor: "rgba(0,0,0,0.1)",
                          },
                        ]}
                        onPress={() => handleCellPress(r, cell.gridColumn)}
                      >
                        {/*HIỂN THỊ SỐ PREVIEW LÊN GHẾ */}
                        {!isEmpty && (
                          <Text
                            style={[
                              { fontSize: cellFontSize, fontWeight: "bold" },
                              // Nếu màu tối (VIP/Couple) thì chữ trắng, màu sáng (Thường) thì chữ đen
                              cell.type === 1 || cell.type === 2
                                ? { color: "#FFF" }
                                : { color: "#4A5568" },
                            ]}
                          >
                            {cellText}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* TÍNH NĂNG ZOOM CHO ADMIN */}
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
        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveLayout}>
          <Text style={styles.saveBtnText}>💾 LƯU SƠ ĐỒ</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#2D3748", paddingTop: 40 },
  title: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },

  dimensionConfig: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    gap: 15,
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  inputGroup: { alignItems: "center" },
  inputLabel: { color: "#A0AEC0", fontSize: 12, marginBottom: 4 },
  dimensionInput: {
    backgroundColor: "#1A202C",
    color: "#FFF",
    width: 60,
    height: 35,
    textAlign: "center",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#4A5568",
  },
  applyBtn: {
    backgroundColor: "#4299E1",
    height: 35,
    paddingHorizontal: 15,
    justifyContent: "center",
    borderRadius: 6,
  },
  applyBtnText: { color: "#FFF", fontWeight: "bold", fontSize: 13 },

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

  // CSS Mới cho Matrix có Thước đo
  matrixContainer: { alignItems: "flex-start", paddingBottom: 50 },
  matrixRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  rowLabelBox: {
    alignItems: "center",
    justifyContent: "center",
    marginRight: 5,
  },
  rowLabelText: { color: "#A0AEC0", fontWeight: "bold" },
  seatCell: { justifyContent: "center", alignItems: "center" },

  zoomControls: {
    position: "absolute",
    right: 20,
    bottom: 100,
    backgroundColor: "rgba(45, 55, 72, 0.9)",
    borderRadius: 8,
    padding: 2,
    zIndex: 10,
    elevation: 5,
    shadowColor: "#000",
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
    marginTop: -2,
  },

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
