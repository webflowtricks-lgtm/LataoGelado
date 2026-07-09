import { Product, StoreSettings, Category } from './types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "salgados", label: "Salgados", icon: "Flame" },
  { id: "lanches", label: "Lanches", icon: "UtensilsCrossed" },
  { id: "drinks", label: "Drinks", icon: "PartyPopper" },
  { id: "cervejas", label: "Cervejas", icon: "Beer" },
  { id: "vodkas", label: "Vodkas", icon: "Wine" },
  { id: "refrigerantes", label: "Refrigerantes", icon: "GlassWater" }
];

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "Bar & Lanchonete Premium",
  whatsappNumber: "5511999999999", // Editable placeholder
  address: "Av. Paulista, 1000 - Bela Vista, São Paulo - SP",
  deliveryFee: 7.00,
  isOpen: true,
  categories: DEFAULT_CATEGORIES
};

export const INITIAL_PRODUCTS: Product[] = [
  // Salgados
  {
    id: "salgado-1",
    name: "Coxinha de Frango com Catupiry",
    description: "Deliciosa massa dourada recheada com frango desfiado suculento e requeijão cremoso original.",
    price: 8.00,
    category: "salgados",
    image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500&auto=format&fit=crop&q=60",
    available: true,
    order: 1
  },
  {
    id: "salgado-2",
    name: "Bolinha de Queijo",
    description: "Massa leve crocante frita por fora e recheada com bastante queijo muçarela derretido e orégano.",
    price: 7.50,
    category: "salgados",
    image: "https://images.unsplash.com/photo-1548340748-6d2b7d7db701?w=500&auto=format&fit=crop&q=60",
    available: true,
    order: 2
  },
  {
    id: "salgado-3",
    name: "Kibe Frito Recheado",
    description: "Kibe de carne moída temperada com hortelã fresco e especiarias, recheado com catupiry cremoso.",
    price: 8.50,
    category: "salgados",
    image: "https://images.unsplash.com/photo-1608897013039-887f21d8c804?w=500&auto=format&fit=crop&q=60",
    available: true,
    order: 3
  },

  // Lanches
  {
    id: "lanche-1",
    name: "X-Burguer Artesanal",
    description: "Pão de brioche tostado na manteiga, blend bovino artesanal de 150g, queijo cheddar duplo e maionese artesanal da casa.",
    price: 22.00,
    category: "lanches",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60",
    available: true,
    order: 1
  },
  {
    id: "lanche-2",
    name: "X-Salada Premium",
    description: "Pão de brioche, blend de 150g, queijo prato derretido, alface americana fresca, tomate maduro fatiado e molho especial.",
    price: 26.00,
    category: "lanches",
    image: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&auto=format&fit=crop&q=60",
    available: true,
    order: 2
  },
  {
    id: "lanche-3",
    name: "Duplo Bacon Cheddar",
    description: "Para quem tem fome: 2x blends de 150g, fatias generosas de bacon super crocante, queijo cheddar derretido e barbecue.",
    price: 34.00,
    category: "lanches",
    image: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=500&auto=format&fit=crop&q=60",
    available: true,
    order: 3
  },

  // Drinks
  {
    id: "drink-1",
    name: "Caipirinha Clássica",
    description: "A clássica caipirinha brasileira feita com cachaça artesanal envelhecida, limão taiti, açúcar e muito gelo moído.",
    price: 18.00,
    category: "drinks",
    image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60",
    available: true,
    order: 1
  },
  {
    id: "drink-2",
    name: "Gin Tônica Tropical",
    description: "Gin premium, água tônica gelada, rodelas de laranja desidratada e um toque adocicado de polpa de maracujá fresco.",
    price: 24.00,
    category: "drinks",
    image: "https://images.unsplash.com/photo-1574085733277-851d9d856a3a?w=500&auto=format&fit=crop&q=60",
    available: true,
    order: 2
  },
  {
    id: "drink-3",
    name: "Moscow Mule Clássico",
    description: "Vodka premium, suco fresco de limão, xarope de açúcar e a famosa espuma cremosa artesanal de gengibre.",
    price: 28.00,
    category: "drinks",
    image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60",
    available: true,
    order: 3
  },

  // Cervejas
  {
    id: "cerveja-1",
    name: "Heineken Long Neck 330ml",
    description: "A autêntica cerveja premium lager holandesa, trincando de gelada.",
    price: 10.00,
    category: "cervejas",
    image: "https://images.unsplash.com/photo-1600788886242-5c96aabe3757?w=500&auto=format&fit=crop&q=60",
    available: true,
    order: 1
  },
  {
    id: "cerveja-2",
    name: "Corona Extra 330ml",
    description: "Cerveja mexicana super leve e refrescante, servida fria com uma fatia de limão taiti.",
    price: 10.00,
    category: "cervejas",
    image: "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=500&auto=format&fit=crop&q=60",
    available: true,
    order: 2
  },
  {
    id: "cerveja-3",
    name: "Stella Artois 330ml",
    description: "Lager premium belga de aroma suave e sabor balanceado com amargor agradável.",
    price: 9.00,
    category: "cervejas",
    image: "https://images.unsplash.com/photo-1566633806327-68e152aaf26d?w=500&auto=format&fit=crop&q=60",
    available: true,
    order: 3
  },

  // Vodkas
  {
    id: "vodka-1",
    name: "Dose de Absolut",
    description: "Uma dose (50ml) da clássica vodka premium sueca Absolut, servida com ou sem gelo.",
    price: 16.00,
    category: "vodkas",
    image: "https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=500&auto=format&fit=crop&q=60",
    available: true,
    order: 1
  },
  {
    id: "vodka-2",
    name: "Dose de Cîroc Red Berry",
    description: "Uma dose (50ml) da sofisticada vodka francesa destilada de uvas, saborizada com frutas vermelhas.",
    price: 22.00,
    category: "vodkas",
    image: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=500&auto=format&fit=crop&q=60",
    available: true,
    order: 2
  },
  {
    id: "vodka-3",
    name: "Garrafa de Smirnoff 998ml",
    description: "Garrafa fechada de vodka Smirnoff clássica, ideal para dividir com os amigos na mesa.",
    price: 49.00,
    category: "vodkas",
    image: "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=500&auto=format&fit=crop&q=60",
    available: true,
    order: 3
  },

  // Refrigerantes
  {
    id: "refri-1",
    name: "Coca-Cola Lata 350ml",
    description: "Sabor original trincando de gelada para acompanhar seu lanche ou salgado.",
    price: 6.00,
    category: "refrigerantes",
    image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=60",
    available: true,
    order: 1
  },
  {
    id: "refri-2",
    name: "Guaraná Antarctica Lata 350ml",
    description: "O refrigerante com o sabor único e original da Amazônia, servido super gelado.",
    price: 5.50,
    category: "refrigerantes",
    image: "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=500&auto=format&fit=crop&q=60",
    available: true,
    order: 2
  },
  {
    id: "refri-3",
    name: "Água Mineral com Gás 500ml",
    description: "Água mineral leve, pura e gaseificada com uma fatia de limão.",
    price: 4.50,
    category: "refrigerantes",
    image: "https://images.unsplash.com/photo-1608885898957-a599fb1b468b?w=500&auto=format&fit=crop&q=60",
    available: true,
    order: 3
  }
];
