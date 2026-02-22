"use client"

import { useRef } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { TransitionLink } from "./transition-link"
import { ArrowRight } from "lucide-react"

const capabilities = [
  {
    title: "Upload & Analyze",
    excerpt:
      "Upload wearables CSV and skin lesion images, or pick from the HAM10000 dataset. Run the full pipeline in seconds.",
    slug: "/new-case",
  },
  {
    title: "AI-Powered Reasoning",
    excerpt:
      "Gemini provides per-node reasoning for each step of the pipeline—wearables, vision, fusion, and guardrails.",
    slug: "/new-case",
  },
  {
    title: "Clinical Reports",
    excerpt:
      "Get structured clinician reports and patient-friendly summaries to support informed decision-making.",
    slug: "/new-case",
  },
]

export function BlogPreview() {
  const container = useRef(null)

  useGSAP(
    () => {
      gsap.from(".blog-title", {
        scrollTrigger: {
          trigger: container.current,
          start: "top 85%",
        },
        y: 60,
        opacity: 0,
        duration: 1,
        ease: "power2.out",
        force3D: true,
      })

      gsap.from(".blog-post", {
        scrollTrigger: {
          trigger: ".blog-grid",
          start: "top 85%",
        },
        y: 60,
        opacity: 0,
        stagger: 0.15,
        duration: 0.8,
        ease: "power2.out",
        force3D: true,
      })
    },
    { scope: container },
  )

  return (
    <section ref={container} id="how-it-works" className="py-20 md:py-32 bg-[#111]">
      <div className="container mx-auto px-4">
        <h2 className="blog-title text-4xl md:text-6xl font-bold text-center mb-16">
          How It Works
        </h2>
        <div className="blog-grid grid grid-cols-1 md:grid-cols-3 gap-8">
          {capabilities.map((item, index) => (
            <div key={index} className="blog-post bg-[#1a1a1a] p-8 rounded-lg flex flex-col">
              <h3 className="text-2xl font-bold mb-4">{item.title}</h3>
              <p className="text-neutral-400 mb-6 flex-grow">{item.excerpt}</p>
              <TransitionLink
                href={item.slug}
                className="group text-white font-semibold flex items-center gap-2"
              >
                Try It <ArrowRight className="transition-transform group-hover:translate-x-1" size={20} />
              </TransitionLink>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
