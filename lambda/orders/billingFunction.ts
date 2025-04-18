
import { Context, SNSEvent, SNSMessage } from "aws-lambda"

export const handler = async (event: SNSEvent, context: Context): Promise<void> => {
    event.Records.forEach((record) => {
        console.log(record.Sns)
    })

    return
}
