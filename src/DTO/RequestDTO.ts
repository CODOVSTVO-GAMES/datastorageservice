export class RequestDTO {
    data: string;
    serverHash: string;
    constructor(data: string, serverHash: string) {
        this.data = data
        this.serverHash = serverHash;
    }
}
