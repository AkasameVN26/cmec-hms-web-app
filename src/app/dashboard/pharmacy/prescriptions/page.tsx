'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Modal, Spin, Alert, message, Tag, Descriptions, Space } from 'antd';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

const PrescriptionsPage = () => {
  const { can } = useAuth();
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<any | null>(null);

  const fetchPrescriptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('don_thuoc')
        .select(`
            *,
            lich_kham:id_lich_kham (
                benh_nhan:id_benh_nhan ( ho_ten ),
                bac_si:id_bac_si (
                    tai_khoan!inner(ho_ten)
                )
            ),
            chi_tiet_don_thuoc(
                *,
                thuoc:id_thuoc(
                    ten_thuoc,
                    don_vi_tinh
                )
            )
        `)
        .eq('trang_thai_don_thuoc', 'Mới')
        .order('thoi_gian_ke_don', { ascending: true });

      if (error) throw error;
      setPrescriptions(data || []);
    } catch (err: any) {
      setError(`Lỗi khi tải danh sách đơn thuốc: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  const handleViewDetails = (record: any) => {
    setSelectedPrescription(record);
    setIsModalVisible(true);
  };

  const handleDispense = (record: any) => {
    Modal.confirm({
        title: 'Xác nhận cấp phát thuốc',
        content: `Bạn có chắc muốn xác nhận đã cấp phát cho đơn thuốc #${record.id_don_thuoc}?`,
        okText: 'Xác nhận',
        cancelText: 'Huỷ',
        onOk: async () => {
            const { error } = await supabase
                .from('don_thuoc')
                .update({ trang_thai_don_thuoc: 'Đã cấp phát' })
                .eq('id_don_thuoc', record.id_don_thuoc);
            
            if (error) {
                message.error(`Lỗi khi cập nhật trạng thái: ${error.message}`);
            } else {
                message.success('Đã xác nhận cấp phát đơn thuốc thành công.');
                fetchPrescriptions();
            }
        }
    });
  };

  const detailColumns = [
    { title: 'Tên thuốc', dataIndex: ['thuoc', 'ten_thuoc'], key: 'ten_thuoc' },
    { title: 'Số lượng', dataIndex: 'so_luong', key: 'so_luong' },
    { title: 'Đơn vị', dataIndex: ['thuoc', 'don_vi_tinh'], key: 'don_vi_tinh' },
    { title: 'Liều dùng', dataIndex: 'lieu_dung', key: 'lieu_dung' },
  ];

  const mainColumns = [
    { title: 'Mã đơn', dataIndex: 'id_don_thuoc', key: 'id_don_thuoc', render: (id:number) => `#${id}` },
    { title: 'Bệnh nhân', dataIndex: ['lich_kham', 'benh_nhan', 'ho_ten'], key: 'patient_name' },
    { title: 'Bác sĩ kê đơn', dataIndex: ['lich_kham', 'bac_si', 'tai_khoan', 'ho_ten'], key: 'doctor_name' },
    { title: 'Ngày kê đơn', dataIndex: 'thoi_gian_ke_don', key: 'thoi_gian_ke_don', render: (ts:string) => new Date(ts).toLocaleString('vi-VN') },
    { title: 'Trạng thái', dataIndex: 'trang_thai_don_thuoc', key: 'status', render: (status:string) => <Tag color="blue">{status}</Tag> },
    {
        title: 'Hành động',
        key: 'action',
        render: (_: any, record: any) => (
            <Space>
                <Button size="small" onClick={() => handleViewDetails(record)}>Xem chi tiết</Button>
                {can('prescription.dispense') && (
                    <Button type="primary" size="small" onClick={() => handleDispense(record)}>Xác nhận cấp phát</Button>
                )}
            </Space>
        )
    }
  ];

  if (loading) return <Spin tip="Đang tải..." />;
  if (error) return <Alert message={error} type="error" />;

  return (
    <>
      <Card title="Danh sách Đơn thuốc chờ cấp phát">
        <Table
          columns={mainColumns}
          dataSource={prescriptions}
          loading={loading}
          rowKey="id_don_thuoc"
          size="small"
        />
      </Card>

      {selectedPrescription && (
        <Modal
          title={`Chi tiết Đơn thuốc #${selectedPrescription.id_don_thuoc}`}
          open={isModalVisible}
          onCancel={() => setIsModalVisible(false)}
          footer={<Button onClick={() => setIsModalVisible(false)}>Đóng</Button>}
          width={800}
        >
            <Descriptions bordered column={1} size="small" style={{marginBottom: 16}}>
                <Descriptions.Item label="Bệnh nhân">{selectedPrescription.lich_kham.benh_nhan.ho_ten}</Descriptions.Item>
                <Descriptions.Item label="Bác sĩ kê đơn">{selectedPrescription.lich_kham.bac_si.tai_khoan.ho_ten}</Descriptions.Item>
                <Descriptions.Item label="Ngày kê đơn">{new Date(selectedPrescription.thoi_gian_ke_don).toLocaleString('vi-VN')}</Descriptions.Item>
            </Descriptions>
            <Table 
                columns={detailColumns} 
                dataSource={selectedPrescription.chi_tiet_don_thuoc} 
                pagination={false} 
                rowKey="id_chi_tiet_don_thuoc"
                size="small"
            />
        </Modal>
      )}
    </>
  );
};

export default PrescriptionsPage;
