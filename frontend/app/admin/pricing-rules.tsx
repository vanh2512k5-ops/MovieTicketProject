import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, Switch } from 'react-native';
import axiosClient from '@/utils/axiosClient';
import { useRouter } from 'expo-router';

interface PricingRule {
  id: number;
  ruleType: string;
  ruleKey: string;
  surchargeAmount: number;
  isActive: boolean;
}

export default function AdminPricingRules() {
  const router = useRouter();
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  
  // Form State
  const [ruleType, setRuleType] = useState('SeatType');
  const [ruleKey, setRuleKey] = useState('');
  const [surchargeAmount, setSurchargeAmount] = useState('0');
  const [isActive, setIsActive] = useState(true);

  const fetchRules = async () => {
    try {
      const response = await axiosClient.get('/PricingRules');
      setRules(response.data);
    } catch (error) {
      console.error(error);
      Alert.alert('Lỗi', 'Không thể tải danh sách cấu hình giá.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const openAddModal = () => {
    setIsEditing(false);
    setCurrentId(null);
    setRuleType('SeatType');
    setRuleKey('');
    setSurchargeAmount('0');
    setIsActive(true);
    setModalVisible(true);
  };

  const openEditModal = (rule: PricingRule) => {
    setIsEditing(true);
    setCurrentId(rule.id);
    setRuleType(rule.ruleType);
    setRuleKey(rule.ruleKey);
    setSurchargeAmount(rule.surchargeAmount.toString());
    setIsActive(rule.isActive);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!ruleKey || !surchargeAmount) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin!');
      return;
    }

    const payload = {
      id: isEditing ? currentId : 0,
      ruleType,
      ruleKey,
      surchargeAmount: parseFloat(surchargeAmount),
      isActive
    };

    try {
      if (isEditing) {
        await axiosClient.put(`/PricingRules/${currentId}`, payload);
        Alert.alert('Thành công', 'Đã cập nhật quy tắc!');
      } else {
        await axiosClient.post('/PricingRules', payload);
        Alert.alert('Thành công', 'Đã thêm quy tắc mới!');
      }
      setModalVisible(false);
      fetchRules();
    } catch (error) {
      console.error(error);
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi lưu dữ liệu.');
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Xác nhận', 'Bạn có chắc chắn muốn xóa phụ thu này?', [
      { text: 'Hủy', style: 'cancel' },
      { 
        text: 'Xóa', 
        style: 'destructive',
        onPress: async () => {
          try {
            await axiosClient.delete(`/PricingRules/${id}`);
            Alert.alert('Thành công', 'Đã xóa thành công!');
            fetchRules();
          } catch (error) {
            Alert.alert('Lỗi', 'Không thể xóa.');
          }
        }
      }
    ]);
  };

  const renderItem = ({ item }: { item: PricingRule }) => (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.ruleType} - {item.ruleKey}</Text>
        <Text style={[styles.amount, { color: item.surchargeAmount >= 0 ? '#48BB78' : '#F56565' }]}>
          {item.surchargeAmount >= 0 ? '+' : ''}{item.surchargeAmount.toLocaleString()}đ
        </Text>
        <Text style={styles.status}>
          Trạng thái: {item.isActive ? '✅ Hoạt động' : '❌ Đang tắt'}
        </Text>
      </View>
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
          <Text style={styles.btnText}>Sửa</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
          <Text style={styles.btnText}>Xóa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return <ActivityIndicator style={{ flex: 1, backgroundColor: '#1A202C' }} size="large" color="#3182CE" />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CẤU HÌNH GIÁ VÉ</Text>
      
      <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
        <Text style={styles.addBtnText}>+ THÊM QUY TẮC MỚI</Text>
      </TouchableOpacity>

      <FlatList
        data={rules}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
      />

      {/* Modal Thêm / Sửa */}
      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{isEditing ? 'SỬA QUY TẮC' : 'THÊM QUY TẮC MỚI'}</Text>

            <Text style={styles.label}>Loại phụ thu (VD: SeatType, Format)</Text>
            <TextInput style={styles.input} value={ruleType} onChangeText={setRuleType} placeholderTextColor="#A0AEC0" />

            <Text style={styles.label}>Từ khóa (VD: VIP, Couple, 3D)</Text>
            <TextInput style={styles.input} value={ruleKey} onChangeText={setRuleKey} placeholderTextColor="#A0AEC0" />

            <Text style={styles.label}>Số tiền (+ hoặc -)</Text>
            <TextInput style={styles.input} value={surchargeAmount} onChangeText={setSurchargeAmount} keyboardType="numeric" placeholderTextColor="#A0AEC0" />

            <View style={styles.switchRow}>
              <Text style={styles.label}>Kích hoạt</Text>
              <Switch value={isActive} onValueChange={setIsActive} trackColor={{ false: '#4A5568', true: '#3182CE' }} />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#718096' }]} onPress={() => setModalVisible(false)}>
                <Text style={styles.btnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#3182CE' }]} onPress={handleSave}>
                <Text style={styles.btnText}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A202C', paddingTop: 50 },
  title: { color: '#FFF', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  addBtn: { backgroundColor: '#38A169', marginHorizontal: 20, padding: 15, borderRadius: 8, alignItems: 'center' },
  addBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  card: { backgroundColor: '#2D3748', borderRadius: 10, marginVertical: 10, padding: 15 },
  cardContent: { marginBottom: 10 },
  cardTitle: { color: '#E2E8F0', fontSize: 18, fontWeight: 'bold' },
  amount: { fontSize: 16, fontWeight: 'bold', marginTop: 5 },
  status: { color: '#A0AEC0', fontSize: 14, marginTop: 5 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  editBtn: { backgroundColor: '#D69E2E', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 5 },
  deleteBtn: { backgroundColor: '#E53E3E', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 5 },
  btnText: { color: '#FFF', fontWeight: 'bold' },
  
  modalContainer: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)', padding: 20 },
  modalContent: { backgroundColor: '#2D3748', padding: 25, borderRadius: 15 },
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  label: { color: '#A0AEC0', fontSize: 14, marginBottom: 5, marginTop: 15 },
  input: { backgroundColor: '#1A202C', color: '#FFF', padding: 12, borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: '#4A5568' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30 },
  modalBtn: { flex: 1, padding: 15, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 }
});
