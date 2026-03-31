'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function LandingHero() {
  return (
    <section className="landing-hero">
      {/* Full-screen video background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/hero-video.mp4" type="video/mp4" />
      </video>

      {/* Dark gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/20" />

      {/* Additional vignette overlay for cinematic depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,black/50_100%)]" />

      {/* Content overlaid on video */}
      <div className="relative z-10 min-h-screen min-h-[100dvh] flex flex-col justify-center px-8 md:px-16 lg:px-24">
        <div className="max-w-3xl">
          {/* Brand text */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-sm md:text-base text-white/40 font-medium tracking-wide mb-4"
          >
            lumma
          </motion.p>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight text-white leading-tight"
          >
            Delightful events
            <br />
            <span className="text-gradient-landing">start here.</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg md:text-xl lg:text-2xl text-white/70 max-w-xl mt-6 leading-relaxed"
          >
            Set up an event page, invite friends and sell tickets. Host a memorable event today.
          </motion.p>

          {/* CTA button */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-row gap-4 mt-10"
          >
            <Link
              href="/create-event"
              className="border border-white/30 text-white px-8 py-3.5 rounded-xl font-semibold text-base hover:bg-white/5 hover:border-white/50 transition-all duration-200 flex items-center gap-2 backdrop-blur-sm"
            >
              Create Your First Event
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Bottom gradient fade for seamless transition */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#131517] to-transparent pointer-events-none" />
    </section>
  );
}
