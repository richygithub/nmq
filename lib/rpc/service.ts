
import {RpcClient} from './rpcClient';


class EnterReq{
    name:string;
}
class EnterReply{
    count:number
}

class Rpc_Enter{

    id:number = 1;
    handler:(msg:EnterReq)=>Promise<EnterReply>;

    deserializeReply(data:Buffer):EnterReply{
        let msg = new EnterReply();
        msg.count = data.readInt32BE(0);
        return msg;
    }

    serializeReply( msg:EnterReply):Buffer{
        let buf=Buffer.alloc(4);
        buf.writeInt32BE(msg.count,0);
        return buf;
    }

    deserializeReq(data:Buffer):EnterReq{
        let msg = new EnterReq();
        msg.name = data.toString('utf8');
        return msg;
    }


    serializeReq( msg:EnterReq):Buffer{
        return Buffer.from(msg.name);
    }

}

//export
interface HandlerBase{
    enter:  (msg:EnterReq)=>Promise<EnterReply>;
}

class Handler implements HandlerBase{

    async enter(msg:EnterReq):Promise<EnterReply>{

        return new EnterReply();
    }
}
/*
Rpc_Enter.handler = function(msg:EnterReq){
    return new Promise( (resolve)=>{

        resolve();
    }) 
} 
*/

class ServiceStub{
    private client:RpcClient;

    _rpcEnter:Rpc_Enter;
    constructor(client:RpcClient){
        this.client = client;
        this._rpcEnter = new Rpc_Enter();
    }
    enter(msg:EnterReq){
        let self = this;
        return self.client.req( self._rpcEnter.id, self._rpcEnter.serializeReq(msg),self._rpcEnter.deserializeReply );
 
    }

}


class ServiceImp{
    
    _services:[ any ];
    _rpc:[any];
    constructor(){
        let rpcEnter = new Rpc_Enter();
//        this._rpc[ Rpc_Enter.id ] = rpcEnter;
//        this._services[ Rpc_Enter.id ] = this.enter;
    }
    async packetHandler( serviceId:number, data:Buffer ){

        let rpc = this._rpc[serviceId];
        let handler = this._services[serviceId];


        if( !rpc || !handler ){


        }else{
            let ret = await handler();

            handler( rpc.deserializeReq( data ) );
        }
    }


    enter:(data:EnterReq)=>Promise<EnterReply>;
}

let service = new ServiceImp();

service.enter = function (data:EnterReq){
    return new Promise( (resolve)=>{

        let msg = new EnterReply();



        resolve(msg);

    })
}


