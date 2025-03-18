import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs'
import * as cdk from 'aws-cdk-lib'
import * as dynamoDB from 'aws-cdk-lib/aws-dynamodb'
import * as ssm from 'aws-cdk-lib/aws-ssm'
import { Construct } from 'constructs'

interface OrderAppStackProps extends cdk.StackProps {
    productsDdb: dynamoDB.Table
}

export class OrderAppStack extends cdk.Stack {
    readonly ordersHandler: lambdaNodejs.NodejsFunction

    constructor(scope: Construct, id: string, props: OrderAppStackProps) {
        super(scope, id, props)

        const ordersDdb = new dynamoDB.Table(this, 'OrdersDdb', {
            tableName: 'orders',
            partitionKey: { name: 'pk', type: dynamoDB.AttributeType.STRING },
            sortKey: { name: 'sk', type: dynamoDB.AttributeType.STRING },
            billingMode: dynamoDB.BillingMode.PROVISIONED,
            readCapacity: 1,
            writeCapacity: 1
        })

        //layer de pedidos
        const ordersLayerArn = ssm.StringParameter.valueForStringParameter(this, 'OrdersLayerVersionArn')
        const ordersLayer = lambda.LayerVersion.fromLayerVersionArn(this, 'OrdersLayerVersionArn', ordersLayerArn)

        //layer de produtos
        const productEventsLayerArn = ssm.StringParameter.valueForStringParameter(this, 'ProductEventsLayerVersionArn')
        const productEventLayer = lambda.LayerVersion.fromLayerVersionArn(this, 'ProductEventsLayerVersionArn', productEventsLayerArn)

        this.ordersHandler = new lambdaNodejs.NodejsFunction(this, 'OrdersFunction', {
            functionName: 'OrdersFunction',
            memorySize: 512,
            entry: 'lambda/orders/ordersFunction.ts',
            bundling: {
                minify: true,
                sourceMap: false
            },
            runtime: lambda.Runtime.NODEJS_20_X,
            environment: {
                PRODUCTS_DDB: props.productsDdb.tableName,
                ORDERS_DDB: ordersDdb.tableName
            },
            layers: [ordersLayer, productEventLayer],
            tracing: lambda.Tracing.ACTIVE,
            insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0
        })

        ordersDdb.grantReadWriteData(this.ordersHandler)
        props.productsDdb.grantReadData(this.ordersHandler)
    }
}