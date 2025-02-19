import * as lambda from "aws-cdk-lib/aws-lambda"
import * as lambdaNodeJs from "aws-cdk-lib/aws-lambda-nodejs"
import * as cdk from "aws-cdk-lib"
import * as dynamoDb from "aws-cdk-lib/aws-dynamodb"
import { Construct } from "constructs"

export class ProductsAppStack extends cdk.Stack {
    readonly fetchProductsHandler: lambdaNodeJs.NodejsFunction
    readonly productsDdb: dynamoDb.Table
    readonly adminProductsHandler: lambdaNodeJs.NodejsFunction

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
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

        this.fetchProductsHandler = new lambdaNodeJs.NodejsFunction(this, 'FetchProductsFunction', {
            functionName: 'FetchProductsFunction',
            entry: 'lambda/products/fetchProducts.ts',
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_22_X,
            memorySize: 512,
            timeout: cdk.Duration.seconds(5),
            bundling: {
                minify: true,
                sourceMap: false
            },
            environment: {
                PRODUCTS_DDB: this.productsDdb.tableName
            }
        })

        this.productsDdb.grantReadData(this.fetchProductsHandler)

        this.adminProductsHandler = new lambdaNodeJs.NodejsFunction(this, 'AdminProductsFunction', {
            functionName: 'AdminProductsFunction',
            entry: 'lambda/products/adminProducts.ts',
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_22_X,
            memorySize: 512,
            timeout: cdk.Duration.seconds(5),
            bundling: {
                minify: true,
                sourceMap: false
            },
            environment: {
                PRODUCTS_DDB: this.productsDdb.tableName
            }
        })

        this.productsDdb.grantWriteData(this.adminProductsHandler)
    }
}