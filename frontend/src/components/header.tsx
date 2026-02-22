"use client"

import { useState } from "react"
import { TransitionLink } from "./transition-link"
import { motion, AnimatePresence } from "framer-motion"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { useRef } from "react"
import { Menu, X } from "lucide-react"

export function Header() {
  const headerRef = useRef(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useGSAP(() => {
    gsap.from(headerRef.current, {
      y: -100,
      opacity: 0,
      duration: 1,
      ease: "power2.out",
      delay: 2,
      force3D: true,
    })
  }, [])

  return (
    <motion.header ref={headerRef} className="fixed top-0 left-0 right-0 z-50 p-4">
      <div className="container mx-auto flex justify-between items-center bg-black/20 backdrop-blur-md p-4 rounded-full">
        <TransitionLink href="/" className="text-white font-bold text-xl">
          OncoLens
        </TransitionLink>
        <nav className="hidden md:flex items-center gap-6 text-white">
          <TransitionLink href="/new-case" className="hover:text-neutral-300 transition-colors">
            New Case
          </TransitionLink>
          <TransitionLink href="/benchmark" className="hover:text-neutral-300 transition-colors">
            Benchmark
          </TransitionLink>
        </nav>
        <div className="flex items-center gap-3">
          <TransitionLink href="/new-case" className="hidden md:block">
            <motion.button
              className="bg-white text-black font-semibold py-2 px-5 rounded-full"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Start Demo
            </motion.button>
          </TransitionLink>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-white hover:bg-white/10 rounded-lg"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden mt-2 overflow-hidden"
          >
            <div className="rounded-xl bg-black/40 backdrop-blur-md border border-white/10 p-4 flex flex-col gap-2">
              <TransitionLink
                href="/new-case"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2 text-white hover:bg-white/10 rounded-lg"
              >
                New Case
              </TransitionLink>
              <TransitionLink
                href="/benchmark"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2 text-white hover:bg-white/10 rounded-lg"
              >
                Benchmark
              </TransitionLink>
              <TransitionLink
                href="/new-case"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2 bg-white text-black font-semibold rounded-lg text-center"
              >
                Start Demo
              </TransitionLink>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
