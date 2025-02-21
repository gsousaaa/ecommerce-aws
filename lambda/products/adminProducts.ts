import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { Product, ProductRepository } from "/opt/nodejs/productsLayer";
import { DynamoDB } from "aws-sdk"

const productsDdb = process.env.PRODUCTS_DDB!
const ddbClient = new DynamoDB.DocumentClient()

const productRepository = new ProductRepository(ddbClient, productsDdb)
export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
    const lambdaRequestId = context.awsRequestId
    const apiRequestId = event.requestContext.requestId

    console.log(`API Gateway RequestId: ${apiRequestId} - Lambda requestId: ${lambdaRequestId}`)

    if (event.resource === '/products') {
        console.log('POST /products')
        const body = JSON.parse(event.body!)
        const product = await productRepository.createProduct(body as Product)

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