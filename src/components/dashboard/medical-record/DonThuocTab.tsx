"use client";

import { useState, useEffect, useCallback } from "react";
import { message, Tag, Table } from "antd";
import { supabase } from "@/lib/supabase";

const DonThuocTab = ({ record_id }: { record_id: number }) => {
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPrescriptions = useCallback(async () => {
    setLoading(true);
    // First, get all appointment IDs for the current medical record
    const { data: appointmentData, error: appointmentError } = await supabase
      .from("lich_kham")
      .select("id_lich_kham")
      .eq("id_ho_so", record_id);

    if (appointmentError || !appointmentData || appointmentData.length === 0) {
      if (appointmentError)
        message.error(
          "Lỗi khi tải lịch khám của hồ sơ: " + appointmentError.message
        );
      setPrescriptions([]);
      setLoading(false);
      return;
    }
    const appointmentIds = appointmentData.map((a) => a.id_lich_kham);

    // Then, get prescriptions for those appointments
    const { data, error } = await supabase
      .from("don_thuoc")
      .select(
        `
                *,
                lich_kham:id_lich_kham(
                    bac_si:id_bac_si_phu_trach(
                        tai_khoan!inner(ho_ten)
                    )
                ),
                chi_tiet_don_thuoc(
                    *,
                    thuoc:id_thuoc(
                        ten_thuoc,
                        don_vi_tinh
                    )
                )
            `
      )
      .in("id_lich_kham", appointmentIds)
      .order("thoi_gian_ke_don", { ascending: false });

    if (error) {
      message.error("Lỗi khi tải danh sách đơn thuốc: " + error.message);
    } else {
      setPrescriptions(data || []);
    }
    setLoading(false);
  }, [record_id]);

  useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  const expandedRowRender = (record: any) => {
    const detailColumns = [
      {
        title: "Tên thuốc",
        dataIndex: ["thuoc", "ten_thuoc"],
        key: "ten_thuoc",
      },
      { title: "Số lượng", dataIndex: "so_luong", key: "so_luong" },
      {
        title: "Đơn vị",
        dataIndex: ["thuoc", "don_vi_tinh"],
        key: "don_vi_tinh",
      },
      { title: "Liều dùng", dataIndex: "lieu_dung", key: "lieu_dung" },
    ];
    return (
      <Table
        columns={detailColumns}
        dataSource={record.chi_tiet_don_thuoc}
        pagination={false}
        rowKey="id_chi_tiet_don_thuoc"
      />
    );
  };

  const mainColumns = [
    {
      title: "Mã đơn",
      dataIndex: "id_don_thuoc",
      key: "id_don_thuoc",
      render: (id: number) => `#${id}`,
    },
    {
      title: "Ngày kê đơn",
      dataIndex: "thoi_gian_ke_don",
      key: "thoi_gian_ke_don",
      render: (ts: string) => new Date(ts).toLocaleString("vi-VN"),
    },
    {
      title: "Bác sĩ kê đơn",
      dataIndex: ["lich_kham", "bac_si", "tai_khoan", "ho_ten"],
      key: "bac_si",
    },
    {
      title: "Trạng thái",
      dataIndex: "trang_thai_don_thuoc",
      key: "trang_thai",
      render: (status: string) => <Tag>{status}</Tag>,
    },
  ];

  return (
    <Table
      columns={mainColumns}
      dataSource={prescriptions}
      loading={loading}
      rowKey="id_don_thuoc"
      expandable={{ expandedRowRender }}
      size="small"
    />
  );
};

export default DonThuocTab;
