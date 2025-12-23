'use client';

import { useState, useEffect } from "react";
import { Typography } from "antd";

const { Text } = Typography;

const weekdays = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

const formatDateTime = (date: Date) => {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}, ${weekdays[date.getDay()]}, ngày ${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
};

const Clock = () => {
  // Use string state to avoid object reference changes causing re-renders.
  // Initialize with empty string to avoid hydration mismatch between server and client time.
  const [timeString, setTimeString] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const newTimeString = formatDateTime(now);

      // Only update state if the string has actually changed
      setTimeString(prev => {
        if (prev !== newTimeString) {
          return newTimeString;
        }
        return prev;
      });
    };

    // Initial update
    updateTime();

    // Check every second, but only re-render when text changes (every minute)
    const timer = setInterval(updateTime, 1000);

    return () => { clearInterval(timer); };
  }, []);

  // Use minHeight to prevent layout shift during initial hydration
  return (
    <div style={{ textAlign: 'center', minHeight: '22px' }}>
      <Text style={{ color: 'white', fontSize: '14px' }}>{timeString}</Text>
    </div>
  );
};

export default Clock;
