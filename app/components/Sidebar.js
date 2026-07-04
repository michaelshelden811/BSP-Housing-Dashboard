'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'

const navItems = [
  { section: 'Main', links: [
    { href: '/', label: 'Dashboard', icon: '⊞' },
  ]},
  { section: 'Houses', links: [
    { href: '/houses/acoma', label: 'Acoma', icon: '⌂' },
    { href: '/houses/mayberry', label: 'Mayberry', icon: '⌂' },
    { href: '/houses/bell', label: 'Bell', icon: '⌂' },
    { href: '/houses/noah', label: 'Noah', icon: '⌂' },
  ]},
  { section: 'Financials', links: [
    { href: '/expenses', label: 'Expenses', icon: '$' },
    { href: '/receipts', label: 'Supply Runs', icon: '⬆' },
  ]},
  { section: 'Team', links: [
    { href: '/peers', label: 'Peers', icon: '◉' },
  ]},
  { section: 'Admin', links: [
    { href: '/settings', label: 'Settings', icon: '⚙' },
  ]},
]

const bottomNavLinks = [
  { href: '/', label: 'Dashboard', icon: '⊞' },
  { href: '/houses/acoma', label: 'Acoma', icon: '⌂' },
  { href: '/houses/mayberry', label: 'Mayberry', icon: '⌂' },
  { href: '/peers', label: 'Peers', icon: '◉' },
  { href: '/expenses', label: 'Expenses', icon: '$' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [isMobile, setIsMobile] = useState(false)
  const [showMore, setShowMore] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (isMobile) {
    return (
      <>
        {/* Spacer so content doesn't hide behind bottom nav */}
        <div style={{ height: 60 }} />

        {/* More menu overlay */}
        {showMore && (
          <div style={{ position: 'fixed', bottom: 60, left: 0, right: 0, background: '#0f0f0f', borderTop: '1px solid #1a1a1a', zIndex: 999, padding: '12px 0' }}>
            {navItems.map(({ section, links }) => (
              <div key={section}>
                <div style={{ padding: '6px 20px 2px', fontSize: 10, color: '#444', textTransform: 'uppercase', letterSpacing: '1px' }}>{section}</div>
                {links.map(({ href, label, icon }) => {
                  const active = pathname === href
                  return (
                    <Link key={href} href={href} onClick={() => setShowMore(false)} style={{ textDecoration: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', fontSize: 14, color: active ? '#5b9cf6' : '#e8e8e8', background: active ? '#161f2e' : 'transparent' }}>
                        <span>{icon}</span>{label}
                      </div>
                    </Link>
                  )
                })}
              </div>
            ))}
          </div>
        )}
        {showMore && <div onClick={() => setShowMore(false)} style={{ position: 'fixed', inset: 0, zIndex: 998 }} />}

        {/* Bottom nav bar */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 60, background: '#0f0f0f', borderTop: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', zIndex: 1000 }}>
          {bottomNavLinks.map(({ href, label, icon }) => {
            const active = pathname === href
            return (
              <Link key={href} href={href} style={{ textDecoration: 'none', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '8px 4px', color: active ? '#5b9cf6' : '#555' }}>
                  <span style={{ fontSize: 16 }}>{icon}</span>
                  <span style={{ fontSize: 9, fontWeight: active ? 600 : 400 }}>{label}</span>
                </div>
              </Link>
            )
          })}
          <div onClick={() => setShowMore(v => !v)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '8px 4px', color: showMore ? '#5b9cf6' : '#555', cursor: 'pointer' }}>
            <span style={{ fontSize: 16 }}>···</span>
            <span style={{ fontSize: 9 }}>More</span>
          </div>
        </div>
      </>
    )
  }

  return (
    <div style={{ width: 200, minWidth: 200, background: '#0f0f0f', borderRight: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', padding: '20px 0', height: '100vh', position: 'sticky', top: 0 }}>
      <div style={{ padding: '0 20px 24px', fontSize: 15, fontWeight: 500, color: '#e8e8e8' }}>
        BSP <span style={{ color: '#5b9cf6' }}>Housing</span>
      </div>
      {navItems.map(({ section, links }) => (
        <div key={section}>
          <div style={{ padding: '8px 20px 4px', fontSize: 10, color: '#444', textTransform: 'uppercase', letterSpacing: '1px' }}>{section}</div>
          {links.map(({ href, label, icon }) => {
            const active = pathname === href
            return (
              <Link key={href} href={href} style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 20px', cursor: 'pointer', fontSize: 13, color: active ? '#5b9cf6' : '#888', background: active ? '#161f2e' : 'transparent', borderLeft: active ? '2px solid #5b9cf6' : '2px solid transparent' }}>
                  <span style={{ fontSize: 14, lineHeight: 1 }}>{icon}</span>
                  {label}
                </div>
              </Link>
            )
          })}
        </div>
      ))}
    </div>
  )
}
