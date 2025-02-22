import * as cdk from "aws-cdk-lib"
import { ProductsAppStack } from "../lib/productsApp-stack";
import { ECommerceApiStack } from "../lib/ecommerceApi-stack";
import { ProductsAppLayersStack } from "../lib/productsAppLayers-stack";

import 'dotenv/config';

const app = new cdk.App()

const env: cdk.Environment = {
    account: process.env.ACCOUNT_ID,
    region: 'us-east-1'
}

const tags = {
    cost: "ECommerce",
    team: "GlaucoSousa"
}

const productsAppLayersStack = new ProductsAppLayersStack(app, "ProductsAppLayers", {env, tags })

const productsAppStack = new ProductsAppStack(app, "ProductsApp", { env, tags })

//depende indiretamente da stack de layers
productsAppStack.addDependency(productsAppLayersStack)

const eCommerceApiStack = new ECommerceApiStack(app, "ECommerceApi", { fetchProductsHandler: productsAppStack.fetchProductsHandler, adminProductsHandler: productsAppStack.adminProductsHandler, env, tags })

eCommerceApiStack.addDependency(productsAppStack)

