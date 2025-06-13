export async function GET(request: Request) {
  const url = new URL(request.url);
  const category = url.searchParams.get('category');
  const search = url.searchParams.get('search');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  // Mock data - in a real app, this would come from a database
  const mockItems = [
    {
      id: '1',
      title: 'Vintage Denim Jacket',
      price: 45,
      originalPrice: 89,
      image: 'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=2',
      brand: 'Levi\'s',
      size: 'M',
      condition: 'Good',
      seller: 'Sarah M.',
      location: 'New York',
      category: 'women',
      isPromoted: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      title: 'Summer Floral Dress',
      price: 32,
      originalPrice: 65,
      image: 'https://images.pexels.com/photos/985635/pexels-photo-985635.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=2',
      brand: 'Zara',
      size: 'S',
      condition: 'Excellent',
      seller: 'Emma K.',
      location: 'Los Angeles',
      category: 'women',
      isPromoted: false,
      createdAt: new Date().toISOString(),
    },
    // Add more mock items as needed
  ];

  // Filter items based on query parameters
  let filteredItems = mockItems;

  if (category && category !== 'all') {
    filteredItems = filteredItems.filter(item => item.category === category);
  }

  if (search) {
    const searchLower = search.toLowerCase();
    filteredItems = filteredItems.filter(item =>
      item.title.toLowerCase().includes(searchLower) ||
      item.brand.toLowerCase().includes(searchLower)
    );
  }

  // Apply pagination
  const paginatedItems = filteredItems.slice(offset, offset + limit);

  return Response.json({
    items: paginatedItems,
    total: filteredItems.length,
    hasMore: offset + limit < filteredItems.length,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['title', 'description', 'price', 'brand', 'size', 'condition', 'category'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return new Response(
          JSON.stringify({ error: `Missing required field: ${field}` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Mock item creation - in a real app, this would save to a database
    const newItem = {
      id: Date.now().toString(),
      ...body,
      seller: 'Current User', // Would come from authentication
      location: 'User Location', // Would come from user profile
      createdAt: new Date().toISOString(),
      isPromoted: false,
    };

    return Response.json({
      success: true,
      item: newItem,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}