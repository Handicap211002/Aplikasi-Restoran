import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { roomNumber, customerName, orderType, paymentMethod, items } = body

    // Validasi data
    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "Item order tidak boleh kosong" },
        { status: 400 }
      )
    }

    // Gunakan transaction untuk atomic operation
    const result = await prisma.$transaction(async (prisma) => {
      // 1. Cek stok semua item dengan query yang benar
      const menuItems = await prisma.menuItem.findMany({
        where: {
          id: { in: items.map((i: any) => i.menuItemId) }
        },
        select: {
          id: true,
          name: true,
          stock: true
        }
      })

      // Validasi stok
      for (const item of items) {
        const menuItem = menuItems.find(mi => mi.id === item.menuItemId)
        if (!menuItem) {
          throw new Error(`Menu item ${item.menuItemId} tidak ditemukan`)
        }
        if (menuItem.stock < item.quantity) {
          throw new Error(`Stok ${menuItem.name} tidak mencukupi`)
        }
      }

      // Hitung total
      const totalOrder = items.length
      const totalPrice = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0)

      // 2. Buat order
      const order = await prisma.order.create({
        data: {
          roomNumber,
          customerName,
          orderType,
          paymentMethod,
          totalOrder,
          totalPrice,
          status: 'SUCCESS',
          orderItems: {
            create: items.map((item: any) => ({
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              price: item.price,
              note: item.note,
            })),
          },
        },
        include: {
          orderItems: true
        }
      })

      for (const item of items) {
        await prisma.menuItem.update({
          where: { id: item.menuItemId },
          data: {
            stock: {
              decrement: item.quantity
            }
          }
        })
      }

      return order
    })

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('[ORDER_ERROR]', error)
    return NextResponse.json(
      { error: error.message || 'Gagal membuat order' },
      { status: 500 }
    )
  }
}