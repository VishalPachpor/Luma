'use client';

import { motion } from 'framer-motion';

export default function PhoneMockup() {
  return (
    <div className="phone-mockup-perspective relative flex items-center justify-center">
      {/* Dark circular background behind phone */}
      <div className="absolute w-[400px] h-[400px] md:w-[500px] md:h-[500px] lg:w-[600px] lg:h-[600px] rounded-full bg-gradient-radial from-white/[0.03] to-transparent" />

      {/* Phone frame */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="phone-mockup-tilt phone-mockup-glow relative w-[280px] md:w-[340px] lg:w-[380px] aspect-[9/19] bg-[#0a0a0a] rounded-[40px] border-[3px] border-[#2a2a2a] overflow-hidden"
      >
        {/* Notch / Dynamic Island */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-20" />

        {/* Screen content */}
        <div className="absolute inset-2 rounded-[32px] bg-[#131517] overflow-hidden">
          {/* Event card preview */}
          <div className="p-4 pt-10">
            {/* Gradient header bar */}
            <div className="h-20 w-full rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 mb-4" />

            {/* Event title */}
            <h3 className="text-white font-bold text-lg tracking-tight mb-2">
              DJ SET Y2K PARTY
            </h3>

            {/* Location */}
            <p className="text-gray-400 text-xs mb-1">
              Club Fugazi, San Francisco
            </p>

            {/* Date */}
            <p className="text-gray-500 text-xs mb-4">
              Sunday, Jul 23 · 9:00 PM
            </p>

            {/* Guests row */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex -space-x-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 border-2 border-[#131517]" />
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 border-2 border-[#131517]" />
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 border-2 border-[#131517]" />
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 border-2 border-[#131517]" />
              </div>
              <span className="text-gray-400 text-xs">45 Guests</span>
            </div>

            {/* You're In badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-emerald-400 text-xs font-medium">You're In</span>
            </div>
          </div>

          {/* Bottom navigation hint */}
          <div className="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
        </div>
      </motion.div>
    </div>
  );
}
