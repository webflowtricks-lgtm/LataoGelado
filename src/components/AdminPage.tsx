import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Settings, 
  ClipboardList, 
  Utensils, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  MapPin, 
  Phone, 
  DollarSign, 
  Activity, 
  Sparkles, 
  X, 
  AlertTriangle,
  Store,
  Grid,
  Tags,
  ChevronDown,
  Crown,
  Upload,
  LogOut,
  Printer,
  Copy,
  Search,
  CreditCard,
  QrCode,
  Banknote
} from 'lucide-react';
import { Product, StoreSettings, Order, ProductCategory, Category } from '../types';
import { 
  addProduct, 
  updateProduct, 
  deleteProduct, 
  updateStoreSettings,
  updateOrderStatus
} from '../dbService';
import { ICON_MAP, getCategoryStyle } from './MenuPage';

interface AdminPageProps {
  products: Product[];
  settings: StoreSettings;
  orders: Order[];
  onNavigateToMenu: () => void;
  onLogout?: () => void;
}

const formatBRL = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export default function AdminPage({ products, settings, orders, onNavigateToMenu, onLogout }: AdminPageProps) {
  const [activeTab, setActiveTab] = useState<'pedidos' | 'produtos' | 'configuracoes'>('pedidos');
  
  // Order status filter ('todos' | 'pendentes' | 'pagos')
  const [orderFilter, setOrderFilter] = useState<'todos' | 'pendentes' | 'pagos'>('todos');
  
  // Custom dialog/alert state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmLabel?: string;
    confirmButtonClass?: string;
    iconType?: 'danger' | 'success';
  } | null>(null);
  const [customAlert, setCustomAlert] = useState<string | null>(null);

  // States for print modal and receipt copy
  const [printModalOrder, setPrintModalOrder] = useState<Order | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');

  // Product state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  
  // Product form fields
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodPrice, setProdPrice] = useState<number | ''>('');
  const [prodCat, setProdCat] = useState<ProductCategory>(settings.categories?.[0]?.id || 'lanches');
  const [prodImage, setProdImage] = useState('');
  const [prodAvailable, setProdAvailable] = useState(true);
  const [prodOrder, setProdOrder] = useState<number>(1);
  const [prodFeatured, setProdFeatured] = useState(false);

  // Category Management states
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catLabel, setCatLabel] = useState('');
  const [catIcon, setCatIcon] = useState('Flame');
  const [categorySuccess, setCategorySuccess] = useState<string | null>(null);

  // Settings form fields
  const [setStoreName, setSetStoreName] = useState(settings.storeName);
  const [setWhatsapp, setSetWhatsapp] = useState(settings.whatsappNumber);
  const [setAddress, setSetAddress] = useState(settings.address);
  const [setDeliveryFee, setSetDeliveryFee] = useState<number>(settings.deliveryFee);
  const [setIsOpen, setSetIsOpen] = useState(settings.isOpen);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Calculations for Admin Stats
  const stats = {
    totalRevenue: orders.reduce((sum, o) => sum + (o.total || 0), 0),
    totalOrders: orders.length,
    totalProducts: products.length,
    openStatus: settings.isOpen
  };

  // Open product form for creating
  const handleNewProductClick = () => {
    setEditingProduct(null);
    setProdName('');
    setProdDesc('');
    setProdPrice('');
    setProdCat(settings.categories?.[0]?.id || 'lanches');
    setProdImage('');
    setProdAvailable(true);
    setProdOrder(products.length + 1);
    setProdFeatured(false);
    setIsProductFormOpen(true);
  };

  // Open product form for editing
  const handleEditProductClick = (product: Product) => {
    setEditingProduct(product);
    setProdName(product.name);
    setProdDesc(product.description || '');
    setProdPrice(product.price);
    setProdCat(product.category);
    setProdImage(product.image || '');
    setProdAvailable(product.available);
    setProdOrder(product.order || 1);
    setProdFeatured(!!product.featured);
    setIsProductFormOpen(true);
  };

  // Submit Product Create or Edit
  const handleProductSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!prodName.trim() || prodPrice === '') return;

    const priceNum = typeof prodPrice === 'string' ? parseFloat(prodPrice) : prodPrice;
    
    const productData = {
      name: prodName.trim(),
      description: prodDesc.trim(),
      price: priceNum,
      category: prodCat,
      image: prodImage.trim(),
      available: prodAvailable,
      order: Number(prodOrder) || 1,
      featured: prodFeatured
    };

    try {
      if (editingProduct) {
        await updateProduct({
          ...productData,
          id: editingProduct.id
        });
      } else {
        await addProduct(productData);
      }
      setIsProductFormOpen(false);
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
    }
  };

  // Delete product
  const handleDeleteProduct = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Excluir Produto?",
      message: "Tem certeza de que deseja excluir este produto do cardápio permanentemente?",
      confirmLabel: "Excluir",
      confirmButtonClass: "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/10",
      iconType: "danger",
      onConfirm: async () => {
        try {
          await deleteProduct(id);
        } catch (error) {
          console.error("Erro ao excluir produto:", error);
        }
        setConfirmModal(null);
      }
    });
  };

  // Double confirmation workflow to mark an order as paid
  const handleMarkAsPaid = (order: Order) => {
    setConfirmModal({
      isOpen: true,
      title: "Confirmar Pagamento (Passo 1/2)",
      message: `Deseja marcar o pedido de ${order.customerName} (no valor de ${formatBRL(order.grandTotal)}) como PAGO?`,
      confirmLabel: "Confirmar",
      confirmButtonClass: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/10",
      iconType: "success",
      onConfirm: () => {
        setTimeout(() => {
          setConfirmModal({
            isOpen: true,
            title: "TEM CERTEZA ABSOLUTA? (Passo 2/2)",
            message: `Esta ação irá alterar o status de pagamento do pedido de ${order.customerName} permanentemente para EFETUADO. Confirmar?`,
            confirmLabel: "Confirmar",
            confirmButtonClass: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/10",
            iconType: "success",
            onConfirm: async () => {
              try {
                await updateOrderStatus(order.id, 'paid');
              } catch (error) {
                console.error("Erro ao atualizar status do pedido:", error);
              }
              setConfirmModal(null);
            }
          });
        }, 150);
      }
    });
  };

  // Double confirmation workflow to mark an order as pending
  const handleMarkAsPending = (order: Order) => {
    setConfirmModal({
      isOpen: true,
      title: "Alterar para Pendente (Passo 1/2)",
      message: `Deseja alterar o status do pedido de ${order.customerName} (no valor de ${formatBRL(order.grandTotal)}) para PENDENTE?`,
      confirmLabel: "Confirmar",
      confirmButtonClass: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/10",
      iconType: "warning",
      onConfirm: () => {
        setTimeout(() => {
          setConfirmModal({
            isOpen: true,
            title: "TEM CERTEZA ABSOLUTA? (Passo 2/2)",
            message: `Esta ação irá reverter o status do pedido de ${order.customerName} de Pago para PENDENTE. Confirmar?`,
            confirmLabel: "Confirmar",
            confirmButtonClass: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/10",
            iconType: "warning",
            onConfirm: async () => {
              try {
                await updateOrderStatus(order.id, 'pending');
              } catch (error) {
                console.error("Erro ao atualizar status do pedido:", error);
              }
              setConfirmModal(null);
            }
          });
        }, 150);
      }
    });
  };

  // Helper to generate the plain text representation of the order for copying
  const getPlainReceiptText = (order: Order) => {
    const dateFormatted = new Date(order.createdAt).toLocaleString('pt-BR');
    const border = '========================================';
    const divider = '----------------------------------------';
    const storeName = settings.storeName || 'CARDÁPIO DIGITAL';
    
    let text = `${border}\n`;
    text += `${storeName.toUpperCase().padEnd(40)}\n`;
    if (settings.whatsappNumber) text += `WhatsApp: ${settings.whatsappNumber}\n`;
    text += `${border}\n`;
    text += `PEDIDO: #${order.id.slice(-6).toUpperCase()}\n`;
    text += `DATA: ${dateFormatted}\n`;
    text += `CLIENTE: ${order.customerName}\n`;
    text += `STATUS: ${order.status === 'paid' ? 'PAGO' : 'PENDENTE'}\n`;
    text += `${divider}\n`;
    text += `QTD ITEM                      TOTAL\n`;
    text += `${divider}\n`;
    
    order.items.forEach(item => {
      const qtyStr = `${item.quantity}x `;
      const nameStr = item.name.slice(0, 24);
      const priceStr = formatBRL(item.price * item.quantity);
      // Format row nicely with spacing
      const rowStart = qtyStr + nameStr;
      const spacesNeeded = 40 - rowStart.length - priceStr.length;
      const spaces = spacesNeeded > 0 ? ' '.repeat(spacesNeeded) : ' ';
      text += `${rowStart}${spaces}${priceStr}\n`;
    });
    
    text += `${divider}\n`;
    
    const subtotalStr = formatBRL(order.total);
    const feeStr = formatBRL(order.deliveryFee);
    const totalStr = formatBRL(order.grandTotal);
    
    text += `Subtotal:`.padEnd(30) + subtotalStr.padStart(10) + '\n';
    text += `Taxa de Entrega:`.padEnd(30) + feeStr.padStart(10) + '\n';
    text += `${divider}\n`;
    text += `TOTAL GERAL:`.padEnd(30) + totalStr.padStart(10) + '\n';
    text += `${border}\n`;
    
    if (order.observations) {
      text += `OBSERVAÇÕES:\n${order.observations}\n`;
      text += `${border}\n`;
    }
    
    text += `Seu Happy Hour começa aqui!\n`;
    return text;
  };

  // Helper to generate the Blob URL for direct tab printing
  const getReceiptBlobUrl = (order: Order) => {
    const dateFormatted = new Date(order.createdAt).toLocaleString('pt-BR');
    const itemsHtml = order.items.map(item => `
      <tr style="border-bottom: 1px dashed #cccccc;">
        <td style="padding: 8px 0; font-size: 14px; font-weight: bold; font-family: monospace; text-align: left;">
          ${item.quantity}x ${item.name}
        </td>
        <td style="padding: 8px 0; text-align: right; font-size: 14px; font-family: monospace; font-weight: bold;">
          ${formatBRL(item.price * item.quantity)}
        </td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Pedido #${order.id.slice(-6).toUpperCase()}</title>
        <style>
          @media print {
            body { 
              margin: 0; 
              padding: 0; 
              width: 100%;
            }
            @page {
              margin: 0;
            }
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            color: #000000;
            margin: 0 auto;
            padding: 20px 15px;
            font-size: 14px;
            line-height: 1.5;
            max-width: 380px;
            background: #ffffff;
          }
          .header {
            border-bottom: 2px dashed #000000;
            padding-bottom: 12px;
            margin-bottom: 12px;
            text-align: center;
          }
          .header h2 {
            margin: 0 0 6px 0;
            font-size: 20px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .header p {
            margin: 3px 0;
            font-size: 12px;
          }
          .info {
            font-size: 13px;
            margin-bottom: 12px;
            border-bottom: 2px dashed #000000;
            padding-bottom: 10px;
          }
          .info p {
            margin: 4px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
          }
          th {
            border-bottom: 1px solid #000000;
            text-align: left;
            padding-bottom: 6px;
            font-size: 13px;
            text-transform: uppercase;
          }
          .totals {
            border-top: 2px dashed #000000;
            padding-top: 8px;
            margin-top: 8px;
            font-size: 13px;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
          }
          .grand-total {
            font-size: 16px;
            font-weight: bold;
            border-top: 2px dashed #000000;
            padding-top: 8px;
            margin-top: 8px;
          }
          .observations {
            margin-top: 15px;
            border: 1px dashed #000000;
            padding: 8px;
            font-size: 12px;
            background-color: #fafafa;
          }
          .footer {
            margin-top: 25px;
            text-align: center;
            font-size: 12px;
            border-top: 2px dashed #000000;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>${settings.storeName || 'Cardápio Digital'}</h2>
          ${settings.whatsappNumber ? `<p>Whats: ${settings.whatsappNumber}</p>` : ''}
          <p style="font-weight: bold; margin-top: 8px; font-size: 13px; letter-spacing: 1px;">=== SEU HAPPY HOUR COMEÇA AQUI! ===</p>
        </div>
        <div class="info">
          <p><strong>PEDIDO:</strong> #${order.id.slice(-6).toUpperCase()}</p>
          <p><strong>DATA:</strong> ${dateFormatted}</p>
          <p><strong>CLIENTE:</strong> ${order.customerName}</p>
          <p><strong>STATUS:</strong> ${order.status === 'paid' ? 'PAGO' : 'PENDENTE'}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th style="text-align: left;">Qtd/Item</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div class="totals">
          <div class="totals-row">
            <span>Subtotal:</span>
            <span>${formatBRL(order.total)}</span>
          </div>
          <div class="totals-row">
            <span>Taxa de Entrega:</span>
            <span>${formatBRL(order.deliveryFee)}</span>
          </div>
          <div class="totals-row grand-total">
            <span>TOTAL GERAL:</span>
            <span>${formatBRL(order.grandTotal)}</span>
          </div>
        </div>
        ${order.observations ? `
          <div class="observations">
            <strong>OBSERVAÇÕES:</strong><br/>
            ${order.observations}
          </div>
        ` : ''}
        <div class="footer">
          <p>Seu Happy Hour começa aqui!</p>
          <p style="font-size: 10px; color: #555555; margin-top: 6px;">Gerado em ${new Date().toLocaleString('pt-BR')}</p>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    return URL.createObjectURL(blob);
  };

  // Printer workflow for printing an order receipt (suitable for kitchen / thermal printing)
  const handlePrintOrder = (order: Order) => {
    setPrintModalOrder(order);
  };

  // Save general store settings
  const handleSettingsSave = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await updateStoreSettings({
        storeName: setStoreName.trim(),
        whatsappNumber: setWhatsapp.replace(/\s+/g, ''), // remove whitespace
        address: setAddress.trim(),
        deliveryFee: Number(setDeliveryFee) || 0,
        isOpen: setIsOpen
      });
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (error) {
      console.error("Erro ao atualizar configurações:", error);
    }
  };

  // Category management helper functions
  const handleCategorySave = async (e: FormEvent) => {
    e.preventDefault();
    if (!catLabel.trim()) return;

    const categoriesList = settings.categories || [];
    const lowerLabel = catLabel.trim().toLowerCase();
    
    const catId = editingCategory 
      ? editingCategory.id 
      : lowerLabel.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");

    let finalId = catId;
    if (!editingCategory) {
      let counter = 1;
      while (categoriesList.some(c => c.id === finalId)) {
        finalId = `${catId}-${counter}`;
        counter++;
      }
    }

    const updatedCategory: Category = {
      id: finalId,
      label: catLabel.trim(),
      icon: catIcon
    };

    let newCategories: Category[];
    if (editingCategory) {
      newCategories = categoriesList.map(c => c.id === editingCategory.id ? updatedCategory : c);
    } else {
      newCategories = [...categoriesList, updatedCategory];
    }

    try {
      await updateStoreSettings({
        ...settings,
        categories: newCategories
      });
      setCategorySuccess(editingCategory ? 'Categoria atualizada!' : 'Categoria cadastrada!');
      setTimeout(() => setCategorySuccess(null), 3000);
      
      setEditingCategory(null);
      setCatLabel('');
      setCatIcon('Flame');
    } catch (error) {
      console.error("Erro ao salvar categoria:", error);
    }
  };

  const handleDeleteCategory = (catId: string) => {
    const catProducts = products.filter(p => p.category === catId);
    let confirmMsg = "Tem certeza que deseja excluir esta categoria?";
    if (catProducts.length > 0) {
      confirmMsg = `Esta categoria possui ${catProducts.length} produtos cadastrados. Ao excluí-la, estes produtos serão agrupados em "Outros" no cardápio de clientes. Deseja continuar?`;
    }

    setConfirmModal({
      isOpen: true,
      title: "Excluir Categoria?",
      message: confirmMsg,
      confirmLabel: "Excluir",
      confirmButtonClass: "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/10",
      iconType: "danger",
      onConfirm: async () => {
        const categoriesList = settings.categories || [];
        const newCategories = categoriesList.filter(c => c.id !== catId);

        try {
          await updateStoreSettings({
            ...settings,
            categories: newCategories
          });
          setCategorySuccess('Categoria removida!');
          setTimeout(() => setCategorySuccess(null), 3000);
        } catch (error) {
          console.error("Erro ao remover categoria:", error);
        }
        setConfirmModal(null);
      }
    });
  };

  const handleEditCategoryStart = (cat: Category) => {
    setEditingCategory(cat);
    setCatLabel(cat.label);
    setCatIcon(cat.icon);
  };

  const handleCancelCategoryEdit = () => {
    setEditingCategory(null);
    setCatLabel('');
    setCatIcon('Flame');
  };

  // Quick toggle product availability
  const toggleAvailability = async (product: Product) => {
    try {
      await updateProduct({
        ...product,
        available: !product.available
      });
    } catch (error) {
      console.error("Erro ao alternar disponibilidade:", error);
    }
  };

  // Quick toggle product featured status
  const toggleFeatured = async (product: Product) => {
    try {
      await updateProduct({
        ...product,
        featured: !product.featured
      });
    } catch (error) {
      console.error("Erro ao alternar destaque do produto:", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Top Admin Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-20 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button 
              onClick={onNavigateToMenu}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Voltar ao Cardápio"
            >
              <ArrowLeft className="w-5 h-5 text-slate-300" />
            </button>
            <div className="h-6 w-px bg-slate-800" />
            <div className="flex items-center space-x-2">
              <span className="text-amber-400 font-extrabold text-sm uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                Admin
              </span>
              <h1 className="font-display font-bold text-lg tracking-tight">Painel de Controle</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-xs font-semibold bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
              <Store className="w-4 h-4 text-slate-400" />
              <span className="text-slate-200">{settings.storeName}</span>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                className="p-2 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-rose-400 rounded-lg transition-colors cursor-pointer border border-slate-700"
                title="Sair do Painel"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Admin Stage */}
      <main className="max-w-6xl mx-auto px-4 mt-6">
        
       

        {/* Tab Navigation Rail */}
        <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('pedidos')}
            className={`flex items-center space-x-2 px-5 py-3 border-b-2 font-semibold text-sm transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'pedidos'
                ? 'border-slate-900 text-slate-900 bg-slate-100/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Registro de Pedidos ({orders.length})</span>
          </button>
          
          <button
            onClick={() => setActiveTab('produtos')}
            className={`flex items-center space-x-2 px-5 py-3 border-b-2 font-semibold text-sm transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'produtos'
                ? 'border-slate-900 text-slate-900 bg-slate-100/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Utensils className="w-4 h-4" />
            <span>Gerenciar Cardápio ({products.length})</span>
          </button>
          
          <button
            onClick={() => setActiveTab('configuracoes')}
            className={`flex items-center space-x-2 px-5 py-3 border-b-2 font-semibold text-sm transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'configuracoes'
                ? 'border-slate-900 text-slate-900 bg-slate-100/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Configurações Loja</span>
          </button>
        </div>

        {/* Render Tab Contents */}
        <div>
          {/* TAB 1: LOGGED ORDERS */}
          {activeTab === 'pedidos' && (
            <div className="space-y-4 animate-fade-in">
              {/* Order Status & Search Filters */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex-1 max-w-md relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar por nome do cliente ou nº do pedido..."
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 text-slate-800 text-xs rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 placeholder:text-slate-400 font-medium shadow-3xs"
                  />
                  {orderSearchQuery && (
                    <button
                      onClick={() => setOrderSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 text-[10px] font-bold cursor-pointer"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="hidden sm:block text-right">
                    <h3 className="text-[10px] font-display font-bold text-slate-800 uppercase tracking-wider">Filtrar por Status</h3>
                  </div>
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto shrink-0">
                    <button
                      onClick={() => setOrderFilter('todos')}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                        orderFilter === 'todos'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Todos ({orders.length})
                    </button>
                    <button
                      onClick={() => setOrderFilter('pendentes')}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                        orderFilter === 'pendentes'
                          ? 'bg-white text-rose-600 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Pendentes ({orders.filter(o => o.status !== 'paid').length})
                    </button>
                    <button
                      onClick={() => setOrderFilter('pagos')}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                        orderFilter === 'pagos'
                          ? 'bg-white text-emerald-600 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Pagos ({orders.filter(o => o.status === 'paid').length})
                    </button>
                  </div>
                </div>
              </div>

              {(() => {
                const filteredOrders = orders.filter((order) => {
                  const isPaid = order.status === 'paid';
                  if (orderFilter === 'pendentes' && isPaid) return false;
                  if (orderFilter === 'pagos' && !isPaid) return false;

                  if (orderSearchQuery.trim() !== '') {
                    const query = orderSearchQuery.toLowerCase().trim();
                    const nameMatch = order.customerName.toLowerCase().includes(query);
                    const idMatch = order.id.toLowerCase().includes(query) ||
                                    `#${order.id.slice(-6).toUpperCase()}`.toLowerCase().includes(query) ||
                                    order.id.slice(-6).toLowerCase().includes(query);
                    return nameMatch || idMatch;
                  }

                  return true;
                });

                if (filteredOrders.length === 0) {
                  return (
                    <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-xs">
                      <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <h3 className="font-bold text-slate-800">Nenhum pedido encontrado</h3>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        {orderSearchQuery.trim() !== ''
                          ? 'Nenhum pedido corresponde à sua busca por "' + orderSearchQuery + '".'
                          : orderFilter === 'todos' 
                          ? 'Os pedidos efetuados pelos clientes no cardápio serão listados aqui em tempo real.'
                          : orderFilter === 'pendentes'
                          ? 'Não há nenhum pedido com pagamento pendente.'
                          : 'Não há nenhum pedido com pagamento efetuado.'}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredOrders.map((order) => {
                      const dateFormatted = new Date(order.createdAt).toLocaleString('pt-BR');
                      const isPaid = order.status === 'paid';
                      return (
                        <div 
                          key={order.id}
                          className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden"
                        >
                          {/* Decorative Top Accent */}
                          <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
                            isPaid ? 'from-emerald-400 to-teal-500' : 'from-amber-400 to-orange-500'
                          }`} />
                          
                          <div className="flex justify-between items-start mb-3.5">
                            <div>
                              <div className="flex items-center gap-1.5 min-w-0">
                                <h3 className="font-display font-black text-sm text-slate-900 truncate max-w-[150px]" title={order.customerName}>
                                  {order.customerName}
                                </h3>
                                <span className="text-[10px] text-slate-400 font-mono font-semibold select-all bg-slate-50 border border-slate-100 rounded px-1 py-0.5 shrink-0">
                                  #{order.id.slice(-6).toUpperCase()}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{dateFormatted}</p>
                            </div>
                            
                            <div className="flex items-center space-x-1.5 shrink-0">
                              <button
                                onClick={() => handlePrintOrder(order)}
                                title="Imprimir Pedido"
                                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all cursor-pointer flex items-center justify-center border border-slate-200 bg-slate-50/50 shadow-3xs"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              {isPaid ? (
                                <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-md font-bold text-[10px] border border-emerald-100 flex items-center space-x-1 shrink-0">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                  <span>Pago</span>
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 rounded-md font-bold text-[10px] border border-amber-100 flex items-center space-x-1 shrink-0">
                                  <AlertTriangle className="w-3 h-3 stroke-[2.5]" />
                                  <span>Pendente</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Order Products List */}
                          <div className="space-y-2 py-3 border-y border-slate-100">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-xs font-medium text-slate-600">
                                <span>
                                  <span className="font-bold text-slate-900">{item.quantity}x</span> {item.name}
                                </span>
                                <span className="font-semibold text-slate-800">{formatBRL(item.price * item.quantity)}</span>
                              </div>
                            ))}
                          </div>

                          {/* Observations */}
                          {order.observations && (
                            <div className="mt-3 bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Observações:</p>
                              <p className="text-xs font-medium text-slate-700 mt-0.5 leading-relaxed">
                                {order.observations}
                              </p>
                            </div>
                          )}

                          {/* Payment Method */}
                          <div className="mt-3 bg-emerald-50 rounded-lg p-2.5 border border-emerald-100 text-emerald-900 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {(!order.paymentMethod || order.paymentMethod === 'pix') && <QrCode className="w-4 h-4 text-emerald-600 shrink-0" />}
                              {order.paymentMethod === 'cartao' && <CreditCard className="w-4 h-4 text-emerald-600 shrink-0" />}
                              {order.paymentMethod === 'dinheiro' && <Banknote className="w-4 h-4 text-emerald-600 shrink-0" />}
                              <div>
                                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Forma de Pagamento:</p>
                                <p className="text-xs font-black text-emerald-950 mt-0.5">
                                  {order.paymentMethod === 'pix' && 'Pix'}
                                  {order.paymentMethod === 'cartao' && 'Cartão'}
                                  {order.paymentMethod === 'dinheiro' && 'Na entrega (dinheiro)'}
                                  {!order.paymentMethod && 'Pix (Padrão)'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Delivery Address */}
                          {order.deliveryAddress && (
                            <div className="mt-3 bg-indigo-50/50 rounded-lg p-2.5 border border-indigo-100 text-indigo-900">
                              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-indigo-500" />
                                Endereço de Entrega:
                              </p>
                              <p className="text-xs font-semibold text-indigo-950 mt-0.5 leading-relaxed">
                                {order.deliveryAddress}
                              </p>
                              {order.distance && (
                                <p className="text-[10px] font-bold text-indigo-400 mt-1">
                                  Distância: <span className="text-indigo-600 font-extrabold">{order.distance} km</span>
                                </p>
                              )}
                            </div>
                          )}

                          {/* Pricing details */}
                          <div className="mt-4 flex items-center justify-between">
                            <div>
                              <p className="text-[10px] font-semibold text-slate-400 uppercase">Total Geral</p>
                              <p className="font-display font-extrabold text-base text-slate-900">
                                {formatBRL(order.grandTotal)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] text-slate-400 font-medium">Taxa: {formatBRL(order.deliveryFee)}</p>
                              <p className="text-[9px] text-slate-400 font-medium">Subtotal: {formatBRL(order.total)}</p>
                            </div>
                          </div>

                          {/* Order Payment Confirmation Action */}
                          {isPaid ? (
                            <div className="mt-4 pt-3.5 border-t border-dashed border-slate-150 flex justify-end">
                              <button
                                onClick={() => handleMarkAsPending(order)}
                                className="w-full bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-extrabold text-xs py-2.5 rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs transition-all hover:scale-[1.02]"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Alterar para Pendente</span>
                              </button>
                            </div>
                          ) : (
                            <div className="mt-4 pt-3.5 border-t border-dashed border-slate-150 flex justify-end">
                              <button
                                onClick={() => handleMarkAsPaid(order)}
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-2.5 rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs transition-all hover:scale-[1.02]"
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                <span>Confirmar Pagamento</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 2: MANAGE PRODUCTS */}
          {activeTab === 'produtos' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-display font-bold text-slate-800">Itens do Cardápio</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Adicione, edite ou pause produtos no cardápio</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsCategoryModalOpen(true)}
                    className="inline-flex items-center space-x-1.5 border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer transition-transform hover:-translate-y-0.5 shadow-xs"
                  >
                    <Tags className="w-4 h-4 text-slate-500" />
                    <span>Categorias</span>
                  </button>
                  <button
                    onClick={handleNewProductClick}
                    className="inline-flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md cursor-pointer transition-transform hover:-translate-y-0.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Novo Produto</span>
                  </button>
                </div>
              </div>

              {/* Grouped by Categories */}
              <div className="space-y-8">
                {(() => {
                  const categoriesList = settings.categories || [];
                  const activeCatIds = new Set(categoriesList.map(c => c.id));
                  const orphanedProducts = products.filter(p => !activeCatIds.has(p.category));

                  const displayGroups = [...categoriesList];
                  if (orphanedProducts.length > 0) {
                    displayGroups.push({ id: 'outros', label: 'Outros (Sem Categoria Ativa)', icon: 'Grid' });
                  }

                  return displayGroups.map((cat, idx) => {
                    const catProducts = products.filter(p => {
                      if (cat.id === 'outros') {
                        return !activeCatIds.has(p.category);
                      }
                      return p.category === cat.id;
                    });

                    const Icon = cat.id === 'vodkas' ? (ICON_MAP.BottleWine || Grid) : (ICON_MAP[cat.icon] || Grid);
                    const style = getCategoryStyle(cat.id, idx);

                    return (
                      <div key={cat.id} className="space-y-3">
                        <div className="flex items-center space-x-2.5 pb-1.5 border-b border-slate-200">
                          <div className={`p-1 rounded-md border ${style.bg}`}>
                            <Icon className="w-4.5 h-4.5" />
                          </div>
                          <h3 className="font-display font-bold text-sm text-slate-800">
                            {cat.label}
                          </h3>
                          <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-1.5 py-0.5 rounded-full">
                            {catProducts.length} itens
                          </span>
                        </div>

                        {catProducts.length === 0 ? (
                          <p className="text-xs text-slate-400 italic py-2 pl-4">Nenhum produto cadastrado nesta categoria.</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {catProducts.map((p) => (
                              <div 
                                key={p.id}
                                className={`bg-white rounded-xl border p-4 flex justify-between items-center transition-all ${
                                  p.available ? 'border-slate-100' : 'border-rose-100 bg-rose-50/10 opacity-70'
                                }`}
                              >
                                <div className="flex items-center space-x-3.5 min-w-0 flex-1 pr-4">
                                  <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-150 shrink-0 overflow-hidden flex items-center justify-center">
                                    {p.image ? (
                                      <img 
                                        src={p.image} 
                                        alt={p.name} 
                                        className="w-full h-full object-cover" 
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <Icon className="w-5 h-5 text-slate-400" />
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center space-x-2">
                                      <h4 className="font-bold text-sm text-slate-900 truncate">{p.name}</h4>
                                      {p.featured && (
                                        <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" title="Item em Destaque" />
                                      )}
                                      <span className="text-[10px] text-slate-400 font-mono">Pos: {p.order || 1}</span>
                                    </div>
                                    <p className="text-slate-400 text-[11px] truncate mt-0.5">{p.description || 'Sem descrição'}</p>
                                    <p className="font-bold text-slate-800 text-xs mt-1">{formatBRL(p.price)}</p>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-2 shrink-0">
                                  {/* Featured Toggle Button */}
                                  <button
                                    onClick={() => toggleFeatured(p)}
                                    className={`p-2 rounded-lg transition-colors cursor-pointer ${
                                      p.featured 
                                        ? 'bg-amber-100 hover:bg-amber-200 text-amber-600' 
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600'
                                    }`}
                                    title={p.featured ? "Remover de Destaque" : "Destacar no Banner"}
                                  >
                                    <Crown className={`w-3.5 h-3.5 ${p.featured ? 'fill-amber-500' : ''}`} />
                                  </button>

                                  {/* Availability toggle switch */}
                                  <button
                                    onClick={() => toggleAvailability(p)}
                                    className={`w-11 h-6 rounded-full p-1 transition-colors relative cursor-pointer ${
                                      p.available ? 'bg-emerald-500' : 'bg-slate-300'
                                    }`}
                                    title={p.available ? "Marcar como Esgotado" : "Disponibilizar"}
                                  >
                                    <div className={`bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${
                                      p.available ? 'translate-x-5' : 'translate-x-0'
                                    }`} />
                                  </button>

                                  {/* Edit Button */}
                                  <button
                                    onClick={() => handleEditProductClick(p)}
                                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer"
                                    title="Editar Produto"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Delete Button */}
                                  <button
                                    onClick={() => handleDeleteProduct(p.id)}
                                    className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                                    title="Excluir Produto"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* TAB 3: CONFIGURATIONS */}
          {activeTab === 'configuracoes' && (
            <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-100 p-6 shadow-xs animate-fade-in">
              <div className="flex items-center space-x-2 pb-4 border-b border-slate-100 mb-6">
                <Settings className="w-5 h-5 text-slate-400" />
                <h2 className="text-base font-display font-bold text-slate-800">Dados do Estabelecimento</h2>
              </div>

              {settingsSuccess && (
                <div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs rounded-xl flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Configurações salvas e atualizadas com sucesso!</span>
                </div>
              )}

              <form onSubmit={handleSettingsSave} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nome do Estabelecimento
                  </label>
                  <input
                    type="text"
                    required
                    value={setStoreName}
                    onChange={(e) => setSetStoreName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-slate-900 rounded-xl py-3 px-4 text-sm font-medium outline-hidden transition-colors text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Número de WhatsApp (Receber pedidos)
                  </label>
                  <div className="relative">
                    <Phone className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="DDI + DDD + Número (ex: 5511999999999)"
                      value={setWhatsapp}
                      onChange={(e) => setSetWhatsapp(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-slate-900 rounded-xl py-3 pl-11 pr-4 text-sm font-medium outline-hidden transition-colors text-slate-800"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">
                    Insira sem traços ou parênteses. Deve conter o código do país (Brasil é 55). Exemplo: 5511999999999
                  </p>
                </div>



                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">Funcionamento da Loja</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Controla se os clientes conseguem enviar pedidos</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSetIsOpen(!setIsOpen)}
                    className={`w-14 h-7 rounded-full p-1 transition-colors relative cursor-pointer flex items-center ${
                      setIsOpen ? 'bg-teal-500' : 'bg-slate-300'
                    }`}
                  >
                    <div className={`bg-white w-5 h-5 rounded-full shadow-sm transition-transform ${
                      setIsOpen ? 'translate-x-7' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all hover:-translate-y-0.5 cursor-pointer mt-4"
                >
                  Salvar Configurações
                </button>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Product Form Modal (Used for Create and Edit) */}
      <AnimatePresence>
        {isProductFormOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProductFormOpen(false)}
              className="fixed inset-0 bg-black z-40"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-5">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-slate-900 text-white rounded-lg">
                    <Utensils className="w-5 h-5" />
                  </div>
                  <h3 className="font-display font-bold text-slate-900 text-base">
                    {editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsProductFormOpen(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleProductSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nome do Produto
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Coxinha Cremosa"
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-slate-900 rounded-xl py-2.5 px-4 text-sm font-medium outline-hidden transition-colors text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Categoria
                  </label>
                  <select
                    value={prodCat}
                    onChange={(e) => setProdCat(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-slate-900 rounded-xl py-2.5 px-4 text-sm font-medium outline-hidden transition-colors text-slate-800"
                  >
                    {(settings.categories || []).map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                    {prodCat && !(settings.categories || []).some(c => c.id === prodCat) && (
                      <option value={prodCat}>{prodCat}</option>
                    )}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Preço (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={prodPrice}
                      onChange={(e) => setProdPrice(e.target.value !== '' ? parseFloat(e.target.value) : '')}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-slate-900 rounded-xl py-2.5 px-4 text-sm font-medium outline-hidden transition-colors text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Ordem de Exibição
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="1"
                      value={prodOrder}
                      onChange={(e) => setProdOrder(parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-slate-900 rounded-xl py-2.5 px-4 text-sm font-medium outline-hidden transition-colors text-slate-800"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Ordem sequencial na lista</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Descrição do Item
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ex: Massa leve, frita por fora recheada com carne moída selecionada e especiarias..."
                    value={prodDesc}
                    onChange={(e) => setProdDesc(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-slate-900 rounded-xl py-2.5 px-4 text-sm font-medium outline-hidden transition-colors text-slate-800 resize-none"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Imagem do Produto (Link ou Upload do Dispositivo)
                    </label>
                    <span className="text-[10px] text-slate-400 font-semibold">(Opcional)</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2.5 mb-2">
                    <input
                      type="url"
                      placeholder="Cole o link de uma imagem da internet"
                      value={prodImage}
                      onChange={(e) => setProdImage(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 focus:border-slate-900 rounded-xl py-2.5 px-4 text-sm font-medium outline-hidden transition-colors text-slate-800"
                    />
                    <label className="sm:shrink-0 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-250 hover:border-slate-350 font-bold text-xs rounded-xl cursor-pointer transition-all flex items-center justify-center space-x-2 select-none active:scale-95">
                      <Upload className="w-4 h-4 text-slate-600" />
                      <span>Fazer Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Max 2MB file limit to prevent huge Firestore payload sizes
                            if (file.size > 2 * 1024 * 1024) {
                              setCustomAlert("Selecione uma imagem menor que 2MB para garantir o salvamento correto no banco de dados.");
                              return;
                            }
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              if (typeof reader.result === 'string') {
                                setProdImage(reader.result);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                  
                  {prodImage && (
                    <div className="mt-2.5 relative w-full h-32 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center group">
                      <img 
                        src={prodImage} 
                        alt="Pré-visualização" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setProdImage('')}
                        className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors cursor-pointer"
                        title="Remover Imagem"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="mt-2">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Escolha rápida (Sugestões):</p>
                    <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-50 rounded-lg border border-slate-100 max-h-[76px] overflow-y-auto">
                      {[
                        { label: '🍔 Hambúrguer', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60' },
                        { label: '🍟 Coxinha / Fritos', url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500&auto=format&fit=crop&q=60' },
                        { label: '🧀 Bolinha Queijo', url: 'https://images.unsplash.com/photo-1548340748-6d2b7d7db701?w=500&auto=format&fit=crop&q=60' },
                        { label: '🥟 Pastel / Snacks', url: 'https://images.unsplash.com/photo-1585325701165-351af916e5ec?w=500&auto=format&fit=crop&q=60' },
                        { label: '🍹 Caipirinha', url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60' },
                        { label: '🍸 Gin Tônica', url: 'https://images.unsplash.com/photo-1574085733277-851d9d856a3a?w=500&auto=format&fit=crop&q=60' },
                        { label: '🍺 Cerveja Gelada', url: 'https://images.unsplash.com/photo-1600788886242-5c96aabe3757?w=500&auto=format&fit=crop&q=60' },
                        { label: '🥤 Coca-Cola / Refri', url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=60' },
                        { label: '💧 Água Mineral', url: 'https://images.unsplash.com/photo-1608885898957-a599fb1b468b?w=500&auto=format&fit=crop&q=60' },
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setProdImage(preset.url)}
                          className="px-2 py-1 text-[10px] bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-md transition-colors cursor-pointer font-medium"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">Disponível para venda</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Define se o produto pode ser selecionado pelos clientes</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProdAvailable(!prodAvailable)}
                    className={`w-11 h-6 rounded-full p-1 transition-colors relative cursor-pointer ${
                      prodAvailable ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${
                      prodAvailable ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-slate-800 flex items-center">
                      <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-400 mr-1.5 shrink-0" />
                      Destacar no banner de destaque rotativo
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Define se o produto aparecerá no topo do cardápio do cliente</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProdFeatured(!prodFeatured)}
                    className={`w-11 h-6 rounded-full p-1 transition-colors relative cursor-pointer ${
                      prodFeatured ? 'bg-amber-500' : 'bg-slate-300'
                    }`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${
                      prodFeatured ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                <div className="pt-3 flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsProductFormOpen(false)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors text-center"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer transition-all hover:-translate-y-0.5 text-center shadow-md"
                  >
                    Salvar Produto
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Category Management Modal */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!editingCategory) setIsCategoryModalOpen(false);
              }}
              className="fixed inset-0 bg-black z-40"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl bg-white rounded-2xl shadow-2xl z-50 p-6 max-h-[90vh] flex flex-col"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-5 shrink-0">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-slate-900 text-white rounded-lg">
                    <Tags className="w-5 h-5" />
                  </div>
                  <h3 className="font-display font-bold text-slate-900 text-base">
                    Gerenciar Categorias
                  </h3>
                </div>
                <button
                  onClick={() => {
                    handleCancelCategoryEdit();
                    setIsCategoryModalOpen(false);
                  }}
                  className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-6">
                {categorySuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl text-xs font-bold flex items-center space-x-2 animate-fade-in shrink-0">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{categorySuccess}</span>
                  </div>
                )}

                {/* Form to Create/Edit */}
                <form onSubmit={handleCategorySave} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-4">
                  <h4 className="font-display font-bold text-xs text-slate-800 uppercase tracking-wide">
                    {editingCategory ? '✏️ Editar Categoria' : 'Nova Categoria'}
                  </h4>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Nome da Categoria
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Pizzas, Sobremesas, Vinhos"
                      value={catLabel}
                      onChange={(e) => setCatLabel(e.target.value)}
                      className="w-full bg-white border border-slate-200 focus:border-slate-900 rounded-xl py-2 px-3 text-sm font-medium outline-hidden transition-colors text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Ícone de Destaque
                    </label>
                    <div className="grid grid-cols-5 gap-2 bg-white rounded-xl p-2.5 border border-slate-200">
                      {Object.keys(ICON_MAP).map((iconKey) => {
                        const IconComp = ICON_MAP[iconKey];
                        const isSelected = catIcon === iconKey;
                        return (
                          <button
                            key={iconKey}
                            type="button"
                            onClick={() => setCatIcon(iconKey)}
                            className={`p-2 rounded-lg border flex flex-col items-center justify-center transition-all cursor-pointer ${
                              isSelected 
                                ? 'bg-slate-900 border-slate-900 text-white' 
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-150 text-slate-500 hover:text-slate-800'
                            }`}
                            title={iconKey}
                          >
                            <IconComp className="w-4 h-4 mb-0.5" />
                            <span className="text-[8px] font-bold truncate max-w-full text-center">{iconKey}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex space-x-2 pt-1">
                    {editingCategory && (
                      <button
                        type="button"
                        onClick={handleCancelCategoryEdit}
                        className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                      >
                        Cancelar
                      </button>
                    )}
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer transition-all hover:-translate-y-0.5 shadow-md text-center"
                    >
                      {editingCategory ? 'Salvar Alteração' : 'Criar Categoria'}
                    </button>
                  </div>
                </form>

                {/* List of current categories */}
                <div className="space-y-3">
                  <h4 className="font-display font-bold text-xs text-slate-500 uppercase tracking-wide">
                    Categorias Cadastradas ({ (settings.categories || []).length })
                  </h4>
                  
                  <div className="space-y-1.5">
                    {(settings.categories || []).map((cat, idx) => {
                      const IconComp = cat.id === 'vodkas' ? (ICON_MAP.BottleWine || Grid) : (ICON_MAP[cat.icon] || Grid);
                      const style = getCategoryStyle(cat.id, idx);
                      const catProducts = products.filter(p => p.category === cat.id);
                      
                      return (
                        <div 
                          key={cat.id}
                          className="bg-white rounded-xl border border-slate-150 p-3 flex items-center justify-between shadow-xs hover:border-slate-300 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg border ${style.bg}`}>
                              <IconComp className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold text-xs text-slate-900">{cat.label}</p>
                              <p className="text-[10px] text-slate-400 font-medium">ID: {cat.id} • {catProducts.length} itens</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5">
                            <button
                              onClick={() => handleEditCategoryStart(cat)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer"
                              title="Editar Nome/Ícone"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                              title="Remover Categoria"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Custom Confirmation Dialog */}
      <AnimatePresence>
        {confirmModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal(null)}
              className="fixed inset-0 bg-black z-[100]"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-3xl shadow-2xl z-[101] p-6 text-center border border-slate-100"
            >
              {confirmModal.iconType === 'success' ? (
                <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
              ) : (
                <div className="w-12 h-12 bg-rose-50 border border-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-6 h-6 animate-pulse" />
                </div>
              )}
              
              <h3 className="font-display font-bold text-slate-900 text-base mb-2">
                {confirmModal.title}
              </h3>
              
              <p className="text-slate-500 text-xs font-medium leading-relaxed mb-6">
                {confirmModal.message}
              </p>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmModal.onConfirm}
                  className={`flex-1 py-3 font-bold text-xs rounded-xl cursor-pointer transition-colors shadow-md ${
                    confirmModal.confirmButtonClass || 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/10'
                  }`}
                >
                  {confirmModal.confirmLabel || 'Excluir'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Custom Alert Dialog */}
      <AnimatePresence>
        {customAlert && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setCustomAlert(null)}
              className="fixed inset-0 bg-[#0c0c0d]/80 z-[100] backdrop-blur-xs"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-3xl shadow-2xl z-[101] p-6 text-center border border-slate-100"
            >
              <div className="w-12 h-12 bg-amber-50 border border-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>
              
              <h3 className="font-display font-bold text-slate-900 text-base mb-2">
                Atenção
              </h3>
              
              <p className="text-slate-500 text-xs font-medium leading-relaxed mb-6">
                {customAlert}
              </p>
              
              <button
                type="button"
                onClick={() => setCustomAlert(null)}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors shadow-md"
              >
                Entendido
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Visual Print and Receipt Modal */}
      <AnimatePresence>
        {printModalOrder && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setPrintModalOrder(null)}
              className="fixed inset-0 bg-[#0c0c0d] z-[110] backdrop-blur-xs"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-slate-100 rounded-3xl shadow-2xl z-[111] p-5 max-h-[95vh] flex flex-col border border-slate-200"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center pb-3 border-b border-slate-200 mb-4 shrink-0">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-slate-900 text-white rounded-lg">
                    <Printer className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-slate-900 text-sm">
                      Comprovante do Pedido
                    </h3>
                    <p className="text-[10px] text-slate-400 font-semibold">
                      #{printModalOrder.id.slice(-6).toUpperCase()} • {printModalOrder.customerName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setPrintModalOrder(null)}
                  className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body with thermal receipt preview */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-4 mb-4 select-text">
                <div className="relative bg-white border border-slate-200 rounded-2xl p-5 shadow-xs font-mono text-slate-800 text-xs overflow-hidden leading-relaxed">
                  {/* Decorative top border visual */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-900" />
                  
                  {/* Receipt content wrapper */}
                  <div className="text-center pb-3 border-b border-dashed border-slate-300">
                    <h4 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
                      {settings.storeName || 'Cardápio Digital'}
                    </h4>
                    {settings.whatsappNumber && <p className="text-[10px] text-slate-500 mt-0.5">Whats: {settings.whatsappNumber}</p>}
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">=== SEU HAPPY HOUR COMEÇA AQUI! ===</p>
                  </div>

                  {/* Info details */}
                  <div className="py-2.5 border-b border-dashed border-slate-300 text-[11px] space-y-0.5">
                    <p><strong>PEDIDO:</strong> #{printModalOrder.id.slice(-6).toUpperCase()}</p>
                    <p><strong>DATA:</strong> {new Date(printModalOrder.createdAt).toLocaleString('pt-BR')}</p>
                    <p><strong>CLIENTE:</strong> {printModalOrder.customerName}</p>
                    <p><strong>PAGAMENTO:</strong> {printModalOrder.status === 'paid' ? 'PAGO' : 'PENDENTE'}</p>
                  </div>

                  {/* Table header */}
                  <table className="w-full text-left my-2.5">
                    <thead>
                      <tr className="border-b border-slate-300 text-[10px] text-slate-400 font-bold">
                        <th className="pb-1 font-mono">Qtd/Item</th>
                        <th className="pb-1 font-mono text-right">Preço</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dashed divide-slate-150">
                      {printModalOrder.items.map((item, idx) => (
                        <tr key={idx} className="text-[11px]">
                          <td className="py-2 pr-2 font-bold text-slate-900">
                            {item.quantity}x {item.name}
                          </td>
                          <td className="py-2 text-right text-slate-700">
                            {formatBRL(item.price * item.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totals */}
                  <div className="pt-2.5 border-t border-dashed border-slate-300 text-[11px] space-y-1">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatBRL(printModalOrder.total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taxa de Entrega:</span>
                      <span>{formatBRL(printModalOrder.deliveryFee)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm text-slate-900 pt-1.5 border-t border-dashed border-slate-200">
                      <span>TOTAL:</span>
                      <span>{formatBRL(printModalOrder.grandTotal)}</span>
                    </div>
                  </div>

                  {/* Observations */}
                  {printModalOrder.observations && (
                    <div className="mt-4 p-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] leading-normal">
                      <strong className="text-slate-400">OBSERVAÇÕES:</strong>
                      <p className="mt-0.5 font-medium text-slate-700 whitespace-pre-line">{printModalOrder.observations}</p>
                    </div>
                  )}

                  <div className="text-center text-[10px] text-slate-400 mt-5 pt-2 border-t border-dashed border-slate-200">
                    <p>Seu Happy Hour começa aqui!</p>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="grid grid-cols-2 gap-3 shrink-0">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(getPlainReceiptText(printModalOrder));
                      setCopiedText(true);
                      setTimeout(() => setCopiedText(false), 2000);
                    } catch (err) {
                      console.error("Erro ao copiar texto:", err);
                    }
                  }}
                  className="py-3 px-2 bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors flex items-center justify-center space-x-1.5 shadow-sm"
                >
                  {copiedText ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                      <span className="text-emerald-400">Texto Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Texto</span>
                    </>
                  )}
                </button>
                
                <a
                  href={getReceiptBlobUrl(printModalOrder)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-all flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-600/15 hover:scale-[1.02]"
                >
                  <Printer className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Imprimir Nota</span>
                </a>
              </div>
              <p className="text-[10px] text-slate-400 text-center font-medium mt-3">
                Dica: O botão <strong className="text-slate-500">Imprimir Nota</strong> abre uma nova aba imune a bloqueios para impressão direta em impressoras térmicas ou papel A4!
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
