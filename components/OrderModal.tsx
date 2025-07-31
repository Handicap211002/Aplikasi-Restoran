'use client'

import { FC } from 'react'
import { FaTimes, FaCreditCard } from 'react-icons/fa'

type OrderType = 'IN_RESTAURANT' | 'DELIVERY_ROOM' | 'TAKE_AWAY'
type PaymentMethod = 'CASH' | 'TRANSFER' | 'ROOM_CHARGE'

interface OrderModalProps {
  isOpen: boolean
  onClose: () => void
  onNext: () => void
  orderData: {
    roomNumber: string
    customerName: string
    orderType: OrderType
    paymentMethod: PaymentMethod
    isPreOrder: boolean
    scheduledAt: string | null // ISO string (UTC) atau null
  }
  setOrderData: React.Dispatch<React.SetStateAction<{
    roomNumber: string
    customerName: string
    orderType: OrderType
    paymentMethod: PaymentMethod
    isPreOrder: boolean
    scheduledAt: string | null
  }>>
}

/** Ambil "HH:mm" dari ISO string (local time) */
function isoToHHmm(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Dari "HH:mm" → ISO string (UTC) untuk next occurrence (hari ini jika >= sekarang, kalau lewat → besok) */
function nextOccurrenceISOFromHHmm(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  const now = new Date()
  const target = new Date()
  target.setHours(h, m, 0, 0)
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1)
  }
  return target.toISOString()
}

export const OrderModal: FC<OrderModalProps> = ({
  isOpen,
  onClose,
  onNext,
  orderData,
  setOrderData
}) => {
  if (!isOpen) return null

  const timeValue = orderData.scheduledAt ? isoToHHmm(orderData.scheduledAt) : ''

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl w-[90%] max-w-md shadow-xl space-y-6 relative border border-blue-300">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-black text-2xl"
          aria-label="Close"
        >
          <FaTimes />
        </button>

        {/* Title */}
        <h2 className="text-3xl font-bold text-center text-black">ORDER ROOM</h2>

        {/* Room Number */}
        <div className="relative">
          <input
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            value={orderData.roomNumber}
            onChange={(e) =>
              setOrderData((prev) => ({
                ...prev,
                roomNumber: e.target.value.replace(/\D/g, '')
              }))
            }
            placeholder="Room Number"
            className="w-full border border-black rounded-lg px-10 py-3 text-sm text-black"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-black/70 text-lg">🏨</span>
        </div>

        {/* Customer Name */}
        <div className="relative">
          <input
            type="text"
            value={orderData.customerName}
            onChange={(e) =>
              setOrderData((prev) => ({ ...prev, customerName: e.target.value }))
            }
            placeholder="Name"
            className="w-full border border-black rounded-lg px-10 py-3 text-sm text-black"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-black/70 text-lg">👤</span>
        </div>

        {/* Pre‑order (opsional): hanya pilih JAM */}
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={orderData.isPreOrder}
              onChange={(e) =>
                setOrderData((prev) => ({
                  ...prev,
                  isPreOrder: e.target.checked,
                  scheduledAt: e.target.checked ? prev.scheduledAt : null
                }))
              }
              className="h-4 w-4"
            />
            <span className="text-sm text-black font-medium">Pre‑order (opsional)</span>
          </label>

          {orderData.isPreOrder && (
            <div className="relative">
              <input
                type="time"
                step={60} // presisi menit
                value={timeValue}
                onChange={(e) =>
                  setOrderData((prev) => ({
                    ...prev,
                    scheduledAt: e.target.value
                      ? nextOccurrenceISOFromHHmm(e.target.value)
                      : null
                  }))
                }
                className="w-full border border-black rounded-lg px-10 py-3 text-sm text-black"
                placeholder="Pilih jam (HH:MM)"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                * If left blank, the order is processed now.
              </p>
            </div>
          )}
        </div>

        {/* Order Type */}
        <h3 className="text-2xl font-bold text-center text-black">ORDER TYPE</h3>
        <div className="flex flex-wrap justify-center gap-3">
          {(['IN_RESTAURANT', 'DELIVERY_ROOM', 'TAKE_AWAY'] as OrderType[]).map((type) => (
            <button
              key={type}
              onClick={() => setOrderData((prev) => ({ ...prev, orderType: type }))}
              className={`px-4 py-2 rounded-full border border-black text-[11px] font-semibold ${
                orderData.orderType === type ? 'bg-black text-white' : 'text-black'
              }`}
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

        {/* Payment */}
        <button
          onClick={onNext}
          className="w-full flex items-center justify-center border border-black text-black py-3 rounded-full font-bold text-lg gap-3"
        >
          <FaCreditCard />
          <span>Payment</span>
        </button>
      </div>
    </div>
  )
}
