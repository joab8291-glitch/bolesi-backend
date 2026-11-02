const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const crypto = require("crypto");
const { z } = require("zod");
const { prisma } = require("../lib/prisma");

const router = express.Router();
const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const tokenFor = (user) => jwt.sign(
  { sub: user.id, role: user.role, email: user.email },
  process.env.JWT_SECRET,
  { expiresIn: "7d", issuer: "bolesi-api", audience: "bolesi-app" }
);
const auth = (roles = []) => asyncRoute(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || !process.env.JWT_SECRET) return res.status(401).json({ error: "Authentication required" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { issuer: "bolesi-api", audience: "bolesi-app" });
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, name: true, email: true, role: true } });
    if (!user || (roles.length && !roles.includes(user.role))) return res.status(403).json({ error: "Not authorised" });
    req.user = user;
    next();
  } catch (_error) { return res.status(401).json({ error: "Invalid or expired token" }); }
});
const admin = auth(["SUPER_ADMIN"]);
const slugify = (value) => String(value || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const phoneForMpesa = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return "254" + digits.slice(1);
  if (digits.startsWith("7") && digits.length === 9) return "254" + digits;
  throw Object.assign(new Error("Enter a valid Kenyan mobile number"), { status: 400 });
};
const safeProduct = (p) => ({ ...p, price: Number(p.price), compareAtPrice: p.compareAtPrice == null ? null : Number(p.compareAtPrice) });

router.get("/health", asyncRoute(async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: "healthy", service: "bolesi-backend", database: "connected", timestamp: new Date().toISOString() });
}));

// Authentication: public customer accounts and one-time super-admin bootstrap.
router.post("/auth/register", asyncRoute(async (req, res) => {
  const data = z.object({ name: z.string().min(2).max(100), email: z.string().email().transform(v => v.toLowerCase()), phone: z.string().optional(), password: z.string().min(10).max(100) }).parse(req.body);
  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({ data: { ...data, passwordHash }, select: { id: true, name: true, email: true, role: true } });
  res.status(201).json({ user, token: tokenFor(user) });
}));
router.post("/auth/login", asyncRoute(async (req, res) => {
  const data = z.object({ email: z.string().email().transform(v => v.toLowerCase()), password: z.string().min(1) }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) return res.status(401).json({ error: "Invalid email or password" });
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, token: tokenFor(user) });
}));
router.post("/auth/admin-bootstrap", asyncRoute(async (req, res) => {
  const setupToken = process.env.ADMIN_SETUP_TOKEN;
  if (!setupToken || req.get("x-admin-setup-token") !== setupToken) return res.status(404).json({ error: "Not found" });
  const data = z.object({ name: z.string().min(2).max(100), email: z.string().email().transform(v => v.toLowerCase()), password: z.string().min(12).max(100) }).parse(req.body);
  const existing = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
  if (existing) return res.status(409).json({ error: "Super administrator is already configured" });
  const { password, ...userData } = data;
  const user = await prisma.user.create({ data: { ...userData, passwordHash: await bcrypt.hash(password, 12), role: "SUPER_ADMIN" }, select: { id: true, name: true, email: true, role: true } });
  res.status(201).json({ user, token: tokenFor(user) });
}));
router.get("/auth/me", auth(), (req, res) => res.json({ user: req.user }));

// Safe public runtime capabilities; never expose credentials.
router.get("/config/public", (_req, res) => res.json({
  payments: { mpesaEnabled: Boolean(process.env.MPESA_CONSUMER_KEY && process.env.MPESA_CONSUMER_SECRET && process.env.MPESA_SHORTCODE && process.env.MPESA_PASSKEY && process.env.MPESA_CALLBACK_URL), payAtShopEnabled: true },
  fulfilment: { collectionEnabled: true, deliveryEnabled: process.env.DELIVERY_FEE_KES !== undefined && process.env.DELIVERY_FEE_KES !== "", deliveryFee: process.env.DELIVERY_FEE_KES ? Number(process.env.DELIVERY_FEE_KES) : null }
}));

