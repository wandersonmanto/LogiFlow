export enum OrderStatus {
  OPEN = 'Aberto',
  IN_PROGRESS = 'Em Andamento',
  COMPLETED = 'Concluído',
  DELAYED = 'Em Atraso',
  READY_TO_PICK = 'A Separar',
  DRAFT = 'Rascunho'
}

export enum LogisticsStatus {
  REGISTERED = 'Registrado',
  SEPARATED = 'Separado',
  LOADED = 'Carregado',
  IN_TRANSIT = 'Em Rota',
  NOT_DELIVERED = 'Não Entregue',
  ADDRESS_NOT_FOUND = 'Endereço não localizado',
  COMPLETED = 'Concluído'
}

export enum OrderType {
  STORE = 'Loja',
  ECOMMERCE = 'Site'
}

export enum DeliveryType {
  COMPLETE = 'Completa',
  PARTIAL = 'Parcial'
}

export interface DeliveryAttempt {
  timestamp: string;
  status: LogisticsStatus;
  driverName?: string;
  vehiclePlate?: string;
  observation?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerLocation: string; // City/State
  neighborhood?: string; // New field for routing
  date: string;
  status: OrderStatus;
  logisticsStatus: LogisticsStatus; // Status detalhado do fluxo
  type: OrderType;
  items: number;
  weight?: string;
  deliveryDate?: string;
  
  // New Fields for Step 4
  deliveryType: DeliveryType;
  isFutureDelivery: boolean;
  futureDeliveryDate?: string;
  
  hasAssembly: boolean;
  assemblyDate?: string;
  
  alerts?: {
    isDelayed: boolean;     // > 3 dias
    isCritical: boolean;    // > 7 dias
  };

  // Fields for Assembly Module
  itemsList?: OrderItem[];
  assembler?: string;
  assemblyBonus?: number;
  assemblyBonusDescription?: string;
  assemblyStatus?: 'Pendente' | 'Agendado' | 'Atribuído' | 'Concluído';

  // Fields for Logistics Execution
  driverId?: string;
  driverName?: string;
  vehicleId?: string;
  vehiclePlate?: string;
  deliveryObservation?: string;
  
  // History
  deliveryHistory?: DeliveryAttempt[];

  // Draft Data
  draftStep?: number; // To restore the form at specific step
  salesperson?: string; // Mapped from Coupon in CSV import
  cpf?: string;
  phone?: string;
  phoneOptional?: string;
  address?: {
    cep: string;
    state: string;
    city: string;
    neighborhood: string;
    street: string;
    number: string;
    observation: string;
  };
  invoiceNumber?: string;
  couponNumber?: string;
}

export interface Product {
  id: string;
  sku: string;
  description: string;
    assemblyValue: number;
    quantity: number;
    toDeliver: boolean;
    toAssemble: boolean;
}

export interface NewProduct {
    id: number;
    sku: string;
    description: string;
    createdAt: string;
}

export interface OrderItem extends Product {
  // All fields are now in Product as per the user's edit
}

export interface Driver {
  id: string;
  name: string;
  cnh: string;
  category: string;
  expirationDate: string;
  phone: string;
  status: 'Disponível' | 'Em Rota' | 'Férias' | 'Inativo';
}

export interface Vehicle {
  id: string;
  model: string;
  plate: string;
  type: 'VUC' | 'Toco' | 'Truck' | 'Van' | 'Utilitário';
  capacity: string; // ex: 1500kg
  status: 'Disponível' | 'Em Uso' | 'Manutenção';
}

export interface KPI {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: string;
  colorClass: string;
}

export interface AssemblerStats {
  id: string;
  name: string;
  totalAssemblies: number;
  onTimeRate: number; // Percentage
  avgTime: string; // e.g. "45min"
  totalValue: number;
  bonusTotal: number;
  goal: number; // Target value
  avatarUrl?: string;
}