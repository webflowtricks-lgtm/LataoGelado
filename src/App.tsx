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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4"
        >
          <div className="inline-flex p-4 bg-slate-900 text-white rounded-2xl shadow-xl animate-bounce mb-2">
            <Store className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-display font-bold text-slate-800 tracking-tight">
            Carregando o Cardápio Digital...
          </h2>
          <div className="flex items-center justify-center space-x-2 text-slate-400 text-xs font-semibold">
            <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
            <span>Sincronizando com o banco Firestore</span>
          </div>
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
