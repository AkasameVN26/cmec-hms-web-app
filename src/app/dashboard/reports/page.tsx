'use client';

import { useState, useEffect } from 'react';
import { Card, Table, DatePicker, Button, Form, Row, Col, Statistic } from 'antd';
import { supabase } from '@/lib/supabase';
import { Line } from '@ant-design/charts';
import dayjs, { Dayjs } from 'dayjs';

const ReportsPage = () => {
  const [appointmentCount, setAppointmentCount] = useState(0);
  const [inpatients, setInpatients] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [establishmentDate, setEstablishmentDate] = useState<Dayjs | null>(null);
  const [startMonth, setStartMonth] = useState<Dayjs | null>(null);

  useEffect(() => {
    fetchInpatients();
    const fetchHospitalInfo = async () => {
      const { data, error } = await supabase.from('benh_vien').select('ngay_thanh_lap').single();
      if (data && data.ngay_thanh_lap) {
        setEstablishmentDate(dayjs(data.ngay_thanh_lap));
      }
    };
    fetchHospitalInfo();
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
    const { startMonth, endMonth } = values;
    if (!startMonth || !endMonth) return;

    setLoading(true);
    const results = [];
    let currentMonth = startMonth.clone();

    const { data: salariesData, error: salariesError } = await supabase
      .from('bac_si')
      .select('tien_luong');
    const totalSalaries = salariesData ? salariesData.reduce((acc, item) => acc + (item.tien_luong || 0), 0) : 0;

    while (currentMonth.isBefore(endMonth) || currentMonth.isSame(endMonth, 'month')) {
      const year = currentMonth.year();
      const month = currentMonth.month();
      const startDate = new Date(year, month, 1).toISOString();
      const endDate = new Date(year, month + 1, 0).toISOString();

      const { data: feesData, error: feesError } = await supabase
        .from('lich_kham')
        .select('chi_phi_kham')
        .gte('thoi_gian_kham', startDate)
        .lte('thoi_gian_kham', endDate)
        .eq('trang_thai', 'Đã Khám');

      const totalFees = feesData ? feesData.reduce((acc, item) => acc + (item.chi_phi_kham || 0), 0) : 0;
      const netRevenue = totalFees - totalSalaries;
      const monthStr = currentMonth.format('YYYY-MM');

      results.push({ month: monthStr, value: totalFees, category: 'Tổng chi phí' });
      results.push({ month: monthStr, value: totalSalaries, category: 'Tổng lương' });
      results.push({ month: monthStr, value: netRevenue, category: 'Doanh thu' });

      currentMonth = currentMonth.add(1, 'month');
    }
    setChartData(results);
    setLoading(false);
  };

  const inpatientColumns = [
    { title: 'Họ tên', dataIndex: ['benh_nhan', 'ho_ten'], key: 'ho_ten' },
    { title: 'Ngày sinh', dataIndex: ['benh_nhan', 'ngay_sinh'], key: 'ngay_sinh' },
    { title: 'Lý do khám', dataIndex: 'ly_do_kham', key: 'ly_do_kham' },
    { title: 'Kết luận', dataIndex: 'ket_luan_benh', key: 'ket_luan_benh' },
  ];

  const chartConfig = {
    data: chartData,
    xField: 'month',
    yField: 'value',
    seriesField: 'category',
    yAxis: {
      label: {
        formatter: (v: any) => `${v / 1000000}M VND`,
      },
    },
    tooltip: {
      formatter: (datum: any) => ({ name: datum.category, value: `${datum.value.toLocaleString()} VND` }),
    },
    legend: { position: 'top' as const },
    smooth: true,
  };

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
        <Card title="Báo cáo doanh thu chi tiết">
          <Form onFinish={onRevenueFinish} layout="inline" style={{ marginBottom: 24 }}>
            <Form.Item name="startMonth" label="Từ tháng" rules={[{ required: true }]}>
              <DatePicker.MonthPicker 
                onChange={(date) => setStartMonth(date)}
                disabledDate={(current) => establishmentDate ? current.isBefore(establishmentDate, 'month') : false}
              />
            </Form.Item>
            <Form.Item name="endMonth" label="Đến tháng" rules={[{ required: true }]}>
              <DatePicker.MonthPicker 
                disabled={!startMonth}
                disabledDate={(current) => 
                  startMonth ? current.isBefore(startMonth, 'month') || current.isAfter(startMonth.add(11, 'month'), 'month') : false
                }
              />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading}>Xem báo cáo</Button>
            </Form.Item>
          </Form>
          {chartData.length > 0 && <Line {...chartConfig} />}
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