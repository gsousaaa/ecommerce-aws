import { CarrierType, PaymentType, ShippingType } from "/opt/nodejs/ordersApiLayer"

export enum OrderEventType {
    CREATED = 'ORDER_CREATED', 
    DELETED = 'ORDER_DELETED'
}

export interface Envelope {
    eventType: OrderEventType,
    data: string
}

export interface OrderEvent {
    email: string,
    orderId: string,
    shipping: {
        type: ShippingType,
        carrier: CarrierType
    },
    billing: {
        payment: PaymentType,
        totalPrice: number
    },
    productCodes: string[],
    requestId: string
}