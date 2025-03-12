import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { Product, ProductRepository } from "/opt/nodejs/productsLayer";
import { DynamoDB, Lambda } from "aws-sdk"
import { ProductEvent, ProductEventType } from "/opt/nodejs/productsEventsLayer";

const productsDdb = process.env.PRODUCTS_DDB!
const productEventsFunctionname = process.env.PRODUCT_EVENT_FUNCTION_NAME!

const ddbClient = new DynamoDB.DocumentClient()
const lambdaClient = new Lambda()

const productRepository = new ProductRepository(ddbClient, productsDdb)
export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
    const lambdaRequestId = context.awsRequestId
    const apiRequestId = event.requestContext.requestId

    console.log(`API Gateway RequestId: ${apiRequestId} - Lambda requestId: ${lambdaRequestId}`)

    if (event.resource === '/products') {
        console.log('POST /products')
        const body = JSON.parse(event.body!)
        const product = await productRepository.createProduct(body as Product)

        const response = await sendProductEvent(product, ProductEventType.CREATED, 'glauco@gmail.com', lambdaRequestId)

        console.log(response)

        return {
            statusCode: 201,
            body: JSON.stringify({ product })
        }
    }

    if (event.resource === '/products/{id}') {
        const productId = event.pathParameters?.id as string

        if (event.httpMethod === 'PUT') {
            console.log(`PUT /products/${productId}`)
            try {
                const body = JSON.parse(event.body!)
                const updatedProduct = await productRepository.updateProduct(productId, body as Product)

                const response = await sendProductEvent(updatedProduct, ProductEventType.UPDATED, 'glauco@gmail.com', lambdaRequestId)
                console.log(response)

                return {
                    statusCode: 200,
                    body: JSON.stringify({ updatedProduct })
                }
            } catch (err) {
                return {
                    statusCode: 404,
                    body: 'Product not found'
                }
            }
        }

        if (event.httpMethod === 'DELETE') {
            console.log(`DELETE /products/${productId}`)

            try {
                const deletedProduct = await productRepository.deleteProduct(productId)

                const response = await sendProductEvent(deletedProduct, ProductEventType.DELETED, 'glauco@gmail.com', lambdaRequestId)
                console.log(response)

                return {
                    statusCode: 200,
                    body: JSON.stringify({ deletedProduct })
                }
            } catch (err) {
                console.error((<Error>err).message)
                return {
                    statusCode: 404,
                    body: (<Error>err).message
                }
            }
        }
    }

    return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Bad request' })
    }

}

const sendProductEvent = (product: Product, eventType: ProductEventType, email: string, lambdaRequestId: string) => {
    const event: ProductEvent = {
        email,
        eventType,
        productCode: product.code,
        productId: product.id,
        productPrice: product.price,
        requestId: lambdaRequestId
    }

    return lambdaClient.invoke({
        FunctionName: productEventsFunctionname,
        Payload: JSON.stringify(event),
        InvocationType: 'Event'
    }).promise()
}   