import { collection, doc, onSnapshot, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { Product, StoreSettings, Order } from './types';
import { DEFAULT_SETTINGS, INITIAL_PRODUCTS, DEFAULT_CATEGORIES } from './data';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Envia o erro no formato JSON esperado pelo sistema para diagnóstico de regras do Firestore.
 */
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Subscribes to the store settings.
 * Seeds DEFAULT_SETTINGS if they do not exist.
 */
export function subscribeSettings(onUpdate: (settings: StoreSettings) => void) {
  const docRef = doc(db, 'settings', 'store');
  const pathForSettings = 'settings/store';
  
  return onSnapshot(docRef, async (snapshot) => {
    if (!snapshot.exists()) {
      try {
        await setDoc(docRef, DEFAULT_SETTINGS);
        onUpdate(DEFAULT_SETTINGS);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, pathForSettings);
      }
    } else {
      const data = snapshot.data() as StoreSettings;
      if (!data.categories || !Array.isArray(data.categories)) {
        data.categories = DEFAULT_CATEGORIES;
      }
      onUpdate(data);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, pathForSettings);
  });
}

/**
 * Subscribes to the products list.
 * Seeds INITIAL_PRODUCTS if the collection is empty.
 */
export function subscribeProducts(onUpdate: (products: Product[]) => void) {
  const colRef = collection(db, 'products');
  const pathForProducts = 'products';
  
  return onSnapshot(colRef, async (snapshot) => {
    if (snapshot.empty) {
      try {
        const batch = writeBatch(db);
        INITIAL_PRODUCTS.forEach((product) => {
          const dRef = doc(colRef, product.id);
          batch.set(dRef, product);
        });
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, pathForProducts);
      }
    } else {
      const items: Product[] = [];
      const batchToUpdate = writeBatch(db);
      let needsUpdate = false;

      snapshot.forEach((documentSnap) => {
        const data = documentSnap.data() as Product;
        const initialMatch = INITIAL_PRODUCTS.find(p => p.id === documentSnap.id);
        
        if (initialMatch && !data.image) {
          const dRef = doc(colRef, documentSnap.id);
          batchToUpdate.set(dRef, { image: initialMatch.image }, { merge: true });
          needsUpdate = true;
          items.push({ ...data, image: initialMatch.image, id: documentSnap.id });
        } else {
          items.push({ ...data, id: documentSnap.id });
        }
      });

      if (needsUpdate) {
        batchToUpdate.commit().catch(err => console.error("Erro no auto-update de imagens:", err));
      }

      // Ordena por ordem de exibição e depois por nome
      items.sort((a, b) => {
        const orderDiff = (a.order || 0) - (b.order || 0);
        if (orderDiff !== 0) return orderDiff;
        return a.name.localeCompare(b.name);
      });
      onUpdate(items);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, pathForProducts);
  });
}

/**
 * Updates the store settings in Firestore.
 */
export async function updateStoreSettings(settings: StoreSettings) {
  const pathForSettings = 'settings/store';
  try {
    const docRef = doc(db, 'settings', 'store');
    await setDoc(docRef, settings);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, pathForSettings);
  }
}

/**
 * Adds a new product to Firestore.
 */
export async function addProduct(product: Omit<Product, 'id'>) {
  const pathForProducts = 'products';
  try {
    const colRef = collection(db, 'products');
    const docRef = doc(colRef);
    const newProduct: Product = {
      ...product,
      id: docRef.id
    };
    await setDoc(docRef, newProduct);
    return newProduct;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, pathForProducts);
    throw error;
  }
}

/**
 * Updates an existing product in Firestore.
 */
export async function updateProduct(product: Product) {
  const pathForProduct = `products/${product.id}`;
  try {
    const docRef = doc(db, 'products', product.id);
    await setDoc(docRef, product);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, pathForProduct);
  }
}

/**
 * Deletes a product from Firestore.
 */
export async function deleteProduct(id: string) {
  const pathForProduct = `products/${id}`;
  try {
    const docRef = doc(db, 'products', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, pathForProduct);
  }
}

/**
 * Subscribes to orders.
 */
export function subscribeOrders(onUpdate: (orders: Order[]) => void) {
  const pathForOrders = 'orders';
  const colRef = collection(db, 'orders');
  
  return onSnapshot(colRef, (snapshot) => {
    const items: Order[] = [];
    snapshot.forEach((doc) => {
      items.push({ ...doc.data() as Order, id: doc.id });
    });
    // Ordena por data decrescente
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    onUpdate(items);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, pathForOrders);
  });
}

/**
 * Logs a new order in Firestore.
 */
export async function createOrder(order: Omit<Order, 'id'>) {
  const pathForOrders = 'orders';
  try {
    const colRef = collection(db, 'orders');
    const docRef = doc(colRef);
    const newOrder: Order = {
      ...order,
      id: docRef.id
    };
    await setDoc(docRef, newOrder);
    return newOrder;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, pathForOrders);
    throw error;
  }
}
