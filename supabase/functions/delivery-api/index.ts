import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";
import { corsHeaders } from "../_shared/cors.ts";
import { OpenAPIRouter } from "npm:@cloudflare/itty-router-openapi";
import { z } from "npm:zod@3.22.4";

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Create OpenAPI router
const router = new OpenAPIRouter({
  schema: {
    info: {
      title: "Remore Delivery API",
      description: "API for delivery riders to manage pickups and deliveries",
      version: "1.0.0",
    },
    servers: [
      {
        url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/delivery-api`,
        description: "Production server",
      },
    ],
  },
});

// Define schemas
const OrderSchema = z.object({
  id: z.string().uuid(),
  status: z.string(),
  buyer: z.object({
    id: z.string().uuid(),
    nickname: z.string(),
    phone: z.string().optional().nullable(),
    profile_picture: z.string().optional().nullable(),
  }),
  seller: z.object({
    id: z.string().uuid(),
    nickname: z.string(),
    phone: z.string().optional().nullable(),
    profile_picture: z.string().optional().nullable(),
  }),
  item: z.object({
    id: z.string().uuid(),
    title: z.string(),
    images: z.array(z.string()),
  }),
  delivery: z.object({
    id: z.string().uuid().optional(),
    status: z.string(),
    pickup_address: z.string().optional().nullable(),
    delivery_address: z.string().optional().nullable(),
    pickup_time_slot: z.string().optional().nullable(),
    delivery_time_slot: z.string().optional().nullable(),
    pickup_instructions: z.string().optional().nullable(),
    delivery_instructions: z.string().optional().nullable(),
  }).optional(),
});

const DeliveryUpdateSchema = z.object({
  status: z.enum([
    "assigned",
    "en_route_to_pickup",
    "at_pickup",
    "picked_up",
    "en_route_to_delivery",
    "at_delivery",
    "delivered",
    "failed",
  ]),
  notes: z.string().optional(),
  verification_code: z.string().optional(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }).optional(),
});

// Authentication middleware
const authenticate = async (request: Request) => {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Missing or invalid authorization header" }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const token = authHeader.replace("Bearer ", "");
  
  // In a real implementation, you would validate the token
  // For now, we'll use a simple check for demo purposes
  if (token !== "RIDER_API_KEY" && !token.startsWith("eyJ")) {
    return new Response(
      JSON.stringify({ error: "Invalid API key or token" }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  return null; // Authentication successful
};

// API Routes

// Get all pending deliveries
router.get("/deliveries/pending", {
  summary: "Get all pending deliveries",
  description: "Returns all deliveries that need to be assigned to a rider",
  tags: ["Deliveries"],
  responses: {
    "200": {
      description: "List of pending deliveries",
      schema: z.array(OrderSchema),
    },
    "401": {
      description: "Unauthorized",
    },
  },
}, async (request: Request) => {
  const authError = await authenticate(request);
  if (authError) return authError;

  try {
    // Get orders with delivery_scheduled status and their delivery details
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        status,
        buyer:profiles!orders_buyer_id_fkey(id, nickname, phone, profile_picture),
        seller:profiles!orders_seller_id_fkey(id, nickname, phone, profile_picture),
        item:items(id, title, images),
        delivery:delivery_schedules(
          id, status, pickup_address, delivery_address, 
          pickup_time_slot, delivery_time_slot,
          pickup_instructions, delivery_instructions
        )
      `)
      .in("status", ["pickup_scheduled", "delivery_scheduled"])
      .is("rider_id", null);

    if (error) throw error;

    return new Response(
      JSON.stringify(data),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error fetching pending deliveries:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch pending deliveries" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Get assigned deliveries for a rider
router.get("/deliveries/assigned", {
  summary: "Get assigned deliveries",
  description: "Returns all deliveries assigned to the authenticated rider",
  tags: ["Deliveries"],
  responses: {
    "200": {
      description: "List of assigned deliveries",
      schema: z.array(OrderSchema),
    },
    "401": {
      description: "Unauthorized",
    },
  },
}, async (request: Request) => {
  const authError = await authenticate(request);
  if (authError) return authError;

  try {
    // Get rider ID from token (in a real implementation)
    const riderId = "sample-rider-id"; // This would come from the token

    // Get orders assigned to this rider
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        status,
        buyer:profiles!orders_buyer_id_fkey(id, nickname, phone, profile_picture),
        seller:profiles!orders_seller_id_fkey(id, nickname, phone, profile_picture),
        item:items(id, title, images),
        delivery:delivery_schedules(
          id, status, pickup_address, delivery_address, 
          pickup_time_slot, delivery_time_slot,
          pickup_instructions, delivery_instructions
        )
      `)
      .eq("rider_id", riderId);

    if (error) throw error;

    return new Response(
      JSON.stringify(data),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error fetching assigned deliveries:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch assigned deliveries" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Get delivery details
router.get("/deliveries/:id", {
  summary: "Get delivery details",
  description: "Returns detailed information about a specific delivery",
  tags: ["Deliveries"],
  params: {
    id: {
      description: "Delivery ID",
      schema: z.string().uuid(),
    },
  },
  responses: {
    "200": {
      description: "Delivery details",
      schema: OrderSchema,
    },
    "401": {
      description: "Unauthorized",
    },
    "404": {
      description: "Delivery not found",
    },
  },
}, async (request: Request, { id }: { id: string }) => {
  const authError = await authenticate(request);
  if (authError) return authError;

  try {
    // Get order details
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        status,
        buyer:profiles!orders_buyer_id_fkey(id, nickname, phone, profile_picture),
        seller:profiles!orders_seller_id_fkey(id, nickname, phone, profile_picture),
        item:items(id, title, images),
        delivery:delivery_schedules(
          id, status, pickup_address, delivery_address, 
          pickup_time_slot, delivery_time_slot,
          pickup_instructions, delivery_instructions
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return new Response(
          JSON.stringify({ error: "Delivery not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      throw error;
    }

    return new Response(
      JSON.stringify(data),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error fetching delivery details:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch delivery details" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Assign delivery to rider
router.post("/deliveries/:id/assign", {
  summary: "Assign delivery to rider",
  description: "Assigns a delivery to the authenticated rider",
  tags: ["Deliveries"],
  params: {
    id: {
      description: "Delivery ID",
      schema: z.string().uuid(),
    },
  },
  responses: {
    "200": {
      description: "Delivery assigned successfully",
    },
    "401": {
      description: "Unauthorized",
    },
    "404": {
      description: "Delivery not found",
    },
    "409": {
      description: "Delivery already assigned",
    },
  },
}, async (request: Request, { id }: { id: string }) => {
  const authError = await authenticate(request);
  if (authError) return authError;

  try {
    // Get rider ID from token (in a real implementation)
    const riderId = "sample-rider-id"; // This would come from the token

    // Check if order exists and is available
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, status, rider_id")
      .eq("id", id)
      .in("status", ["pickup_scheduled", "delivery_scheduled"])
      .single();

    if (orderError) {
      if (orderError.code === "PGRST116") {
        return new Response(
          JSON.stringify({ error: "Delivery not found or not available" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      throw orderError;
    }

    if (order.rider_id) {
      return new Response(
        JSON.stringify({ error: "Delivery already assigned to a rider" }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Assign rider to order
    const { error: updateError } = await supabase
      .from("orders")
      .update({ 
        rider_id: riderId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) throw updateError;

    // Update delivery schedule status
    const { error: deliveryError } = await supabase
      .from("delivery_schedules")
      .update({ 
        status: "assigned",
        updated_at: new Date().toISOString(),
      })
      .eq("order_id", id);

    if (deliveryError) throw deliveryError;

    // Add to delivery status history
    await supabase
      .from("delivery_status_history")
      .insert({
        order_id: id,
        status: "assigned",
        notes: `Assigned to rider ${riderId}`,
        created_by: riderId,
      });

    return new Response(
      JSON.stringify({ success: true, message: "Delivery assigned successfully" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error assigning delivery:", error);
    return new Response(
      JSON.stringify({ error: "Failed to assign delivery" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Update delivery status
router.put("/deliveries/:id/status", {
  summary: "Update delivery status",
  description: "Updates the status of a delivery",
  tags: ["Deliveries"],
  params: {
    id: {
      description: "Delivery ID",
      schema: z.string().uuid(),
    },
  },
  body: {
    schema: DeliveryUpdateSchema,
  },
  responses: {
    "200": {
      description: "Delivery status updated successfully",
    },
    "401": {
      description: "Unauthorized",
    },
    "404": {
      description: "Delivery not found",
    },
    "400": {
      description: "Invalid verification code",
    },
  },
}, async (request: Request, { id }: { id: string }) => {
  const authError = await authenticate(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { status, notes, verification_code, location } = body;

    // Get rider ID from token (in a real implementation)
    const riderId = "sample-rider-id"; // This would come from the token

    // Check if order exists and is assigned to this rider
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, status, rider_id")
      .eq("id", id)
      .eq("rider_id", riderId)
      .single();

    if (orderError) {
      if (orderError.code === "PGRST116") {
        return new Response(
          JSON.stringify({ error: "Delivery not found or not assigned to you" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      throw orderError;
    }

    // For pickup and delivery, verify the code
    if ((status === "picked_up" || status === "delivered") && verification_code) {
      const type = status === "picked_up" ? "pickup" : "delivery";
      
      const { data: qrCode, error: qrError } = await supabase
        .from("delivery_qr_codes")
        .select("verification_code")
        .eq("order_id", id)
        .eq("type", type)
        .is("scanned_at", null)
        .single();

      if (qrError || !qrCode) {
        return new Response(
          JSON.stringify({ error: "QR code not found or already used" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (qrCode.verification_code !== verification_code) {
        return new Response(
          JSON.stringify({ error: "Invalid verification code" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Mark QR code as scanned
      await supabase
        .from("delivery_qr_codes")
        .update({
          scanned_at: new Date().toISOString(),
          scanned_by: riderId,
        })
        .eq("order_id", id)
        .eq("type", type);
    }

    // Update order status based on delivery status
    let orderStatus = order.status;
    if (status === "picked_up") {
      orderStatus = "picked_up";
    } else if (status === "delivered") {
      orderStatus = "delivered";
    }

    // Update order
    const { error: updateOrderError } = await supabase
      .from("orders")
      .update({ 
        status: orderStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateOrderError) throw updateOrderError;

    // Update delivery schedule
    const { error: updateDeliveryError } = await supabase
      .from("delivery_schedules")
      .update({ 
        status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("order_id", id);

    if (updateDeliveryError) throw updateDeliveryError;

    // Add to delivery status history
    await supabase
      .from("delivery_status_history")
      .insert({
        order_id: id,
        status: status,
        notes: notes || `Status updated to ${status}`,
        location: location ? `POINT(${location.longitude} ${location.latitude})` : null,
        created_by: riderId,
      });

    // If delivered, release escrow funds
    if (status === "delivered") {
      await supabase.rpc("release_escrow_funds", { p_order_id: id });
    }

    return new Response(
      JSON.stringify({ success: true, message: "Delivery status updated successfully" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error updating delivery status:", error);
    return new Response(
      JSON.stringify({ error: "Failed to update delivery status" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Get delivery status history
router.get("/deliveries/:id/history", {
  summary: "Get delivery status history",
  description: "Returns the status history for a specific delivery",
  tags: ["Deliveries"],
  params: {
    id: {
      description: "Delivery ID",
      schema: z.string().uuid(),
    },
  },
  responses: {
    "200": {
      description: "Delivery status history",
    },
    "401": {
      description: "Unauthorized",
    },
    "404": {
      description: "Delivery not found",
    },
  },
}, async (request: Request, { id }: { id: string }) => {
  const authError = await authenticate(request);
  if (authError) return authError;

  try {
    // Check if order exists
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id")
      .eq("id", id)
      .single();

    if (orderError) {
      if (orderError.code === "PGRST116") {
        return new Response(
          JSON.stringify({ error: "Delivery not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      throw orderError;
    }

    // Get status history
    const { data: history, error: historyError } = await supabase
      .from("delivery_status_history")
      .select(`
        id,
        status,
        notes,
        location,
        created_at,
        created_by
      `)
      .eq("order_id", id)
      .order("created_at", { ascending: true });

    if (historyError) throw historyError;

    return new Response(
      JSON.stringify(history),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error fetching delivery history:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch delivery history" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Handle CORS preflight requests
router.options("*", () => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
});

// Handle 404 for unmatched routes
router.all("*", () => {
  return new Response(
    JSON.stringify({ error: "Not Found" }),
    {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});

// Serve the API
serve((req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Handle the request with the router
  return router.handle(req);
});