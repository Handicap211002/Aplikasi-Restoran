'use client'
import { FC, useEffect, useState, useRef } from 'react';

interface SuccessModalProps {
  isOpen: boolean
  onClose: () => void
  orderData: {
    roomNumber: string
    customerName: string
    orderType: 'IN_RESTAURANT' | 'DELIVERY_ROOM' | 'TAKE_AWAY'
    paymentMethod: 'CASH' | 'TRANSFER' | 'ROOM_CHARGE'
    items: Array<{
      menuItemId: number
      quantity: number
      price: number
      note?: string
    }>
  }
  totalOrder: number
  totalPrice: number
}

export const SuccessModal: FC<SuccessModalProps> = ({
  isOpen,
  onClose,
  orderData,
  totalOrder,
  totalPrice
}) => {
  const [isSubmitting] = useState(false)
  const [error] = useState<string | null>(null)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white px-6 py-6 rounded-2xl w-full max-w-md text-center relative shadow-2xl border border-gray-200">
        {/* Tampilkan loading saat proses submit */}
        {isSubmitting && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-2xl">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          </div>
        )}

        {/* Tampilkan error jika ada */}
        {error ? (
          <>
            <div className="flex justify-center mb-3">
              <div className="bg-red-500 rounded-full p-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-red-600 mb-2">Order Gagal</h2>
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-8 py-1.5 border-2 border-red-500 text-red-700 font-semibold rounded-full"
            >
              Tutup
            </button>
          </>
        ) : (
          <>
            {/* Tampilan sukses (sama seperti versi lama) */}
            <div className="flex justify-center mb-3">
              <div className="bg-green-500 rounded-full p-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.707a1 1 0 00-1.414-1.414L9 10.172 7.707 8.879a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-blue-900 mb-2">Order successful</h2>

            <div className="text-sm text-gray-900 mb-4 leading-6">
              <div>Order &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Number Room {orderData.roomNumber}</div>
              <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Name {orderData.customerName}</div>
            </div>

            <p className="text-sm text-gray-700 leading-5 mb-4">
              Please wait for your order for about 15-20 minutes<br />
              <span className="font-semibold">Thank you & enjoy.</span>
            </p>

            <div className="text-sm text-gray-900 mb-6">
              <div className="mb-1">Total &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {totalOrder} Order</div>
              <div>Jumlah Uang &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: Rp. {totalPrice.toLocaleString()}</div>
            </div>

            <button
              onClick={onClose}
              className="px-8 py-1.5 border-2 border-blue-500 text-blue-700 font-semibold rounded-full hover:bg-gradient-to-r hover:from-cyan-500 hover:to-blue-700 hover:text-white transition"
            >
              FINISH
            </button>
          </>
        )}
      </div>
    </div>
  )
}