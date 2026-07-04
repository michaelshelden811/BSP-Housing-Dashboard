import './globals.css'

export const metadata = {
  title: 'BSP Housing Dashboard',
  description: 'Barbell Saves Project — Housing Financial Dashboard',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#0a0a0a', color: '#e8e8e8', fontFamily: 'system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
