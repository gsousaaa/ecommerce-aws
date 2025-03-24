export enum PaymentType {
    CASH = 'CASH',
    CREDIT_CARD = 'CREDIT_CARD',
    DEBIT_CARD = 'DEBIT_CARD',
}

export enum ShippingType {
    ECONOMIC = 'ECONOMIC',
    URGENT = 'URGENT'   
}

export enum CarrierType {
    CORREIOS = 'CORREIOS',
    FEDEX = 'FEDEX'
}

export interface OrderModelRequest {
    email: string,
    productIds: string[],
    paymentType: PaymentType,
    carrierType: CarrierType,
    shippingType: ShippingType
}

export interface OrderProductResponse {
    code: string,
    price: number
}

export interface OrderModelResponse {
    email: string,
    id: string,
    createdAt: number,
    billing: {
        payment: PaymentType,
        totalPrice: number
    },
    shipping: {
        type: ShippingType,
        carrier: CarrierType
    },
    products: OrderProductResponse[]
}