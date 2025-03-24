import * as cdk from "aws-cdk-lib"
import { ProductsAppStack } from "../lib/productsApp-stack";
import { ECommerceApiStack } from "../lib/ecommerceApi-stack";
import { ProductsAppLayersStack } from "../lib/productsAppLayers-stack";

import 'dotenv/config';
import { EventsDdbStack } from "../lib/eventsDdb-stack";
import { OrderAppStack } from "../lib/ordersApp-stack";
import { OrdersAppLayersStack } from "../lib/ordersAppLayers-stack";

const app = new cdk.App()

const env: cdk.Environment = {
    account: '418295712635',
    region: 'us-east-1'
}

const tags = {
    cost: "ECommerce",
    team: "GlaucoSousa"
}

const eventsDdbStack = new EventsDdbStack(app, "EventsDdb", { env, tags })

const productsAppLayersStack = new ProductsAppLayersStack(app, "ProductsAppLayers", { env, tags })

const productsAppStack = new ProductsAppStack(app, "ProductsApp", { env, tags, eventsDdb: eventsDdbStack.eventsDdb })

const ordersAppLayersStack = new OrdersAppLayersStack(app, 'OrdersAppLayers', { env, tags })
const ordersAppStack = new OrderAppStack(app, 'OrdersApp', { env, tags, productsDdb: productsAppStack.productsDdb })

ordersAppStack.addDependency(productsAppStack)
ordersAppStack.addDependency(ordersAppLayersStack)

//depende indiretamente da stack de layers
productsAppStack.addDependency(productsAppLayersStack)
productsAppStack.addDependency(eventsDdbStack)

const eCommerceApiStack = new ECommerceApiStack(app, "ECommerceApi", {
    fetchProductsHandler: productsAppStack.fetchProductsHandler,
    adminProductsHandler: productsAppStack.adminProductsHandler,
    ordersHandler: ordersAppStack.ordersHandler,
    env,
    tags
})

eCommerceApiStack.addDependency(productsAppStack)

