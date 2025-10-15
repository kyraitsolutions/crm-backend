import { Request,Response } from "express"
export default (
    request:Request,
    response:Response,
    responseStatusCode:number,
    responseMessage:string,
    result?:unknown
)=>{
    const responseData={
        success:true,
        responseStatusCode:responseStatusCode,
        responseMessage:responseMessage,
        request:{
            method:request.method,
            baseUrl:request.host,
            endpoint:request.url
        },
        result
    }

    return response.status(responseStatusCode).json(responseData)
}