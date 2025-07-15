export interface Category {
  id: number
  name: string
  slug: string
}

export interface MenuItem {
  id: number
  name: string
  price: number
  image: string
  category: Category
  quantity: number
  note?: string
  description: string;
}
