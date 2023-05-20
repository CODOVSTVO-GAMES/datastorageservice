export class DataDTO {
    accountId: string;
    sessionId: number;
    dataObjects: object[]
    constructor(accountId: string, sessionId: number, dataObjects: object[]) {
        this.accountId = accountId
        this.sessionId = sessionId
        this.dataObjects = dataObjects
    }
}
