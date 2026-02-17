import { supabase } from '../supabaseClient';
import { Order, OrderStatus, OrderType, Product, LogisticsStatus, DeliveryType, OrderItem, AssemblerStats, Driver, Vehicle, DeliveryAttempt } from '../types';

/**
 * DB Service Implementation for Supabase
 */

// Helper: Map Supabase snake_case to App camelCase
const mapOrderFromDB = (o: any): Order => ({
    id: o.id,
    orderNumber: o.order_number,
    customerName: o.customer_name,
    customerLocation: o.customer_location || '',
    neighborhood: o.neighborhood,
    date: o.date,
    status: o.status as OrderStatus,
    logisticsStatus: o.logistics_status as LogisticsStatus,
    type: o.type as OrderType,
    items: o.order_items ? o.order_items.reduce((acc: number, item: any) => acc + item.quantity, 0) : 0,
    deliveryDate: o.delivery_date,
    deliveryType: o.delivery_type as DeliveryType,
    isFutureDelivery: o.is_future_delivery,
    futureDeliveryDate: o.future_delivery_date,
    hasAssembly: o.has_assembly,
    assemblyDate: o.assembly_date,
    assemblyStatus: o.assembly_status,
    assembler: o.assembler,
    assemblyBonus: o.assembly_bonus,
    assemblyBonusDescription: o.assembly_bonus_description,
    
    driverId: o.driver_id,
    driverName: o.driver_name,
    vehicleId: o.vehicle_id,
    vehiclePlate: o.vehicle_plate,
    deliveryObservation: o.delivery_observation,
    
    salesperson: o.salesperson,
    cpf: o.cpf,
    phone: o.phone,
    phoneOptional: o.phone_optional,
    invoiceNumber: o.invoice_number,
    couponNumber: o.coupon_number,
    
    address: o.address_data, // JSONB mapping directly
    
    // Relations
    itemsList: o.order_items ? o.order_items.map((i: any) => ({
        id: i.id,
        sku: i.sku,
        description: i.description,
        assemblyValue: i.assembly_value,
        quantity: i.quantity,
        toDeliver: i.to_deliver,
        toAssemble: i.to_assemble
    })) : [],
    
    deliveryHistory: o.delivery_history ? o.delivery_history.map((h: any) => ({
        timestamp: h.timestamp,
        status: h.status as LogisticsStatus,
        driverName: h.driver_name,
        vehiclePlate: h.vehicle_plate,
        observation: h.observation
    })) : []
});

