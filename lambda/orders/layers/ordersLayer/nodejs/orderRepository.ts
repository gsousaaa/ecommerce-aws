import { DocumentClient } from "aws-sdk/clients/dynamodb"
import { v4 } from "uuid"
import { CarrierType, PaymentType, ShippingType } from "/opt/nodejs/ordersApiLayer"

export interface OrderProduct {
    code: string,
    price: number
}

export interface Order {
    pk: string,
    sk?: string,
    shipping: { type: ShippingType, carrier: CarrierType},
    createdAt?: number,
    products: OrderProduct[],
    billing: {
        totalPrice: number,
        payment: PaymentType
    }
}

export class OrderRepository {
    private ddbClient: DocumentClient
    private ordersDdb: string

    constructor(ddbClient: DocumentClient, ordersDdb: string) {
        this.ddbClient = ddbClient,
            this.ordersDdb = ordersDdb
    }

    async createOrder(order: Order): Promise<Order> {
        order.sk = v4()
        order.createdAt = Date.now()
        await this.ddbClient.put({
            TableName: this.ordersDdb,
            Item: order
        }).promise()

        return order
    }

    async getAllOrders(): Promise<Order[]> {
        const response = await this.ddbClient.scan({ TableName: this.ordersDdb }).promise()
        return response.Items as Order[]
    }

    async getOrdersByEmail(email: string): Promise<Order[]> {
        const response = await this.ddbClient.query({
            TableName: this.ordersDdb,
            KeyConditionExpression: "pk = :email",
            ExpressionAttributeValues: { ":email": email }
        }).promise()

        return response.Items as Order[]
    }

    async getOrder(email: string, orderId: string): Promise<Order> {
        const response = await this.ddbClient.get({
            TableName: this.ordersDdb,
            Key: {
                pk: email,
                sk: orderId
            }
        }).promise()

        if (!response.Item) throw new Error('Order not found')
        return response.Item as Order
    }

    async deleteOrder(email: string, orderId: string): Promise<Order> {
        const response = await this.ddbClient.delete({
            TableName: this.ordersDdb,
            Key: {
                pk: email,
                sk: orderId
            },
            ReturnValues: "ALL_OLD"
        }).promise()

        if (!response.Attributes) throw new Error('Order not found')

        return response.Attributes as Order
    }
}