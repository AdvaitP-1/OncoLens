"use client"

import { Suspense } from "react"
import { Canvas } from "@react-three/fiber"
import { GlowScene } from "./glow-scene"
import { TransitionLink } from "./transition-link"

export function Footer() {
  return (
    <footer className="relative bg-black text-white py-20 overflow-hidden">
      <div className="absolute inset-0 z-0 isolate">
        <Canvas
          dpr={[1, 2]}
          gl={{ antialias: true, powerPreference: "high-performance", alpha: false }}
        >
          <Suspense fallback={null}>
            <GlowScene />
          </Suspense>
        </Canvas>
      </div>
      <div className="relative z-10 container mx-auto px-4 text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-4">Ready to analyze?</h2>
        <p className="text-lg text-neutral-300 mb-8">
          Upload a skin lesion image and wearables data to get AI-powered clinical insights.
        </p>
        <TransitionLink href="/new-case">
          <button className="bg-white text-black font-bold py-4 px-8 rounded-full text-lg transition-transform hover:scale-105">
            Create New Case
          </button>
        </TransitionLink>
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center">
          <p className="text-neutral-400">
            &copy; {new Date().getFullYear()} OncoLens. Clinical decision support demo.
          </p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <a href="#" className="text-neutral-400 hover:text-white">
              GitHub
            </a>
            <a href="#" className="text-neutral-400 hover:text-white">
              Documentation
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
