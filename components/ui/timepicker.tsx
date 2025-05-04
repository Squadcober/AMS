import React from "react"

interface TimePickerProps {
  id: string
  value: string | null
  onChange: (time: string) => void
  className?: string
}

const TimePicker: React.FC<TimePickerProps> = ({ id, value, onChange, className }) => {
  return (
    <input
      id={id}
      type="time"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    />
  )
}

export { TimePicker }
