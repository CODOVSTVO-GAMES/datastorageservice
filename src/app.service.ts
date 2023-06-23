import { Injectable } from '@nestjs/common';
import { ResponseDTO } from './DTO/ResponseDTO';
import { DataDTO } from './DTO/DataDTO';
import { ResonseDataDTO } from './DTO/ResponseDataDTO';
import { InjectRepository } from '@nestjs/typeorm';
import { Objects } from './Models/Objects';
import { Repository } from 'typeorm';
import { DataObjectsDTO } from './DTO/DataObjectsDTO';


@Injectable()
export class AppService {

    constructor(
        @InjectRepository(Objects) private dataStorageRepo: Repository<Objects>
    ) { }

    async dataSaveResponser(data: any) {
        console.log(data)
        const responseDTO = new ResponseDTO()
        let status = 200

        try {
            const resonseDataDTO = await this.dataSaveHandler(data)
            responseDTO.data = resonseDataDTO
        }
        catch (e) {
            if (e == 'sessions not found' || e == 'session expired') {
                status = 403//перезапуск клиента
            }
            else if (e == 'too many requests') {
                status = 429//повторить запрос позже
            } else if (e == 'parsing data error') {
                status = 400 //сервер не знает что делать
            } else {
                status = 400
            }
            console.log("Ошибка " + e)
        }
        responseDTO.status = status

        return responseDTO
    }

    async dataSaveHandler(data: any): Promise<ResonseDataDTO> {
        let dataDTO
        try {
            dataDTO = new DataDTO(data.accountId, data.sessionId, data.dataObjects)
        } catch (e) {
            throw "parsing data error"
        }

        return this.dataSaveLogic(dataDTO)
    }


    async dataSaveLogic(dataDTO: DataDTO): Promise<ResonseDataDTO> {
        const accountId = dataDTO.accountId
        const incomingObjects = this.parseDataObjectsPOST(dataDTO.dataObjects)

        const savedObjects = await this.findAllDataObjectsByAccountId(accountId)

        for (let l = 0; l < incomingObjects.length; l++) {
            console.log('берем обьект')
            console.log(incomingObjects[l].key)
            console.log(incomingObjects[l].value)

            if (incomingObjects[l].key == undefined || incomingObjects[l].value == undefined) {
                continue
            }
            try {
                const obj = this.getObjectByKey(incomingObjects[l].key, savedObjects)
                await this.updateObjectsValueByAccountIdAndKey(obj, incomingObjects[l].value)
                console.log("Обновлен обьект: " + incomingObjects[l].key)
            } catch (e) {
                if (e == 'object not found') {
                    await this.saveObject(accountId, incomingObjects[l].key, incomingObjects[l].value)
                    console.log("Сохранен новый обьект: " + incomingObjects[l].key)
                    continue
                } else {
                    console.log("Хз чего произошло")
                    throw e
                }
            }
        }
        return new ResonseDataDTO()
    }

    //----------------------------------------

    async dataGetResponser(data: any) {
        const responseDTO = new ResponseDTO()
        let status = 200

        try {
            const resonseDataDTO = await this.dataGetHandler(data)
            responseDTO.data = resonseDataDTO
        }
        catch (e) {
            if (e == 'sessions not found' || e == 'session expired') {
                status = 403//перезапуск клиента
            }
            else if (e == 'too many requests') {
                status = 429//повторить запрос позже
            } else if (e == 'parsing data error') {
                status = 400 //сервер не знает что делать
            } else {
                status = 400
            }
            console.log("Ошибка " + e)
        }
        responseDTO.status = status

        return responseDTO
    }

    async dataGetHandler(data: any): Promise<ResonseDataDTO> {
        let dataDTO
        try {
            dataDTO = new DataDTO(data.accountId, data.sessionId, data.dataObjects)
        } catch (e) {
            throw "parsing data error"
        }

        return this.dataGetLogic(dataDTO)
    }

    async dataGetLogic(dataDTO: DataDTO): Promise<ResonseDataDTO> {
        const accountId = dataDTO.accountId
        const incomingObjects = this.parseDataObjectsGET(dataDTO.dataObjects)

        const savedObjects = await this.findAllDataObjectsByAccountId(accountId)

        const responseObjects: DataObjectsDTO[] = []

        for (let l = 0; l < incomingObjects.length; l++) {
            try {
                const obj = this.getObjectByKey(incomingObjects[l], savedObjects)
                const data = JSON.parse(obj.data)
                responseObjects.push(new DataObjectsDTO(obj.className, data))
            } catch (e) {
                if (e == 'object not found') {
                    console.log("Запрошен пустой класс!!!")
                    //log
                    responseObjects.push(new DataObjectsDTO(incomingObjects[l], {}))
                }
                else {
                    throw "ЧТо то тут не так"
                }
            }
        }
        const resonseDataDTO = new ResonseDataDTO()
        resonseDataDTO.objects = responseObjects
        return resonseDataDTO
    }

    //----------------------------------------------------------

    getObjectByKey(key: string, objects: Objects[]): Objects {
        for (let l = 0; l < objects.length; l++) {
            if (objects[l].className == key) {
                return objects[l]
            }
        }
        throw "object not found"
    }

    parseDataObjectsPOST(objects: object): Array<DataObjectsDTO> {
        const dataObjects = new Array<DataObjectsDTO>
        const arr = Object.values(objects)
        for (let l = 0; l < arr.length; l++) {
            if (arr[l] == 'null' || arr[l] == 'undefined' || arr[l] == null || arr[l] == undefined) {
                console.log("Пришел пустой обьект")
                continue
            }
            dataObjects.push(new DataObjectsDTO(arr[l].name, arr[l].obj))
        }
        return dataObjects
    }

    parseDataObjectsGET(objects: object): Array<string> {
        const dataObjects = []
        const arr: string[] = Object.values(objects)
        for (let l = 0; l < arr.length; l++) {
            dataObjects.push(arr[l])
        }
        return dataObjects
    }

    async findAllDataObjectsByAccountId(accountId: string): Promise<Array<Objects>> {
        const objects = await this.dataStorageRepo.find(
            {
                where: {
                    accountId: accountId
                }
            }
        )
        return objects
    }

    async updateObjectsValueByAccountIdAndKey(object: Objects, value: object) {
        const str = JSON.stringify(value)

        await this.dataStorageRepo
            .createQueryBuilder()
            .update(Objects)
            .set({ data: str })
            .where({ id: object.id })
            .execute()
    }

    async saveObject(accountId: string, key: string, value: object) {
        const str = JSON.stringify(value)
        await this.dataStorageRepo.save(
            await this.dataStorageRepo.create(
                {
                    accountId: accountId,
                    className: key,
                    data: str
                }
            )
        )
    }
}


