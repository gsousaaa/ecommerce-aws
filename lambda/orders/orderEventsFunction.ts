import { AWSError, DynamoDB } from "aws-sdk"
import { OrderEventsRepository } from "/opt/nodejs/orderEventsRepositoryLayer"
import { Context, SNSEvent, SNSMessage } from "aws-lambda"
import { Envelope, OrderEvent } from "/opt/nodejs/orderEventsLayer"
import { PromiseResult } from "aws-sdk/lib/request"

const eventsDdb = process.env.EVENTS_DDB!
const ddbClient = new DynamoDB.DocumentClient()

const orderEventsRepository = new OrderEventsRepository(ddbClient, eventsDdb)

export const handler = async (event: SNSEvent, context: Context): Promise<void> => {

    const promises: Promise<PromiseResult<DynamoDB.DocumentClient.PutItemOutput, AWSError>>[] = []
     // executando de forma paralela para todos os itens
    event.Records.forEach((record) => {
        promises.push(createEvent(record.Sns))
    })

    await Promise.all(promises)

    return 
}

const createEvent = (body: SNSMessage) => {
    const messageId = body.MessageId
    const envelope = JSON.parse(body.Message) as Envelope
    const event = JSON.parse(envelope.data) as OrderEvent

    console.log(`Order event - MessageId: ${messageId}`)

    const timestamp = Date.now()
    const ttl = ~~(timestamp / 1000 + 5 * 60)

    return orderEventsRepository.createOrderEvent({
        pk: `#order_${event.orderId}`,
        sk: `${envelope.eventType}#${timestamp}`,
        info: {
            orderId: event.orderId,
            messageId,
            productCodes: event.productCodes
        },
        requestId: event.requestId,
        createdAt: timestamp,
        ttl,
        email: event.email,
        eventType: envelope.eventType,
    })
}