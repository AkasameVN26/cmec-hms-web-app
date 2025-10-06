'use client';

import { useState, useEffect } from 'react';
import { Card, Form, Button, Select, DatePicker, Input, message, Row, Col, Modal, Spin } from 'antd';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';

const { Option } = Select;

const NewAppointmentPage = () => {
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [patientLoading, setPatientLoading] = useState(false);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [searchingDoctors, setSearchingDoctors] = useState(false);
  const [isPatientModalVisible, setIsPatientModalVisible] = useState(false);
  const router = useRouter();
  const [form] = Form.useForm();
  const [patientForm] = Form.useForm();

  useEffect(() => {
    const fetchAllRooms = async () => {
      const { data, error } = await supabase
        .from('phong_kham')
        .select('id_phong_kham, ten_phong_kham, vi_tri');
      
      if (data) {
        const sortedData = data.sort((a, b) => 
          a.ten_phong_kham.localeCompare(b.ten_phong_kham, 'vi', { sensitivity: 'base' })
        );
        setRooms(sortedData);
      }
    };

    fetchAllRooms();
  }, []);

  const disabledDate = (current: any) => {
    // Can not select days before today
    return current && current < dayjs().startOf('day');
  };

  const handlePatientSearch = async (value: string) => {
    if (value) {
      setSearchingPatients(true);
      const { data } = await supabase
        .from('benh_nhan')
        .select('id_benh_nhan, ho_ten, so_dien_thoai')
        .or(`ho_ten.ilike.%${value}%,so_dien_thoai.ilike.%${value}%`);
      if (data) setPatients(data);
      setSearchingPatients(false);
    } else {
      setPatients([]);
    }
  };



  const getShift = (time: dayjs.Dayjs): string | null => {
    const hour = time.hour();
    if (hour >= 7 && hour < 12) return 'Sáng';
    if (hour >= 13 && hour < 17) return 'Chiều';
    if (hour >= 18 && hour < 21) return 'Tối';
    return null;
  };

  const handleTimeChange = async (value: dayjs.Dayjs | null) => {
    form.setFieldsValue({ id_bac_si: null });
    setDoctors([]);

    if (value) {
      const shift = getShift(value);
      if (!shift) {
        message.warning('Vui lòng chọn thời gian trong giờ làm việc (Sáng: 7-12h, Chiều: 13-17h, Tối: 18-21h).');
        return;
      }

      setSearchingDoctors(true);
      const selectedDate = value.format('YYYY-MM-DD');

      const { data: shiftData, error: shiftError } = await supabase
        .from('lich_truc')
        .select('id_bac_si')
        .eq('ngay_truc', selectedDate)
        .eq('ca_truc', shift);

      if (shiftError || !shiftData || shiftData.length === 0) {
        message.error('Không có bác sĩ nào trực trong ca này.');
        setSearchingDoctors(false);
        return;
      }

      const doctorIds = shiftData.map(s => s.id_bac_si);
      const { data: doctorsData, error: doctorsError } = await supabase
        .from('bac_si')
        .select('id_bac_si, ho_ten, chuyen_khoa')
        .in('id_bac_si', doctorIds);

      if (doctorsData) {
        const getLastName = (fullName: string) => {
          const parts = fullName.split(' ');
          return parts[parts.length - 1];
        };
        
        const sortedData = doctorsData.sort((a, b) => {
          const lastNameA = getLastName(a.ho_ten);
          const lastNameB = getLastName(b.ho_ten);
          return lastNameA.localeCompare(lastNameB, 'vi', { sensitivity: 'base' });
        });

        setDoctors(sortedData);
      } else {
        message.error('Không thể tải danh sách bác sĩ.');
      }
      setSearchingDoctors(false);
    }
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    const { error } = await supabase.from('lich_kham').insert([
      {
        id_benh_nhan: values.id_benh_nhan,
        id_bac_si: values.id_bac_si,
        id_phong_kham: values.id_phong_kham,
        thoi_gian_kham: values.thoi_gian_kham.toISOString(),
        ly_do_kham: values.ly_do_kham,
        trang_thai: 'Đã Hẹn',
      },
    ]);

    if (error) {
      message.error(error.message);
    } else {
      message.success('Thêm lịch khám thành công');
      router.push('/dashboard/appointments');
    }
    setLoading(false);
  };

  const onAddPatientFinish = async (values: any) => {
    setPatientLoading(true);
    const { data, error } = await supabase.from('benh_nhan').insert([values]).select().single();

    if (error) {
      message.error(error.message);
    } else if (data) {
      message.success('Thêm bệnh nhân thành công');
      setPatients([data, ...patients]);
      form.setFieldsValue({ id_benh_nhan: data.id_benh_nhan });
      setIsPatientModalVisible(false);
      patientForm.resetFields();
    }
    setPatientLoading(false);
  };

  return (
    <>
      <Card title="Thêm lịch khám mới">
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Thời gian khám" name="thoi_gian_kham" rules={[{ required: true }]}>
                <DatePicker showTime style={{ width: '100%' }} onChange={handleTimeChange} disabledDate={disabledDate} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Bác sĩ" name="id_bac_si" rules={[{ required: true }]}>
                <Select 
                  placeholder="Vui lòng chọn thời gian trước"
                  loading={searchingDoctors}
                  disabled={doctors.length === 0}
                >
                  {doctors.map(d => <Option key={d.id_bac_si} value={d.id_bac_si}>{`${d.ho_ten} (${d.chuyen_khoa})`}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Bệnh nhân" required>
                <Row gutter={8}>
                  <Col span={18}>
                    <Form.Item name="id_benh_nhan" noStyle rules={[{ required: true, message: 'Vui lòng chọn bệnh nhân'}]}>
                      <Select 
                        placeholder="Nhập tên hoặc SĐT để tìm kiếm"
                        showSearch
                        onSearch={handlePatientSearch}
                        loading={searchingPatients}
                        filterOption={false}
                        notFoundContent={searchingPatients ? <Spin size="small" /> : 'Không tìm thấy bệnh nhân'}
                      >
                        {patients.map(p => <Option key={p.id_benh_nhan} value={p.id_benh_nhan}>{`${p.ho_ten} - ${p.so_dien_thoai}`}</Option>)}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Button onClick={() => setIsPatientModalVisible(true)}>Thêm bệnh nhân</Button>
                  </Col>
                </Row>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="id_phong_kham" label="Phòng khám" rules={[{ required: true }]}>
                <Select 
                  placeholder="Chọn phòng khám"
                  showSearch
                >
                  {rooms.map(r => <Option key={r.id_phong_kham} value={r.id_phong_kham}>{`${r.ten_phong_kham} (${r.vi_tri})`}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="ly_do_kham" label="Lý do khám" rules={[{ required: true }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} style={{ marginRight: 8 }}>
              Thêm lịch khám
            </Button>
            <Button onClick={() => router.back()}>
              Quay lại
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Modal
        title="Thêm bệnh nhân mới"
        visible={isPatientModalVisible}
        onCancel={() => setIsPatientModalVisible(false)}
        footer={null}
      >
        <Form form={patientForm} layout="vertical" onFinish={onAddPatientFinish}>
          <Form.Item name="ho_ten" label="Họ và tên" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="ngay_sinh" label="Ngày sinh" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="gioi_tinh" label="Giới tính" rules={[{ required: true }]}>
            <Select placeholder="Chọn giới tính">
              <Option value="Nam">Nam</Option>
              <Option value="Nữ">Nữ</Option>
            </Select>
          </Form.Item>
          <Form.Item name="dia_chi" label="Địa chỉ" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="so_dien_thoai" label="Số điện thoại" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="cccd" label="CCCD" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={patientLoading}>
              Thêm bệnh nhân
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default NewAppointmentPage;