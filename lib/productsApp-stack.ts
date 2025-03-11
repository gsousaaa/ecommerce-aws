import * as lambda from "aws-cdk-lib/aws-lambda"
import * as lambdaNodeJs from "aws-cdk-lib/aws-lambda-nodejs"
import * as cdk from "aws-cdk-lib"
import * as dynamoDb from "aws-cdk-lib/aws-dynamodb"
import * as ssm from "aws-cdk-lib/aws-ssm"
import { Construct } from "constructs"

interface ProductsAppStackProps extends cdk.StackProps {
    eventsDdb: dynamoDb.Table
}

export class ProductsAppStack extends cdk.Stack {
    readonly fetchProductsHandler: lambdaNodeJs.NodejsFunction
    readonly productsDdb: dynamoDb.Table
    readonly adminProductsHandler: lambdaNodeJs.NodejsFunction

    constructor(scope: Construct, id: string, props: ProductsAppStackProps) {
        super(scope, id, props)

        this.productsDdb = new dynamoDb.Table(this, 'ProductsDdb', {
            tableName: 'products',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            partitionKey: {
                name: 'id',
                type: dynamoDb.AttributeType.STRING
            },
            billingMode: dynamoDb.BillingMode.PROVISIONED,
            readCapacity: 1,
            writeCapacity: 1
        })

        // Products Layer
        const productsLayerArn = ssm.StringParameter.valueForStringParameter(this, 'ProductsLayerVersionArn')
        const productsLayer = lambda.LayerVersion.fromLayerVersionArn(this, 'ProductsLayerVersionArn', productsLayerArn)

        // product events layer
        const productEventsLayerArn = ssm.StringParameter.valueForStringParameter(this, 'ProductEventsLayerVersionArn')
        const productEventLayer = lambda.LayerVersion.fromLayerVersionArn(this, 'ProductEventsLayerVersionArn', productEventsLayerArn)

        const productsEventsHandler = new lambdaNodeJs.NodejsFunction(this, 'ProductEventsFunction', {
            functionName: 'ProductEventsFunction',
            entry: 'lambda/products/productEventsFunction.ts',
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_20_X,
            tracing: lambda.Tracing.ACTIVE,
            memorySize: 512,
            bundling: {
                minify: true,
                sourceMap: false,
                nodeModules: [
                    'aws-xray-sdk-core'
                ]
            },
            environment: {
                EVENTS_DDB: props.eventsDdb.tableName
            },
            layers: [productEventLayer],
            insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0
        })

        props.eventsDdb.grantWriteData(productsEventsHandler)

        this.fetchProductsHandler = new lambdaNodeJs.NodejsFunction(this, 'FetchProductsFunction', {
            functionName: 'FetchProductsFunction',
            entry: 'lambda/products/fetchProducts.ts',
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_20_X,
            tracing: lambda.Tracing.ACTIVE,
            memorySize: 512,
            bundling: {
                minify: true,
                sourceMap: false,
                nodeModules: [
                    'aws-xray-sdk-core'
                ]
            },
            environment: {
                PRODUCTS_DDB: this.productsDdb.tableName
            },
            layers: [productsLayer],
            insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0
        })

        this.productsDdb.grantReadData(this.fetchProductsHandler)

        this.adminProductsHandler = new lambdaNodeJs.NodejsFunction(this, 'AdminProductsFunction', {
            functionName: 'AdminProductsFunction',
            entry: 'lambda/products/adminProducts.ts',
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_20_X,
            tracing: lambda.Tracing.ACTIVE,
            memorySize: 512,
            bundling: {
                minify: true,
                sourceMap: false,
                nodeModules: [
                    'aws-xray-sdk-core'
                ]
            },
            environment: {
                PRODUCTS_DDB: this.productsDdb.tableName,
                PRODUCT_EVENT_FUNCTION_NAME: productsEventsHandler.functionName
            },
            layers: [productsLayer, productEventLayer],
            insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0
        })

        this.productsDdb.grantWriteData(this.adminProductsHandler)
        // permitindo que a funcao admin products chame a funcao products events
        productsEventsHandler.grantInvoke(this.adminProductsHandler)
    }
}