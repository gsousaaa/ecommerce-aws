import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { create } from "domain";

export interface OrderEventDdb {
    pk: string,
    sk: string,
    ttl: number,
    email: string,
    createdAt: number,
    requestId: string,
    eventType: string;
    info: {
        orderId: string,
        productCodes: string[]
        messageId: string
    }
}

export class OrderEventsRepository {
    private clientDdb: DocumentClient
    private eventsDdb: string

    constructor(clientsDdb: DocumentClient, eventsDdb: string) {
        this.clientDdb = clientsDdb
        this.eventsDdb = eventsDdb
    }

    createOrderEvent(orderEvent: OrderEventDdb) {
        return this.clientDdb.put({
            TableName: this.eventsDdb,
            Item: orderEvent
        }).promise()
    }
}