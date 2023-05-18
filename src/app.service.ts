import { Injectable } from '@nestjs/common';
import { RequestDTO } from './DTO/RequestDTO';
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
            else if (e == 'server hash bad' || e == 'server DTO bad') {
                status = 401//активно сигнализировать в логи
            } else if (e == 'too many requests') {
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
        let requestDTO;
        try {
            requestDTO = new RequestDTO(data.data, data.serverHash)
        } catch (e) {
            throw "server DTO bad"
        }

        if (this.isServerHashBad(requestDTO.serverHash)) {
            throw "server hash bad"
        }

        let dataDTO
        try {
            const obj = JSON.parse(JSON.stringify(requestDTO.data))
            dataDTO = new DataDTO(obj.userId, obj.sessionId, obj.dataObjects)
        } catch (e) {
            throw "parsing data error"
        }

        return this.dataSaveLogic(dataDTO)
    }


    async dataSaveLogic(dataDTO: DataDTO): Promise<ResonseDataDTO> {
        const userId = dataDTO.userId
        const incomingObjects = this.parseDataObjectsPOST(dataDTO.dataObjects)
        console.log(incomingObjects)
        console.log(JSON.stringify(incomingObjects))

        const savedObjects = await this.findAllDataObjectsByUserId(userId)

        for (let l = 0; l < incomingObjects.length; l++) {
            try {
                const obj = this.getObjectByKey(incomingObjects[l].key, savedObjects)
                await this.updateObjectsValueByUserIdAndKey(obj, incomingObjects[l].value)
                console.log("Обновлен обьект: " + incomingObjects[l].key)
            } catch (e) {
                if (e == 'object not found') {
                    await this.saveObject(userId, incomingObjects[l].key, incomingObjects[l].value)
                    console.log("Сохранен новый обьект: " + incomingObjects[l].key)
                    continue
                }
                console.log("Хз чего произошло")
                throw e
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
            else if (e == 'server hash bad' || e == 'server DTO bad') {
                status = 401//активно сигнализировать в логи
            } else if (e == 'too many requests') {
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
        let requestDTO;
        try {
            requestDTO = new RequestDTO(data.data, data.serverHash)
        } catch (e) {
            throw "server DTO bad"
        }

        if (this.isServerHashBad(requestDTO.serverHash)) {
            throw "server hash bad"
        }

        let dataDTO
        try {
            const obj = JSON.parse(JSON.stringify(requestDTO.data))
            dataDTO = new DataDTO(obj.userId, obj.sessionId, obj.dataObjects)
        } catch (e) {
            throw "parsing data error"
        }

        return this.dataGetLogic(dataDTO)
    }

    async dataGetLogic(dataDTO: DataDTO): Promise<ResonseDataDTO> {
        const userId = dataDTO.userId
        const incomingObjects = this.parseDataObjectsGET(dataDTO.dataObjects)

        console.log("Запрошены обьекты: " + incomingObjects)

        const savedObjects = await this.findAllDataObjectsByUserId(userId)

        const responseObjects: DataObjectsDTO[] = []

        for (let l = 0; l < incomingObjects.length; l++) {
            try {
                const obj = this.getObjectByKey(incomingObjects[l], savedObjects)
                responseObjects.push(new DataObjectsDTO(obj.className, obj.data))
            } catch (e) {
                if (e == 'object not found') {
                    console.log("Запрошен пустой класс!!!")
                    //log
                    responseObjects.push(new DataObjectsDTO(incomingObjects[l], '{}'))
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
            console.log(arr[l])
            dataObjects.push(new DataObjectsDTO(arr[l].name, arr[l].obj))
        }
        return dataObjects
    }

    parseDataObjectsGET(objects: object): Array<string> {
        console.log(objects)
        const dataObjects = []
        const arr: string[] = Object.values(objects)
        for (let l = 0; l < arr.length; l++) {
            dataObjects.push(arr[l])
        }
        return dataObjects
    }

    async findAllDataObjectsByUserId(userId: string): Promise<Array<Objects>> {
        const objects = await this.dataStorageRepo.find(
            {
                where: {
                    userId: userId
                }
            }
        )
        return objects
    }

    async updateObjectsValueByUserIdAndKey(object: Objects, value: string) {
        await this.dataStorageRepo
            .createQueryBuilder()
            .update(Objects)
            .set({ data: value })
            .where({ id: object.id })
            .execute()
    }

    async saveObject(userId: string, key: string, value: string) {
        await this.dataStorageRepo.save(
            await this.dataStorageRepo.create(
                {
                    userId: userId,
                    className: key,
                    data: value
                }
            )
        )
    }

    isServerHashBad(serverHash: string): boolean {
        if (serverHash == '89969458273-the-main-prize-in-the-show-psychics') {
            return false
        }
        return true
    }

}


