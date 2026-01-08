'use client';

import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { GithubButton } from './GithubButton';

interface HeroProps {
  onGetStarted: () => void;
}

const exampleProfiles = [
  {
    id: '915480322328649758',
    name: 'Example Profile',
    description: 'Showcase your Discord presence',
  },
  {
    id: '915480322328649758',
    name: 'Developer Profile',
    description: 'Perfect for GitHub READMEs',
  },
  {
    id: '915480322328649758',
    name: 'Portfolio Integration',
    description: 'Embed in your website',
  },
];

export function Hero({ onGetStarted }: HeroProps) {
  const [currentExample, setCurrentExample] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentExample((prev) => (prev + 1) % exampleProfiles.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      className={`relative min-h-[85vh] flex flex-col items-center justify-center px-4 py-20 overflow-hidden transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      aria-label="Hero section"
    >
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#09090B] via-[#0a0a0f] to-[#09090B] pointer-events-none" />

      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#5865F2]/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00d9ff]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto text-center">
        {/* Main heading */}
        <h1
          className={`text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 transition-all duration-1000 delay-200 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}
        >
          Create Beautiful
          <span className="block bg-gradient-to-r from-[#5865F2] via-[#00d9ff] to-[#5865F2] bg-clip-text text-transparent animate-gradient">
            Discord Profile Cards
          </span>
        </h1>

        {/* Subtitle */}
        <p
          className={`text-lg md:text-xl text-zinc-400 mb-12 max-w-2xl mx-auto transition-all duration-1000 delay-400 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}
        >
          Generate stunning Discord profile cards for your README, portfolio, or website.
          Real-time preview, fully customizable, and ready to embed.
        </p>

        {/* CTA Button */}
        <button
          onClick={onGetStarted}
          className={`group relative px-8 py-4 bg-gradient-to-r from-[#5865F2] to-[#00d9ff] text-white font-semibold rounded-xl shadow-lg shadow-[#5865F2]/25 hover:shadow-xl hover:shadow-[#5865F2]/40 transition-all duration-300 hover:scale-105 mb-8 transition-all duration-1000 delay-600 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}
          aria-label="Get started with Discord profile generator"
        >
          <span className="relative z-10">Get Started</span>
          <div className="absolute inset-0 bg-gradient-to-r from-[#00d9ff] to-[#5865F2] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </button>

        <div
          className={`flex justify-center mb-16 transition-all duration-1000 delay-700 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}
        >
          <GithubButton />
        </div>

        {/* Animated Profile Preview Cards */}
        <div
          className={`relative w-full max-w-4xl mx-auto transition-all duration-1000 delay-800 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
            }`}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {/* Floating profile card examples */}
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className={`relative rounded-2xl border border-white/10 bg-gradient-to-br from-[#0d0e13]/80 to-[#050505]/80 backdrop-blur-xl p-4 shadow-2xl transform transition-all duration-700 hover:scale-105 hover:shadow-[#5865F2]/20 hover:shadow-2xl ${index === 1 ? 'md:-translate-y-4' : ''
                  }`}
                style={{
                  animationDelay: `${index * 200}ms`,
                  animation: 'float 6s ease-in-out infinite',
                }}
              >
                <div className="aspect-[380/500] rounded-xl bg-gradient-to-br from-zinc-900/50 to-zinc-800/30 border border-white/5 flex items-center justify-center overflow-hidden relative">
                  {/* Animated gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#5865F2]/10 via-transparent to-[#00d9ff]/10 animate-pulse" />

                  {/* Mock profile card content */}
                  <div className="text-center text-zinc-400 p-4 relative z-10">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-[#5865F2]/30 to-[#00d9ff]/30 flex items-center justify-center border-2 border-white/10">
                      <svg className="w-6 h-6 text-[#5865F2]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.016a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.65a.061.061 0 0 0-.031-.03zM8.02 15.33a1.125 1.125 0 0 1-1.06-1.048 1.106 1.106 0 0 1 1.048-1.06 1.124 1.124 0 0 1 1.06 1.047 1.1 1.1 0 0 1-1.048 1.06zm7.975 0a1.125 1.125 0 0 1-1.06-1.048 1.106 1.106 0 0 1 1.048-1.06 1.124 1.124 0 0 1 1.06 1.047 1.1 1.1 0 0 1-1.048 1.06z" />
                      </svg>
                    </div>
                    <div className="h-3 w-24 mx-auto mb-2 bg-zinc-700/50 rounded" />
                    <div className="h-2 w-16 mx-auto mb-3 bg-zinc-700/30 rounded" />
                    <div className="flex gap-1 justify-center mb-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="w-4 h-4 rounded bg-zinc-700/30" />
                      ))}
                    </div>
                    <div className="h-2 w-full mb-1 bg-zinc-700/20 rounded" />
                    <div className="h-2 w-3/4 mx-auto bg-zinc-700/20 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-6 h-6 text-zinc-500" aria-hidden="true" />
        </div>
      </div>

      <style jsx>{`
        @keyframes gradient {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          33% {
            transform: translateY(-10px) rotate(1deg);
          }
          66% {
            transform: translateY(5px) rotate(-1deg);
          }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          * {
            animation: none !important;
          }
        }
      `}</style>
    </section>
  );
}

