import ClientSection from '@/components/landing/client-section';
import CallToActionSection from '@/components/landing/cta-section';
import { FeaturesSection } from '@/components/landing/features-section';
import HeroSection from '@/components/landing/hero-section';
import PricingSection from '@/components/landing/pricing-section';
import Particles from '@/components/magicui/particles';
import { SphereMask } from '@/components/magicui/sphere-mask';

export const metadata = {
  title: 'Featurize - User Feedback Platform',
  description:
    'Gather and prioritize user feedback to build products that resonate with your audience.',
};

export default async function Page() {
  return (
    <>
      <HeroSection />
      {/* <FeaturesSection /> */}
      {/* <ClientSection /> */}
      {/* <SphereMask /> */}
      {/* <PricingSection /> */}
      <CallToActionSection />
      <Particles
        className="absolute inset-0 -z-10"
        quantity={50}
        ease={70}
        size={0.05}
        staticity={40}
        color={'#ffffff'}
      />
    </>
  );
}
