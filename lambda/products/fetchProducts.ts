import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";

export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
    const httpMethod = event.httpMethod

    const lambdaRequestId = context.awsRequestId

    const apiRequestId = event.requestContext.requestId

    console.log(`API Gateway RequestId: ${apiRequestId} - Lambda requestId: ${lambdaRequestId}`)

    if (event.resource === '/products' && httpMethod === 'GET') {

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'GET PRODUCTS'
            })
        }
    }

    if(event.resource === '/products/{id}' && httpMethod === 'GET') {
        console.log('GET /products/{id}')

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: `GET /products/${event.pathParameters?.id}`
            })
        }
    }

    return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Bad request' })
    }

}