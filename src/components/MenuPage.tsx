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
  MessageCircle, 
  ChevronRight, 
  ChevronLeft,
  Crown,
  Store, 
  UtensilsCrossed, 
  Flame, 
  Beer, 
  Wine, 
  BottleWine,
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
  Grid,
  Martini,
  CupSoda,
  Truck,
  Info,
  Navigation,
  CreditCard,
  QrCode,
  Banknote,
  User,
  FileText
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
  BottleWine,
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
  Grid,
  Martini,
  CupSoda
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
  vodkas: { label: 'Vodkas', icon: BottleWine, color: 'from-purple-400 to-indigo-500', bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  cervejas: { label: 'Cervejas', icon: Beer, color: 'from-yellow-400 to-amber-500', bg: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  drinks: { label: 'Drinks', icon: PartyPopper, color: 'from-pink-400 to-rose-500', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  lanches: { label: 'Lanches', icon: UtensilsCrossed, color: 'from-red-400 to-red-600', bg: 'bg-red-500/10 text-red-400 border-red-500/20' }
};

// Store address coordinates (Rua Waldomiro Fernandes, 90 - Tokio, Londrina - PR)
const STORE_LAT = -23.32185;
const STORE_LON = -51.18128;

// Distance calculation using Haversine formula (returns km)
function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c; // Distance in km
  return parseFloat(d.toFixed(2));
}

// Delivery fee pricing model based on radius from the store
function calculateDeliveryFeeByDistance(distance: number): number {
  if (distance <= 1.0) return 3.00;
  if (distance <= 2.5) return 5.00;
  if (distance <= 5.0) return 8.00;
  if (distance <= 8.0) return 12.00;
  if (distance <= 12.0) return 15.00;
  return 20.00;
}

// Clean Brazilian address structures for robust geocoding with OpenStreetMap
function cleanBrazilianAddress(address: string): { street: string; number: string; cleanQuery: string } {
  let normalized = address.trim();

  // Strip ZIP codes (CEP): 86063-260 or 86063260
  normalized = normalized.replace(/\b\d{5}-?\d{3}\b/g, '');

  // Strip common complement words and everything after them
  const complementsRegex = /\b(apto|ap|casa|bloco|bl|loja|lj|sala|sl|fundos|sobrado|condomínio|cond|residencial|lote|qd|qda|quadra)\b.*/gi;
  normalized = normalized.replace(complementsRegex, '');

  let number = '';
  const commaParts = normalized.split(',').map(p => p.trim()).filter(Boolean);
  let street = '';
  
  if (commaParts.length > 0) {
    street = commaParts[0];
    
    // Check if there is a number at the very beginning of the remaining parts after the first comma
    const remainingPart = normalized.substring(normalized.indexOf(',') + 1).trim();
    if (remainingPart) {
      const numMatch = remainingPart.match(/^\s*(?:nº|n|num|numero)?\s*(\d+[a-zA-Z]?)(?:\s+|-|,|\b)/i);
      if (numMatch) {
        number = numMatch[1];
      }
    }

    // Fallback: check other comma parts
    if (!number) {
      for (let i = 1; i < commaParts.length; i++) {
        const part = commaParts[i];
        const numMatch = part.match(/^\s*(?:nº|n|num|numero)?\s*(\d+[a-zA-Z]?)(?:\s+|-|,|\b|$)/i);
        if (numMatch) {
          number = numMatch[1];
          break;
        }
      }
    }
  }

  // If no number found yet, split by hyphen
  if (!number) {
    const hyphenParts = normalized.split('-').map(p => p.trim()).filter(Boolean);
    for (const part of hyphenParts) {
      const numMatch = part.match(/^\s*(?:nº|n|num|numero)?\s*(\d+[a-zA-Z]?)(?:\s+|-|,|\b|$)/i);
      if (numMatch) {
        number = numMatch[1];
        break;
      }
    }
  }

  // If still no number, check if there is a number at the very end of the street name
  if (!number && street) {
    const numAtEndMatch = street.match(/\s+(\d+[a-zA-Z]?)$/);
    if (numAtEndMatch) {
      number = numAtEndMatch[1];
      street = street.substring(0, street.length - numAtEndMatch[0].length).trim();
    }
  }

  // Clean up street name (remove trailing hyphens, commas, or extra spaces)
  street = street.replace(/^[\s,.-]+|[\s,.-]+$/g, '').trim();

  if (!street) {
    street = normalized;
  }

  let cleanQuery = street;
  if (number) {
    cleanQuery += `, ${number}`;
  }
  
  return { street, number, cleanQuery };
}

// Token-based validation to ensure returned location actually matches street name and is in Londrina
function isValidAddressMatch(searchAddress: string, displayName: string): boolean {
  const cleanDisplayName = displayName.toLowerCase();
  
  // Extract significant words from searchAddress
  const words = searchAddress
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
    .split(/[\s,.-]+/)
    .filter(w => w.length >= 3);
    
  const IGNORED_WORDS = new Set([
    'rua', 'avenida', 'av', 'de', 'do', 'da', 'em', 'para', 'pr', 
    'londrina', 'brasil', 'brazil', 'bairro', 'jardim', 'jd', 
    'apto', 'ap', 'casa', 'bloco', 'condominio', 'residencia'
  ]);
  
  const searchTokens = words.filter(w => !IGNORED_WORDS.has(w));
  
  if (searchTokens.length === 0) {
    // If no specific tokens, just make sure it's in Londrina
    return cleanDisplayName.includes('londrina');
  }
  
  // Normalize display name for matching
  const normalizedDisplayName = cleanDisplayName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Check if at least one search token is in the display name
  return searchTokens.some(token => normalizedDisplayName.includes(token)) && cleanDisplayName.includes('londrina');
}

// Geocode with multiple layered fallbacks for high resilience
async function fetchCoordinatesWithFallback(address: string): Promise<{ lat: number; lon: number; success: boolean }> {
  // Try 0: CEP (Postal Code) API search for high precision in Brazil
  const cepMatch = address.match(/\b(\d{5})-?(\d{3})\b/);
  if (cepMatch) {
    const cep = cepMatch[1] + cepMatch[2];
    try {
      const response = await fetch(`https://cep.awesomeapi.com.br/json/${cep}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.lat && data.lng) {
          const lat = parseFloat(data.lat);
          const lon = parseFloat(data.lng);
          // Ensure it's in Londrina to avoid false positives
          if (data.city && data.city.toLowerCase().includes('londrina')) {
            return { lat, lon, success: true };
          }
        }
      }
    } catch (e) {
      console.error("Error fetching CEP from AwesomeAPI:", e);
    }

    try {
      const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.location && data.location.coordinates) {
          const lat = parseFloat(data.location.coordinates.latitude);
          const lon = parseFloat(data.location.coordinates.longitude);
          if (data.city && data.city.toLowerCase().includes('londrina')) {
            return { lat, lon, success: true };
          }
        }
      }
    } catch (e) {
      console.error("Error fetching CEP from BrasilAPI:", e);
    }
  }

  const { street, number, cleanQuery } = cleanBrazilianAddress(address);
  
  // Try 1: Structured Search with Nominatim (Street + City + State + Country)
  try {
    const streetQuery = number ? `${street}, ${number}` : street;
    const url = `https://nominatim.openstreetmap.org/search?format=json&street=${encodeURIComponent(streetQuery)}&city=Londrina&state=Parana&country=Brazil&limit=1`;
    const response = await fetch(url, {
      headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' }
    });
    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        const item = data[0];
        if (isValidAddressMatch(street, item.display_name)) {
          return { lat: parseFloat(item.lat), lon: parseFloat(item.lon), success: true };
        }
      }
    }
  } catch (e) {
    console.error("Error in Geocode Try 1 (Structured):", e);
  }

  // Try 2: Unstructured Search (cleanQuery + Londrina, PR, Brasil)
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery + ', Londrina, PR, Brasil')}&limit=1`;
    const response = await fetch(url, {
      headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' }
    });
    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        const item = data[0];
        if (isValidAddressMatch(street, item.display_name)) {
          return { lat: parseFloat(item.lat), lon: parseFloat(item.lon), success: true };
        }
      }
    }
  } catch (e) {
    console.error("Error in Geocode Try 2 (Unstructured):", e);
  }

  // Try 3: Structured Search without House Number (Street only)
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&street=${encodeURIComponent(street)}&city=Londrina&state=Parana&country=Brazil&limit=1`;
    const response = await fetch(url, {
      headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' }
    });
    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        const item = data[0];
        if (isValidAddressMatch(street, item.display_name)) {
          return { lat: parseFloat(item.lat), lon: parseFloat(item.lon), success: true };
        }
      }
    }
  } catch (e) {
    console.error("Error in Geocode Try 3 (Street Structured):", e);
  }

  // Try 4: Unstructured Search without House Number (Street only + Londrina, PR, Brasil)
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(street + ', Londrina, PR, Brasil')}&limit=1`;
    const response = await fetch(url, {
      headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' }
    });
    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        const item = data[0];
        if (isValidAddressMatch(street, item.display_name)) {
          return { lat: parseFloat(item.lat), lon: parseFloat(item.lon), success: true };
        }
      }
    }
  } catch (e) {
    console.error("Error in Geocode Try 4 (Street Unstructured):", e);
  }

  // Try 5: Raw address fallback with Londrina restrictions
  try {
    let q5 = address;
    if (!q5.toLowerCase().includes('londrina')) {
      q5 += ', Londrina, PR, Brasil';
    }
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q5)}&limit=1`;
    const response = await fetch(url, {
      headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' }
    });
    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        const item = data[0];
        if (isValidAddressMatch(address, item.display_name)) {
          return { lat: parseFloat(item.lat), lon: parseFloat(item.lon), success: true };
        }
      }
    }
  } catch (e) {
    console.error("Error in Geocode Try 5 (Raw Fallback):", e);
  }

  return { lat: 0, lon: 0, success: false };
}

