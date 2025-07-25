﻿export interface Category {
  id: number
  name: string
  slug: string
}

export interface MenuItem {
  id: number
  name: string
  price: number
  stock: number
  image: string
  category: Category
  quantity: number
  note?: string
   categoryId: number;
  description: string;
}
