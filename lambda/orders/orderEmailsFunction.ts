import { Context, SQSEvent } from "aws-lambda";


export const handler = async(event: SQSEvent, context: Context): Promise<void> => {
    event.Records.forEach((record) => {
        console.log(record)
        const body = JSON.parse(record.body)
        console.log(body)
    })

    return
}


