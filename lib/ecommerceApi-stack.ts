import * as lambdaNodeJs from "aws-cdk-lib/aws-lambda-nodejs"
import * as apigateway from "aws-cdk-lib/aws-apigateway"
import * as cdk from "aws-cdk-lib"
import * as cwlogs from "aws-cdk-lib/aws-logs"
import { Construct } from "constructs"

interface ECommerceApiStackProps extends cdk.StackProps {
    fetchProductsHandler: lambdaNodeJs.NodejsFunction,
    adminProductsHandler: lambdaNodeJs.NodejsFunction,
    ordersHandler: lambdaNodeJs.NodejsFunction
}

export class ECommerceApiStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: ECommerceApiStackProps) {
        super(scope, id, props)

        const logGroup = new cwlogs.LogGroup(this, "ECommerceApiLogs")
        const api = new apigateway.RestApi(this, "ECommerceApi", {
            restApiName: 'ECommerceApi',
            cloudWatchRole: true,
            deployOptions: {
                accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
                accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
                    httpMethod: true,
                    ip: true,
                    protocol: true,
                    requestTime: true,
                    resourcePath: true,
                    responseLength: true,
                    status: true,
                    caller: true,
                    user: true
                })
            }
        })

        this.productsService(props, api)
        this.ordersService(props, api)
    }

    private ordersService(props: ECommerceApiStackProps, api: apigateway.RestApi) {
        const ordersIntegration = new apigateway.LambdaIntegration(props.ordersHandler)

        //resource - /orders
        const ordersResource = api.root.addResource('orders')

        // Validador de requisição (apenas para DELETE)
        const deleteOrderValidator = new apigateway.RequestValidator(this, 'DeleteRequestValidator', {
            restApi: api,
            validateRequestParameters: true,
        });

        //GET /orders
        //GET /orders?email=${email}
        //GET /orders?email=${email}&orderId=${orderId}
        ordersResource.addMethod('GET', ordersIntegration)

        // DELETE /orders
        ordersResource.addMethod('DELETE', ordersIntegration, {
            requestParameters: {
                'method.request.querystring.email': true,
                'method.request.querystring.orderId': true
            },
            requestValidator: deleteOrderValidator
        })
        // POST /orders
        ordersResource.addMethod('POST', ordersIntegration)
    }

    private productsService(props: ECommerceApiStackProps, api: apigateway.RestApi) {
        const fetchProductsIntegration = new apigateway.LambdaIntegration(props.fetchProductsHandler)

        // GET /products
        const productsResource = api.root.addResource("products")
        productsResource.addMethod('GET', fetchProductsIntegration)

        // GET /products/{id}
        const productIdResource = productsResource.addResource("{id}")
        productIdResource.addMethod('GET', fetchProductsIntegration)

        const adminProductsIntegration = new apigateway.LambdaIntegration(props.adminProductsHandler)

        //POST /products
        productsResource.addMethod('POST', adminProductsIntegration)

        // PUT /products/{id}
        productIdResource.addMethod('PUT', adminProductsIntegration)

        // DELETE /products/{id}
        productIdResource.addMethod('DELETE', adminProductsIntegration)
    }
}