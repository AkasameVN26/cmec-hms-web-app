'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Spin, Alert, Input, Form, Row, Col, Button } from 'antd';
import { supabase } from '@/lib/supabase';

const PrescriptionsPage = () => {
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterForm] = Form.useForm();

  const fetchPrescriptions = async (filters: any = {}) => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase.from('don_thuoc').select(`
        id_don_thuoc,
        ngay_ke_don,
        ghi_chu,
        lich_kham:id_lich_kham (
          id_lich_kham,
          benh_nhan:id_benh_nhan (ho_ten),
          bac_si:id_bac_si (ho_ten)
        ),
        chi_tiet_don_thuoc:chi_tiet_don_thuoc (
          *,
          thuoc:id_thuoc (ten_thuoc, don_vi_tinh)
        )
      `);

      if (filters.patient_name) {
        query = query.ilike('lich_kham.benh_nhan.ho_ten', `%${filters.patient_name}%`);
      }
      if (filters.doctor_name) {
        query = query.ilike('lich_kham.bac_si.ho_ten', `%${filters.doctor_name}%`);
      }

      const { data, error } = await query.order('ngay_ke_don', { ascending: false });

      if (error) throw error;
      if (data) setPrescriptions(data);

    } catch (err: any) {
      setError(`Không thể tải dữ liệu đơn thuốc: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const onFilterFinish = (values: any) => {
    fetchPrescriptions(values);
  };

  const expandedRowRender = (record: any) => {
    const columns = [
      { title: 'Tên thuốc', dataIndex: ['thuoc', 'ten_thuoc'], key: 'ten_thuoc' },
      { title: 'Số lượng', dataIndex: 'so_luong', key: 'so_luong' },
      { title: 'Đơn vị', dataIndex: ['thuoc', 'don_vi_tinh'], key: 'don_vi_tinh' },
      { title: 'Liều dùng', dataIndex: 'lieu_dung', key: 'lieu_dung' },
      { title: 'Ghi chú', dataIndex: 'ghi_chu', key: 'ghi_chu' },
    ];
    return <Table columns={columns} dataSource={record.chi_tiet_don_thuoc} pagination={false} rowKey="id_chi_tiet_don_thuoc" />;
  };

  const mainColumns = [
    { title: 'Mã Đơn Thuốc', dataIndex: 'id_don_thuoc', key: 'id_don_thuoc' },
    { title: 'Bệnh nhân', dataIndex: ['lich_kham', 'benh_nhan', 'ho_ten'], key: 'patient_name' },
    { title: 'Bác sĩ kê đơn', dataIndex: ['lich_kham', 'bac_si', 'ho_ten'], key: 'doctor_name' },
    { title: 'Ngày kê đơn', dataIndex: 'ngay_ke_don', key: 'ngay_ke_don', render: (text: string) => new Date(text).toLocaleDateString() },
    { title: 'Ghi chú chung', dataIndex: 'ghi_chu', key: 'ghi_chu' },
  ];

  if (loading) return <Spin tip="Đang tải..." />;
  if (error) return <Alert message={error} type="error" />;

  return (
    <Card title="Danh sách Đơn thuốc">
        <Alert 
            message="Chức năng xem thông tin."
            description="Trang này dùng để tra cứu và xem chi tiết các đơn thuốc đã được tạo. Việc tạo và chỉnh sửa đơn thuốc được thực hiện trong mục Quản lý Lịch khám."
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
        />
        <Form form={filterForm} onFinish={onFilterFinish} layout="vertical" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="patient_name" label="Lọc theo tên bệnh nhân">
                <Input placeholder="Nhập tên bệnh nhân" allowClear />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="doctor_name" label="Lọc theo tên bác sĩ">
                <Input placeholder="Nhập tên bác sĩ" allowClear />
              </Form.Item>
            </Col>
            <Col span={8} style={{ display: 'flex', alignItems: 'flex-end' }}>
              <Form.Item>
                <Button type="primary" htmlType="submit">Tìm kiếm</Button>
                <Button style={{ marginLeft: 8 }} onClick={() => { filterForm.resetFields(); fetchPrescriptions(); }}>Reset</Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      <Table
        columns={mainColumns}
        dataSource={prescriptions}
        rowKey="id_don_thuoc"
        expandable={{ expandedRowRender }}
      />
    </Card>
  );
};

export default PrescriptionsPage;