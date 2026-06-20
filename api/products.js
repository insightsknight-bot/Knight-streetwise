const { put, list } = require('@vercel/blob');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password, name, price, imageBase64, filename, subtitle, badge } = req.body || {};

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Incorrect password' });
  }
  if (!name || !price || !imageBase64) {
    return res.status(400).json({ error: 'Missing product name, price, or photo' });
  }

  try {
    // Decode the photo
    const base64Data = imageBase64.split(',').pop();
    const buffer = Buffer.from(base64Data, 'base64');
    const safeName = (filename || 'photo.jpg').replace(/[^a-zA-Z0-9.\-_]/g, '');
    const path = `products/${Date.now()}-${safeName}`;

    // Store the photo in Vercel Blob
    const imageBlob = await put(path, buffer, {
      access: 'public',
      addRandomSuffix: true,
      contentType: 'image/jpeg'
    });

    // Load the current product list (or start fresh)
    let products = [];
    try {
      const { blobs } = await list({ prefix: 'products.json' });
      const match = blobs.find((b) => b.pathname === 'products.json');
      if (match) {
        const fileRes = await fetch(match.url);
        products = await fileRes.json();
      }
    } catch (e) {
      products = [];
    }

    const newProduct = {
      id: `p${Date.now()}`,
      name,
      subtitle: subtitle || '',
      price: Number(price),
      image: imageBlob.url,
      badge: badge || ''
    };
    products.push(newProduct);

    // Save the updated product list
    await put('products.json', JSON.stringify(products), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json'
    });

    return res.status(200).json({ success: true, product: newProduct });
  } catch (err) {
    console.error('upload.js error:', err);
    return res.status(500).json({ error: 'Upload failed. Try a smaller photo.' });
  }
};
