import React from 'react'

interface FileInputProps {
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export const FileInput: React.FC<FileInputProps> = ({ onChange }) => {
  return (
    <div className="file-input">
      <input type="file" onChange={onChange} />
    </div>
  )
}
