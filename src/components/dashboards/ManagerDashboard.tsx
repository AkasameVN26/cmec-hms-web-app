'use client';

import { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Spin, Alert, Typography } from 'antd';
import { UserOutlined, MedicineBoxOutlined, DollarCircleOutlined, AreaChartOutlined, BarChartOutlined, PieChartOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';

const ReactECharts = dynamic(() => import('echarts-for-react').then(mod => mod.default), { ssr: false });

const { Title } = Typography;

const ManagerDashboard = () => {
    const [kpis, setKpis] = useState<any>(null);
    const [revenueChart, setRevenueChart] = useState<any[]>([]);
    const [specialtyChart, setSpecialtyChart] = useState<any[]>([]);
    const [patientsChart, setPatientsChart] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                const [kpiRes, revenueRes, specialtyRes, patientsRes] = await Promise.all([
                    supabase.rpc('get_manager_dashboard_kpis'),
                    supabase.rpc('get_monthly_revenue_chart_data'),
                    supabase.rpc('get_specialty_appointment_chart_data'),
                    supabase.rpc('get_new_patients_chart_data')
                ]);

                if (kpiRes.error) throw new Error(`KPIs Error: ${kpiRes.error.message}`);
                if (revenueRes.error) throw new Error(`Revenue Chart Error: ${revenueRes.error.message}`);
                if (specialtyRes.error) throw new Error(`Specialty Chart Error: ${specialtyRes.error.message}`);
                if (patientsRes.error) throw new Error(`Patients Chart Error: ${patientsRes.error.message}`);

                setKpis(kpiRes.data);
                setRevenueChart(revenueRes.data || []);
                setSpecialtyChart(specialtyRes.data || []);
                setPatientsChart(patientsRes.data || []);

            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

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

    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Spin size="large" /></div>;
    }

    if (error) {
        return <Alert message="Lỗi tải dữ liệu" description={error} type="error" showIcon />;
    }

    return (
        <div style={{ padding: '24px' }}>
            <Title level={2} style={{ marginBottom: '24px' }}>Tổng quan</Title>
            <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={12} lg={6}>
                    <Card><Statistic title="Tổng bệnh nhân" value={kpis.total_patients} prefix={<UserOutlined />} /></Card>
                </Col>
                <Col xs={24} sm={12} md={12} lg={6}>
                    <Card><Statistic title="Lượt khám hôm nay" value={kpis.appointments_today} prefix={<MedicineBoxOutlined />} /></Card>
                </Col>
                <Col xs={24} sm={12} md={12} lg={6}>
                    <Card><Statistic title="Tỷ lệ lấp đầy giường" value={kpis.bed_occupancy_rate} suffix="%" /></Card>
                </Col>
                <Col xs={24} sm={12} md={12} lg={6}>
                    <Card><Statistic title="Doanh thu tháng này" value={kpis.revenue_this_month} suffix="VND" prefix={<DollarCircleOutlined />} /></Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
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

            <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
                <Col span={24}>
                    <Card title={<><BarChartOutlined /> Lượng bệnh nhân mới 12 tháng qua</>}>
                        <ReactECharts option={getNewPatientsChartOptions()} style={{ height: 300 }} />
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default ManagerDashboard;
