import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>⬅</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Điều khoản dịch vụ</Text>
        </View>

        {/* Nội dung */}
        <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
          <Text style={styles.lastUpdated}>Cập nhật lần cuối: Tháng 6/2026</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Giới thiệu chung</Text>
            <Text style={styles.paragraph}>
              Chào mừng bạn đến với ứng dụng đặt vé xem phim MovieTicket. Bằng việc truy cập và sử dụng ứng dụng của chúng tôi, bạn đồng ý tuân thủ các điều khoản và điều kiện được quy định dưới đây. Vui lòng đọc kỹ trước khi sử dụng dịch vụ.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Quy định đặt vé và thanh toán</Text>
            <Text style={styles.paragraph}>
              • Người dùng phải đăng nhập tài khoản hợp lệ để thực hiện đặt vé.{'\n'}
              • Vé sau khi thanh toán thành công sẽ không được hoàn tiền hay đổi trả dưới mọi hình thức (trừ trường hợp rạp hủy suất chiếu).{'\n'}
              • Thời gian giữ ghế là 10 phút. Nếu quá thời gian trên chưa hoàn tất thanh toán, giao dịch sẽ tự động bị hủy.{'\n'}
              • Vui lòng kiểm tra kỹ thông tin: Tên phim, rạp chiếu, suất chiếu và ghế ngồi trước khi xác nhận thanh toán.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Quy định tại rạp chiếu</Text>
            <Text style={styles.paragraph}>
              • Trẻ em dưới độ tuổi quy định của phim (C13, C16, C18) sẽ không được phép vào rạp, rạp có quyền từ chối phục vụ và không hoàn tiền vé.{'\n'}
              • Vui lòng xuất trình mã QR Code hoặc mã vé đặt trước cho nhân viên rạp để lấy vé cứng (nếu cần).{'\n'}
              • Cấm mang thức ăn, đồ uống mua từ bên ngoài vào phòng chiếu.{'\n'}
              • Cấm các hành vi quay phim, chụp ảnh, ghi âm trái phép trong phòng chiếu.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Bảo mật thông tin</Text>
            <Text style={styles.paragraph}>
              Chúng tôi cam kết bảo vệ thông tin cá nhân của người dùng và chỉ sử dụng cho mục đích cung cấp dịch vụ, hỗ trợ khách hàng và cải thiện trải nghiệm ứng dụng. Chi tiết xem tại "Chính sách bảo mật" của chúng tôi.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Sửa đổi điều khoản</Text>
            <Text style={styles.paragraph}>
              MovieTicket có quyền thay đổi, chỉnh sửa các Điều khoản Dịch vụ này vào bất kỳ lúc nào mà không cần báo trước. Việc bạn tiếp tục sử dụng ứng dụng đồng nghĩa với việc bạn chấp nhận các thay đổi đó.
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1A202C',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#1A202C',
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: "#2D3748",
    borderBottomWidth: 1,
    borderBottomColor: '#4A5568',
  },
  backButton: {
    padding: 5,
    marginRight: 15,
  },
  backText: {
    fontSize: 20,
    color: "#FFF",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFF",
  },
  contentContainer: {
    padding: 20,
  },
  lastUpdated: {
    color: '#A0AEC0',
    fontStyle: 'italic',
    fontSize: 13,
    marginBottom: 20,
    textAlign: 'right',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#F6E05E',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  paragraph: {
    color: '#E2E8F0',
    fontSize: 15,
    lineHeight: 24,
  },
});
