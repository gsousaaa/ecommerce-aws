import { throws } from "assert"
import { DocumentClient } from "aws-sdk/clients/dynamodb"
import { v4 } from "uuid"

export interface Product {
    id: string,
    model: string,
    code: string,
    price: number,
    productName: string
}

export class ProductRepository {
    private ddbClient: DocumentClient
    private productsDdb: string

    constructor(ddbClient: DocumentClient, productsDdb: string) {
        this.ddbClient = ddbClient
        this.productsDdb = productsDdb
    }

    async getAllProducts(): Promise<Product[]> {
        const response = await this.ddbClient.scan({
            TableName: this.productsDdb
        }).promise()

        return response.Items as Product[]
    }

    async getProductById(productId: string): Promise<Product> {
        const response = await this.ddbClient.get({
            TableName: this.productsDdb, Key: {
                id: productId
            }
        }).promise()

        if (!response.Item) throw new Error('Produto não encontrado!')

        return response.Item as Product
    }

    async createProduct(product: Product): Promise<Product> {
        product.id = v4()

        await this.ddbClient.put({
            TableName: this.productsDdb,
            Item: product
        }).promise()

        return product
    }

    async deleteProduct(productId: string): Promise<Product> {
        const data = await this.ddbClient.delete({
            TableName: this.productsDdb, 
            Key: {
                id: productId
            },
            ReturnValues: "ALL_OLD"
        }).promise()

       if(!data.Attributes) throw new Error('Product not found')

        return data.Attributes as Product
    }

    

}