'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Select, DatePicker, Button, Form, Row, Col, Modal, Input, message, InputNumber, Space, Descriptions } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';

const { Option } = Select;

const AppointmentsPage = () => {
  const router = useRouter();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any | null>(null);
  const [selectedAppointmentDetails, setSelectedAppointmentDetails] = useState<any | null>(null);
  const [form] = Form.useForm();
  const [filterForm] = Form.useForm();

  useEffect(() => {
    const fetchDoctors = async () => {
      const { data, error } = await supabase.from('bac_si').select('id_bac_si, ho_ten, chuyen_khoa');
      if (data) setDoctors(data);
    };
    fetchDoctors();
    fetchInitialAppointments();
  }, []);

  const fetchInitialAppointments = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('lich_kham').select(`
      id_lich_kham, thoi_gian_kham, ly_do_kham, ket_luan_benh, trang_thai, hinh_thuc_dieu_tri, chi_phi_kham, ngay_tai_kham,
      benh_nhan:id_benh_nhan (ho_ten),
      bac_si:id_bac_si (ho_ten)
    `);
    if (data) setAppointments(data);
    setLoading(false);
  };

  const onFilterFinish = async (values: any) => {
    setLoading(true);
    let query = supabase.from('lich_kham').select(`
      id_lich_kham, thoi_gian_kham, ly_do_kham, ket_luan_benh, trang_thai, hinh_thuc_dieu_tri, chi_phi_kham, ngay_tai_kham,
      benh_nhan:id_benh_nhan (ho_ten),
      bac_si:id_bac_si (ho_ten)
    `);

    if (values.id_bac_si) {
      query = query.eq('id_bac_si', values.id_bac_si);
    }

    if (values.date) {
      const date = values.date.format('YYYY-MM-DD');
      query = query.gte('thoi_gian_kham', `${date}T00:00:00Z`).lte('thoi_gian_kham', `${date}T23:59:59Z`);
    }

    const { data, error } = await query;
    if (data) setAppointments(data);
    setLoading(false);
  };

  const handleEdit = async (record: any) => {
    setEditingAppointment(record);
    
    const { data: donThuocData } = await supabase
      .from('don_thuoc')
      .select('*')
      .eq('id_lich_kham', record.id_lich_kham);

    const formData = {
      ...record,
      ngay_tai_kham: record.ngay_tai_kham ? dayjs(record.ngay_tai_kham) : null,
      don_thuoc: donThuocData || [],
    };

    form.setFieldsValue(formData);
    setIsModalVisible(true);
  };

  const handleDetails = async (record: any) => {
    const { data: donThuocData } = await supabase
      .from('don_thuoc')
      .select('*')
      .eq('id_lich_kham', record.id_lich_kham);

    setSelectedAppointmentDetails({ ...record, don_thuoc: donThuocData || [] });
    setIsDetailsModalVisible(true);
  };

  const handleUpdate = async (values: any) => {
    if (!editingAppointment) return;

    const { don_thuoc, ...lichKhamValues } = values;

    const { error: lichKhamError } = await supabase
      .from('lich_kham')
      .update(lichKhamValues)
      .eq('id_lich_kham', editingAppointment.id_lich_kham);

    if (lichKhamError) {
      message.error(lichKhamError.message);
      return;
    }

    // Delete old prescriptions
    const { error: deleteError } = await supabase
        .from('don_thuoc')
        .delete()
        .eq('id_lich_kham', editingAppointment.id_lich_kham);

    if (deleteError) {
        message.error(`Lỗi xoá đơn thuốc cũ: ${deleteError.message}`);
        return;
    }

    // Insert new prescriptions if any
    if (don_thuoc && don_thuoc.length > 0) {
        const newDonThuoc = don_thuoc.map((thuoc: any) => ({
            ...thuoc,
            id_lich_kham: editingAppointment.id_lich_kham,
        }));

        const { error: insertError } = await supabase.from('don_thuoc').insert(newDonThuoc);

        if (insertError) {
            message.error(`Lỗi thêm đơn thuốc mới: ${insertError.message}`);
            return;
        }
    }

    message.success('Cập nhật thành công!');
    setIsModalVisible(false);
    onFilterFinish(filterForm.getFieldsValue()); // Refresh the table
  };

  const handleDelete = async () => {
    if (!editingAppointment) return;

    Modal.confirm({
      title: 'Bạn có chắc chắn muốn xoá lịch khám này?',
      content: 'Hành động này không thể hoàn tác.',
      onOk: async () => {
        try {
          // 1. Delete prescriptions
          await supabase
            .from('don_thuoc')
            .delete()
            .eq('id_lich_kham', editingAppointment.id_lich_kham);

          // 2. Delete appointment
          const { error } = await supabase
            .from('lich_kham')
            .delete()
            .eq('id_lich_kham', editingAppointment.id_lich_kham);

          if (error) throw error;

          message.success('Xoá lịch khám thành công');
          setIsModalVisible(false);
          fetchInitialAppointments(); // Refresh the main table
        } catch (error: any) {
          message.error(error.message);
        }
      },
    });
  };

  const columns = [
    { title: 'Bệnh nhân', dataIndex: ['benh_nhan', 'ho_ten'], key: 'benh_nhan' },
    { title: 'Bác sĩ', dataIndex: ['bac_si', 'ho_ten'], key: 'bac_si' },
    { title: 'Thời gian khám', dataIndex: 'thoi_gian_kham', key: 'thoi_gian_kham', render: (text: string) => new Date(text).toLocaleString() },
    { title: 'Lý do khám', dataIndex: 'ly_do_kham', key: 'ly_do_kham' },
    { title: 'Trạng thái', dataIndex: 'trang_thai', key: 'trang_thai' },
    {
      title: 'Hành động',
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button onClick={() => handleEdit(record)}>Cập nhật</Button>
          {record.trang_thai === 'Đã Khám' && (
            <Button onClick={() => handleDetails(record)}>Chi tiết</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card 
        title="Quản lý Lịch khám"
        extra={
          <Button type="primary" onClick={() => router.push('/dashboard/appointments/new')}>
            Thêm lịch khám
          </Button>
        }
      >
        <Form form={filterForm} onFinish={onFilterFinish} layout="vertical" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="id_bac_si" label="Tra cứu theo bác sĩ">
                <Select placeholder="Chọn bác sĩ" allowClear>
                  {doctors.map(doctor => (
                    <Option key={doctor.id_bac_si} value={doctor.id_bac_si}>{`${doctor.ho_ten} (${doctor.chuyen_khoa})`}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="date" label="Tra cứu theo ngày">
                <DatePicker style={{ width: '100%' }} placeholder="Chọn ngày" />
              </Form.Item>
            </Col>
            <Col span={8} style={{ display: 'flex', alignItems: 'flex-end' }}>
              <Form.Item>
                <Button type="primary" htmlType="submit">Tìm kiếm</Button>
                <Button style={{ marginLeft: 8 }} onClick={() => { filterForm.resetFields(); fetchInitialAppointments(); }}>Reset</Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>
        <Table
          columns={columns}
          dataSource={appointments}
          loading={loading}
          rowKey="id_lich_kham"
        />
      </Card>

      <Modal
        title="Cập nhật thông tin ca khám"
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleUpdate}>
            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item name="ket_luan_benh" label="Kết luận của bác sĩ">
                        <Input.TextArea rows={4} />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item name="trang_thai" label="Trạng thái">
                        <Select>
                        <Option value="Đã Hẹn">Đã Hẹn</Option>
                        <Option value="Đã Khám">Đã Khám</Option>
                        <Option value="Đã Huỷ">Đã Huỷ</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="hinh_thuc_dieu_tri" label="Hình thức điều trị">
                        <Select placeholder="Chọn hình thức điều trị">
                            <Option value="Nội trú">Nội trú</Option>
                            <Option value="Ngoại trú">Ngoại trú</Option>
                        </Select>
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item name="chi_phi_kham" label="Chi phí khám (VND)">
                        <InputNumber 
                            style={{ width: '100%' }} 
                            min={0} 
                            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                            parser={(value) => Number(value!.replace(/\./g, ''))}
                        />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item name="ngay_tai_kham" label="Ngày tái khám">
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                </Col>
            </Row>
            
            <h4>Đơn thuốc</h4>
            <Form.List name="don_thuoc">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                      <Form.Item
                        {...restField}
                        name={[name, 'ten_thuoc']}
                        rules={[{ required: true, message: 'Vui lòng nhập tên thuốc' }]}
                      >
                        <Input placeholder="Tên thuốc" />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'so_luong']}
                        rules={[{ required: true, message: 'Vui lòng nhập số lượng' }]}
                      >
                        <Input placeholder="Số lượng" />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'lieu_dung']}
                        rules={[{ required: true, message: 'Vui lòng nhập liều dùng' }]}
                      >
                        <Input placeholder="Liều dùng" />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'ghi_chu']}
                      >
                        <Input placeholder="Ghi chú" />
                      </Form.Item>
                      <MinusCircleOutlined onClick={() => remove(name)} />
                    </Space>
                  ))}
                  <Form.Item>
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                      Thêm thuốc
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>

          <Form.Item>
            <Button type="primary" htmlType="submit" style={{ marginRight: 8 }}>Cập nhật</Button>
            <Button danger onClick={handleDelete}>Xoá lịch khám</Button>
          </Form.Item>
        </Form>
      </Modal>

      {selectedAppointmentDetails && (
        <Modal
          title="Chi tiết ca khám"
          visible={isDetailsModalVisible}
          onCancel={() => setIsDetailsModalVisible(false)}
          footer={<Button onClick={() => setIsDetailsModalVisible(false)}>Đóng</Button>}
          width={800}
        >
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Bệnh nhân">{selectedAppointmentDetails.benh_nhan.ho_ten}</Descriptions.Item>
            <Descriptions.Item label="Bác sĩ">{selectedAppointmentDetails.bac_si.ho_ten}</Descriptions.Item>
            <Descriptions.Item label="Thời gian khám">{new Date(selectedAppointmentDetails.thoi_gian_kham).toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="Lý do khám">{selectedAppointmentDetails.ly_do_kham}</Descriptions.Item>
            <Descriptions.Item label="Kết luận của bác sĩ">{selectedAppointmentDetails.ket_luan_benh}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái">{selectedAppointmentDetails.trang_thai}</Descriptions.Item>
            <Descriptions.Item label="Hình thức điều trị">{selectedAppointmentDetails.hinh_thuc_dieu_tri}</Descriptions.Item>
            <Descriptions.Item label="Chi phí khám">{selectedAppointmentDetails.chi_phi_kham ? selectedAppointmentDetails.chi_phi_kham.toLocaleString() : 'N/A'} VND</Descriptions.Item>
            <Descriptions.Item label="Ngày tái khám">{selectedAppointmentDetails.ngay_tai_kham ? new Date(selectedAppointmentDetails.ngay_tai_kham).toLocaleDateString() : 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Đơn thuốc">
              {selectedAppointmentDetails.don_thuoc.length > 0 ? (
                <Table
                  size="small"
                  pagination={false}
                  dataSource={selectedAppointmentDetails.don_thuoc}
                  columns={[
                    { title: 'Tên thuốc', dataIndex: 'ten_thuoc', key: 'ten_thuoc' },
                    { title: 'Số lượng', dataIndex: 'so_luong', key: 'so_luong' },
                    { title: 'Liều dùng', dataIndex: 'lieu_dung', key: 'lieu_dung' },
                    { title: 'Ghi chú', dataIndex: 'ghi_chu', key: 'ghi_chu' },
                  ]}
                  rowKey="id_don_thuoc"
                />
              ) : 'Không có'}
            </Descriptions.Item>
          </Descriptions>
        </Modal>
      )}
    </>
  );
};

export default AppointmentsPage;