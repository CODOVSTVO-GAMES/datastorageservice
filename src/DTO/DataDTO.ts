export class DataDTO {
    userId: string;
    sessionId: number;
    dataObjects: object[]
    constructor(userId: string, sessionId: number, dataObjects: object[]) {
        this.userId = userId
        this.sessionId = sessionId
        this.dataObjects = dataObjects
    }
}
