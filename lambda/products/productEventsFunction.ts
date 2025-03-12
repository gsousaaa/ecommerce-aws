import { Callback, Context } from "aws-lambda";
import { ProductEvent } from "/opt/nodejs/productsEventsLayer";
import { DynamoDB } from "aws-sdk";

const eventsDdb = process.env.EVENTS_DDB!
const ddbClient = new DynamoDB.DocumentClient()

export const handler = async(event: ProductEvent, context:  Context, callback: Callback): Promise<void> => {
    console.log(event)

    console.log(`Lambda requestId: ${context.awsRequestId}`)
    
    await createEvent(event)

    callback(null, JSON.stringify({
        productEventCreated: true,
        message: `OK`
    }))
}

const createEvent = (event: ProductEvent) => {
    const timestamp = Date.now()
    const ttl = ~~(timestamp / 1000 + 5 * 60) // 5 minutos a frente

    return ddbClient.put({
        TableName: eventsDdb,
        Item: {
            pk: `#product_${event.productCode}`,
            sk: `${event.eventType}#${timestamp}`,
            email: event.email,
            createdAt: timestamp,
            requestId: event.requestId,
            eventType: event.eventType,
            ttl,
            info: {
                productId: event.productId,
                price: event.productPrice
            }
        }
    }).promise()
}