export const dbService = {
  
  getOrders: async (): Promise<Order[]> => {
    const { data, error } = await supabase
        .from('orders')
        .select(`
            *,
            order_items (*),
            delivery_history (*)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching orders:', error);
        // We throw here so the UI knows something is wrong instead of showing empty list
        throw new Error(`Erro ao buscar pedidos: ${error.message}`);
    }
    return data ? data.map(mapOrderFromDB) : [];
  },

  getOrderById: async (id: string): Promise<Order | undefined> => {
    const { data, error } = await supabase
        .from('orders')
        .select(`
            *,
            order_items (*),
            delivery_history (*)
        `)
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching order by id:', error);
        return undefined;
    }
    return mapOrderFromDB(data);
  },

  createOrder: async (order: Omit<Order, 'id'>): Promise<Order> => {
    // 1. Insert Order
    const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
            order_number: order.orderNumber,
            customer_name: order.customerName,
            customer_location: order.customerLocation,
            neighborhood: order.neighborhood,
            date: order.date,
            status: order.status,
            logistics_status: order.logisticsStatus,
            type: order.type,
            delivery_type: order.deliveryType,
            is_future_delivery: order.isFutureDelivery,
            future_delivery_date: order.futureDeliveryDate,
            has_assembly: order.hasAssembly,
            assembly_date: order.assemblyDate,
            assembly_status: order.assemblyStatus,
            
            salesperson: order.salesperson,
            cpf: order.cpf,
            phone: order.phone,
            phone_optional: order.phoneOptional,
            invoice_number: order.invoiceNumber,
            coupon_number: order.couponNumber,
            address_data: order.address
        })
        .select()
        .single();

    if (orderError) throw orderError;

    // 2. Insert Items if any
    if (order.itemsList && order.itemsList.length > 0) {
        const itemsToInsert = order.itemsList.map(item => ({
            order_id: orderData.id,
            sku: item.sku,
            description: item.description,
            assembly_value: item.assemblyValue,
            quantity: item.quantity,
            to_deliver: item.toDeliver,
            to_assemble: item.toAssemble
        }));

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(itemsToInsert);
        
        if (itemsError) console.error("Error inserting items", itemsError);
    }

    return mapOrderFromDB({ ...orderData, order_items: order.itemsList || [] });
  },

  createOrdersBulk: async (newOrders: Omit<Order, 'id'>[]): Promise<boolean> => {
      // Loop is simpler for robust relational insertion in this context without RPC
      for (const order of newOrders) {
          try {
             await dbService.createOrder(order);
          } catch (e) {
             console.error("Error creating bulk order", e);
             throw e;
          }
      }
      return true;
  },

  updateOrder: async (id: string, updatedOrder: Partial<Order>): Promise<Order | null> => {
      // 1. Map frontend fields to DB fields
      const dbPayload: any = {};
      
      // Basic Fields Mapping
      const fieldMap: Record<string, string> = {
          status: 'status',
          customerName: 'customer_name',
          orderNumber: 'order_number',
          customerLocation: 'customer_location',
          neighborhood: 'neighborhood',
          date: 'date',
          type: 'type',
          deliveryType: 'delivery_type',
          isFutureDelivery: 'is_future_delivery',
          futureDeliveryDate: 'future_delivery_date',
          hasAssembly: 'has_assembly',
          assemblyDate: 'assembly_date',
          salesperson: 'salesperson',
          cpf: 'cpf',
          phone: 'phone',
          phoneOptional: 'phone_optional',
          invoiceNumber: 'invoice_number',
          couponNumber: 'coupon_number',
          address: 'address_data'
      };

      Object.keys(updatedOrder).forEach(key => {
          if (fieldMap[key] && updatedOrder[key as keyof Order] !== undefined) {
              dbPayload[fieldMap[key]] = updatedOrder[key as keyof Order];
          }
      });

      // 2. Update Items if provided
      if (updatedOrder.itemsList) {
          // A. Delete existing items
          await supabase.from('order_items').delete().eq('order_id', id);
          
          // B. Insert new items
          if (updatedOrder.itemsList.length > 0) {
              const itemsToInsert = updatedOrder.itemsList.map(item => ({
                order_id: id,
                sku: item.sku,
                description: item.description,
                assembly_value: item.assemblyValue,
                quantity: item.quantity,
                to_deliver: item.toDeliver,
                to_assemble: item.toAssemble
            }));
            await supabase.from('order_items').insert(itemsToInsert);
          }
      }

      // 3. Update Main Order Table
      if (Object.keys(dbPayload).length > 0) {
          const { data, error } = await supabase
            .from('orders')
            .update(dbPayload)
            .eq('id', id)
            .select(`*, order_items(*), delivery_history(*)`)
            .single();

          if (error) {
              console.error("Update Order Error", error);
              return null;
          }
          return mapOrderFromDB(data);
      }
      
      return dbService.getOrderById(id) as Promise<Order>;
  },

  deleteOrder: async (id: string): Promise<boolean> => {
      const { error } = await supabase.from('orders').delete().eq('id', id);
      return !error;
  },

  updateOrderStatus: async (id: string, status: OrderStatus): Promise<boolean> => {
     const { error } = await supabase.from('orders').update({ status }).eq('id', id);
     return !error;
  },

  updateLogisticsStatus: async (
      id: string, 
      logisticsStatus: LogisticsStatus, 
      extraData?: { driver?: Driver, vehicle?: Vehicle, observation?: string }
  ): Promise<boolean> => {
    
    const updateData: any = { logistics_status: logisticsStatus };
    
    // Auto status logic
    if (logisticsStatus === LogisticsStatus.COMPLETED) updateData.status = OrderStatus.COMPLETED;
    else if ([LogisticsStatus.IN_TRANSIT, LogisticsStatus.SEPARATED, LogisticsStatus.LOADED].includes(logisticsStatus)) updateData.status = OrderStatus.IN_PROGRESS;
    else if ([LogisticsStatus.NOT_DELIVERED, LogisticsStatus.ADDRESS_NOT_FOUND].includes(logisticsStatus)) updateData.status = OrderStatus.DELAYED;

    if (extraData?.driver) {
        updateData.driver_id = extraData.driver.id;
        updateData.driver_name = extraData.driver.name;
    }
    if (extraData?.vehicle) {
        updateData.vehicle_id = extraData.vehicle.id;
        updateData.vehicle_plate = extraData.vehicle.plate;
    }
    if (extraData?.observation) {
        updateData.delivery_observation = extraData.observation;
    }

    // Reset Driver/Vehicle if moving back to Separated (Retry flow)
    if (logisticsStatus === LogisticsStatus.SEPARATED) {
        updateData.driver_id = null;
        updateData.driver_name = null;
        updateData.vehicle_id = null;
        updateData.vehicle_plate = null;
    }

    const { error } = await supabase.from('orders').update(updateData).eq('id', id);

    // History Entry
    if (!error && (logisticsStatus === LogisticsStatus.COMPLETED || logisticsStatus === LogisticsStatus.NOT_DELIVERED)) {
        await supabase.from('delivery_history').insert({
            order_id: id,
            timestamp: new Date().toLocaleString('pt-BR'),
            status: logisticsStatus,
            driver_name: extraData?.driver?.name,
            vehicle_plate: extraData?.vehicle?.plate,
            observation: extraData?.observation
        });
    }

    if (error) {
        console.error('Error updating status:', error);
        throw error;
    }
    return true;
  },

  updateAssemblyData: async (id: string, data: { assembler: string, bonus: number, bonusDesc: string }): Promise<boolean> => {
    const { error } = await supabase.from('orders').update({
        assembler: data.assembler,
        assembly_bonus: data.bonus,
        assembly_bonus_description: data.bonusDesc,
        assembly_status: 'Concluído'
    }).eq('id', id);
    
    if (error) throw error;
    return true;
  },

  // Products
  searchProducts: async (query: string): Promise<Product[]> => {
    if (!query) return [];
    
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .ilike('description', `%${query}%`)
        .limit(10);
    
    if (error) {
        console.error('Error searching products:', error);
        return [];
    }

    return (data || []).map((p: any) => ({
        id: p.id,
        sku: p.sku,
        description: p.description,
        assemblyValue: p.assembly_value
    }));
  },

  // Fleet
  getDrivers: async (): Promise<Driver[]> => {
      const { data, error } = await supabase.from('drivers').select('*');
      
      if (error) {
          console.error('Error fetching drivers:', error);
          // THROW ERROR so UI can see it!
          throw new Error(`Erro ao buscar motoristas: ${error.message} (${error.code})`);
      }

      return (data || []).map((d: any) => ({
          id: d.id,
          name: d.name,
          cnh: d.cnh,
          category: d.category,
          expirationDate: d.expiration_date,
          phone: d.phone,
          status: d.status
      }));
  },

  createDriver: async (driver: Omit<Driver, 'id'>): Promise<Driver> => {
      const { data, error } = await supabase.from('drivers').insert({
          name: driver.name,
          cnh: driver.cnh,
          category: driver.category,
          expiration_date: driver.expirationDate,
          phone: driver.phone,
          status: driver.status
      }).select().single();
      
      if (error) {
          console.error("Error creating driver", error);
          throw new Error(`Erro ao criar motorista: ${error.message}`);
      }
      return { ...driver, id: data.id };
  },

  getVehicles: async (): Promise<Vehicle[]> => {
      const { data, error } = await supabase.from('vehicles').select('*');
      
      if (error) {
          console.error('Error fetching vehicles:', error);
          throw new Error(`Erro ao buscar veículos: ${error.message} (${error.code})`);
      }

      return (data || []).map((v: any) => ({
          id: v.id,
          model: v.model,
          plate: v.plate,
          type: v.type,
          capacity: v.capacity,
          status: v.status
      }));
  },

  createVehicle: async (vehicle: Omit<Vehicle, 'id'>): Promise<Vehicle> => {
      const { data, error } = await supabase.from('vehicles').insert({
          model: vehicle.model,
          plate: vehicle.plate,
          type: vehicle.type,
          capacity: vehicle.capacity,
          status: vehicle.status
      }).select().single();
      
      if (error) {
          console.error("Error creating vehicle", error);
          throw new Error(`Erro ao criar veículo: ${error.message}`);
      }
      return { ...vehicle, id: data.id };
  },

  // Reporting (Aggregation Logic)
  getAssemblerStats: async (period: 'week' | 'month'): Promise<AssemblerStats[]> => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
            assembler,
            assembly_bonus,
            assembly_status,
            order_items (assembly_value, quantity, to_assemble)
        `)
        .eq('has_assembly', true)
        .eq('assembly_status', 'Concluído');

      if (error) {
          console.error('Error fetching stats:', error);
          throw error;
      }
      if (!data) return [];

      const statsMap: Record<string, AssemblerStats> = {};

      data.forEach((order: any) => {
          if (!order.assembler) return;
          
          if (!statsMap[order.assembler]) {
              statsMap[order.assembler] = {
                  id: order.assembler, // Use name as ID for simplicity here
                  name: order.assembler,
                  totalAssemblies: 0,
                  onTimeRate: 100, // Mock calculation
                  avgTime: '45min', // Mock
                  totalValue: 0,
                  bonusTotal: 0,
                  goal: 5000 // Static goal
              };
          }

          const assemblerStat = statsMap[order.assembler];
          assemblerStat.totalAssemblies += 1;
          assemblerStat.bonusTotal += (order.assembly_bonus || 0);

          // Calculate Value from items
          let orderValue = 0;
          order.order_items?.forEach((item: any) => {
              if (item.to_assemble) {
                  orderValue += (item.assembly_value * item.quantity);
              }
          });
          assemblerStat.totalValue += orderValue;
      });

      return Object.values(statsMap).sort((a, b) => b.totalValue - a.totalValue);
  }
};