'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Modal, Descriptions, Spin, Form, Select, message, Row, Col, Input, Tag } from 'antd';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import NProgress from 'nprogress';

const { Option } = Select;

const TechniciansPage = () => {
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [filteredTechnicians, setFilteredTechnicians] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [selectedTechnicianDetails, setSelectedTechnicianDetails] = useState<any | null>(null);
  const router = useRouter();
  const [searchForm] = Form.useForm();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: techniciansData, error } = await supabase
      .from('ky_thuat_vien')
      .select(`
        id_ky_thuat_vien,
        trinh_do,
        so_dien_thoai,
        cccd,
        ngay_sinh,
        tien_luong,
        ngay_chuyen_den,
        ngay_chuyen_di,
        chuyen_khoa!id_chuyen_khoa ( id_chuyen_khoa, ten_chuyen_khoa ),
        tai_khoan!id_ky_thuat_vien ( id, email, ho_ten ),
        ktv_dich_vu_cls ( dich_vu_cls ( id_dich_vu, ten_dich_vu ) )
      `);

    if (error) {
        message.error('Lỗi khi tải dữ liệu Kỹ thuật viên: ' + error.message);
        setLoading(false);
        return;
    }

    const { data: specialtiesData } = await supabase.from('chuyen_khoa').select('*').eq('loai_khoa', 'Cận lâm sàng');

    if (techniciansData) {
        setTechnicians(techniciansData);
        setFilteredTechnicians(techniciansData);
    }
    if (specialtiesData) setSpecialties(specialtiesData);
    setLoading(false);
  };

  const handleSearch = (values: any) => {
    let filtered = technicians;

    if (values.ho_ten) {
      filtered = filtered.filter(t => t.tai_khoan && t.tai_khoan.ho_ten.toLowerCase().includes(values.ho_ten.toLowerCase()));
    }
    if (values.id_chuyen_khoa) {
      filtered = filtered.filter(t => t.chuyen_khoa && t.chuyen_khoa.id_chuyen_khoa === values.id_chuyen_khoa);
    }

    setFilteredTechnicians(filtered);
  };

  const handleClearFilter = () => {
    searchForm.resetFields();
    setFilteredTechnicians(technicians);
  };

  const handleViewDetails = async (technician: any) => {
    setSelectedTechnicianDetails(technician);
    setIsDetailsModalVisible(true);
  };

  const handleEditInfo = (technicianId: string) => {
    NProgress.start();
    router.push(`/dashboard/technicians/edit/${technicianId}`);
  };

  const columns = [
    { title: 'Họ tên', dataIndex: ['tai_khoan', 'ho_ten'], key: 'ho_ten', render: (text: string) => text || '-' },
    { title: 'Email', dataIndex: ['tai_khoan', 'email'], key: 'email', render: (text: string) => text || '-' },
    { title: 'Chuyên khoa', dataIndex: ['chuyen_khoa', 'ten_chuyen_khoa'], key: 'chuyen_khoa', render: (text: string) => text || '-' },
    { title: 'Trình độ', dataIndex: 'trinh_do', key: 'trinh_do', render: (text: string) => text || '-' },
    { title: 'Số điện thoại', dataIndex: 'so_dien_thoai', key: 'so_dien_thoai', render: (text: string) => text || '-' },
    {
      title: 'Hành động',
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button onClick={() => handleViewDetails(record)}>Xem chi tiết</Button>
          <Button onClick={() => handleEditInfo(record.id_ky_thuat_vien)}>Sửa thông tin</Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card 
        title="Quản lý Kỹ thuật viên"
        extra={<Button type="primary" onClick={() => { NProgress.start(); router.push('/dashboard/accounts/new?role_id=7'); }}>Thêm Kỹ thuật viên</Button>}
      >
        <Form form={searchForm} onFinish={handleSearch} layout="vertical" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="ho_ten" label="Tên kỹ thuật viên">
                <Input placeholder="Nhập tên kỹ thuật viên" allowClear />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="id_chuyen_khoa" label="Chuyên khoa">
                <Select placeholder="Chọn chuyên khoa" allowClear>
                    {specialties.map(s => <Option key={s.id_chuyen_khoa} value={s.id_chuyen_khoa}>{s.ten_chuyen_khoa}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row>
            <Col span={24} style={{ textAlign: 'right' }}>
                <Button type="primary" htmlType="submit">Tìm kiếm</Button>
                <Button style={{ marginLeft: 8 }} onClick={handleClearFilter}>Xoá bộ lọc</Button>
            </Col>
          </Row>
        </Form>
        <Table
          columns={columns}
          dataSource={filteredTechnicians}
          loading={loading}
          rowKey="id_ky_thuat_vien"
        />
      </Card>

      {selectedTechnicianDetails && (
        <Modal
          title="Chi tiết Kỹ thuật viên"
          visible={isDetailsModalVisible}
          onCancel={() => setIsDetailsModalVisible(false)}
          footer={<Button onClick={() => setIsDetailsModalVisible(false)}>Đóng</Button>}
          width={600}
        >
          {loading ? <Spin /> : (
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Họ tên">{selectedTechnicianDetails.tai_khoan?.ho_ten || '-'}</Descriptions.Item>
              <Descriptions.Item label="Email">{selectedTechnicianDetails.tai_khoan?.email || '-'}</Descriptions.Item>
              <Descriptions.Item label="Chuyên khoa">{selectedTechnicianDetails.chuyen_khoa?.ten_chuyen_khoa || '-'}</Descriptions.Item>
              <Descriptions.Item label="Trình độ">{selectedTechnicianDetails.trinh_do || '-'}</Descriptions.Item>
              <Descriptions.Item label="Ngày sinh">{selectedTechnicianDetails.ngay_sinh ? new Date(selectedTechnicianDetails.ngay_sinh).toLocaleDateString() : '-'}</Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">{selectedTechnicianDetails.so_dien_thoai || '-'}</Descriptions.Item>
              <Descriptions.Item label="CCCD">{selectedTechnicianDetails.cccd || '-'}</Descriptions.Item>
              <Descriptions.Item label="Ngày chuyển đến">{selectedTechnicianDetails.ngay_chuyen_den ? new Date(selectedTechnicianDetails.ngay_chuyen_den).toLocaleDateString() : '-'}</Descriptions.Item>
              <Descriptions.Item label="Ngày chuyển đi">{selectedTechnicianDetails.ngay_chuyen_di ? new Date(selectedTechnicianDetails.ngay_chuyen_di).toLocaleDateString() : '-'}</Descriptions.Item>
              <Descriptions.Item label="Lương">{selectedTechnicianDetails.tien_luong ? selectedTechnicianDetails.tien_luong.toLocaleString('vi-VN') + ' VND' : '-'}</Descriptions.Item>
              <Descriptions.Item label="Các dịch vụ thực hiện">
                {(selectedTechnicianDetails.ktv_dich_vu_cls && selectedTechnicianDetails.ktv_dich_vu_cls.length > 0) ? 
                    selectedTechnicianDetails.ktv_dich_vu_cls.map((serviceLink: any) => (
                        <Tag key={serviceLink.dich_vu_cls.id_dich_vu} style={{ margin: '2px' }}>
                            {serviceLink.dich_vu_cls.ten_dich_vu}
                        </Tag>
                    )) : '-'}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Modal>
      )}
    </>
  );
};

export default TechniciansPage;
export const dynamic = 'force-dynamic';
