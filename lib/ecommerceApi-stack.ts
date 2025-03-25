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
        const deleteOrderValidator = new apigateway.RequestValidator(this, 'DeleteOrderRequestValidator', {
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
        const postOrderValidator = new apigateway.RequestValidator(this, 'PostOrderRequestValidator', {
            restApi: api,
            requestValidatorName: 'PostOrderRequestValidator',
            validateRequestBody: true
        })

        const orderRequestModel = new apigateway.Model(this, 'OrderRequestModel', {
            modelName: 'OrderRequestModel', restApi: api, schema: {
                type: apigateway.JsonSchemaType.OBJECT,
                properties: {
                    email: {
                        type: apigateway.JsonSchemaType.STRING,
                    },
                    productIds: {
                        type: apigateway.JsonSchemaType.ARRAY,
                        minItems: 1,
                        items: {
                            type: apigateway.JsonSchemaType.STRING
                        }
                    },
                    paymentType: {
                        type: apigateway.JsonSchemaType.STRING,
                        enum: ['CASH', 'CREDIT_CARD', 'DEBIT_CARD']
                    },
                    carrierType: {
                        type: apigateway.JsonSchemaType.STRING,
                        enum: ['CORREIOS', 'FEDEX']
                    },
                    shippingType: {
                        type: apigateway.JsonSchemaType.STRING,
                        enum: ['URGENT', 'ECONOMIX']
                    }

                },
                required: ['email', 'productIds', 'paymentType', 'carrierType', 'shippingType']
            }
        })
        ordersResource.addMethod('POST', ordersIntegration, {
            requestValidator: postOrderValidator, requestModels: {
                "application/json": orderRequestModel
            }
        })
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
        const postProductValidator = new apigateway.RequestValidator(this, 'PostProductValidator', {
            restApi: api,
            requestValidatorName: 'PostProductValidator',
            validateRequestBody: true
        })

        const productRequestModel = new apigateway.Model(this, 'ProductRequestModel', {
            restApi: api,
            modelName: 'ProductRequestModel',
            schema: {
                type: apigateway.JsonSchemaType.OBJECT,
                properties: {
                    model: { type: apigateway.JsonSchemaType.STRING },
                    code: { type: apigateway.JsonSchemaType.STRING },
                    price: { type: apigateway.JsonSchemaType.NUMBER },
                    productName: { type: apigateway.JsonSchemaType.STRING },
                    productUrl: { type: apigateway.JsonSchemaType.STRING },
                },
                required: ['model', 'code', 'price', 'productName', 'productUrl']
            }
        })
        productsResource.addMethod('POST', adminProductsIntegration, {requestValidator: postProductValidator, requestModels: {
            'application/json': productRequestModel
        } })

        // PUT /products/{id}
        const updateProductValidator = new apigateway.RequestValidator(this, 'UpdateProductValidator', {
            restApi: api,
            requestValidatorName: 'UpdateProductValidator',
            validateRequestBody: true
        })

        productIdResource.addMethod('PUT', adminProductsIntegration, {requestValidator: updateProductValidator, requestModels: {
            'application/json': productRequestModel
        }})

        // DELETE /products/{id}
        productIdResource.addMethod('DELETE', adminProductsIntegration)
    }
}