// Public catalogue.
router.get("/categories", asyncRoute(async (_req, res) => {
  const categories = await prisma.category.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  res.json({ categories });
}));
router.get("/products", asyncRoute(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(60, Math.max(1, Number(req.query.limit) || 24));
  const where = { status: "ACTIVE" };
  if (req.query.category) where.category = { slug: String(req.query.category) };
  if (req.query.featured === "true") where.isFeatured = true;
  if (req.query.q) where.OR = ["name", "brand", "model", "sku"].map(field => ({ [field]: { contains: String(req.query.q), mode: "insensitive" } }));
  const [items, total] = await prisma.$transaction([
    prisma.product.findMany({ where, include: { category: true, images: { orderBy: { sortOrder: "asc" } }, inventory: { where: { branch: { isActive: true } }, select: { quantity: true, reserved: true, branchId: true } } }, orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }], skip: (page - 1) * limit, take: limit }),
    prisma.product.count({ where })
  ]);
  res.json({ products: items.map(safeProduct), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}));
router.get("/products/:slug", asyncRoute(async (req, res) => {
  const product = await prisma.product.findFirst({ where: { slug: req.params.slug, status: "ACTIVE" }, include: { category: true, images: { orderBy: { sortOrder: "asc" } }, inventory: { where: { branch: { isActive: true } }, include: { branch: { select: { id: true, name: true, code: true, address: true } } } } } });
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json({ product: safeProduct(product) });
}));
router.get("/branches", asyncRoute(async (_req, res) => {
  const branches = await prisma.branch.findMany({ where: { isActive: true }, select: { id: true, name: true, code: true, address: true, phone: true, email: true }, orderBy: { name: "asc" } });
  res.json({ branches });
}));

