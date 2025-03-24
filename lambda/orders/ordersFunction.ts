import { DynamoDB } from "aws-sdk"
import { Order, OrderProduct, OrderRepository } from "./layers/ordersLayer/nodejs/orderRepository"
import { Product, ProductRepository } from "/opt/nodejs/productsLayer"
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { OrderModelRequest, OrderModelResponse, OrderProductResponse } from "/opt/nodejs/ordersApiLayer";

const ordersDdb = process.env.ORDERS_DDB!
const productsDdb = process.env.PRODUCTS_DDB!
const ddbClient = new DynamoDB.DocumentClient()

const orderRepository = new OrderRepository(ddbClient, ordersDdb)
const productRepository = new ProductRepository(ddbClient, productsDdb)

export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
    const method = event.httpMethod
    const apiRequestId = event.requestContext
    const lambdaRequestId = context.awsRequestId

    console.log(`HTTP METHOD ${method}; Api request ID ${apiRequestId}; Lambda request id: ${lambdaRequestId}`)
    switch (true) {
        case (method === 'POST'):
            const orderRequest = JSON.parse(event.body!) as OrderModelRequest
            const products = await productRepository.getProductsByIds(orderRequest.productIds)

            if (products.length !== orderRequest.productIds.length) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({ message: 'Some product was not found' })
                }
            }

            const order = buildOrder(orderRequest, products)
            const createdOrder = await orderRepository.createOrder(order)

            return {
                statusCode: 201,
                body: JSON.stringify(convertToOrderResponse(createdOrder))
            }

        case (method === 'GET'):
            if (event.queryStringParameters) {
                const email = event.queryStringParameters.email
                const orderId = event.queryStringParameters.orderId

                if (email) {
                    if (orderId) {
                        try {
                            const order = await orderRepository.getOrder(email, orderId)

                            return {
                                statusCode: 200,
                                body: JSON.stringify(order)
                            }
                        } catch (error) {
                            console.log((<Error>error).message)
                            return {
                                statusCode: 404,
                                body: (<Error>error).message
                            }
                        }
                    }


                    const orders = await orderRepository.getOrdersByEmail(email)
                    return {
                        statusCode: 200,
                        body: JSON.stringify(orders)
                    }
                }
            }

            const orders = await orderRepository.getAllOrders()
            return {
                statusCode: 200,
                body: JSON.stringify(orders)
            }

        case (method === 'DELETE'):
            try {
                const email = event.queryStringParameters?.email!
                const orderId = event.queryStringParameters?.orderId!
                const deletedOrder = await orderRepository.deleteOrder(email, orderId)

                return {
                    statusCode: 200,
                    body: JSON.stringify(convertToOrderResponse(deletedOrder))
                }
            } catch (error) {
                console.log((<Error>error).message)
                return {
                    statusCode: 404,
                    body: (<Error>error).message
                }
            }

        default:
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Bad Request' })
            }
    }
}

const convertToOrderResponse = (order: Order) => {
    const orderProducts: OrderProductResponse[] = []

    for (const product of order.products) orderProducts.push({ code: product.code, price: product.price })

    const orderReponse: OrderModelResponse = {
        billing: { payment: order.billing.payment, totalPrice: order.billing.totalPrice },
        createdAt: order.createdAt!,
        email: order.pk,
        id: order.sk!,
        products: orderProducts,
        shipping: {
            carrier: order.shipping.carrier,
            type: order.shipping.type,
        },
    }

    return orderReponse
}

const buildOrder = (orderRequest: OrderModelRequest, products: Product[]): Order => {
    const orderProducts: OrderProduct[] = []
    let totalPrice = 0

    for (const product of products) {
        totalPrice += product.price
        orderProducts.push({ code: product.code, price: product.price })
    }

    const order: Order = {
        pk: orderRequest.email,
        billing: { totalPrice, payment: orderRequest.paymentType },
        products: orderProducts,
        shipping: {
            type: orderRequest.shippingType,
            carrier: orderRequest.carrierType
        }
    }

    return order
}