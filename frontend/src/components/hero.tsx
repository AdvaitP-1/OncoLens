"use client"

import { Suspense, useRef } from "react"
import { Canvas } from "@react-three/fiber"
import { motion } from "framer-motion"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { Scene } from "@/components/scene"
import { TransitionLink } from "@/components/transition-link"
import { ArrowRight } from "lucide-react"

export function Hero() {
  const container = useRef(null)

  useGSAP(
    () => {
      const tl = gsap.timeline()
      tl.fromTo(
        ".hero-title span",
        { y: 100, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.08, duration: 1, ease: "power2.out", force3D: true },
      )
        .fromTo(
          ".hero-subtitle",
          { y: 50, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.9, ease: "power2.out", force3D: true },
          "-=0.6",
        )
        .fromTo(
          ".hero-button",
          { scale: 0.9, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.8, ease: "back.out(1.2)", force3D: true },
          "-=0.5",
        )
    },
    { scope: container },
  )

  const title = "OncoLens"
  const splitTitle = title.split("").map((char, i) => (
    <span key={i} className="inline-block overflow-hidden">
      <span className="inline-block">{char}</span>
    </span>
  ))

  return (
    <div ref={container} className="relative w-full h-screen overflow-hidden">
      <div className="absolute inset-0 z-0 isolate">
        <Canvas
          dpr={[1, 2]}
          gl={{ antialias: true, powerPreference: "high-performance", alpha: false }}
          frameloop="always"
        >
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        </Canvas>
      </div>
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-white text-center px-4">
        <h1 className="hero-title font-bold text-5xl md:text-7xl lg:text-8xl mb-6 [will-change:transform]">{splitTitle}</h1>
        <motion.p
          className="hero-subtitle text-lg md:text-xl lg:text-2xl max-w-3xl mb-8 text-neutral-300"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
        >
          Clinical decision support for skin lesion analysis. Combine health data with AI-powered
          image analysis for smarter dermatology workflows.
        </motion.p>
        <TransitionLink href="/new-case">
          <motion.button
            className="hero-button flex items-center gap-2 bg-white text-black font-semibold py-3 px-6 rounded-full transition-transform duration-300"
            whileHover={{ scale: 1.05, transition: { type: "spring", stiffness: 260, damping: 20 } }}
            whileTap={{ scale: 0.95 }}
          >
            Get Started <ArrowRight size={20} />
          </motion.button>
        </TransitionLink>
      </div>
    </div>
  )
}
