'use client'
import { FC, useState, useEffect } from 'react'

interface PaymentMethodModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (method: 'CASH' | 'TRANSFER' | 'ROOM_CHARGE') => void
}

export const PaymentMethodModal: FC<PaymentMethodModalProps> = ({ isOpen, onClose, onSelect }) => {
  const [selectedMethod, setSelectedMethod] = useState<'CASH' | 'TRANSFER' | 'ROOM_CHARGE' | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setSelectedMethod(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSelect = (method: 'CASH' | 'TRANSFER' | 'ROOM_CHARGE') => {
    setSelectedMethod(method)
    onSelect(method)
  }

  const baseClass = 'w-full py-2 sm:py-3 rounded-full font-bold transition'
  const selectedClass = 'text-white bg-gradient-to-r from-cyan-500 to-blue-700'
  const hoverClass = 'hover:text-white hover:bg-gradient-to-r hover:from-cyan-500 hover:to-blue-700'
  const unselectedClass = 'text-blue-700 border-2 border-blue-500 bg-white'

  const getButtonClass = (method: 'CASH' | 'TRANSFER' | 'ROOM_CHARGE') => {
    const isSelected = selectedMethod === method
    return `${baseClass} ${isSelected ? selectedClass : `${unselectedClass} ${hoverClass}`}`
  }

  const renderButtonContent = (method: 'CASH' | 'TRANSFER' | 'ROOM_CHARGE') => {
    return method === 'ROOM_CHARGE' ? 'ROOM CHARGER' : method
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 transition-opacity duration-300">
      <div
        className={`
          bg-white px-6 py-8 rounded-2xl w-full max-w-sm shadow-xl text-center relative space-y-5 
          transform transition-all duration-500
          ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}
        `}
      >
        <h2 className="text-xl sm:text-2xl font-bold text-black">Select Payment Method</h2>

        <button
          onClick={() => handleSelect('CASH')}
          className={getButtonClass('CASH')}
        >
          {renderButtonContent('CASH')}
        </button>

        <button
          onClick={() => handleSelect('TRANSFER')}
          className={getButtonClass('TRANSFER')}
        >
          {renderButtonContent('TRANSFER')}
        </button>

        <button
          onClick={() => handleSelect('ROOM_CHARGE')}
          className={getButtonClass('ROOM_CHARGE')}
        >
          {renderButtonContent('ROOM_CHARGE')}
        </button>

        <button
          onClick={onClose}
          className="text-black hover:underline text-sm flex items-center justify-center gap-1 pt-2"
        >
          ← Back
        </button>
      </div>
    </div>
  )
}
