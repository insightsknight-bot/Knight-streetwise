const { list } = require('@vercel/blob');

const DEFAULT_PRODUCTS = [
  {
    id: 'p1',
    name: 'Resilience Heavyweight Hoodie',
    subtitle: 'Washed Charcoal',
    price: 145,
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    badge: 'Low Stock'
  },
  {
    id: 'p2',
    name: 'Mastery Oversized Tee',
    subtitle: 'Bone',
    price: 65,
    image: 'https://images.unsplash.com/photo-1520975954732-57dd22299614?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    badge: ''
  },
  {
    id: 'p3',
    name: 'Tactical Nylon Cargo',
    subtitle: 'Matte Black',
    price: 180,
    image: 'https://images.unsplash.com/photo-1628032731835-24d1a01c40ea?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    badge: ''
  }
];

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    const { blobs } = await list({ prefix: 'products.json' });
    const match = blobs.find((b) => b.pathname === 'products.json');

    if (!match) {
      return res.status(200).json(DEFAULT_PRODUCTS);
    }

    const fileRes = await fetch(match.url);
    const data = await fileRes.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('products.js error:', err);
    return res.status(200).json(DEFAULT_PRODUCTS);
  }
};

