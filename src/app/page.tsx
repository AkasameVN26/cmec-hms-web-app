import LandingWrapper from "@/components/landing/LandingWrapper";
import LandingHeader from "@/components/landing/LandingHeader";
import Footer from "@/components/Footer";
import HeroSection from "@/components/landing/HeroSection";
import IntroSection from "@/components/landing/IntroSection";
import ServicesSection from "@/components/landing/ServicesSection";
import DoctorSlider from "@/components/landing/DoctorSlider";
import BookingForm from "@/components/landing/BookingForm";
import NewsSection from "@/components/landing/NewsSection";
import Testimonials from "@/components/landing/Testimonials";
import FloatingActions from "@/components/landing/FloatingActions";

export const dynamic = 'force-dynamic';

export default function LandingPage() {
  return (
    <LandingWrapper>
      <div className="flex flex-col min-h-screen">
        <LandingHeader />
        
        <main className="flex-grow">
          {/* Main Hero Section */}
          <HeroSection />

          {/* Introduction & Statistics */}
          <IntroSection />

          {/* Medical Services */}
          <ServicesSection />

          {/* Doctors Carousel */}
          <DoctorSlider />

          {/* Appointment Booking Form */}
          <BookingForm />

          {/* News & Events */}
          <NewsSection />

          {/* Patient Testimonials */}
          <Testimonials />
        </main>

        <Footer />
        <FloatingActions />
      </div>
    </LandingWrapper>
  );
}