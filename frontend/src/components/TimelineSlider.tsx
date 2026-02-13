import { useMemo, useState, useCallback } from 'react'
import '../styles/TimelineSlider.css'

interface TimelineSliderProps {
  years: number[]
  currentYear: number | null
  onYearSelect: (year: number) => void
}

const TimelineSlider = ({ years, currentYear, onYearSelect }: TimelineSliderProps) => {
  const [sliderValue, setSliderValue] = useState(0)

  // Calculate year range using useMemo
  const { minYear, maxYear } = useMemo(() => {
    if (years.length === 0) return { minYear: 0, maxYear: 0 }
    const sorted = [...years].sort((a, b) => a - b)
    return { minYear: sorted[0], maxYear: sorted[sorted.length - 1] }
  }, [years])

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(e.target.value)
      setSliderValue(newValue)

      if (!minYear || !maxYear) return

      // Calculate year from slider position
      const yearRange = maxYear - minYear
      const year = Math.round(minYear + (newValue / 100) * yearRange)

      // Snap to nearest available year
      const sortedYears = [...years].sort((a, b) => a - b)
      const nearest = sortedYears.reduce((prev, curr) =>
        Math.abs(curr - year) < Math.abs(prev - year) ? curr : prev
      )

      onYearSelect(nearest)
    },
    [minYear, maxYear, years, onYearSelect]
  )

  // Don't render if no years available
  if (years.length === 0) return null

  return (
    <div className="timeline-slider">
      <div className="timeline-labels">
        <span className="timeline-year">{minYear}</span>
        <span className="timeline-year">{maxYear}</span>
      </div>

      <input
        type="range"
        min="0"
        max="100"
        value={sliderValue}
        onChange={handleSliderChange}
        className="timeline-input"
        aria-label="Year slider"
      />

      <div className="timeline-current">
        <div className="timeline-current-year">
          {currentYear || 'Select year'}
        </div>
      </div>
    </div>
  )
}

export default TimelineSlider
