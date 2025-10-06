'use client';

import { useState, useEffect } from 'react';
import { Card, Table, DatePicker, Button, Form, Row, Col, Statistic } from 'antd';
import { supabase } from '@/lib/supabase';

const ReportsPage = () => {
  const [appointmentCount, setAppointmentCount] = useState(0);
  const [inpatients, setInpatients] = useState<any[]>([]);
  const [revenue, setRevenue] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInpatients();
  }, []);

  const fetchInpatients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('lich_kham')
      .select('*, benh_nhan:id_benh_nhan(*)')
      .eq('hinh_thuc_dieu_tri', 'Nội trú');
    if (data) setInpatients(data);
    setLoading(false);
  };

  const onAppointmentCountFinish = async (values: any) => {
    let query = supabase.from('lich_kham').select('id_lich_kham', { count: 'exact' });
    if (values.day) {
      const date = values.day.format('YYYY-MM-DD');
      query = query.gte('thoi_gian_kham', `${date}T00:00:00Z`).lte('thoi_gian_kham', `${date}T23:59:59Z`);
    } else if (values.month) {
      const year = values.month.year();
      const month = values.month.month();
      const startDate = new Date(year, month, 1).toISOString();
      const endDate = new Date(year, month + 1, 0).toISOString();
      query = query.gte('thoi_gian_kham', startDate).lte('thoi_gian_kham', endDate);
    }
    const { count } = await query;
    setAppointmentCount(count || 0);
  };

  const onRevenueFinish = async (values: any) => {
    const { startDate, endDate } = values;
    const { data, error } = await supabase
      .from('lich_kham')
      .select('chi_phi_kham')
      .gte('thoi_gian_kham', startDate.toISOString())
      .lte('thoi_gian_kham', endDate.toISOString());
    if (data) {
      const totalRevenue = data.reduce((acc, item) => acc + (item.chi_phi_kham || 0), 0);
      setRevenue(totalRevenue);
    }
  };

  const inpatientColumns = [
    { title: 'Họ tên', dataIndex: ['benh_nhan', 'ho_ten'], key: 'ho_ten' },
    { title: 'Ngày sinh', dataIndex: ['benh_nhan', 'ngay_sinh'], key: 'ngay_sinh' },
    { title: 'Lý do khám', dataIndex: 'ly_do_kham', key: 'ly_do_kham' },
    { title: 'Kết luận', dataIndex: 'ket_luan_benh', key: 'ket_luan_benh' },
  ];

  return (
    <Row gutter={[16, 16]}>
      <Col span={24}>
        <Card title="Thống kê số lượng bệnh nhân khám bệnh">
          <Form onFinish={onAppointmentCountFinish} layout="inline">
            <Form.Item name="day" label="Theo ngày">
              <DatePicker />
            </Form.Item>
            <Form.Item>
              <Button htmlType="submit">Xem</Button>
            </Form.Item>
          </Form>
          <Form onFinish={onAppointmentCountFinish} layout="inline" style={{ marginTop: 16 }}>
            <Form.Item name="month" label="Theo tháng">
              <DatePicker.MonthPicker />
            </Form.Item>
            <Form.Item>
              <Button htmlType="submit">Xem</Button>
            </Form.Item>
          </Form>
          <Statistic title="Số lượng bệnh nhân" value={appointmentCount} style={{ marginTop: 16 }} />
        </Card>
      </Col>
      <Col span={24}>
        <Card title="Thống kê doanh thu">
          <Form onFinish={onRevenueFinish} layout="inline">
            <Form.Item name="startDate" label="Từ ngày">
              <DatePicker />
            </Form.Item>
            <Form.Item name="endDate" label="Đến ngày">
              <DatePicker />
            </Form.Item>
            <Form.Item>
              <Button htmlType="submit">Xem</Button>
            </Form.Item>
          </Form>
          <Statistic title="Tổng doanh thu" value={revenue} precision={0} suffix="VND" style={{ marginTop: 16 }} />
        </Card>
      </Col>
      <Col span={24}>
        <Card title="Báo cáo danh sách bệnh nhân điều trị nội trú">
          <Table
            columns={inpatientColumns}
            dataSource={inpatients}
            loading={loading}
            rowKey="id_lich_kham"
          />
        </Card>
      </Col>
    </Row>
  );
};

export default ReportsPage;