// Admin catalogue and branch operations.
router.post("/admin/categories", admin, asyncRoute(async (req, res) => {
  const data = z.object({ name: z.string().min(2).max(100), description: z.string().max(500).optional(), imageUrl: z.string().url().optional(), parentId: z.string().optional(), sortOrder: z.number().int().optional(), isActive: z.boolean().optional() }).parse(req.body);
  const slug = slugify(data.name);
  const category = await prisma.category.create({ data: { ...data, slug } });
  res.status(201).json({ category });
}));
router.patch("/admin/categories/:id", admin, asyncRoute(async (req, res) => {
  const data = z.object({ name: z.string().min(2).max(100).optional(), description: z.string().max(500).nullable().optional(), imageUrl: z.string().url().nullable().optional(), parentId: z.string().nullable().optional(), sortOrder: z.number().int().optional(), isActive: z.boolean().optional() }).parse(req.body);
  if (data.name) data.slug = slugify(data.name);
  res.json({ category: await prisma.category.update({ where: { id: req.params.id }, data }) });
}));
router.delete("/admin/categories/:id", admin, asyncRoute(async (req, res) => {
  await prisma.category.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json({ success: true });
}));
router.get("/admin/products", admin, asyncRoute(async (_req, res) => {
  const products = await prisma.product.findMany({
    include: { category: true, images: { orderBy: { sortOrder: "asc" } }, inventory: { where: { branch: { isActive: true } }, select: { quantity: true, reserved: true, branchId: true } } },
    orderBy: [{ updatedAt: "desc" }]
  });
  res.json({ products: products.map(safeProduct) });
}));
router.post("/admin/products", admin, asyncRoute(async (req, res) => {
  const data = z.object({ name: z.string().min(2).max(180), sku: z.string().min(1).max(80), model: z.string().max(100).optional(), brand: z.string().max(100).optional(), description: z.string().max(10000).optional(), specifications: z.record(z.string(), z.unknown()).optional(), price: z.number().positive(), compareAtPrice: z.number().positive().nullable().optional(), status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(), isFeatured: z.boolean().optional(), categoryId: z.string().nullable().optional(), images: z.array(z.object({ url: z.string().url(), alt: z.string().max(200).optional() })).max(12).optional() }).parse(req.body);
  const slug = slugify(data.name) + "-" + slugify(data.sku);
  const { images = [], ...productData } = data;
  const product = await prisma.product.create({ data: { ...productData, slug, images: { create: images.map((img, i) => ({ ...img, sortOrder: i })) } }, include: { images: true, category: true } });
  res.status(201).json({ product: safeProduct(product) });
}));
router.patch("/admin/products/:id", admin, asyncRoute(async (req, res) => {
  const data = z.object({ name: z.string().min(2).max(180).optional(), sku: z.string().min(1).max(80).optional(), model: z.string().max(100).nullable().optional(), brand: z.string().max(100).nullable().optional(), description: z.string().max(10000).nullable().optional(), specifications: z.record(z.string(), z.unknown()).nullable().optional(), price: z.number().positive().optional(), compareAtPrice: z.number().positive().nullable().optional(), status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(), isFeatured: z.boolean().optional(), categoryId: z.string().nullable().optional() }).parse(req.body);
  if (data.name || data.sku) {
    const current = await prisma.product.findUniqueOrThrow({ where: { id: req.params.id }, select: { name: true, sku: true } });
    data.slug = slugify(data.name || current.name) + "-" + slugify(data.sku || current.sku);
  }
  res.json({ product: safeProduct(await prisma.product.update({ where: { id: req.params.id }, data, include: { images: true, category: true } })) });
}));
router.delete("/admin/products/:id", admin, asyncRoute(async (req, res) => {
  await prisma.product.update({ where: { id: req.params.id }, data: { status: "ARCHIVED" } });
  res.json({ success: true });
}));
router.put("/admin/products/:id/images", admin, asyncRoute(async (req, res) => {
  const data = z.object({ images: z.array(z.object({ url: z.string().url(), alt: z.string().max(200).optional() })).max(12) }).parse(req.body);
  await prisma.productImage.deleteMany({ where: { productId: req.params.id } });
  if (data.images.length) await prisma.productImage.createMany({ data: data.images.map((img, i) => ({ ...img, productId: req.params.id, sortOrder: i })) });
  res.json({ replaced: data.images.length });
}));
router.post("/admin/products/:id/images", admin, asyncRoute(async (req, res) => {
  const data = z.object({ images: z.array(z.object({ url: z.string().url(), alt: z.string().max(200).optional() })).min(1).max(12) }).parse(req.body);
  const result = await prisma.productImage.createMany({ data: data.images.map((img, i) => ({ ...img, productId: req.params.id, sortOrder: i })) });
  res.status(201).json({ added: result.count });
}));
router.post("/admin/branches", admin, asyncRoute(async (req, res) => {
  const data = z.object({ name: z.string().min(2).max(120), code: z.string().min(2).max(20).transform(v => v.toUpperCase()), address: z.string().min(5).max(300), phone: z.string().optional(), email: z.string().email().optional() }).parse(req.body);
  res.status(201).json({ branch: await prisma.branch.create({ data }) });
}));
router.patch("/admin/branches/:id", admin, asyncRoute(async (req, res) => {
  const data = z.object({ name: z.string().min(2).optional(), code: z.string().min(2).transform(v => v.toUpperCase()).optional(), address: z.string().min(5).optional(), phone: z.string().nullable().optional(), email: z.string().email().nullable().optional(), isActive: z.boolean().optional() }).parse(req.body);
  res.json({ branch: await prisma.branch.update({ where: { id: req.params.id }, data }) });
}));
router.put("/admin/inventory", admin, asyncRoute(async (req, res) => {
  const data = z.object({ productId: z.string(), branchId: z.string(), quantity: z.number().int().min(0) }).parse(req.body);
  const inventory = await prisma.inventory.upsert({ where: { productId_branchId: { productId: data.productId, branchId: data.branchId } }, create: data, update: { quantity: data.quantity } });
  res.json({ inventory });
}));
router.get("/admin/orders", admin, asyncRoute(async (req, res) => {
  const orders = await prisma.order.findMany({ where: req.query.status ? { status: String(req.query.status) } : {}, include: { items: true, branch: true, payments: true }, orderBy: { createdAt: "desc" }, take: 100 });
  res.json({ orders });
}));
router.patch("/admin/orders/:id/status", admin, asyncRoute(async (req, res) => {
  const data = z.object({ status: z.enum(["PROCESSING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "COMPLETED", "CANCELLED"]) }).parse(req.body);
  const order = await prisma.order.findUniqueOrThrow({ where: { id: req.params.id } });
  if (data.status === "COMPLETED" && order.paymentMethod === "PAY_AT_SHOP" && order.paymentStatus !== "SUCCESS") return res.status(409).json({ error: "Confirm payment before completing a pay-at-shop order" });
  res.json({ order: await prisma.order.update({ where: { id: req.params.id }, data }) });
}));
router.post("/admin/orders/:id/confirm-payment", admin, asyncRoute(async (req, res) => {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: req.params.id }, include: { items: true } });
  if (order.paymentStatus === "SUCCESS") return res.json({ order });
  const updated = await prisma.$transaction(async tx => {
    if (order.branchId) for (const item of order.items) {
      await tx.inventory.updateMany({ where: { productId: item.productId, branchId: order.branchId, reserved: { gte: item.quantity }, quantity: { gte: item.quantity } }, data: { quantity: { decrement: item.quantity }, reserved: { decrement: item.quantity } } });
    }
    const saved = await tx.order.update({ where: { id: order.id }, data: { paymentStatus: "SUCCESS", status: "PROCESSING" } });
    await tx.payment.create({ data: { orderId: order.id, method: order.paymentMethod, status: "SUCCESS", amount: order.total, resultDescription: "Payment manually confirmed by super administrator" } });
    return saved;
  });
  res.json({ order: updated });
}));

// Checkout: prices and stock are always re-read from the database.
router.post("/orders", asyncRoute(async (req, res) => {
  const data = z.object({
    customerName: z.string().min(2).max(120), customerPhone: z.string().min(9).max(20), customerEmail: z.string().email().optional(),
    fulfilment: z.enum(["DELIVERY", "COLLECTION"]), paymentMethod: z.enum(["MPESA", "PAY_AT_SHOP"]),
    branchId: z.string(), deliveryAddress: z.record(z.string(), z.unknown()).optional(),
    items: z.array(z.object({ productId: z.string(), quantity: z.number().int().min(1).max(20) })).min(1).max(30)
  }).parse(req.body);
  if (data.paymentMethod === "MPESA" && !(process.env.MPESA_CONSUMER_KEY && process.env.MPESA_CONSUMER_SECRET && process.env.MPESA_SHORTCODE && process.env.MPESA_PASSKEY && process.env.MPESA_CALLBACK_URL)) return res.status(503).json({ error: "M-Pesa checkout is not configured yet. Please choose pay at shop or contact BOLESI." });
  if (data.fulfilment === "DELIVERY" && !data.deliveryAddress) return res.status(400).json({ error: "Delivery address is required" });
  const branch = await prisma.branch.findFirst({ where: { id: data.branchId, isActive: true } });
  if (!branch) return res.status(400).json({ error: "Select a valid branch" });
  const productIds = [...new Set(data.items.map(i => i.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: productIds }, status: "ACTIVE" } });
  if (products.length !== productIds.length) return res.status(400).json({ error: "One or more products are unavailable" });
  const byId = new Map(products.map(p => [p.id, p]));
  const subtotal = data.items.reduce((sum, item) => sum + Number(byId.get(item.productId).price) * item.quantity, 0);
  const deliveryFee = data.fulfilment === "DELIVERY" ? Number(process.env.DELIVERY_FEE_KES || NaN) : 0;
  if (data.fulfilment === "DELIVERY" && (!Number.isFinite(deliveryFee) || deliveryFee < 0)) return res.status(503).json({ error: "Home delivery is not configured yet. Please choose shop collection or contact BOLESI." });
  const orderNumber = "BOL-" + Date.now().toString(36).toUpperCase() + "-" + crypto.randomBytes(3).toString("hex").toUpperCase();
  const order = await prisma.$transaction(async tx => {
    for (const item of data.items) {
      const stock = await tx.inventory.findUnique({ where: { productId_branchId: { productId: item.productId, branchId: data.branchId } } });
      if (!stock || stock.quantity - stock.reserved < item.quantity) throw Object.assign(new Error("Insufficient stock for " + byId.get(item.productId).name), { status: 409 });
      await tx.inventory.update({ where: { id: stock.id }, data: { reserved: { increment: item.quantity } } });
    }
    return tx.order.create({ data: {
      orderNumber, userId: req.user?.id || null, fulfilment: data.fulfilment, paymentMethod: data.paymentMethod,
      paymentStatus: data.paymentMethod === "PAY_AT_SHOP" ? "PENDING" : "INITIATED",
      status: data.paymentMethod === "PAY_AT_SHOP" ? "PENDING" : "PAYMENT_PENDING",
      subtotal, deliveryFee, total: subtotal + deliveryFee, customerName: data.customerName,
      customerPhone: data.customerPhone, customerEmail: data.customerEmail, deliveryAddress: data.deliveryAddress,
      branchId: branch.id, items: { create: data.items.map(item => {
        const p = byId.get(item.productId); return { productId: p.id, name: p.name, sku: p.sku, unitPrice: p.price, quantity: item.quantity, lineTotal: Number(p.price) * item.quantity };
      }) },
      payments: { create: { method: data.paymentMethod, status: data.paymentMethod === "PAY_AT_SHOP" ? "PENDING" : "INITIATED", amount: subtotal + deliveryFee } }
    }, include: { items: true, branch: true } });
  });
  res.status(201).json({ order });
}));

