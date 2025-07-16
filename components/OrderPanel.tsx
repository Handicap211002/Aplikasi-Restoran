'use client';
import { FC } from 'react';
import { MenuItem } from '@/types';
import Image from 'next/image';

interface OrderPanelProps {
  isOpen: boolean
  orderItems: MenuItem[]
  onClose: () => void
  onIncrease: (index: number) => void
  onDecrease: (index: number) => void
  onRemove: (index: number) => void
  onOrder: () => void // ⬅️ ini yang dulu gak ada makanya error
}


export const OrderPanel: FC<OrderPanelProps> = ({
  isOpen,
  orderItems,
  onClose,
  onIncrease,
  onDecrease,
  onRemove,
  onOrder,
}) => {
  const total = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <>
      {/* Overlay background di mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`w-80 md:w-96 bg-white shadow-2xl h-full transition-transform duration-300
          fixed top-0 right-0 z-40 overflow-y-auto pt-16
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          md:relative md:translate-x-0 md:pt-0`}
      >

        <div className="p-4 flex flex-col h-full justify-between">
          {/* Header */}
          <div>
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                <span className="inline-block w-5 h-5 bg-blue-500 rounded-sm" />
                Order Menu
              </h2>
              <button onClick={onClose} className="text-2xl text-gray-400 hover:text-black">×</button>
            </div>
            <p className="text-sm text-gray-500 mt-1 mb-3">Kiki Beach</p>
            <hr className="border-gray-300" />

            {/* Item list */}
            <div className="mt-4 space-y-3 overflow-y-auto max-h-[60vh] pr-1">
              {orderItems.length === 0 ? (
                <p className="text-center text-gray-400">Silahkan Pilih Menu…</p>
              ) : (
                orderItems.map((item, index) => (
                  <div
                    key={index}
                    className="relative flex items-start border border-blue-400 rounded-lg shadow p-2"
                  >
                    {/* Image */}
                    <div className="w-20 h-20 rounded-lg overflow-hidden mr-3">
                      <Image
                        src={item.image}
                        alt={item.name}
                        width={80}
                        height={80}
                        className="object-cover"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-blue-900 leading-tight">
                        {item.name.toUpperCase()}
                      </h4>
                      <p className="text-sm text-gray-800 leading-tight">
                        Rp. {item.price.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {item.note || 'Tidak ada catatan'}
                      </p>

                      {/* Quantity */}
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => onDecrease(index)}
                          className="w-6 h-6 text-sm font-bold bg-gray-200 text-blue-800 rounded-md"
                        >
                          –
                        </button>
                        <span className="text-sm font-semibold">{item.quantity}</span>
                        <button
                          onClick={() => onIncrease(index)}
                          className="w-6 h-6 text-sm font-bold bg-gray-200 text-blue-800 rounded-md"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => onRemove(index)}
                      className="absolute top-2 right-2 text-white bg-red-500 hover:bg-red-600 w-5 h-5 rounded-full flex items-center justify-center text-xs"
                      title="Hapus item"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4">
            <div className="rounded-xl p-4" style={{ backgroundColor: '#007FAE' }}>
              <div className="flex justify-between text-white text-sm mb-2">
                <span>{orderItems.length} items</span>
                <span className="font-bold text-base">Rp.{total.toLocaleString()}</span>
              </div>
              <button
                disabled={orderItems.length === 0}
                onClick={() => onOrder()} 
                className="w-full bg-white text-sky-700 font-bold py-2 rounded-xl transition hover:bg-gray-100 disabled:opacity-50"
              >
                Order
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};