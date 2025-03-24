import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { ProductRepository } from "/opt/nodejs/productsLayer";
import { DynamoDB } from "aws-sdk"

const productsDdb = process.env.PRODUCTS_DDB!
const ddbClient = new DynamoDB.DocumentClient()

const productRepository = new ProductRepository(ddbClient, productsDdb)
export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
    const httpMethod = event.httpMethod

    const lambdaRequestId = context.awsRequestId

    const apiRequestId = event.requestContext.requestId

    console.log(`API Gateway RequestId: ${apiRequestId} - Lambda requestId: ${lambdaRequestId}`)

    if (event.resource === '/products' && httpMethod === 'GET') {
        console.log('GET /products')
        const products = await productRepository.getAllProducts()

        return {
            statusCode: 200,
            body: JSON.stringify({ products })
        }
    }

    if (event.resource === '/products/{id}' && httpMethod === 'GET') {
        const productId = event.pathParameters?.id!
        console.log(`GET /products/${productId}`)

        try {
            const product = await productRepository.getProductById(productId)
            return {
                statusCode: 200,
                body: JSON.stringify({
                    product
                })
            }
        } catch (err) {
            console.error((<Error>err).message)
            return {
                statusCode: 404,
                body: (<Error>err).message
            }
        }
    }

    return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Bad request' })
    }

}