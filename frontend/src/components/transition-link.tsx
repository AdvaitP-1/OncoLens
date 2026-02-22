"use client"

import React from "react"
import { useTransitionContext } from "@/context/transition-context"
import type { LinkProps } from "next/link"
import type { AnchorHTMLAttributes, ReactNode } from "react"
import { usePathname } from "next/navigation"
import { gsap } from "gsap"
import { ScrollToPlugin } from "gsap/ScrollToPlugin"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollToPlugin)
}

type TransitionLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string
  children: ReactNode
}

export function TransitionLink({ href, children, ...props }: TransitionLinkProps) {
  const { playTransition } = useTransitionContext()
  const pathname = usePathname()

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const hrefStr = href
    const targetPath = hrefStr.split("#")[0]
    const targetHash = hrefStr.split("#")[1]

    if ((targetPath === "" || targetPath === pathname) && targetHash) {
      e.preventDefault()
      const targetElement = document.getElementById(targetHash)
      if (targetElement) {
        gsap.to(window, {
          duration: 1.2,
          scrollTo: { y: targetElement, offsetY: 100 },
          ease: "power2.inOut",
        })
      }
      return
    }

    if (hrefStr !== pathname) {
      e.preventDefault()
      playTransition(hrefStr)
    }
  }

  return (
    <a href={href} onClick={handleClick} {...props}>
      {children}
    </a>
  )
}
