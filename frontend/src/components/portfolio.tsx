"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { TransitionLink } from "./transition-link"

const features = [
  {
    title: "Wearables + Vision Fusion",
    description: "Combine patient wearables data with dermatoscopic images for a holistic risk assessment.",
    imgSrc: "/images/project-cyberscape.png",
    href: "/new-case",
  },
  {
    title: "DAG Pipeline",
    description: "Transparent decision pipeline with wearables, vision, fusion, and guardrails.",
    imgSrc: "/images/ethereal-threads.png",
    href: "/new-case",
  },
  {
    title: "Gemini-Powered Reasoning",
    description: "AI-generated per-node reasoning, clinician reports, and patient summaries.",
    imgSrc: "/images/quantum-leap.png",
    href: "/new-case",
  },
]

export function Portfolio() {
  return (
    <div id="features" className="relative py-20 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Key Features</h2>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-neutral-400">
          Everything you need for clinical decision support in skin lesion analysis.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
            viewport={{ once: true }}
          >
            <TransitionLink href={feature.href}>
              <div className="group relative block w-full h-[450px] overflow-hidden rounded-lg shadow-lg [transform:translateZ(0)]">
                <Image
                  src={feature.imgSrc || "/placeholder.svg"}
                  fill
                  alt={feature.title}
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out" />
                <div className="absolute bottom-0 left-0 p-6 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 ease-out">
                  <h3 className="text-2xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-neutral-300">{feature.description}</p>
                </div>
              </div>
            </TransitionLink>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