export default function MenuPage({ products, settings, onNavigateToAdmin }: MenuPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('todos');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [observations, setObservations] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cartao' | 'dinheiro'>('pix');
  const [orderSuccess, setOrderSuccess] = useState(false);

  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryDistance, setDeliveryDistance] = useState<number | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [isCalculatingFee, setIsCalculatingFee] = useState(false);
  const [feeError, setFeeError] = useState<string | null>(null);

  // Debounced auto-calculation of distance when address is typed
  useEffect(() => {
    if (!deliveryAddress.trim()) {
      setDeliveryDistance(null);
      setDeliveryFee(0);
      setFeeError(null);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsCalculatingFee(true);
      setFeeError(null);
      try {
        const result = await fetchCoordinatesWithFallback(deliveryAddress);
        if (result.success) {
          const distance = calculateHaversineDistance(STORE_LAT, STORE_LON, result.lat, result.lon);
          const fee = calculateDeliveryFeeByDistance(distance);

          setDeliveryDistance(distance);
          setDeliveryFee(fee);
          setFeeError(null);
        } else {
          setFeeError('Endereço não localizado. Tente informar rua e número.');
          setDeliveryDistance(null);
          setDeliveryFee(0);
        }
      } catch (err) {
        console.error("Erro ao calcular frete:", err);
        setFeeError('Erro ao calcular o frete por distância.');
        setDeliveryDistance(null);
        setDeliveryFee(0);
      } finally {
        setIsCalculatingFee(false);
      }
    }, 1000); // 1s debounce

    return () => clearTimeout(delayDebounceFn);
  }, [deliveryAddress]);

  const triggerManualCalculation = async () => {
    if (!deliveryAddress.trim()) return;
    setIsCalculatingFee(true);
    setFeeError(null);
    try {
      const result = await fetchCoordinatesWithFallback(deliveryAddress);
      if (result.success) {
        const distance = calculateHaversineDistance(STORE_LAT, STORE_LON, result.lat, result.lon);
        const fee = calculateDeliveryFeeByDistance(distance);
        setDeliveryDistance(distance);
        setDeliveryFee(fee);
        setFeeError(null);
      } else {
        setFeeError('Endereço não localizado. Tente informar rua e número.');
        setDeliveryDistance(null);
        setDeliveryFee(0);
      }
    } catch (err) {
      setFeeError('Erro ao calcular o frete.');
    } finally {
      setIsCalculatingFee(false);
    }
  };

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
        icon: cat.id === 'vodkas' ? BottleWine : (ICON_MAP[cat.icon] || Grid),
        color: style.color,
        bg: style.bg
      };
    });
    return map;
  }, [categoriesWithProducts]);

  const allCategories = useMemo(() => {
    return [
      { id: 'todos', label: 'Todos', icon: Grid },
      ...categoriesWithProducts.map(cat => ({
        id: cat.id,
        label: cat.label,
        icon: categoryMap[cat.id]?.icon || Grid
      }))
    ];
  }, [categoriesWithProducts, categoryMap]);

  const selectedIndex = useMemo(() => {
    const idx = allCategories.findIndex(c => c.id === activeCategory);
    return idx === -1 ? 0 : idx;
  }, [allCategories, activeCategory]);

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

    const finalDeliveryFee = deliveryFee || 0;
    const orderData: any = {
      customerName: customerName.trim() || "Cliente Anônimo",
      observations: observations.trim() || "Nenhuma observação",
      paymentMethod: paymentMethod,
      items: orderItems,
      total: cartSubtotal,
      deliveryFee: finalDeliveryFee,
      grandTotal: cartSubtotal + finalDeliveryFee,
      createdAt: new Date().toISOString()
    };

    if (deliveryAddress.trim()) {
      orderData.deliveryAddress = deliveryAddress.trim();
    }
    if (deliveryDistance !== null && deliveryDistance !== undefined) {
      orderData.distance = deliveryDistance;
    }

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
    
    if (deliveryDistance !== null) {
      message += `*Taxa de Entrega (${deliveryDistance} km):* ${formatBRL(finalDeliveryFee)}\n`;
      message += `*Total Geral:* ${formatBRL(cartSubtotal + finalDeliveryFee)}\n\n`;
    } else {
      message += `*Taxa de Entrega:* A combinar\n`;
      message += `*Total Geral:* ${formatBRL(cartSubtotal)} + Taxa de Entrega\n\n`;
    }
    
    const paymentLabels: Record<string, string> = {
      pix: 'Pix',
      cartao: 'Cartão de Crédito/Débito',
      dinheiro: 'Na entrega (dinheiro)'
    };
    const paymentLabel = paymentLabels[paymentMethod] || 'Não informado';

    message += `*Nome do Cliente:* ${customerName.trim() || 'Não informado'}\n`;
    message += `*Forma de Pagamento:* ${paymentLabel}\n`;
    message += `*Observação:* ${observations.trim() || 'Nenhuma'}\n\n`;
    
    if (deliveryAddress.trim()) {
      message += `*Endereço de Entrega:* ${deliveryAddress.trim()}\n\n`;
    } else {
      message += `*Endereço de Entrega:* (Não informado / A combinar)\n\n`;
    }
    message += `_Obrigado pela preferência!_`;

    // 3. Open WhatsApp link
    const sanitizedPhone = settings.whatsappNumber.replace(/\D/g, '');
    // Using wa.me is the modern, official recommended standard that seamlessly handles redirects on both iOS and Android
    const whatsappUrl = `https://wa.me/${sanitizedPhone}?text=${encodeURIComponent(message)}`;
    
    // Attempt to open in a new window first (preferred for desktop).
    // If it gets blocked by mobile popup blockers (common on iOS/mobile browsers after an asynchronous 'await'),
    // we fallback to redirecting the current window which never gets blocked and opens WhatsApp natively.
    try {
      const newWindow = window.open(whatsappUrl, '_blank');
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        window.location.href = whatsappUrl;
      }
    } catch (e) {
      window.location.href = whatsappUrl;
    }

    // 4. Reset Cart & Form fields
    setCart([]);
    setCustomerName('');
    setObservations('');
    setPaymentMethod('pix');
    setDeliveryAddress('');
    setDeliveryDistance(null);
    setDeliveryFee(0);
    setIsCartOpen(false);
    setOrderSuccess(true);

    setTimeout(() => {
      setOrderSuccess(false);
    }, 5000);
  };

  return (
    <div className="min-h-screen pb-36 bg-[#0c0c0d] text-white selection:bg-yellow-400 selection:text-black">
      {/* Hero Section Container with Background Image and Gradient overlays */}
      <div className="relative overflow-hidden mb-8">
        {/* Background Image Layer */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none select-none opacity-65"
          style={{ 
            backgroundImage: "url('https://i.ibb.co/Q39XWqsR/Layer-41.png')",
          }}
        />
        {/* Rich dark ambient overlay and bottom transition to background color */}
        <div className="absolute inset-0 bg-neutral-950/75 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#0c0c0d] to-transparent pointer-events-none" />

        {/* Upper Navigation Row (Matches Header Bar on Left Screen) */}
        <header className="relative z-30 bg-transparent px-4 py-4.5 border-b border-neutral-900/10">
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
              <div className="cursor-default">
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
                className="text-yellow-400 tracking-wider text-xl sm:text-2xl font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                style={{ fontFamily: '"Naughty Monster", sans-serif' }}
              >
                É só pedir!
              </span>
            </div>
          </div>
        </header>

        {/* Hero Content Section: Welcome and Dynamic Banner */}
        <div className="max-w-4xl mx-auto px-4 pt-8 pb-4 relative z-10">
          {/* Welcome Section (Mockup Header Profile Style) */}
          <div className="flex justify-center items-center mb-8 text-center">
            <div className="w-full">
              <h2 className="text-4xl md:text-5xl font-naughty text-yellow-400 tracking-wider uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                Bem Vindo(a)!
              </h2>
              <p className="text-zinc-200 text-xs md:text-sm font-semibold mt-3 max-w-xl mx-auto leading-relaxed drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.9)]">
                <strong className="text-yellow-400">Aviso importante:</strong> abrir este cardápio pode dar vontade de pedir tudo. Confira nossas bebidas, espetinhos, doces e promoções.
              </p>
            </div> 
          </div>

          {/* Dynamic "Destaque do Dia" Banner (Chicken Baked Card style on Left Screen) */}
          {activeFeatured && (
            <div className="relative pt-6">
              {/* Overlapping "DESTAQUES DO LATÃO" Brush sticker */}
              <img 
                src="https://i.ibb.co/rRnCkxb5/destauqe.png" 
                alt="Destaques do Latão" 
                className="absolute left-1/2 -translate-x-1/2 top-1.5 z-20 w-44 sm:w-52 md:w-56 object-contain pointer-events-none drop-shadow-[0_4px_6px_rgba(0,0,0,0.35)] destaque-brush-sticker"
                referrerPolicy="no-referrer"
              />
              
              <div 
                onClick={() => setSelectedProduct(activeFeatured)}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="relative overflow-hidden bg-gradient-to-br from-yellow-400 via-amber-400 to-amber-500 border-2 border-orange-500 rounded-[32px] p-6 pb-12 flex items-center justify-between cursor-pointer transition-all hover:shadow-[0_10px_30px_rgba(245,158,11,0.25)] group select-none shadow-2xl"
              >
                {/* Background flare element */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-[70px] pointer-events-none group-hover:bg-white/30 transition-colors duration-300" />
                
                {/* Custom Watermark Logo behind content at 6% opacity (dark/black filter for yellow background) */}
                <div className="absolute inset-0 rounded-[32px] overflow-hidden pointer-events-none z-0">
                  <img 
                    src="https://i.ibb.co/2wtGGnh/logo2.png" 
                    alt="" 
                    className="absolute bottom-[-16px] right-[-16px] w-75 h-75 object-contain logo-destaque-watermark"
                    style={{ filter: 'brightness(0)', opacity: 0.06 }}
                    referrerPolicy="no-referrer"
                  />
                </div>
                
                <div className="flex-1 pr-4 z-10">
                  
                  <AnimatePresence mode="wait">
                  <motion.div
                    key={activeFeatured.id}
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h3 className="text-2xl md:text-3xl font-display font-black text-neutral-950 leading-tight tracking-tight">
                      {activeFeatured.name}
                    </h3>
                    <p className="text-neutral-950/85 text-xs md:text-sm font-bold mt-2 line-clamp-3 max-w-md leading-relaxed">
                      {activeFeatured.description || 'Deliciosa opção em destaque no nosso cardápio! Peça agora mesmo.'}
                    </p>
                    
                    <div className="flex items-center space-x-3 mt-5">
                      <span className="text-yellow-400 font-black text-sm md:text-base px-3.5 py-1.5 bg-neutral-950 rounded-2xl border border-neutral-900 shadow-lg">
                        {formatBRL(activeFeatured.price)}
                      </span>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Overlapping Floating Dish Preview - Rounded Rectangle wider aspect ratio */}
              <div className="relative shrink-0 z-10 w-36 h-44 md:w-48 md:h-56 rounded-[32px] overflow-hidden border-2 border-orange-500/20 shadow-2xl transition-transform duration-500 group-hover:scale-105 group-hover:rotate-3">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeFeatured.id}
                    initial={{ opacity: 0, scale: 0.95, rotate: -3 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.95, rotate: 3 }}
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
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-neutral-950/25 hover:bg-neutral-950/50 border border-neutral-950/10 text-neutral-950 hover:text-white transition-all cursor-pointer flex items-center justify-center"
                    title="Anterior"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentSlide((prev) => (prev + 1) % featuredProducts.length);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-neutral-950/25 hover:bg-neutral-950/50 border border-neutral-950/10 text-neutral-950 hover:text-white transition-all cursor-pointer flex items-center justify-center"
                    title="Próximo"
                  >
                    <ChevronRight className="w-5 h-5" />
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
                      className={`w-2.5 h-1.5 rounded-full transition-all duration-300 ${
                        idx === currentSlide ? 'bg-neutral-950 w-5' : 'bg-neutral-950/35 hover:bg-neutral-950/50'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Layout Container */}
      <main className="max-w-4xl mx-auto px-4 mt-2">
        
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
              <span className="text-[10px] font-bold text-yellow-400 hover:underline cursor-pointer select-none" onClick={() => setActiveCategory('todos')}>Ver Tudo</span>
            </div>
            
            <div className="relative w-full h-[145px] overflow-hidden select-none bg-neutral-950/20 rounded-[28px] border border-neutral-900/30">
              {/* Left & Right fading masks for premium visual depth */}
              <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#0c0c0d] to-transparent z-20 pointer-events-none" />
              <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#0c0c0d] to-transparent z-20 pointer-events-none" />

              {/* Golden Dashed Arc Line in the background */}
              <div className="absolute top-[32px] inset-x-0 flex justify-center pointer-events-none select-none overflow-visible">
                <svg width="340" height="100" viewBox="0 0 340 100" fill="none" className="overflow-visible opacity-35">
                  <path 
                    d="M -60 90 Q 170 -28 400 90" 
                    stroke="#eab308" 
                    strokeWidth="2" 
                    strokeDasharray="4 4" 
                    fill="none" 
                  />
                </svg>
              </div>

              {/* Category Items */}
              <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[340px] h-full relative overflow-visible">
                {allCategories.map((cat, i) => {
                  // Calculate wrapped shortest circular path index difference
                  const total = allCategories.length;
                  let diff = i - selectedIndex;
                  if (diff > total / 2) diff -= total;
                  if (diff < -total / 2) diff += total;

                  // Calculate styles and coordinates
                  const xOffset = diff * 85; // 85px horizontal spacing
                  const yOffset = (diff * diff) * 12; // curve height offset
                  
                  let scale = 1;
                  let opacity = 1;
                  let zIndex = 10;
                  const isSelected = activeCategory === cat.id;

                  if (diff === 0) {
                    scale = 1.25;
                    opacity = 1;
                    zIndex = 30;
                  } else if (Math.abs(diff) === 1) {
                    scale = 0.95;
                    opacity = 0.85;
                    zIndex = 20;
                  } else if (Math.abs(diff) === 2) {
                    scale = 0.75;
                    opacity = 0.5;
                    zIndex = 10;
                  } else {
                    scale = 0.5;
                    opacity = 0;
                    zIndex = 0;
                  }

                  const IconComponent = cat.icon;

                  return (
                    <motion.div
                      key={cat.id}
                      style={{
                        position: 'absolute',
                        left: '170px', // Center offset
                        top: '18px',
                        transformOrigin: 'center center',
                      }}
                      animate={{
                        x: xOffset - 28, // Subtract half of item width (28px) for perfect centering
                        y: yOffset,
                        scale,
                        opacity,
                        zIndex,
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: 260,
                        damping: 26,
                      }}
                      className="absolute flex flex-col items-center justify-center cursor-pointer group"
                      onClick={() => setActiveCategory(cat.id)}
                    >
                      {/* Circular Button */}
                      <div
                        className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all ${
                          isSelected
                            ? 'bg-yellow-400 text-black border-yellow-400 shadow-xl shadow-yellow-500/25'
                            : 'bg-[#17171a] text-zinc-400 border-neutral-900/60 hover:border-neutral-800 hover:text-white'
                        }`}
                      >
                        <IconComponent className={`w-6 h-6 ${isSelected ? 'text-black' : 'text-zinc-400 group-hover:text-zinc-200'}`} />
                      </div>

                      {/* Label text */}
                      <span
                        className={`text-[10px] font-black uppercase tracking-tight mt-2 text-center transition-colors whitespace-nowrap ${
                          isSelected ? 'text-yellow-400' : 'text-zinc-500 group-hover:text-zinc-400'
                        }`}
                      >
                        {cat.label}
                      </span>

                      {/* Bottom active line capsule */}
                      {isSelected && (
                        <motion.div
                          layoutId="activeCategoryLine"
                          className="w-5 h-1 bg-yellow-400 rounded-full mt-1 shadow-[0_2px_6px_rgba(234,179,8,0.4)]"
                          transition={{
                            type: 'spring',
                            stiffness: 260,
                            damping: 26,
                          }}
                        />
                      )}
                    </motion.div>
                  );
                })}
              </div>
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
                    <h2 className="text-base sm:text-lg font-naughty font-black text-neutral-950 tracking-tight menu-category-title">
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
                                updateQuantity(product, 1, e);
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
              className="fixed inset-0 z-50 bg-[#0c0c0d] overflow-y-auto no-scrollbar"
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
                    className="absolute bottom-[-30px] right-[-30px] w-64 h-64 sm:w-80 sm:h-80 sm:bottom-[-40px] sm:right-[-40px] object-contain logo-inferior-card"
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
                  className="mt-2 w-full py-3 border border-neutral-800 text-zinc-400 hover:text-white rounded-2xl text-xs font-bold transition-colors cursor-pointer bg-neutral-950/40 hover:bg-neutral-900/60"
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
                <span>Ver Pedidos</span>
                <ChevronRight className="w-4 h-4 text-yellow-400" />
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Checkout Bottom Sheet (Slide-over Modal styled elegantly with Notebook Paper background) */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/60 z-40 backdrop-blur-xs"
            />

            {/* Content Drawer */}
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto shadow-2xl z-50 max-h-[95vh] flex flex-col overflow-hidden text-slate-900 bg-transparent"
              style={{
                backgroundImage: "url('https://i.ibb.co/RGzp295F/aaa.png')",
                backgroundSize: '100% 100%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            >
              {/* Drawer Header */}
              <div className="pt-8 pb-5 pl-14 pr-6 border-b border-zinc-950/20 flex items-center justify-between bg-transparent shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-yellow-400 text-black rounded-2xl shadow-sm">
                    <ShoppingBag className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-zinc-950 text-base leading-none">Sua Sacola</h3>
                    <p className="text-xs text-zinc-500 font-bold mt-1">Você tem {cartTotalQuantity} {cartTotalQuantity === 1 ? 'item selecionado' : 'itens selecionados'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="p-2.5 text-zinc-500 hover:text-zinc-950 hover:bg-zinc-200/50 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body (Scrollable) */}
              <div className="flex-1 overflow-y-auto pt-5 pb-5 pl-14 pr-6 space-y-6">
                {/* Cart Items List */}
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div 
                      key={item.product.id}
                      className="flex items-center justify-between p-4 bg-[#1e1e22] rounded-3xl border border-neutral-900 shadow-md"
                    >
                      <div className="min-w-0 pr-4">
                        <h4 className="font-black text-sm text-white truncate">{item.product.name}</h4>
                        <p className="text-xs text-zinc-400 font-bold mt-0.5">{formatBRL(item.product.price)} cada</p>
                      </div>
                      <div className="flex items-center space-x-3 shrink-0">
                        <div className="flex items-center bg-transparent rounded-full border border-white/60 p-0.5">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product, -1)}
                            className="p-1.5 text-white hover:text-yellow-400 rounded-full transition-colors cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-black text-white px-2">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product, 1)}
                            className="p-1.5 text-white hover:text-yellow-400 rounded-full transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-sm font-black text-white min-w-[64px] text-right">
                          {formatBRL(item.product.price * item.quantity)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCart(prev => prev.filter(i => i.product.id !== item.product.id))}
                          className="p-1.5 text-[#facc15] hover:text-yellow-400 transition-colors cursor-pointer shrink-0 ml-1"
                          title="Remover item"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Checkout Fields Form */}
                <div id="checkout-form" className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">
                      Seu Nome
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text"
                        placeholder="Ex: Roberto Souza"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full bg-[#1e1e22] border border-neutral-850 focus:border-yellow-400 rounded-2xl py-3.5 pl-11 pr-4 text-xs font-semibold outline-hidden transition-colors text-white placeholder-zinc-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                      <span>Endereço de Entrega</span>
                      <span className="text-[10px] text-emerald-400 normal-case font-bold flex items-center gap-1">
                        <Info className="w-3.5 h-3.5 text-emerald-400" />
                        Cálculo Automático por Raio
                      </span>
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <MapPin className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input 
                          type="text"
                          placeholder="Ex: Rua Piauí, 450"
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          className="w-full bg-[#1e1e22] border border-neutral-850 focus:border-yellow-400 rounded-2xl py-3.5 pl-11 pr-10 text-xs font-semibold outline-hidden transition-colors text-white placeholder-zinc-500"
                        />
                        {deliveryAddress && (
                          <button
                            type="button"
                            onClick={() => {
                              setDeliveryAddress('');
                              setDeliveryDistance(null);
                              setDeliveryFee(0);
                              setFeeError(null);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 rounded-full cursor-pointer bg-neutral-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={triggerManualCalculation}
                        disabled={!deliveryAddress.trim() || isCalculatingFee}
                        className="px-4 bg-neutral-800 hover:bg-neutral-700 text-[#facc15] hover:text-yellow-400 font-extrabold text-xs rounded-2xl border border-neutral-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Calcular
                      </button>
                    </div>

                    {/* Geocoding / Distance calculations feedback */}
                    <div className="mt-2.5">
                      {isCalculatingFee && (
                        <div className="p-3.5 bg-[#1e1e22] border border-yellow-500/20 rounded-2xl flex items-center space-x-2 text-yellow-400 text-[11px] font-bold animate-pulse">
                          <Navigation className="w-3.5 h-3.5 animate-spin text-yellow-400" />
                          <span>Calculando distância e frete por raio...</span>
                        </div>
                      )}

                      {!isCalculatingFee && deliveryDistance !== null && (
                        <div className="p-3.5 bg-[#1e1e22] border border-neutral-850 rounded-2xl space-y-2 text-zinc-300 text-xs shadow-inner">
                          <div className="flex items-center justify-between font-black">
                            <span className="flex items-center gap-1.5 text-emerald-400">
                              <Truck className="w-3.5 h-3.5 text-emerald-400" />
                              Endereço Localizado em Londrina
                            </span>
                            <span className="bg-emerald-500 text-black px-2 py-0.5 rounded-full text-[10px] font-black shrink-0">
                              {deliveryDistance} km
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] text-zinc-400 font-bold border-t border-neutral-850 pt-2">
                            <span>Taxa de Entrega Estimada:</span>
                            <span className="text-[#facc15] font-black text-xs">{formatBRL(deliveryFee)}</span>
                          </div>
                        </div>
                      )}

                      {!isCalculatingFee && feeError && (
                        <div className="p-3.5 bg-[#1e1e22] border border-amber-500/20 rounded-2xl text-amber-400 text-[11px] font-bold space-y-1">
                          <p className="text-amber-400">{feeError}</p>
                          <p className="text-[10px] text-zinc-400 mt-0.5 font-normal">A taxa será combinada diretamente no WhatsApp.</p>
                        </div>
                      )}

                      {!isCalculatingFee && !deliveryAddress && (
                        <p className="text-[10px] text-zinc-500 font-semibold leading-normal pl-1">
                          Digite seu endereço em Londrina para o cálculo automático do frete por raio de distância da loja.
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">
                      Forma de Pagamento
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('pix')}
                        className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border transition-all text-center gap-1.5 cursor-pointer ${
                          paymentMethod === 'pix'
                            ? 'bg-yellow-400 text-black border-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.25)] font-black'
                            : 'bg-[#1e1e22] text-zinc-300 border-neutral-850 hover:border-zinc-700 hover:text-white font-bold'
                        }`}
                      >
                        <QrCode className={`w-5 h-5 stroke-[2] ${paymentMethod === 'pix' ? 'text-black' : 'text-zinc-400'}`} />
                        <span className="text-[10px] tracking-wide uppercase">Pix</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('cartao')}
                        className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border transition-all text-center gap-1.5 cursor-pointer ${
                          paymentMethod === 'cartao'
                            ? 'bg-yellow-400 text-black border-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.25)] font-black'
                            : 'bg-[#1e1e22] text-zinc-300 border-neutral-850 hover:border-zinc-700 hover:text-white font-bold'
                        }`}
                      >
                        <CreditCard className={`w-5 h-5 stroke-[2] ${paymentMethod === 'cartao' ? 'text-black' : 'text-zinc-400'}`} />
                        <span className="text-[10px] tracking-wide uppercase">Cartão</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('dinheiro')}
                        className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border transition-all text-center gap-1.5 cursor-pointer ${
                          paymentMethod === 'dinheiro'
                            ? 'bg-yellow-400 text-black border-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.25)] font-black'
                            : 'bg-[#1e1e22] text-zinc-300 border-neutral-850 hover:border-zinc-700 hover:text-white font-bold'
                        }`}
                      >
                        <Banknote className={`w-5 h-5 stroke-[2] ${paymentMethod === 'dinheiro' ? 'text-black' : 'text-zinc-400'}`} />
                        <span className="text-[10px] tracking-wide uppercase leading-tight">Dinheiro</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">
                      Observações ou Detalhes
                    </label>
                    <div className="relative">
                      <FileText className="w-4 h-4 text-zinc-400 absolute left-4 top-3.5" />
                      <textarea 
                        rows={2}
                        placeholder="Ex: Sem cebola, gelo e limão na dose, etc."
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                        className="w-full bg-[#1e1e22] border border-neutral-850 focus:border-yellow-400 rounded-2xl py-3.5 pl-11 pr-4 text-xs font-semibold outline-hidden transition-colors text-white resize-none placeholder-zinc-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Total Calculations summary */}
                <div className="bg-[#1e1e22] rounded-3xl border border-neutral-900 p-5 space-y-3 shadow-md">
                  <div className="flex justify-between items-center text-xs text-zinc-300 font-semibold">
                    <span>Subtotal dos Itens</span>
                    <span>{formatBRL(cartSubtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-zinc-300 font-semibold">
                    <span>Taxa de Entrega {deliveryDistance !== null ? `(${deliveryDistance} km)` : ''}</span>
                    <span>{deliveryDistance !== null ? formatBRL(deliveryFee) : 'A calcular'}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-neutral-800 pt-2.5 mt-1.5">
                    <span className="font-bold text-sm text-zinc-200">Total Geral</span>
                    <span className="font-display font-black text-lg text-[#facc15]">
                      {formatBRL(cartSubtotal + deliveryFee)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Drawer Footer (Buttons) */}
              <div className="p-5 pl-14 pr-6 border-t border-zinc-950/20 bg-transparent shrink-0">
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={!settings.isOpen}
                  className={`w-full py-4 text-black font-black rounded-3xl flex items-center justify-center space-x-2 shadow-lg transition-all ${
                    settings.isOpen 
                      ? 'bg-[#facc15] hover:bg-yellow-400 hover:-translate-y-0.5 cursor-pointer shadow-yellow-500/10' 
                      : 'bg-neutral-800 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  <MessageCircle className="w-5 h-5 fill-none stroke-black" />
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
