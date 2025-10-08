'use client';

import { useState, useEffect } from 'react';
import { Card, Table, DatePicker, Button, Form, Row, Col, Statistic } from 'antd';
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';
import dayjs, { Dayjs } from 'dayjs';

const ReactECharts = dynamic(() => import('echarts-for-react').then((mod) => mod.default), { ssr: false });

const ReportsPage = () => {
  const [appointmentCount, setAppointmentCount] = useState(0);
  const [inpatients, setInpatients] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [establishmentDate, setEstablishmentDate] = useState<Dayjs | null>(null);
  const [startMonth, setStartMonth] = useState<Dayjs | null>(null);
  const [periodTotals, setPeriodTotals] = useState({ fees: 0, salaries: 0, profit: 0 });

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
    setChartData([]);
    setPeriodTotals({ fees: 0, salaries: 0, profit: 0 });
    const results = [];
    let currentMonth = startMonth.clone();
    
    let grandTotalFees = 0;
    let grandTotalSalaries = 0;

    const { data: salariesData, error: salariesError } = await supabase
      .from('bac_si')
      .select('tien_luong');
    const monthlyTotalSalaries = salariesData ? salariesData.reduce((acc, item) => acc + (item.tien_luong || 0), 0) : 0;

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
      const netRevenue = totalFees - monthlyTotalSalaries;
      const monthStr = currentMonth.format('YYYY-MM');

      grandTotalFees += totalFees;
      grandTotalSalaries += monthlyTotalSalaries;

      results.push({ month: monthStr, value: totalFees, category: 'Tổng Doanh Thu' });
      results.push({ month: monthStr, value: monthlyTotalSalaries, category: 'Chi phí vận hành' });
      results.push({ month: monthStr, value: netRevenue, category: 'Lợi nhuận' });

      currentMonth = currentMonth.add(1, 'month');
    }
    
    setPeriodTotals({
      fees: grandTotalFees,
      salaries: grandTotalSalaries,
      profit: grandTotalFees - grandTotalSalaries,
    });
    setChartData(results);
    setLoading(false);
  };

  const inpatientColumns = [
    { title: 'Họ tên', dataIndex: ['benh_nhan', 'ho_ten'], key: 'ho_ten' },
    { title: 'Ngày sinh', dataIndex: ['benh_nhan', 'ngay_sinh'], key: 'ngay_sinh' },
    { title: 'Lý do khám', dataIndex: 'ly_do_kham', key: 'ly_do_kham' },
    { title: 'Kết luận', dataIndex: 'ket_luan_benh', key: 'ket_luan_benh' },
  ];

  const getChartOptions = (data: any[]) => {
    if (!data || data.length === 0) return {};

    const months = [...new Set(data.map(item => item.month))].sort();
    const categories = ['Tổng Doanh Thu', 'Chi phí vận hành', 'Lợi nhuận'];
    const colors = ['#FFC107', '#F44336', '#4CAF50'];

    const series = categories.map(category => ({
      name: category,
      type: 'line',
      smooth: true,
      data: months.map(month => {
        const item = data.find(d => d.month === month && d.category === category);
        return item ? item.value : 0;
      }),
    }));

    return {
      color: colors,
      tooltip: {
        trigger: 'axis',
        formatter: (params: any[]) => {
          if (!params || params.length === 0) return '';
          let tooltipHtml = `<div style="padding: 12px; border-radius: 4px; background-color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
            <h4 style="margin: 0 0 12px 0;">${params[0].axisValueLabel}</h4>
            <ul style="padding: 0; margin: 0;">`;
          params.forEach(param => {
            const value = (typeof param.value === 'number' && !isNaN(param.value))
              ? param.value.toLocaleString('vi-VN')
              : '0';
            tooltipHtml += `<li style="list-style: none; margin: 8px 0; display: flex; align-items: center;">
              <span style="background-color:${param.color}; width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 8px;"></span>
              <span>${param.seriesName}:</span>
              <span style="margin-left: auto; font-weight: bold;">${value} VND</span>
            </li>`;
          });
          tooltipHtml += `</ul></div>`;
          return tooltipHtml;
        }
      },
      legend: {
        data: categories,
        top: 'top',
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: months,
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => `${(value / 1000000).toFixed(2)}M`
        }
      },
      series: series,
    };
  };

  return (
    <Row gutter={[16, 16]}>
      <Col span={24}>
        <Card title="Báo cáo doanh thu chi tiết">
          <Form onFinish={onRevenueFinish} layout="inline" style={{ marginBottom: 24 }}>
            <Form.Item name="startMonth" label="Từ tháng" rules={[{ required: true }]}>
              <DatePicker.MonthPicker 
                onChange={(date) => setStartMonth(date)}
                disabledDate={(current) => 
                  (establishmentDate && current.isBefore(establishmentDate, 'month')) || current.isAfter(dayjs(), 'month')
                }
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

          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={8}>
              <Statistic title="Tổng Doanh Thu" value={periodTotals.fees || 0} precision={0} suffix="VND" />
            </Col>
            <Col span={8}>
              <Statistic title="Chi phí vận hành" value={periodTotals.salaries || 0} precision={0} suffix="VND" />
            </Col>
            <Col span={8}>
              <Statistic title="Lợi nhuận" value={periodTotals.profit || 0} precision={0} suffix="VND" />
            </Col>
          </Row>

          {chartData.length > 0 && (
            <ReactECharts option={getChartOptions(chartData)} style={{ height: 400 }} />
          )}
        </Card>
      </Col>
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