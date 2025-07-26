'use client'

import { FC } from 'react'
import { FaTimes, FaCreditCard } from 'react-icons/fa'

interface OrderModalProps {
  isOpen: boolean
  onClose: () => void
  onNext: () => void
  orderData: {
    roomNumber: string
    customerName: string
    orderType: 'IN_RESTAURANT' | 'DELIVERY_ROOM' | 'TAKE_AWAY'
    paymentMethod: 'CASH' | 'TRANSFER' | 'ROOM_CHARGE'
  }
  setOrderData: React.Dispatch<React.SetStateAction<{
    roomNumber: string
    customerName: string
    orderType: 'IN_RESTAURANT' | 'DELIVERY_ROOM' | 'TAKE_AWAY'
    paymentMethod: 'CASH' | 'TRANSFER' | 'ROOM_CHARGE'
  }>>
}

export const OrderModal: FC<OrderModalProps> = ({
  isOpen,
  onClose,
  onNext,
  orderData,
  setOrderData
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl w-[90%] max-w-md shadow-xl space-y-6 relative border border-blue-300">

        {/* Close button */}
        <button onClick={onClose} className="absolute right-4 top-4 text-red-600 text-2xl">
          <FaTimes />
        </button>

        {/* Title */}
        <h2 className="text-3xl font-bold text-center text-blue-900">ORDER ROOM</h2>

        {/* Room Number */}
        <div className="relative">
          <input
            type="tel" // hanya angka + muncul keypad angka di HP
            inputMode="numeric"
            pattern="[0-9]*"
            value={orderData.roomNumber}
            onChange={(e) => setOrderData((prev) => ({ ...prev, roomNumber: e.target.value.replace(/\D/g, '') }))}
            placeholder="Room Number"
            className="w-full border border-gray-300 rounded-lg px-10 py-3 text-sm text-black"
          />
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black-500 text-lg">🏨</span>
        </div>

        {/* Customer Name */}
        <div className="relative">
          <input
            type="text"
            value={orderData.customerName}
            onChange={(e) => setOrderData((prev) => ({ ...prev, customerName: e.target.value }))}
            placeholder="Name"
            className="w-full border border-gray-300 rounded-lg px-10 py-3 text-sm text-black"
          />
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black-500 text-lg">👤</span>
        </div>

        {/* Order Type */}
        <h2 className="text-2xl font-bold text-center text-blue-900">ORDER TYPE</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {['IN_RESTAURANT', 'DELIVERY_ROOM', 'TAKE_AWAY'].map((type) => (
            <button
              key={type}
              onClick={() => setOrderData((prev) => ({ ...prev, orderType: type as any }))}
              className={`px-4 py-2 rounded-full border border-blue-900 text-xs sm:text-xs text-[11px] font-semibold 
                ${orderData.orderType === type
                  ? 'bg-blue-800 text-white'
                  : 'text-blue-900 hover:bg-blue-100'
                } 
                sm:px-4 px-2 sm:py-2 py-1
              `}
            >
              {type === 'IN_RESTAURANT' && 'IN RESTAURANT'}
              {type === 'DELIVERY_ROOM' && 'DELIVERY ROOM'}
              {type === 'TAKE_AWAY' && 'TAKE AWAY FROM RESTAURANT'}
            </button>
          ))}
        </div>

        {/* Note */}
        <p className="text-xs text-gray-500 text-center -mt-2">
          * DELIVERY ROOM ORDER TYPE WILL BE SUBJECT TO AN ADDITIONAL COST OF Rp. 50.000
        </p>

        {/* Payment Button */}
        <button
          onClick={onNext}
          className="w-full flex items-center justify-center bg-blue-700 hover:bg-blue-800 text-white py-3 rounded-full font-bold text-lg space-x-3"
        >
          <FaCreditCard />
          <span>Payment</span>
        </button>
      </div>
    </div>
  )
}
