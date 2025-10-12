'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Select, message, Tag, Spin, Alert, DatePicker, Input } from 'antd';
import { supabase } from '@/lib/supabase';
import dayjs from 'dayjs';

const { Option } = Select;

const InpatientTreatmentsPage = () => {
  const [treatments, setTreatments] = useState<any[]>([]);
  const [beds, setBeds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form] = Form.useForm();

  const fetchTreatments = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.from('luot_dieu_tri_noi_tru').select(`
        *,
        benh_nhan:id_benh_nhan ( ho_ten ),
        giuong_benh:id_giuong_benh (
          ten_giuong_benh,
          phong_benh:id_phong_benh ( ten_phong_benh )
        ),
        bac_si:id_bac_si_dieu_tri ( ho_ten ),
        phieu_theo_doi_noi_tru (*)
      `).order('ngay_nhap_vien', { ascending: false });

      if (error) throw error;
      setTreatments(data || []);
    } catch (err: any) {
      setError(`Lỗi khi tải danh sách điều trị: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableBeds = async () => {
    const { data } = await supabase.from('giuong_benh').select('*').eq('trang_thai', 'Trống');
    if (data) setBeds(data);
  };

  useEffect(() => {
    fetchTreatments();
    fetchAvailableBeds();
  }, []);

  const handleEdit = (record: any) => {
    setEditingTreatment(record);
    form.setFieldsValue({
        ...record,
        ngay_xuat_vien: record.ngay_xuat_vien ? dayjs(record.ngay_xuat_vien) : null
    });
    setIsModalVisible(true);
  };

  const handleUpdate = async () => {
    try {
      const values = await form.validateFields();
      if (!editingTreatment) return;

      const { error } = await supabase
        .from('luot_dieu_tri_noi_tru')
        .update(values)
        .eq('id_luot_dieu_tri', editingTreatment.id_luot_dieu_tri);

      if (error) {
        message.error(`Cập nhật thất bại: ${error.message}`);
      } else {
        message.success('Cập nhật thành công!');
        setIsModalVisible(false);
        fetchTreatments();
      }
    } catch (info) {
      console.log('Validate Failed:', info);
    }
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'Đang điều trị': return <Tag color="processing">Đang điều trị</Tag>;
      case 'Đã xuất viện': return <Tag color="success">Đã xuất viện</Tag>;
      default: return <Tag>{status}</Tag>;
    }
  };

  const expandedRowRender = (record: any) => {
    const monitoringColumns = [
        { title: 'Ngày giờ', dataIndex: 'thoi_gian_do', key: 'thoi_gian_do', render: (t:string) => new Date(t).toLocaleString() },
        { title: 'Diễn biến', dataIndex: 'dien_bien_benh', key: 'dien_bien_benh' },
        { title: 'Y lệnh', dataIndex: 'y_lenh', key: 'y_lenh' },
        { title: 'Người thực hiện', dataIndex: 'id_tai_khoan', key: 'id_tai_khoan' }, // Should join to get name
    ];
    return <Table title={() => 'Phiếu theo dõi'} columns={monitoringColumns} dataSource={record.phieu_theo_doi_noi_tru} pagination={false} rowKey="id_phieu" />;
  };

  const columns = [
    { title: 'Bệnh nhân', dataIndex: ['benh_nhan', 'ho_ten'], key: 'patient_name' },
    { title: 'Ngày nhập viện', dataIndex: 'ngay_nhap_vien', key: 'ngay_nhap_vien', render: (t:string) => new Date(t).toLocaleDateString() },
    { title: 'Ngày xuất viện', dataIndex: 'ngay_xuat_vien', key: 'ngay_xuat_vien', render: (t:string | null) => t ? new Date(t).toLocaleDateString() : 'Chưa có' },
    { title: 'Giường', dataIndex: ['giuong_benh', 'ten_giuong_benh'], key: 'bed_name' },
    { title: 'Phòng', dataIndex: ['giuong_benh', 'phong_benh', 'ten_phong_benh'], key: 'room_name' },
    { title: 'Bác sĩ điều trị', dataIndex: ['bac_si', 'ho_ten'], key: 'doctor_name' },
    { title: 'Trạng thái', dataIndex: 'trang_thai_dieu_tri', key: 'trang_thai_dieu_tri', render: getStatusTag },
    {
      title: 'Hành động',
      key: 'action',
      render: (_: any, record: any) => (
        <Button onClick={() => handleEdit(record)}>Cập nhật</Button>
      ),
    },
  ];

  if (loading) return <Spin tip="Đang tải..." />;
  if (error) return <Alert message={error} type="error" />;

  return (
    <>
      <Card title="Quản lý Lượt điều trị nội trú">
        <Alert 
            message="Chức năng theo dõi và quản lý bệnh nhân nội trú."
            description="Việc tiếp nhận bệnh nhân nội trú được thực hiện từ Quản lý Lịch khám khi bác sĩ chỉ định. Tại đây, bạn có thể cập nhật thông tin điều trị, giường bệnh và cho bệnh nhân xuất viện."
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
        />
        <Table
          columns={columns}
          dataSource={treatments}
          loading={loading}
          rowKey="id_luot_dieu_tri"
          expandable={{ expandedRowRender }}
        />
      </Card>

      <Modal
        title="Cập nhật thông tin điều trị"
        visible={isModalVisible}
        onOk={handleUpdate}
        onCancel={() => setIsModalVisible(false)}
        okText="Cập nhật"
        cancelText="Huỷ"
        width={700}
      >
        <Form form={form} layout="vertical">
            <Form.Item name="id_giuong_benh" label="Giường bệnh">
                <Select placeholder="Chọn giường bệnh mới (nếu cần đổi)" allowClear>
                    {/* Also include the current bed in the list */}
                    {editingTreatment?.giuong_benh && <Option key={editingTreatment.id_giuong_benh} value={editingTreatment.id_giuong_benh}>{`${editingTreatment.giuong_benh.ten_giuong_benh} (hiện tại)`}</Option>}
                    {beds.map(b => <Option key={b.id_giuong_benh} value={b.id_giuong_benh}>{b.ten_giuong_benh}</Option>)}
                </Select>
            </Form.Item>
            <Form.Item name="trang_thai_dieu_tri" label="Trạng thái điều trị" rules={[{ required: true }]}>
                <Select>
                    <Option value="Đang điều trị">Đang điều trị</Option>
                    <Option value="Đã xuất viện">Đã xuất viện</Option>
                </Select>
            </Form.Item>
            <Form.Item name="ngay_xuat_vien" label="Ngày xuất viện">
                <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="chan_doan_xuat_vien" label="Chẩn đoán khi xuất viện">
                <Input.TextArea rows={3} />
            </Form.Item>
             <Form.Item name="ghi_chu" label="Ghi chú">
                <Input.TextArea rows={2} />
            </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default InpatientTreatmentsPage;