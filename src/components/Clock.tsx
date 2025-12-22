'use client';

import { useState, useEffect } from "react";
import { Typography } from "antd";

const { Text } = Typography;

const Clock = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => { setCurrentTime(new Date()); }, 1000);
    return () => { clearInterval(timer); };
  }, []);

  const formatDateTime = (date: Date) => {
    const weekdays = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}, ${weekdays[date.getDay()]}, ngày ${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <Text style={{ color: 'white', fontSize: '14px' }}>{formatDateTime(currentTime)}</Text>
    </div>
  );
};

export default Clock;
