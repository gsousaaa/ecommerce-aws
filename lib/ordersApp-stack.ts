import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs'
import * as cdk from 'aws-cdk-lib'
import * as dynamoDB from 'aws-cdk-lib/aws-dynamodb'
import * as ssm from 'aws-cdk-lib/aws-ssm'
import * as sns from 'aws-cdk-lib/aws-sns'
import * as sqs from 'aws-cdk-lib/aws-sqs'
import * as lambdaEventSource from "aws-cdk-lib/aws-lambda-event-sources"
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions'
import * as iam from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs'

interface OrderAppStackProps extends cdk.StackProps {
    productsDdb: dynamoDB.Table,
    eventsDdb: dynamoDB.Table
}

export class OrderAppStack extends cdk.Stack {
    readonly ordersHandler: lambdaNodejs.NodejsFunction
    readonly orderEventsHandler: lambdaNodejs.NodejsFunction

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

        const ordersApiLayerArn = ssm.StringParameter.valueForStringParameter(this, 'OrdersApiLayerVersionArn')
        const ordersApiLayer = lambda.LayerVersion.fromLayerVersionArn(this, 'OrdersApiLayerVersionArn', ordersApiLayerArn)

        //layer de eventos de pedidos
        const orderEventsRepositoryLayerArn = ssm.StringParameter.valueForStringParameter(this, 'OrderEventsRepositoryLayerVersionArn')
        const orderEventsRepositoryLayer = lambda.LayerVersion.fromLayerVersionArn(this, 'OrderEventsRepositoryLayerVersionArn', orderEventsRepositoryLayerArn)

        // repositorio de pedidos
        const orderEventsLayerArn = ssm.StringParameter.valueForStringParameter(this, 'OrderEventsLayerVersionArn')
        const orderEventsLayer = lambda.LayerVersion.fromLayerVersionArn(this, 'OrderEventsLayerVersionArn', orderEventsLayerArn)

        //layer de produtos
        const productEventsLayerArn = ssm.StringParameter.valueForStringParameter(this, 'ProductEventsLayerVersionArn')
        const productEventLayer = lambda.LayerVersion.fromLayerVersionArn(this, 'ProductEventsLayerVersionArn', productEventsLayerArn)

        const ordersTopic = new sns.Topic(this, 'OrderEventsTopic', {
            displayName: 'Order events topic',
            topicName: 'order-events'
        })

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
                ORDERS_DDB: ordersDdb.tableName,
                ORDER_EVENTS_TOPIC_ARN: ordersTopic.topicArn
            },
            layers: [ordersLayer, productEventLayer, ordersApiLayer, orderEventsLayer],
            tracing: lambda.Tracing.ACTIVE,
            insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0
        })

        ordersDdb.grantReadWriteData(this.ordersHandler)
        props.productsDdb.grantReadData(this.ordersHandler)
        ordersTopic.grantPublish(this.ordersHandler)
 
        this.orderEventsHandler = new lambdaNodejs.NodejsFunction(this, 'OrderEventsFunction', {
            functionName: 'OrderEventsFunction',
            memorySize: 512,
            entry: 'lambda/orders/orderEventsFunction.ts',
            bundling: {
                minify: true,
                sourceMap: false
            },
            runtime: lambda.Runtime.NODEJS_20_X,
            environment: {
               EVENTS_DDB: props.eventsDdb.tableName

            },
            layers: [orderEventsLayer, orderEventsRepositoryLayer],
            tracing: lambda.Tracing.ACTIVE,
            insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0
        })

        ordersTopic.addSubscription(new subs.LambdaSubscription(this.orderEventsHandler))
        const eventsDdbPolicy = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["dynamodb:PutItem"],
            resources: [props.eventsDdb.tableArn],
            conditions: {
                ['ForAllValues:StringLike']: {
                    'dynamodb:LeadingKeys': ['#order_*']
                }
            }
        })

        this.orderEventsHandler.addToRolePolicy(eventsDdbPolicy)

        const billingHandler = new lambdaNodejs.NodejsFunction(this, 'BillingFunction', {
            functionName: 'BillingFunction',
            memorySize: 512,
            entry: 'lambda/orders/billingFunction.ts',
            bundling: {
                minify: true,
                sourceMap: false
            },
            runtime: lambda.Runtime.NODEJS_20_X,
            tracing: lambda.Tracing.ACTIVE,
            insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0
        })

        ordersTopic.addSubscription(new subs.LambdaSubscription(billingHandler, {filterPolicy: {
            eventType: sns.SubscriptionFilter.stringFilter({
                allowlist: ['ORDER_CREATED']
            })
        }}))

        const orderEventsQueue = new sqs.Queue(this, 'OrderEventsQueue', {
            queueName: 'order-events'
        })

        ordersTopic.addSubscription(new subs.SqsSubscription(orderEventsQueue))

    }
}