// Daraja STK Push and callback. Keep sandbox until BOLESI live credentials are configured.
const darajaToken = async () => {
  const base = process.env.MPESA_BASE_URL || "https://sandbox.safaricom.co.ke";
  const authValue = Buffer.from(process.env.MPESA_CONSUMER_KEY + ":" + process.env.MPESA_CONSUMER_SECRET).toString("base64");
  const response = await axios.get(base + "/oauth/v1/generate?grant_type=client_credentials", { headers: { Authorization: "Basic " + authValue }, timeout: 15000 });
  return response.data.access_token;
};
router.post("/payments/mpesa/stk", asyncRoute(async (req, res) => {
  const data = z.object({ orderId: z.string(), phone: z.string() }).parse(req.body);
  if (!process.env.MPESA_CONSUMER_KEY || !process.env.MPESA_CONSUMER_SECRET || !process.env.MPESA_SHORTCODE || !process.env.MPESA_PASSKEY || !process.env.MPESA_CALLBACK_URL) return res.status(503).json({ error: "M-Pesa is not configured yet. Contact BOLESI support." });
  const order = await prisma.order.findUnique({ where: { id: data.orderId }, include: { payments: true } });
  if (!order || order.paymentMethod !== "MPESA" || order.paymentStatus === "SUCCESS") return res.status(400).json({ error: "Order cannot accept this payment" });
  const phone = phoneForMpesa(data.phone);
  const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const shortcode = process.env.MPESA_SHORTCODE;
  const password = Buffer.from(shortcode + process.env.MPESA_PASSKEY + timestamp).toString("base64");
  const accessToken = await darajaToken();
  const base = process.env.MPESA_BASE_URL || "https://sandbox.safaricom.co.ke";
  const response = await axios.post(base + "/mpesa/stkpush/v1/processrequest", {
    BusinessShortCode: shortcode, Password: password, Timestamp: timestamp,
    TransactionType: process.env.MPESA_TRANSACTION_TYPE || "CustomerPayBillOnline",
    Amount: Math.max(1, Math.round(Number(order.total))), PartyA: phone, PartyB: shortcode, PhoneNumber: phone,
    CallBackURL: process.env.MPESA_CALLBACK_URL, AccountReference: (process.env.MPESA_ACCOUNT_REFERENCE || "BOLESI").slice(0, 12),
    TransactionDesc: process.env.MPESA_TRANSACTION_DESC || "BOLESI Order Payment"
  }, { headers: { Authorization: "Bearer " + accessToken }, timeout: 25000 });
  const body = response.data;
  if (body.ResponseCode !== "0") return res.status(502).json({ error: body.ResponseDescription || "M-Pesa request failed" });
  await prisma.$transaction([
    prisma.order.update({ where: { id: order.id }, data: { mpesaCheckoutId: body.CheckoutRequestID, paymentStatus: "PENDING" } }),
    prisma.payment.updateMany({ where: { orderId: order.id, method: "MPESA" }, data: { status: "PENDING", merchantRequestId: body.MerchantRequestID, checkoutRequestId: body.CheckoutRequestID } })
  ]);
  res.json({ success: true, message: body.CustomerMessage || "Check your phone to complete M-Pesa payment", checkoutRequestId: body.CheckoutRequestID });
}));
router.post("/payments/mpesa/callback", asyncRoute(async (req, res) => {
  const callback = req.body?.Body?.stkCallback;
  if (!callback?.CheckoutRequestID) return res.status(400).json({ ResultCode: 1, ResultDesc: "Invalid callback" });
  const payment = await prisma.payment.findUnique({ where: { checkoutRequestId: callback.CheckoutRequestID }, include: { order: true } });
  if (!payment) return res.json({ ResultCode: 0, ResultDesc: "Acknowledged" });
  if (["SUCCESS", "FAILED", "CANCELLED"].includes(payment.status)) return res.json({ ResultCode: 0, ResultDesc: "Already processed" });
  const success = Number(callback.ResultCode) === 0;
  const metadata = callback.CallbackMetadata?.Item || [];
  const receipt = metadata.find(x => x.Name === "MpesaReceiptNumber")?.Value;
  await prisma.$transaction(async tx => {
    await tx.payment.update({ where: { id: payment.id }, data: { status: success ? "SUCCESS" : "FAILED", receiptNumber: receipt || null, resultCode: String(callback.ResultCode), resultDescription: callback.ResultDesc || "", rawCallback: req.body } });
    await tx.order.update({ where: { id: payment.orderId }, data: { paymentStatus: success ? "SUCCESS" : "FAILED", status: success ? "PAID" : "PAYMENT_PENDING", mpesaReceipt: receipt || undefined } });
    for (const item of await tx.orderItem.findMany({ where: { orderId: payment.orderId } })) {
      if (success) {
        await tx.inventory.updateMany({ where: { productId: item.productId, branchId: payment.order.branchId, reserved: { gte: item.quantity }, quantity: { gte: item.quantity } }, data: { quantity: { decrement: item.quantity }, reserved: { decrement: item.quantity } } });
      } else {
        await tx.inventory.updateMany({ where: { productId: item.productId, branchId: payment.order.branchId, reserved: { gte: item.quantity } }, data: { reserved: { decrement: item.quantity } } });
      }
    }
  });
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
}));

router.get("/orders/:orderNumber", asyncRoute(async (req, res) => {
  const order = await prisma.order.findUnique({ where: { orderNumber: req.params.orderNumber }, include: { items: true, branch: true, payments: { select: { method: true, status: true, receiptNumber: true, createdAt: true } } } });
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json({ order });
}));

module.exports = router;
