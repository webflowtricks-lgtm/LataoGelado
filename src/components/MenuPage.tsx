import React, { useState, useMemo, FormEvent, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  ShoppingBag, 
  X, 
  Plus, 
  Minus, 
  MapPin, 
  Clock, 
  Sparkles, 
  MessageSquare, 
  ChevronRight, 
  ChevronLeft,
  Crown,
  Store, 
  UtensilsCrossed, 
  Flame, 
  Beer, 
  Wine, 
  GlassWater, 
  PartyPopper,
  Pizza,
  Coffee,
  IceCream,
  Soup,
  Candy,
  Cake,
  Cookie,
  Apple,
  Grid
} from 'lucide-react';
import { Product, StoreSettings, CartItem } from '../types';
import { createOrder } from '../dbService';

interface MenuPageProps {
  products: Product[];
  settings: StoreSettings;
  onNavigateToAdmin: () => void;
}

// Utility to format currency
const formatBRL = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const ICON_MAP: Record<string, any> = {
  Flame,
  Beer,
  Wine,
  GlassWater,
  PartyPopper,
  UtensilsCrossed,
  Pizza,
  Coffee,
  IceCream,
  Soup,
  Candy,
  Cake,
  Cookie,
  Apple,
  Grid
};

const PRESET_STYLES = [
  { color: 'from-amber-400 to-orange-500', bg: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  { color: 'from-sky-400 to-blue-500', bg: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
  { color: 'from-purple-400 to-indigo-500', bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  { color: 'from-yellow-400 to-amber-500', bg: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  { color: 'from-pink-400 to-rose-500', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  { color: 'from-red-400 to-red-600', bg: 'bg-red-500/10 text-red-400 border-red-500/20' },
  { color: 'from-emerald-400 to-teal-500', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { color: 'from-fuchsia-400 to-pink-500', bg: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20' },
];

export function getCategoryStyle(id: string, index: number) {
  if (id === 'salgados') return PRESET_STYLES[0];
  if (id === 'refrigerantes') return PRESET_STYLES[1];
  if (id === 'vodkas') return PRESET_STYLES[2];
  if (id === 'cervejas') return PRESET_STYLES[3];
  if (id === 'drinks') return PRESET_STYLES[4];
  if (id === 'lanches') return PRESET_STYLES[5];
  
  return PRESET_STYLES[index % PRESET_STYLES.length];
}

// Compat layer for old imports (will be dynamically computed in actual renders)
export const CATEGORY_MAP = {
  salgados: { label: 'Salgados', icon: Flame, color: 'from-amber-400 to-orange-500', bg: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  refrigerantes: { label: 'Refrigerantes', icon: GlassWater, color: 'from-sky-400 to-blue-500', bg: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
  vodkas: { label: 'Vodkas', icon: Wine, color: 'from-purple-400 to-indigo-500', bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  cervejas: { label: 'Cervejas', icon: Beer, color: 'from-yellow-400 to-amber-500', bg: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  drinks: { label: 'Drinks', icon: PartyPopper, color: 'from-pink-400 to-rose-500', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  lanches: { label: 'Lanches', icon: UtensilsCrossed, color: 'from-red-400 to-red-600', bg: 'bg-red-500/10 text-red-400 border-red-500/20' }
};

export default function MenuPage({ products, settings, onNavigateToAdmin }: MenuPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('todos');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [observations, setObservations] = useState('');
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Dynamic category calculations
  const categoriesList = useMemo(() => {
    return settings.categories || [];
  }, [settings.categories]);

  const categoriesWithProducts = useMemo(() => {
    const list = [...categoriesList];
    
    // Check if there are products with categories not in categoriesList
    const activeCatIds = new Set(list.map(c => c.id));
    const hasOrphaned = products.some(p => !activeCatIds.has(p.category));
    
    if (hasOrphaned) {
      list.push({ id: 'outros', label: 'Outros', icon: 'Grid' });
    }
    
    return list;
  }, [categoriesList, products]);

  const categoryMap = useMemo(() => {
    const map: Record<string, { label: string; icon: any; color: string; bg: string }> = {};
    categoriesWithProducts.forEach((cat, idx) => {
      const style = getCategoryStyle(cat.id, idx);
      map[cat.id] = {
        label: cat.label,
        icon: ICON_MAP[cat.icon] || Grid,
        color: style.color,
        bg: style.bg
      };
    });
    return map;
  }, [categoriesWithProducts]);

  // New states for the immersive mockup-like product detailed view
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [tempQuantity, setTempQuantity] = useState<number>(1);

  // Manual sliding swiping state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  useEffect(() => {
    if (selectedProduct) {
      const currentQty = getProductQuantity(selectedProduct.id);
      setTempQuantity(currentQty > 0 ? currentQty : 1);
    }
  }, [selectedProduct]);

  // Automatic rotating banner state
  const [currentSlide, setCurrentSlide] = useState(0);

  const featuredProducts = useMemo(() => {
    return products.filter((p) => p.featured && p.available);
  }, [products]);

  // Touch Swiping Handlers for manual sliding
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      setCurrentSlide((prev) => (prev + 1) % featuredProducts.length);
    } else if (isRightSwipe) {
      setCurrentSlide((prev) => (prev - 1 + featuredProducts.length) % featuredProducts.length);
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  useEffect(() => {
    setCurrentSlide(0);
  }, [featuredProducts.length]);

  // Cart calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }, [cart]);

  const cartTotalQuantity = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const cartTotalGeral = useMemo(() => {
    return cartSubtotal;
  }, [cartSubtotal]);

  // Cart operations
  const updateQuantity = (product: Product, delta: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === product.id);
      if (existing) {
        const newQty = existing.quantity + delta;
        if (newQty <= 0) {
          return prevCart.filter((item) => item.product.id !== product.id);
        }
        return prevCart.map((item) =>
          item.product.id === product.id ? { ...item, quantity: newQty } : item
        );
      } else if (delta > 0) {
        return [...prevCart, { product, quantity: 1 }];
      }
      return prevCart;
    });
  };

  const getProductQuantity = (productId: string) => {
    const item = cart.find((i) => i.product.id === productId);
    return item ? item.quantity : 0;
  };

  // Filter products by search and category
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = activeCategory === 'todos' || p.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, activeCategory]);

  // Get the active featured product for the rotating banner
  const activeFeatured = useMemo(() => {
    if (featuredProducts.length === 0) return null;
    return featuredProducts[currentSlide] || featuredProducts[0];
  }, [featuredProducts, currentSlide]);

  // Handle WhatsApp Checkout
  const handleCheckout = async (e: FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    // 1. Log order to Firestore
    const orderItems = cart.map((item) => ({
      id: item.product.id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity
    }));

    const orderData = {
      customerName: customerName.trim() || "Cliente Anônimo",
      observations: observations.trim() || "Nenhuma observação",
      items: orderItems,
      total: cartSubtotal,
      deliveryFee: 0,
      grandTotal: cartSubtotal,
      createdAt: new Date().toISOString()
    };

    try {
      await createOrder(orderData);
    } catch (error) {
      console.error("Erro ao registrar pedido no banco:", error);
    }

    // 2. Format WhatsApp Message
    let message = `*Novo Pedido - ${settings.storeName}*\n`;
    message += `------------------------------------\n\n`;
    
    cart.forEach((item) => {
      message += `• *${item.quantity}x* ${item.product.name} - _${formatBRL(item.product.price * item.quantity)}_\n`;
    });

    message += `\n------------------------------------\n`;
    message += `*Total dos Itens:* ${formatBRL(cartSubtotal)}\n`;
    message += `*Taxa de Entrega:* A combinar de acordo com o endereço\n`;
    message += `*Total Geral:* ${formatBRL(cartSubtotal)} + Taxa de Entrega\n\n`;
    
    message += `*Nome do Cliente:* ${customerName.trim() || 'Não informado'}\n`;
    message += `*Observação:* ${observations.trim() || 'Nenhuma'}\n\n`;
    message += `*Endereço de Entrega:* (Favor informar o endereço de entrega completo aqui)\n\n`;
    message += `_Obrigado pela preferência!_`;

    // 3. Open WhatsApp link
    const sanitizedPhone = settings.whatsappNumber.replace(/\D/g, '');
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${sanitizedPhone}&text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');

    // 4. Reset Cart
    setCart([]);
    setCustomerName('');
    setObservations('');
    setIsCartOpen(false);
    setOrderSuccess(true);

    setTimeout(() => {
      setOrderSuccess(false);
    }, 5000);
  };

  return (
    <div className="min-h-screen pb-36 bg-[#0c0c0d] text-white selection:bg-yellow-400 selection:text-black">
      {/* Upper Navigation Row (Matches Header Bar on Left Screen) */}
      <header className="sticky top-0 z-30 bg-[#0c0c0d]/90 backdrop-blur-md border-b border-neutral-900 px-4 py-4.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Store Icon Badge */}
            <div className="w-11 h-11 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800/80 flex items-center justify-center shrink-0 shadow-md">
              <img 
                src="https://i.ibb.co/2wtGGnh/logo2.png" 
                alt="Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div onDoubleClick={onNavigateToAdmin} className="cursor-default" title="Dê duplo clique para o painel">
              <h1 className="text-lg font-display font-black tracking-tight text-white leading-tight">
                {settings.storeName}
              </h1>
              <div className="flex items-center mt-0.5">
                {settings.isOpen ? (
                  <span className="text-xs font-bold text-yellow-400 select-none">
                    @LataoGelado
                  </span>
                ) : (
                  <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/20 select-none">
                    Fechado
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Simple plain text with "Naughty Monster" font, non-interactive (no link styling) */}
          <div 
            onDoubleClick={onNavigateToAdmin}
            className="select-none py-1.5 pr-2 cursor-default"
            title="Dê duplo clique para o painel"
          >
            <span 
              className="text-yellow-400 tracking-wider text-xl sm:text-2xl"
              style={{ fontFamily: '"Naughty Monster", sans-serif' }}
            >
              É só pedir!
            </span>
          </div>
        </div>
      </header>

      {/* Main Layout Container */}
      <main className="max-w-4xl mx-auto px-4 mt-6">
        
        {/* Welcome Section (Mockup Header Profile Style) */}
        <div className="flex justify-center items-center mb-6 text-center">
          <div className="w-full">
            <h2 className="text-4xl font-naughty text-yellow-400 tracking-wider">
              Bem Vindo(a)!
            </h2>
            <p className="text-zinc-400 text-xs font-medium mt-2 max-w-lg mx-auto">
              <strong className="highlight">Aviso importante: </strong>{" "} abrir este cardápio pode dar vontade de pedir tudo. 🍻 Confira nossas bebidas, espetinhos, doces e promoções.
            </p>
          </div> 
        </div>

        {/* Dynamic "Destaque do Dia" Banner (Chicken Baked Card style on Left Screen) */}
        {activeFeatured && (
          <div 
            onClick={() => setSelectedProduct(activeFeatured)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="mb-8 relative overflow-hidden bg-gradient-to-r from-[#17171a] to-[#25252b] border border-neutral-850 rounded-[32px] p-6 pb-12 flex items-center justify-between cursor-pointer hover:border-neutral-700 transition-all hover:shadow-xl group select-none"
          >
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-500/10 rounded-full blur-[60px] pointer-events-none group-hover:bg-yellow-500/15 transition-all" />
            
            <div className="flex-1 pr-4 z-10">
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-yellow-400/10 text-yellow-400 text-[10px] font-black uppercase tracking-widest rounded-full mb-3.5">
                <Sparkles className="w-3 h-3" />
                <span>Destaques do Latão</span>
              </div>
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeFeatured.id}
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="text-xl md:text-2xl font-display font-black text-white leading-tight">
                    {activeFeatured.name}
                  </h3>
                  <p className="text-zinc-400 text-xs font-medium mt-1.5 line-clamp-2 max-w-md">
                    {activeFeatured.description || 'Deliciosa opção em destaque no nosso cardápio! Peça agora mesmo.'}
                  </p>
                  
                  <div className="flex items-center space-x-3 mt-4 text-xs font-semibold text-zinc-300">
                    <span className="text-yellow-400 font-extrabold text-sm px-2.5 py-1 bg-yellow-400/10 rounded-xl border border-yellow-400/20">
                      {formatBRL(activeFeatured.price)}
                    </span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Overlapping Floating Dish Preview */}
            <div className="relative shrink-0 z-10 w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden border-4 border-neutral-800 shadow-2xl transition-transform duration-500 group-hover:scale-105 group-hover:rotate-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeFeatured.id}
                  initial={{ opacity: 0, scale: 0.9, rotate: -15 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.9, rotate: 15 }}
                  transition={{ duration: 0.35 }}
                  className="w-full h-full"
                >
                  {activeFeatured.image ? (
                    <img 
                      src={activeFeatured.image} 
                      alt={activeFeatured.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                      <UtensilsCrossed className="w-8 h-8 text-neutral-600" />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Manual Sliding Left/Right Chevron Buttons */}
            {featuredProducts.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentSlide((prev) => (prev - 1 + featuredProducts.length) % featuredProducts.length);
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/60 hover:bg-black/85 border border-neutral-800/80 text-white rounded-full transition-all cursor-pointer hover:scale-110 active:scale-95 flex items-center justify-center"
                  title="Anterior"
                >
                  <ChevronLeft className="w-4 h-4 text-yellow-400" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentSlide((prev) => (prev + 1) % featuredProducts.length);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/60 hover:bg-black/85 border border-neutral-800/80 text-white rounded-full transition-all cursor-pointer hover:scale-110 active:scale-95 flex items-center justify-center"
                  title="Próximo"
                >
                  <ChevronRight className="w-4 h-4 text-yellow-400" />
                </button>
              </>
            )}

            {/* Pagination Navigation Dots */}
            {featuredProducts.length > 1 && (
              <div className="absolute bottom-3.5 left-6 flex space-x-1.5 z-20">
                {featuredProducts.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentSlide(idx);
                    }}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                      idx === currentSlide ? 'bg-yellow-400 w-4' : 'bg-zinc-600 hover:bg-zinc-400'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Simple WhatsApp Delivery Guidance Pill */}
     

        {/* Floating Success Alert */}
        <AnimatePresence>
          {orderSuccess && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 flex items-center space-x-3 shadow-md"
            >
              <div className="p-1 bg-emerald-500 text-black rounded-full">
                <Plus className="w-4 h-4 rotate-45" />
              </div>
              <div className="flex-1">
                <p className="font-black text-sm">Pedido enviado com sucesso!</p>
                <p className="text-xs text-zinc-300">Seu WhatsApp foi aberto com o pedido formatado para envio.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search & Categories Box (Matches Meal Category layout on Mockup) */}
        <div className="space-y-5 mb-8">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4.5 h-4.5 text-zinc-400 absolute left-4.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="O que você deseja pedir hoje?"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#17171a] border border-neutral-900 hover:border-neutral-800 focus:border-yellow-400 rounded-2xl py-4 pl-12 pr-4 text-xs font-semibold transition-colors outline-hidden text-white placeholder-zinc-500"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 rounded-full cursor-pointer bg-neutral-800"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Scroller ("Meal Category" title + pills) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Categorias</h3>
              <span className="text-[10px] font-bold text-yellow-400 hover:underline cursor-pointer" onClick={() => setActiveCategory('todos')}>Ver Tudo</span>
            </div>
            
            <div className="flex items-center space-x-2.5 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none scroll-smooth">
              <button
                onClick={() => setActiveCategory('todos')}
                className={`px-4.5 py-2.5 rounded-2xl text-xs font-bold border transition-all shrink-0 cursor-pointer ${
                  activeCategory === 'todos'
                    ? 'bg-yellow-400 text-black border-yellow-400 shadow-lg shadow-yellow-500/10 scale-105'
                    : 'bg-[#17171a] text-zinc-400 border-neutral-900 hover:border-neutral-800 hover:text-white'
                }`}
              >
                Todos
              </button>
              
              {categoriesWithProducts.map((cat) => {
                const mapInfo = categoryMap[cat.id];
                if (!mapInfo) return null;
                const IconComponent = mapInfo.icon;
                const isSelected = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-yellow-400 text-black border-yellow-400 shadow-lg shadow-yellow-500/10 scale-105'
                        : 'bg-[#17171a] text-zinc-400 border-neutral-900 hover:border-neutral-800 hover:text-white'
                    }`}
                  >
                    <IconComponent className={`w-3.5 h-3.5 ${isSelected ? 'text-black' : 'text-zinc-500'}`} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Product Grid / Sections */}
        <div className="space-y-12">
          {categoriesWithProducts.map((cat) => {
            const catValue = categoryMap[cat.id];
            if (!catValue) return null;
            const catProducts = filteredProducts.filter(p => {
              if (cat.id === 'outros') {
                return !categoriesList.some(c => c.id === p.category);
              }
              return p.category === cat.id;
            });
            if (catProducts.length === 0) return null;

            const CategoryIcon = catValue.icon;

            return (
              <section key={cat.id} className="space-y-4">
                {/* Section Title Header with Torn Paper Background */}
                <div className="relative inline-flex items-center min-h-[58px] pl-5 pr-10 py-3.5 mb-1 select-none overflow-visible">
                  {/* Torn Paper Background Image with drop shadow for realism */}
                  <img 
                    src="https://i.ibb.co/PzYdh8j3/paper.png" 
                    alt="" 
                    className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] z-0"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Content over the paper */}
                  <div className="relative z-10 flex items-center space-x-2.5">
                    <div className="p-1.5 rounded-full bg-neutral-950 border border-neutral-800 text-[#ff6b00] flex items-center justify-center shadow-md">
                      <CategoryIcon className="w-4 h-4" />
                    </div>
                    <h2 className="text-base sm:text-lg font-display font-black text-neutral-950 tracking-tight">
                      {cat.label}
                    </h2>
                    <span className="text-zinc-300 text-[10px] font-black bg-neutral-950/90 px-2.5 py-0.5 rounded-full border border-neutral-800/10 shadow-sm">
                      {catProducts.length} {catProducts.length === 1 ? 'item' : 'itens'}
                    </span>
                  </div>
                </div>

                {/* Grid of customized vertical mockup-like card displays */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-5 gap-y-14 pt-10">
                  {catProducts.map((product) => {
                    const quantity = getProductQuantity(product.id);
                    return (
                      <motion.div 
                        key={product.id}
                        layoutId={`product-${product.id}`}
                        onClick={() => setSelectedProduct(product)}
                        className={`bg-[#17171a] hover:bg-[#1d1d22] rounded-[32px] border p-4 pt-16 flex flex-col justify-between transition-all hover:-translate-y-1 cursor-pointer relative ${
                          !product.available ? 'opacity-60' : ''
                        } ${quantity > 0 ? 'border-yellow-400' : 'border-neutral-900'}`}
                      >
                        {/* Custom White Outline Watermark Logo behind content at 6% opacity */}
                        <div className="absolute inset-0 rounded-[32px] overflow-hidden pointer-events-none z-0">
                          <img 
                            src="https://i.ibb.co/2wtGGnh/logo2.png" 
                            alt="" 
                            className="absolute bottom-[-16px] right-[-16px] w-28 h-28 object-contain logo-inferior-card"
                            style={{ filter: 'brightness(0) invert(1)', opacity: 0.06 }}
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        {/* Golden Crown Featured Badge */}
                        {product.featured && (
                          <div className="absolute top-3.5 right-3.5 z-10 p-1.5 bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 rounded-full shadow-md shadow-yellow-500/10">
                            <Crown className="w-3.5 h-3.5 fill-yellow-400" />
                          </div>
                        )}

                        {/* Centered Circular Gourmet Food Plate overlapping the top border */}
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full overflow-hidden border-4 border-[#17171a] shadow-xl bg-neutral-900 flex items-center justify-center transition-transform hover:scale-110 duration-300 z-10">
                          {product.image ? (
                            <img 
                              src={product.image} 
                              alt={product.name} 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                              <UtensilsCrossed className="w-6 h-6 text-neutral-600" />
                            </div>
                          )}
                        </div>

                        {/* Title and Description details */}
                        <div className="text-center mt-2 flex-1 flex flex-col justify-between relative z-10">
                          <div>
                            <h3 className="font-display font-extrabold text-white text-sm sm:text-base leading-tight line-clamp-1">
                              {product.name}
                            </h3>
                            <p className="text-zinc-400 text-[10px] sm:text-xs line-clamp-2 mt-1.5 font-medium leading-relaxed px-1">
                              {product.description || 'Deliciosa refeição premium feita com ingredientes frescos.'}
                            </p>
                          </div>

                          {/* Extra Destaque Badge if featured */}
                          {product.featured && (
                            <div className="flex items-center justify-center space-x-1 mt-2.5 text-[10px] text-yellow-400/95 font-bold bg-yellow-400/5 py-1 px-2.5 rounded-full border border-yellow-400/10 max-w-max mx-auto">
                              <Crown className="w-3 h-3 fill-yellow-400" />
                              <span>Destaque</span>
                            </div>
                          )}
                        </div>

                        {/* Bottom Price & Add Stepper */}
                        <div className="mt-4 pt-3 border-t border-neutral-900/55 flex items-center justify-between w-full relative z-10">
                          <span className="text-sm sm:text-base font-black text-white">
                            {formatBRL(product.price)}
                          </span>

                          {product.available ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProduct(product);
                              }}
                              className={`w-9 h-9 flex items-center justify-center transition-all duration-200 active:scale-90 hover:scale-105 cursor-pointer rounded-tl-[16px] rounded-br-[16px] rounded-tr-[4px] rounded-bl-[4px] ${
                                quantity > 0 
                                  ? 'bg-yellow-400 text-black font-extrabold text-[11px] shadow-lg shadow-yellow-500/20' 
                                  : 'bg-yellow-400 hover:bg-yellow-500 text-black shadow-lg shadow-yellow-500/10'
                              }`}
                              title={quantity > 0 ? `${quantity} no carrinho` : 'Adicionar ao carrinho'}
                            >
                              {quantity > 0 ? (
                                <span>{quantity}x</span>
                              ) : (
                                <Plus className="w-4 h-4 text-black stroke-[3px]" />
                              )}
                            </button>
                          ) : (
                            <span className="px-2 py-1 bg-neutral-900 text-zinc-500 rounded-lg font-bold text-[9px] uppercase tracking-wide border border-neutral-850">
                              Esgotado
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {filteredProducts.length === 0 && (
            <div className="text-center py-16 bg-[#17171a] rounded-[32px] border border-neutral-900 p-8">
              <div className="w-16 h-16 bg-neutral-900 text-zinc-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <UtensilsCrossed className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-white">Nenhum produto encontrado</h3>
              <p className="text-zinc-400 text-xs mt-1">Experimente mudar o termo da busca ou categoria selecionada.</p>
            </div>
          )}
        </div>
      </main>

       {/* Spectacular Product Detailed Modal / Overlay (Matches Right Smartphone Screen) */}
      <AnimatePresence>
        {selectedProduct && (() => {
          const quantity = getProductQuantity(selectedProduct.id);
          const categoryDetail = categoryMap[selectedProduct.category] || { label: 'Especial', bg: 'bg-neutral-900 text-white' };

          return (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-[#0c0c0d] overflow-y-auto"
            >
              {/* Top Banner Image Section - Full Screen Width, Aspect Square */}
              <div className="relative w-full aspect-square md:max-h-[450px] shrink-0 overflow-hidden bg-neutral-900">
                {selectedProduct.image ? (
                  <img 
                    src={selectedProduct.image} 
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <UtensilsCrossed className="w-16 h-16 text-neutral-700" />
                  </div>
                )}

                {/* Absolute Close/Back button in Top-Left */}
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="absolute top-4 left-4 z-20 p-2.5 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 text-white hover:bg-black/85 transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center justify-center"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>

                {/* Absolute Crown Badge in Top-Right (If Featured) */}
                {selectedProduct.featured && (
                  <div className="absolute top-4 right-4 z-20 p-2.5 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 text-yellow-400 flex items-center justify-center">
                    <Crown className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  </div>
                )}
              </div>

              {/* Naturally Flowing Details Content Card - Overlaps the bottom of the image slightly with a beautiful rounded sheet */}
              <div className="w-full max-w-2xl mx-auto bg-[#121214] rounded-t-[32px] p-6 sm:p-8 pb-12 mt-[-32px] relative z-10 shadow-[0_-15px_30px_rgba(0,0,0,0.8)] border-t border-neutral-850">
                {/* Custom White Outline Watermark Logo behind content at 6% opacity */}
                <div className="absolute inset-0 rounded-t-[32px] overflow-hidden pointer-events-none z-0">
                  <img 
                    src="https://i.ibb.co/2wtGGnh/logo2.png" 
                    alt="" 
                    className="absolute bottom-[-20px] right-[-20px] w-48 h-48 object-contain logo-inferior-card"
                    style={{ filter: 'brightness(0) invert(1)', opacity: 0.06 }}
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Horizontal handle indicator */}
                <div className="w-12 h-1 bg-neutral-800 rounded-full mx-auto mb-6 shrink-0 relative z-10" />

                <div className="flex-1 relative z-10">
                  {/* Category Pill Tag & Product Code */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
                      {categoryDetail.label}
                    </span>
                    <span className="text-xs text-zinc-500 font-bold">Cod: #{selectedProduct.id.substring(0, 5)}</span>
                  </div>

                  {/* Product Title */}
                  <h3 className="text-2xl sm:text-3xl font-display font-black text-white leading-tight tracking-tight">
                    {selectedProduct.name}
                  </h3>

                  {/* Attributes line */}
                  {selectedProduct.featured && (
                    <div className="flex items-center mt-3.5 text-xs font-bold text-zinc-400">
                      <span className="flex items-center space-x-1 text-yellow-400">
                        <Crown className="w-3.5 h-3.5 fill-yellow-400" />
                        <span>Destaques do Latão</span>
                      </span>
                    </div>
                  )}

                  {/* Description text */}
                  <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed mt-5 font-semibold">
                    {selectedProduct.description || 'Uma receita autêntica e fresca preparada com ingredientes selecionados pelo chef. Perfeito para lanchar a qualquer hora do dia ou da noite.'}
                  </p>
                </div>

                {/* Bottom Action Bar */}
                <div className="mt-8 pt-6 border-t border-neutral-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 relative z-10">
                  <div>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Preço Unitário</p>
                    <p className="text-xl sm:text-2xl font-black text-white mt-1">
                      {formatBRL(selectedProduct.price)}
                    </p>
                  </div>

                  {selectedProduct.available ? (
                    <div className="flex flex-col items-stretch sm:items-end space-y-3 w-full sm:w-auto">
                      {/* Stepper with Minus / Qty / Plus */}
                      <div className="flex items-center justify-between sm:justify-end space-x-3">
                        <span className="text-xs font-bold text-zinc-400">Quantidade:</span>
                        <div className="bg-neutral-900 border border-neutral-850 rounded-2xl p-1 flex items-center space-x-3">
                          <button
                            type="button"
                            onClick={() => setTempQuantity(prev => Math.max(1, prev - 1))}
                            className="p-2 text-zinc-400 hover:text-white hover:bg-neutral-850 rounded-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="text-sm font-black text-white min-w-[20px] text-center">{tempQuantity}</span>
                          <button
                            type="button"
                            onClick={() => setTempQuantity(prev => prev + 1)}
                            className="p-2 text-zinc-400 hover:text-white hover:bg-neutral-850 rounded-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Prominent Golden Add to Cart Button right below quantity */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCart((prevCart) => {
                            const existing = prevCart.find((item) => item.product.id === selectedProduct.id);
                            if (existing) {
                              return prevCart.map((item) =>
                                item.product.id === selectedProduct.id ? { ...item, quantity: tempQuantity } : item
                              );
                            } else {
                              return [...prevCart, { product: selectedProduct, quantity: tempQuantity }];
                            }
                          });
                          setSelectedProduct(null);
                        }}
                        className="w-full sm:w-auto px-6 py-3 bg-[#facc15] hover:bg-yellow-400 active:scale-95 text-black font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-yellow-500/10 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>Adicionar ao carrinho ({formatBRL(selectedProduct.price * tempQuantity)})</span>
                      </button>
                    </div>
                  ) : (
                    <span className="px-3.5 py-2 bg-neutral-900 text-zinc-500 rounded-xl font-bold text-xs uppercase tracking-wider border border-neutral-850">
                      Indisponível no momento
                    </span>
                  )}
                </div>

                {/* Back button option to close */}
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="mt-6 w-full py-3 border border-neutral-800 text-zinc-400 hover:text-white rounded-2xl text-xs font-bold transition-colors cursor-pointer bg-neutral-950/40 hover:bg-neutral-900/60"
                >
                  Voltar ao Cardápio
                </button>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Floating Bottom Cart Bar */}
      <AnimatePresence>
        {cartTotalQuantity > 0 && !isCartOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-0 right-0 z-30 px-4 max-w-4xl mx-auto"
          >
            <button
              onClick={() => setIsCartOpen(true)}
              className="w-full bg-[#facc15] text-black rounded-3xl px-5 py-4 flex items-center justify-between shadow-xl shadow-yellow-500/10 animate-cart-pulse cursor-pointer hover:bg-yellow-400 transition-colors"
            >
              <div className="flex items-center space-x-3.5">
                <div className="relative p-2.5 bg-black rounded-2xl">
                  <ShoppingBag className="w-5 h-5 text-[#facc15]" />
                  <span className="absolute -top-1.5 -right-1.5 bg-white text-black font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-yellow-400">
                    {cartTotalQuantity}
                  </span>
                </div>
                <div className="text-left">
                  <p className="text-[10px] text-zinc-950 font-black tracking-wider uppercase">Ver sacola de pedidos</p>
                  <p className="text-sm font-black text-black mt-0.5">Subtotal: {formatBRL(cartSubtotal)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-1.5 bg-black text-white hover:bg-neutral-900 py-2.5 px-4 rounded-2xl font-black text-xs">
                <span>Ver carrinho</span>
                <ChevronRight className="w-4 h-4 text-yellow-400" />
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Checkout Bottom Sheet (Slide-over Modal styled elegantly in Dark Mode) */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/95 z-40"
            />

            {/* Content Drawer */}
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto bg-[#17171a] border-t border-neutral-850 rounded-t-[40px] shadow-2xl z-50 max-h-[90vh] flex flex-col overflow-hidden text-white"
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-neutral-900 flex items-center justify-between bg-[#131315] shrink-0">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-yellow-400 text-black rounded-xl">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-white text-base">Sua Sacola</h3>
                    <p className="text-xs text-zinc-400 font-semibold">Você tem {cartTotalQuantity} {cartTotalQuantity === 1 ? 'item selecionado' : 'itens selecionados'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="p-2.5 text-zinc-400 hover:text-white hover:bg-neutral-800 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Cart Items List */}
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div 
                      key={item.product.id}
                      className="flex items-center justify-between p-4 bg-[#1e1e22] rounded-2xl border border-neutral-900"
                    >
                      <div className="min-w-0 pr-4">
                        <h4 className="font-black text-sm text-white truncate">{item.product.name}</h4>
                        <p className="text-xs text-zinc-400 font-bold mt-0.5">{formatBRL(item.product.price)} cada</p>
                      </div>
                      <div className="flex items-center space-x-3 shrink-0">
                        <div className="flex items-center bg-neutral-900 rounded-xl border border-neutral-850 p-0.5">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product, -1)}
                            className="p-1.5 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-black text-white px-2.5">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product, 1)}
                            className="p-1.5 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="text-sm font-black text-white min-w-[64px] text-right">
                          {formatBRL(item.product.price * item.quantity)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCart(prev => prev.filter(i => i.product.id !== item.product.id))}
                          className="p-1.5 text-[#facc15] hover:text-yellow-400 rounded-lg hover:bg-neutral-850 transition-colors cursor-pointer shrink-0"
                          title="Remover item"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Checkout Fields Form */}
                <form id="checkout-form" onSubmit={handleCheckout} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                      Seu Nome
                    </label>
                    <input 
                      type="text"
                      placeholder="Ex: Roberto Souza"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-[#1e1e22] border border-neutral-850 focus:border-yellow-400 rounded-xl py-3 px-4 text-xs font-semibold outline-hidden transition-colors text-white placeholder-zinc-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                      Observações ou Detalhes
                    </label>
                    <textarea 
                      rows={2}
                      placeholder="Ex: Sem cebola, gelo e limão na dose, etc."
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                      className="w-full bg-[#1e1e22] border border-neutral-850 focus:border-yellow-400 rounded-xl py-3 px-4 text-xs font-semibold outline-hidden transition-colors text-white resize-none placeholder-zinc-500"
                    />
                  </div>
                </form>

                {/* Total Calculations summary */}
                <div className="bg-[#1e1e22] rounded-2xl border border-neutral-900 p-5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm text-zinc-200">Total dos Itens</span>
                    <span className="font-display font-black text-lg text-yellow-400">{formatBRL(cartSubtotal)}</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 font-semibold leading-relaxed mt-1">
                    *A taxa de entrega não está incluída neste valor. Ela será calculada e informada de acordo com o endereço de entrega fornecido no WhatsApp.
                  </p>
                </div>
              </div>

              {/* Drawer Footer (Buttons) */}
              <div className="p-5 border-t border-neutral-900 bg-[#131315] shrink-0">
                <button
                  type="submit"
                  form="checkout-form"
                  disabled={!settings.isOpen}
                  className={`w-full py-4 text-black font-black rounded-2xl flex items-center justify-center space-x-2 shadow-lg transition-all ${
                    settings.isOpen 
                      ? 'bg-[#facc15] hover:bg-yellow-400 hover:-translate-y-0.5 cursor-pointer shadow-yellow-500/5' 
                      : 'bg-neutral-800 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  <MessageSquare className="w-5 h-5" />
                  <span>
                    {settings.isOpen 
                      ? 'Enviar Pedido para o WhatsApp' 
                      : 'Estabelecimento Fechado'
                    }
                  </span>
                </button>
                <p className="text-center text-[10px] text-zinc-500 font-bold mt-3">
              
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
