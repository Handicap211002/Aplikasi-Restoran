import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // ⬇️ ambil field tambahan dari body
    const {
      roomNumber,
      customerName,
      orderType,
      paymentMethod,
      items,
      scheduledAt: scheduledAtISO,  // ISO string atau null
      isPreOrder: isPreOrderFromClient, // boolean
    } = body

    // Validasi data
    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Item order tidak boleh kosong' },
        { status: 400 }
      )
    }

    //  normalisasi scheduledAt & flag pre-order
    let scheduledAt: Date | null = null
    if (scheduledAtISO) {
      const d = new Date(scheduledAtISO)
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: 'scheduledAt tidak valid' }, { status: 400 })
      }
      // Opsional: cegah masa lalu di server
      // if (d.getTime() < Date.now()) {
      //   return NextResponse.json({ error: 'Waktu pre-order tidak boleh di masa lalu' }, { status: 400 })
      // }
      scheduledAt = d
    }
    const isPreOrder = scheduledAt ? true : !!isPreOrderFromClient

    // Gunakan transaction untuk atomic operation
    const result = await prisma.$transaction(async (prismaTx) => {
      // 1. Cek stok semua item
      const menuItems = await prismaTx.menuItem.findMany({
        where: { id: { in: items.map((i: any) => i.menuItemId) } },
        select: { id: true, name: true, stock: true },
      })

      for (const item of items) {
        const menuItem = menuItems.find((mi) => mi.id === item.menuItemId)
        if (!menuItem) throw new Error(`Menu item ${item.menuItemId} tidak ditemukan`)
        if (menuItem.stock < item.quantity) {
          throw new Error(`Stok ${menuItem.name} tidak mencukupi`)
        }
      }

      // Hitung total
      const totalOrder = items.length
      const totalPrice = items.reduce(
        (sum: number, item: any) => sum + item.price * item.quantity,
        0
      )

      // 2. Buat order (⬇️ tulis isPreOrder & scheduledAt)
      const order = await prismaTx.order.create({
        data: {
          roomNumber,
          customerName,
          orderType,
          paymentMethod,
          totalOrder,
          totalPrice,
          status: 'SUCCESS', // tetap sesuai alur Anda
          isPreOrder,
          scheduledAt,
          orderItems: {
            create: items.map((item: any) => ({
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              price: item.price,
              note: item.note,
            })),
          },
        },
        include: { orderItems: true },
      })

      // 3. Kurangi stok (tetap seperti sebelumnya)
      for (const item of items) {
        await prismaTx.menuItem.update({
          where: { id: item.menuItemId },
          data: { stock: { decrement: item.quantity } },
        })
      }

      return order
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    console.error('[ORDER_ERROR]', error)
    return NextResponse.json(
      { error: error.message || 'Gagal membuat order' },
      { status: 500 }
    )
  }
}
