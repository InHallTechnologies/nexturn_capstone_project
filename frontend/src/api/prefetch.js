import { categoriesApi } from './categories';
import { productsApi } from './products';
import { purchaseOrdersApi } from './purchaseOrders';
import { reportsApi } from './reports';
import { salesApi } from './sales';
import { stockMovementsApi } from './stockMovements';
import { suppliersApi } from './suppliers';

const isManager = (role) => role === 'Owner' || role === 'Manager';

const reportDateRange = () => {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 29);
  return {
    start_date: startDate.toISOString().slice(0, 10),
    end_date: endDate.toISOString().slice(0, 10),
  };
};

const prefetchDashboard = (role) => {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 6);
  const dateString = (date) => date.toISOString().slice(0, 10);

  const requests = [
    productsApi.listProducts({ per_page: 5, low_stock: 'true' }),
    productsApi.listProducts({ per_page: 1 }),
    salesApi.listSales({
      per_page: 6,
      sort_by: 'created_at',
      sort_order: 'desc',
    }),
  ];

  if (role === 'Owner') {
    requests.push(
      reportsApi.getValuationReport({ per_page: 1 }),
      reportsApi.getSalesByDayReport({
        start_date: dateString(startDate),
        end_date: dateString(endDate),
        per_page: 7,
      })
    );
  }

  if (isManager(role)) {
    requests.push(
      purchaseOrdersApi.listPurchaseOrders({ status: 'draft', per_page: 1 }),
      purchaseOrdersApi.listPurchaseOrders({ status: 'approved', per_page: 1 }),
      purchaseOrdersApi.listPurchaseOrders({
        per_page: 6,
        sort_by: 'created_at',
        sort_order: 'desc',
      })
    );
  }

  return requests;
};

const routeRequests = (path, role) => {
  const [pathname, query = ''] = path.split('?');
  const queryParams = new URLSearchParams(query);
  const manager = isManager(role);
  const categories = () => categoriesApi.listCategories({ per_page: 100 });
  const suppliers = () => suppliersApi.listSuppliers({ per_page: 100 });
  const products = () => productsApi.listProducts({ per_page: 100 });

  if (pathname === '/dashboard') {
    return prefetchDashboard(role);
  }
  if (pathname === '/products') {
    const lowStock = queryParams.get('low_stock') === 'true';
    return [
      productsApi.listProducts({
        page: 1,
        per_page: 15,
        sort_by: 'name',
        sort_order: 'asc',
        ...(lowStock ? { low_stock: 'true' } : {}),
      }),
      ...(manager ? [categories()] : []),
    ];
  }
  if (pathname === '/pos') {
    return [
      productsApi.listProducts({
        per_page: 100,
        sort_by: 'name',
        sort_order: 'asc',
      }),
      ...(manager ? [categories()] : []),
    ];
  }
  if (pathname === '/categories' && manager) {
    return [
      categoriesApi.listCategories({
        page: 1,
        per_page: 15,
        sort_by: 'name',
        sort_order: 'asc',
      }),
    ];
  }
  if (pathname === '/suppliers' && manager) {
    return [
      suppliersApi.listSuppliers({
        page: 1,
        per_page: 15,
        sort_by: 'name',
        sort_order: 'asc',
      }),
    ];
  }
  if (pathname === '/purchase-orders' && manager) {
    return [
      suppliers(),
      purchaseOrdersApi.listPurchaseOrders({
        page: 1,
        per_page: 15,
        sort_by: 'created_at',
        sort_order: 'desc',
      }),
    ];
  }
  if (pathname === '/purchase-orders/new' && manager) {
    return [suppliers(), products()];
  }
  if (pathname === '/receive-goods' && manager) {
    const requests = [
      purchaseOrdersApi.listPurchaseOrders({ status: 'approved', per_page: 50 }),
      purchaseOrdersApi.listPurchaseOrders({ status: 'partially_received', per_page: 50 }),
      suppliers(),
      products(),
    ];
    const orderId = queryParams.get('po_id');
    if (orderId) {
      requests.push(purchaseOrdersApi.getPurchaseOrder(orderId));
    }
    return requests;
  }
  if (pathname === '/stock-movements' && manager) {
    return [
      products(),
      stockMovementsApi.listStockMovements({
        page: 1,
        per_page: 20,
        sort_by: 'created_at',
        sort_order: 'desc',
      }),
    ];
  }
  if (pathname === '/reports' && manager) {
    const requests = [reportsApi.getLowStockReport({ page: 1, per_page: 20 })];
    if (role === 'Owner') {
      requests.push(
        reportsApi.getValuationReport({ page: 1, per_page: 20 }),
        reportsApi.getLedgerBalanceReport({ page: 1, per_page: 20 }),
        reportsApi.getSalesByDayReport({
          ...reportDateRange(),
          page: 1,
          per_page: 30,
          sort_by: 'date',
          sort_order: 'desc',
        })
      );
    }
    return requests;
  }

  const orderMatch = pathname.match(/^\/purchase-orders\/(\d+)$/);
  if (orderMatch && manager) {
    const orderRequest = purchaseOrdersApi.getPurchaseOrder(orderMatch[1]);
    return [
      orderRequest,
      orderRequest.then((order) => suppliersApi.getSupplier(order.supplier_id)),
      products(),
    ];
  }

  return [];
};

export const prefetchRouteData = async (path, role) => {
  const requests = routeRequests(path, role);
  await Promise.all(
    requests.map((request) =>
      request.catch((error) => {
        console.warn(`Page data prefetch failed for ${path}.`, error);
      })
    )
  );
};

export const prefetchAccessiblePages = async (role) => {
  const paths = [
    '/dashboard',
    '/products',
    '/pos',
    ...(isManager(role)
      ? [
          '/categories',
          '/suppliers',
          '/purchase-orders',
          '/purchase-orders/new',
          '/receive-goods',
          '/stock-movements',
          '/reports',
        ]
      : []),
  ];

  for (let index = 0; index < paths.length; index += 2) {
    await Promise.all(
      paths.slice(index, index + 2).map((path) => prefetchRouteData(path, role))
    );
  }
};
