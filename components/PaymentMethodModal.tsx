'use client'
import { FC, useState } from 'react'

interface PaymentMethodModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (method: 'CASH' | 'TRANSFER' | 'ROOM_CHARGE') => void
}

export const PaymentMethodModal: FC<PaymentMethodModalProps> = ({ isOpen, onClose, onSelect }) => {
  const [selectedMethod, setSelectedMethod] = useState<'CASH' | 'TRANSFER' | 'ROOM_CHARGE' | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  if (!isOpen) return null

  const handleSelect = async (method: 'CASH' | 'TRANSFER' | 'ROOM_CHARGE') => {
    setSelectedMethod(method)
    setIsLoading(true)

    setTimeout(() => {
      onSelect(method)
      setIsLoading(false)
    }, 1000) // Delay untuk simulasi proses
  }

  const Spinner = () => (
    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
  )

  const baseClass = 'w-full py-2 sm:py-3 rounded-full font-bold transition'
  const selectedClass = 'text-white bg-gradient-to-r from-cyan-500 to-blue-700'
  const hoverClass = 'hover:text-white hover:bg-gradient-to-r hover:from-cyan-500 hover:to-blue-700'
  const unselectedClass = 'text-blue-700 border-2 border-blue-500 bg-white'

  const getButtonClass = (method: 'CASH' | 'TRANSFER' | 'ROOM_CHARGE') => {
    const isSelected = selectedMethod === method
    return `${baseClass} ${isSelected ? selectedClass : `${unselectedClass} ${hoverClass}`}`
  }

  const renderButtonContent = (method: 'CASH' | 'TRANSFER' | 'ROOM_CHARGE') => {
    const isThisButtonLoading = isLoading && selectedMethod === method
    return isThisButtonLoading ? (
      <div className="flex items-center justify-center gap-2">
        <Spinner />
        <span>Processing...</span>
      </div>
    ) : method === 'ROOM_CHARGE' ? 'ROOM CHARGER' : method
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white px-6 py-8 rounded-2xl w-full max-w-sm shadow-xl text-center relative space-y-5">

        <h2 className="text-xl sm:text-2xl font-bold text-black">Select Payment Method</h2>

        <button
          onClick={() => handleSelect('CASH')}
          className={getButtonClass('CASH')}
          disabled={isLoading}
        >
          {renderButtonContent('CASH')}
        </button>

        <button
          onClick={() => handleSelect('TRANSFER')}
          className={getButtonClass('TRANSFER')}
          disabled={isLoading}
        >
          {renderButtonContent('TRANSFER')}
        </button>

        <button
          onClick={() => handleSelect('ROOM_CHARGE')}
          className={getButtonClass('ROOM_CHARGE')}
          disabled={isLoading}
        >
          {renderButtonContent('ROOM_CHARGE')}
        </button>

        <button
          onClick={onClose}
          className="text-black hover:underline text-sm flex items-center justify-center gap-1 pt-2"
          disabled={isLoading}
        >
          ← Back
        </button>
      </div>
    </div>
  )
}
