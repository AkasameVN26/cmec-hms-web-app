"use client";

import { useEffect } from "react";
// import AOS from 'aos';
// import 'aos/dist/aos.css';

// TODO: [Duy] - Initialize AOS/Animation library here
// TODO: [Duy] - Handle global landing page state if needed
export default function LandingWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // AOS.init({
    //   duration: 1000,
    //   once: true,
    // });
  }, []);

  return <div className="landing-wrapper">{children}</div>;
}
