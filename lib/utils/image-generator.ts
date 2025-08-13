// Dynamic image generation utilities to replace static placeholders

export function generateAvatarURL(name: string, size = 200): string {
  // Generate deterministic avatar based on name
  const initials = name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2)

  // Generate consistent color based on name hash
  const hash = name.split("").reduce((acc, char) => {
    return ((acc << 5) - acc + char.charCodeAt(0)) & 0xffffffff
  }, 0)

  const hue = Math.abs(hash) % 360
  const backgroundColor = `hsl(${hue}, 65%, 50%)`
  const textColor = "white"

  // Create SVG avatar
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${backgroundColor}"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.4}" 
            fill="${textColor}" text-anchor="middle" dominant-baseline="central">
        ${initials}
      </text>
    </svg>
  `

  return `data:image/svg+xml;base64,${btoa(svg)}`
}

export function generatePlaceholderImage(
  width: number,
  height: number,
  text?: string,
  backgroundColor = "#f3f4f6",
  textColor = "#6b7280",
): string {
  const displayText = text || `${width}×${height}`
  const fontSize = Math.min(width, height) * 0.1

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${backgroundColor}" stroke="#d1d5db" stroke-width="2"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${fontSize}" 
            fill="${textColor}" text-anchor="middle" dominant-baseline="central">
        ${displayText}
      </text>
    </svg>
  `

  return `data:image/svg+xml;base64,${btoa(svg)}`
}

export function generateChartPlaceholder(width: number, height: number, type: "line" | "bar" | "pie" = "line"): string {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
      <g transform="translate(40, 20)">
        ${
          type === "line"
            ? generateLineChart(width - 80, height - 60)
            : type === "bar"
              ? generateBarChart(width - 80, height - 60)
              : generatePieChart(width - 80, height - 60)
        }
      </g>
      <text x="50%" y="95%" font-family="Arial, sans-serif" font-size="12" 
            fill="#6b7280" text-anchor="middle">
        ${type.charAt(0).toUpperCase() + type.slice(1)} Chart
      </text>
    </svg>
  `

  return `data:image/svg+xml;base64,${btoa(svg)}`
}

function generateLineChart(width: number, height: number): string {
  const points = Array.from({ length: 8 }, (_, i) => {
    const x = (i / 7) * width
    const y = height - (Math.random() * 0.7 + 0.1) * height
    return `${x},${y}`
  }).join(" ")

  return `
    <polyline points="${points}" fill="none" stroke="#3b82f6" stroke-width="2"/>
    ${Array.from({ length: 8 }, (_, i) => {
      const x = (i / 7) * width
      const y = height - (Math.random() * 0.7 + 0.1) * height
      return `<circle cx="${x}" cy="${y}" r="3" fill="#3b82f6"/>`
    }).join("")}
  `
}

function generateBarChart(width: number, height: number): string {
  const barWidth = width / 8
  return Array.from({ length: 6 }, (_, i) => {
    const x = i * barWidth + barWidth * 0.5
    const barHeight = (Math.random() * 0.7 + 0.1) * height
    const y = height - barHeight
    return `<rect x="${x}" y="${y}" width="${barWidth * 0.8}" height="${barHeight}" fill="#3b82f6" rx="2"/>`
  }).join("")
}

function generatePieChart(width: number, height: number): string {
  const centerX = width / 2
  const centerY = height / 2
  const radius = Math.min(width, height) / 3

  const segments = [30, 25, 20, 15, 10]
  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]

  let currentAngle = 0
  return segments
    .map((segment, i) => {
      const angle = (segment / 100) * 360
      const startAngle = currentAngle
      const endAngle = currentAngle + angle
      currentAngle += angle

      const x1 = centerX + radius * Math.cos(((startAngle - 90) * Math.PI) / 180)
      const y1 = centerY + radius * Math.sin(((startAngle - 90) * Math.PI) / 180)
      const x2 = centerX + radius * Math.cos(((endAngle - 90) * Math.PI) / 180)
      const y2 = centerY + radius * Math.sin(((endAngle - 90) * Math.PI) / 180)

      const largeArc = angle > 180 ? 1 : 0

      return `
      <path d="M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z" 
            fill="${colors[i]}" stroke="white" stroke-width="2"/>
    `
    })
    .join("")
}

export function generateSecurityIcon(type: "shield" | "lock" | "key" | "warning", size = 24): string {
  const icons = {
    shield: `<path d="M12 1l9 3v6c0 5.55-3.84 10.74-9 12-5.16-1.26-9-6.45-9-12V4l9-3z"/>`,
    lock: `<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><circle cx="12" cy="7" r="4"/>`,
    key: `<path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4a1 1 0 0 0-1.4 0l-2.1 2.1a1 1 0 0 0 0 1.4Z"/><path d="m21 2-9.6 9.6"/>`,
    warning: `<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="m12 17 .01 0"/>`,
  }

  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      ${icons[type]}
    </svg>
  `

  return `data:image/svg+xml;base64,${btoa(svg)}`
}
