import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Store, Loader2, Lock } from 'lucide-react';
import MenuPage from './components/MenuPage';
import AdminPage from './components/AdminPage';
import { subscribeProducts, subscribeSettings, subscribeOrders } from './dbService';
import { Product, StoreSettings, Order } from './types';

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [path, setPath] = useState(window.location.pathname);

  // Hook to capture navigation history changes programmatically
  useEffect(() => {
    const handleLocationChange = () => {
      setPath(window.location.pathname);
    };

    const originalPushState = window.history.pushState;
    window.history.pushState = function (...args) {
      const result = originalPushState.apply(this, args);
      window.dispatchEvent(new Event('popstate'));
      return result;
    };

    const originalReplaceState = window.history.replaceState;
    window.history.replaceState = function (...args) {
      const result = originalReplaceState.apply(this, args);
      window.dispatchEvent(new Event('popstate'));
      return result;
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, []);

  // Listen to Firestore changes (Seeding happens inside these subscriptions if empty)
  useEffect(() => {
    let unsubProducts = () => {};
    let unsubSettings = () => {};
    let unsubOrders = () => {};

    // 1. Subscribe to settings
    unsubSettings = subscribeSettings((updatedSettings) => {
      setSettings(updatedSettings);
    });

    // 2. Subscribe to products
    unsubProducts = subscribeProducts((updatedProducts) => {
      setProducts(updatedProducts);
    });

    // 3. Subscribe to orders
    unsubOrders = subscribeOrders((updatedOrders) => {
      setOrders(updatedOrders);
      // Once both products and settings are loaded, stop loading indicator
      setLoading(false);
    });

    return () => {
      unsubProducts();
      unsubSettings();
      unsubOrders();
    };
  }, []);

  const navigateTo = (to: string) => {
    window.history.pushState({}, '', to);
  };

  // Render elegant loading splash
  if (loading || !settings) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center flex flex-col items-center max-w-sm"
        >
          <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
            <motion.img 
              src="https://i.ibb.co/2wtGGnh/logo2.png" 
              alt="Logo" 
              className="w-20 h-20 object-contain"
              animate={{ 
                scale: [1, 1.08, 1],
              }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              referrerPolicy="no-referrer"
            />
          </div>
          
          <h2 className="text-xl font-display font-extrabold text-white tracking-tight">
            Carregando cardápio...
          </h2>
          
          <p className="text-zinc-400 text-xs mt-2 flex items-center justify-center gap-1.5 font-medium">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-yellow-400" />
            <span>Sincronizando com o banco Firestore</span>
          </p>
        </motion.div>
      </div>
    );
  }

  // Determine path routing
  const isPainel = path.startsWith('/painel');

  return (
    <AnimatePresence mode="wait">
      {isPainel ? (
        <motion.div
          key="admin-page"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <AdminPage 
            products={products}
            settings={settings}
            orders={orders}
            onNavigateToMenu={() => navigateTo('/')}
          />
        </motion.div>
      ) : (
        <motion.div
          key="menu-page"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <MenuPage 
            products={products}
            settings={settings}
            onNavigateToAdmin={() => navigateTo('/painel')}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
