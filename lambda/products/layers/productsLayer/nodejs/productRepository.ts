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

        if(!response.Item) throw new Error('Produto não encontrado!')

        return response.Item as Product
    }

}