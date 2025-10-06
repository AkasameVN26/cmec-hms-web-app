"use client";
import React from "react";
import { ConfigProvider } from "antd";
import { AntdRegistry } from "@ant-design/nextjs-registry";

const AntdProvider = ({ children }: { children: React.ReactNode }) => (
  <AntdRegistry>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#2997D4",
        },
      }}
    >
      {children}
    </ConfigProvider>
  </AntdRegistry>
);

export default AntdProvider;
