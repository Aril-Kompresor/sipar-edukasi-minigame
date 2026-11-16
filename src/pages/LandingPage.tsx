import React from 'react';
import { HeroSection } from '../components/HeroSection';
import { MateriPreview } from '../components/MateriPreview';

export const LandingPage: React.FC = () => {
  return (
    <main>
      <HeroSection />
      <MateriPreview />
    </main>
  );
};
