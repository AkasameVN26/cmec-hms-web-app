"use client";

import { Layout } from "antd";

const { Footer: AntFooter } = Layout;

// TODO: [Bình] - Implement full footer with links, maps, and contact info
export default function Footer() {
  return (
    <AntFooter style={{ textAlign: "center", background: "#f0f2f5" }}>
      CMEC ©{new Date().getFullYear()} - Phát triển bởi Aura Farmers
    </AntFooter>
  );
}
