'use client';

import { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Spin, Alert, Typography, DatePicker, Button, Space, Tooltip } from 'antd';
import { UserOutlined, MedicineBoxOutlined, DollarCircleOutlined, AreaChartOutlined, BarChartOutlined, PieChartOutlined, ScheduleOutlined, BugOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';
import dayjs, { Dayjs } from 'dayjs';

const ReactECharts = dynamic(() => import('echarts-for-react').then(mod => mod.default), { ssr: false });

const { Title } = Typography;

const ManagerDashboard = () => {
    const [kpis, setKpis] = useState<any>(null);
    const [revenueChart, setRevenueChart] = useState<any[]>([]);
    const [specialtyChart, setSpecialtyChart] = useState<any[]>([]);
    const [patientsChart, setPatientsChart] = useState<any[]>([]);
    const [onCallDutyChart, setOnCallDutyChart] = useState<any[]>([]);
    const [topDiseasesChart, setTopDiseasesChart] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [onCallDutyMonth, setOnCallDutyMonth] = useState<Dayjs>(dayjs());
    const [topDiseasesMonth, setTopDiseasesMonth] = useState<Dayjs>(dayjs());
    const [currentPage, setCurrentPage] = useState(1);

    // Initial data fetch for KPIs and page 1
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                setLoading(true);
                const [kpiRes, revenueRes, specialtyRes] = await Promise.all([
                    supabase.rpc('get_manager_dashboard_kpis'),
                    supabase.rpc('get_monthly_revenue_chart_data'),
                    supabase.rpc('get_specialty_appointment_chart_data'),
                ]);

                if (kpiRes.error) throw new Error(`KPIs Error: ${kpiRes.error.message}`);
                if (revenueRes.error) throw new Error(`Revenue Chart Error: ${revenueRes.error.message}`);
                if (specialtyRes.error) throw new Error(`Specialty Chart Error: ${specialtyRes.error.message}`);

                setKpis(kpiRes.data);
                setRevenueChart(revenueRes.data || []);
                setSpecialtyChart(specialtyRes.data || []);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    // Fetch data for page 2
    useEffect(() => {
        if (currentPage !== 2) return;
        const fetchPage2Data = async () => {
            try {
                setLoading(true);
                const topDiseasesStartOfMonth = topDiseasesMonth.startOf('month').format('YYYY-MM-DD');
                const topDiseasesEndOfMonth = topDiseasesMonth.endOf('month').format('YYYY-MM-DD');

                const [patientsRes, topDiseasesRes] = await Promise.all([
                    supabase.rpc('get_new_patients_chart_data'),
                    supabase.rpc('get_top_diseases_chart_data', { start_date: topDiseasesStartOfMonth, end_date: topDiseasesEndOfMonth })
                ]);

                if (patientsRes.error) throw new Error(`Patients Chart Error: ${patientsRes.error.message}`);
                if (topDiseasesRes.error) throw new Error(`Top Diseases Chart Error: ${topDiseasesRes.error.message}`);

                setPatientsChart(patientsRes.data || []);
                setTopDiseasesChart(topDiseasesRes.data || []);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchPage2Data();
    }, [currentPage, topDiseasesMonth]);

    // Fetch data for page 3
    useEffect(() => {
        if (currentPage !== 3) return;
        const fetchPage3Data = async () => {
            try {
                setLoading(true);
                const onCallDutyStartOfMonth = onCallDutyMonth.startOf('month').format('YYYY-MM-DD');
                const onCallDutyEndOfMonth = onCallDutyMonth.endOf('month').format('YYYY-MM-DD');

                const { data, error } = await supabase.rpc('get_doctor_on_call_chart_data', { start_date: onCallDutyStartOfMonth, end_date: onCallDutyEndOfMonth });

                if (error) throw new Error(`On-Call Duty Chart Error: ${error.message}`);

                setOnCallDutyChart(data || []);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchPage3Data();
    }, [currentPage, onCallDutyMonth]);

    const getRevenueChartOptions = () => ({
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: revenueChart.map(d => d.month) },
        yAxis: { type: 'value', axisLabel: { formatter: (value: number) => `${(value / 1000000).toFixed(1)}M` } },
        series: [{ name: 'Doanh thu', type: 'line', smooth: true, data: revenueChart.map(d => d.revenue) }],
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    });

    const getSpecialtyChartOptions = () => ({
        tooltip: { trigger: 'item' },
        legend: { orient: 'vertical', left: 'left' },
        series: [{
            name: 'Lượt khám',
            type: 'pie',
            radius: '50%',
            data: specialtyChart,
            emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' } }
        }]
    });

    const getNewPatientsChartOptions = () => ({
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: patientsChart.map(d => d.month) },
        yAxis: { type: 'value' },
        series: [{ name: 'Bệnh nhân mới', type: 'bar', data: patientsChart.map(d => d.new_patients) }],
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    });

    const getOnCallDutyChartOptions = () => {
        const doctors = Array.from(new Set(onCallDutyChart.map(d => d.doctor_name)));
        const shifts = ['Sáng', 'Chiều', 'Tối'];
        const shiftDurations: { [key: string]: number } = {
            'Sáng': 5,
            'Chiều': 4,
            'Tối': 3
        };

        const series = shifts.map(shift => ({
            name: shift,
            type: 'bar',
            stack: 'total',
            label: {
                show: true,
                formatter: (params: any) => {
                    if (params.value > 0) {
                        return params.value;
                    }
                    return '';
                }
            },
            itemStyle: {
                color: shift === 'Sáng' ? '#faad14' : shift === 'Chiều' ? '#2f54eb' : '#722ed1'
            },
            emphasis: { focus: 'series' },
            data: doctors.map(doctor => {
                const record = onCallDutyChart.find(d => d.doctor_name === doctor && d.shift_type === shift);
                return record ? record.shift_count * shiftDurations[shift] : 0;
            })
        }));

        return {
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                formatter: (params: any) => {
                    let tooltip = `${params[0].name}<br/>`;
                    let totalHours = 0;
                    params.forEach((param: any) => {
                        tooltip += `${param.marker} ${param.seriesName}: ${param.value} giờ<br/>`;
                        totalHours += param.value;
                    });
                    tooltip += `<b>Tổng: ${totalHours} giờ</b>`;
                    return tooltip;
                }
            },
            legend: { data: shifts },
            grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
            xAxis: { type: 'value', name: 'Tổng giờ trực' },
            yAxis: { type: 'category', data: doctors },
            series: series
        };
    };

    const getTopDiseasesChartOptions = () => ({
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        xAxis: { type: 'value', name: 'Số lượng bệnh nhân' },
        yAxis: { type: 'category', data: topDiseasesChart.map(d => d.disease_name).reverse() },
        series: [{
            name: 'Số lượng bệnh nhân',
            type: 'bar',
            data: topDiseasesChart.map(d => d.patient_count).reverse(),
            label: { show: true, position: 'right' }
        }],
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    });

    const renderPage = () => {
        if (loading) {
            return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Spin size="large" /></div>;
        }

        switch (currentPage) {
            case 1:
                return (
                    <Row gutter={[16, 16]}>
                        <Col xs={24} lg={12}>
                            <Card title={<><AreaChartOutlined /> Doanh thu 12 tháng qua</>}>
                                <ReactECharts option={getRevenueChartOptions()} style={{ height: 300 }} />
                            </Card>
                        </Col>
                        <Col xs={24} lg={12}>
                            <Card title={<><PieChartOutlined /> Top 5 chuyên khoa có nhiều lượt khám nhất</>}>
                                <ReactECharts option={getSpecialtyChartOptions()} style={{ height: 300 }} />
                            </Card>
                        </Col>
                    </Row>
                );
            case 2:
                return (
                    <>
                        <Row gutter={[16, 16]}>
                            <Col span={24}>
                                <Card title={<><BarChartOutlined /> Lượng bệnh nhân mới 12 tháng qua</>}>
                                    <ReactECharts option={getNewPatientsChartOptions()} style={{ height: 300 }} />
                                </Card>
                            </Col>
                        </Row>
                        <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
                            <Col span={24}>
                                <Card
                                    title={<><BugOutlined /> Top 10 bệnh có nhiều bệnh nhân nhất</>}
                                    extra={<DatePicker picker="month" value={topDiseasesMonth} onChange={(date) => setTopDiseasesMonth(date || dayjs())} />}
                                >
                                    <ReactECharts option={getTopDiseasesChartOptions()} style={{ height: 400 }} />
                                </Card>
                            </Col>
                        </Row>
                    </>
                );
            case 3:
                return (
                    <Row gutter={[16, 16]}>
                        <Col span={24}>
                            <Card
                                title={<><ScheduleOutlined /> Thống kê lịch trực của bác sĩ</>}
                                extra={<DatePicker picker="month" value={onCallDutyMonth} onChange={(date) => setOnCallDutyMonth(date || dayjs())} />}
                            >
                                <ReactECharts option={getOnCallDutyChartOptions()} style={{ height: 400 }} />
                            </Card>
                        </Col>
                    </Row>
                );
            default:
                return null;
        }
    };

    if (error) {
        return <Alert message="Lỗi tải dữ liệu" description={error} type="error" showIcon />;
    }

    return (
        <div style={{ padding: '24px' }}>
            <Title level={2} style={{ marginBottom: '24px' }}>Tổng quan</Title>
            {currentPage === 1 && (
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} md={12} lg={6}>
                        <Card><Statistic title="Tổng bệnh nhân" value={kpis?.total_patients} prefix={<UserOutlined />} /></Card>
                    </Col>
                    <Col xs={24} sm={12} md={12} lg={6}>
                        <Card><Statistic title="Lượt khám hôm nay" value={kpis?.appointments_today} prefix={<MedicineBoxOutlined />} /></Card>
                    </Col>
                    <Col xs={24} sm={12} md={12} lg={6}>
                        <Card><Statistic title="Tỷ lệ lấp đầy giường" value={kpis?.bed_occupancy_rate} suffix="%" /></Card>
                    </Col>
                    <Col xs={24} sm={12} md={12} lg={6}>
                        <Card><Statistic title="Doanh thu tháng này" value={kpis?.revenue_this_month} suffix="VND" prefix={<DollarCircleOutlined />} /></Card>
                    </Col>
                </Row>
            )}

            <div style={{ marginTop: '24px' }}>
                {renderPage()}
            </div>

            <Row justify="center" style={{ marginTop: '24px' }}>
                <Space>
                    <Tooltip title="Trang trước">
                        <Button aria-label="Trang trước" icon={<LeftOutlined />} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} />
                    </Tooltip>
                    <Typography.Text>Trang {currentPage} / 3</Typography.Text>
                    <Tooltip title="Trang sau">
                        <Button aria-label="Trang sau" icon={<RightOutlined />} onClick={() => setCurrentPage(p => Math.min(3, p + 1))} disabled={currentPage === 3} />
                    </Tooltip>
                </Space>
            </Row>
        </div>
    );
};

export default ManagerDashboard;
