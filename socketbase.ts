import {Buffer} from 'buffer';
import net = require('net');
import dgram = require('dgram');

import Event = require('events');

import {Session} from './lib/session';
import {Mailbox} from './lib/mailbox';
import {NetEngine,TcpEngine,UdpEngine} from './lib/net-engine';
import { setTimeout } from 'timers';

enum NetProto{
    TCP=1,
    UDP
}


interface SocketBase{
//    send(sid:string,data:any,cb?);

    
}


interface RpcMsg{
    toBuf():Buffer;
    fromBuf(data:Buffer ):RpcMsg;
    id():string;
}
class Amsg implements RpcMsg{
    toBuf(){
        return Buffer.from("abcd");
    }
    fromBuf( data:Buffer){
        return this;
    }
    id():string{
        return "";
    }
}

class Router implements SocketBase{
    private _server:net.Server|dgram.Socket;
    private _netProto:NetProto;
    private _host:string;
    private _port:number;
    private _sessions:Map<string,Session>;
    private _serialId:number;
    private _packetHandler:(data:Buffer)=>void;
    
    constructor(type:NetProto,host:string,port:number,packetHandler:(data:Buffer)=>void ){
        this._netProto = type;
        this._host = host;
        this._port = port;
        this._serialId =0 ;
        this._sessions = new Map<string,Session>();
        this._packetHandler = packetHandler;
    }
    send(sid:string,data:Buffer,cb){
        let session = this._sessions[sid];
        if( !session ){
            console.error(`session ${sid} not found.`)
            return false;
        }
        return session.send(data,cb );
    }
    bind(){
        let self=this;
        if( self._netProto == NetProto.TCP ){
            self._server = new net.Server( (socket)=>{
                
                self._serialId++;
                
                let netEngine = new TcpEngine(socket);

                let session = new Session(this._packetHandler);
                let mailbox = new Mailbox(session,netEngine,10,10 );
                session.setMailBox(mailbox);
                
                //self._sessions[self._serialId]= session;
                self._sessions[socket.remoteAddress] = session;
                console.log('connect addr:',socket.remoteAddress);

            })

            self._server.listen(self._port);
            self._server.on('error',(err)=>{
                console.error('server error!',err);
            })

        }else if(self._netProto == NetProto.UDP ){
            self._server = dgram.createSocket('udp4');
            self._server.on('message',(msg,info)=>{

                let session = self._sessions[info.address]
                if( !!session ){
                    //recv 
                    session.netEngine.decode(msg);
                }else{
                    session = new Session(this._packetHandler);
                    let netEngine = new UdpEngine();
                    let mailbox = new Mailbox(session,netEngine,10,10);
                    self._sessions[info.address] =session;

                }
            });
        }else{
            // to do
            console.error(`error type:${self._netProto}`);
        }

    }
}


enum NetStatus{
    Connected=1,
    Closed,
    Connecting 
}

class RpcCB{
    private _decode:(data:Buffer)=>RpcMsg;
    private _cb:(error:Error,msg:RpcMsg)=>void;
    constructor(decode:( data:Buffer) =>RpcMsg, cb:(error:Error,msg:RpcMsg)=>void){
        this._decode = decode;
        this._cb = cb;
    }
}

class Dealer implements SocketBase{
    private _socket:net.Socket|dgram.Socket;
    private _netProto:NetProto;
    private _host:string;
    private _port:number;
    private _session:Session;
    private _serialId:number;

    private _status:NetStatus;
    private _connected:boolean;
    private _rpcId:number;

    private _packetHandler:(data:Buffer)=>void;

//    private _cbs:Map<number,(err:Error,reply:RpcMsg)=>void >;
    private _cbs:Map<number,RpcCB>;


    private _cbsTimer:Map<number,NodeJS.Timer>;
    

    

    constructor(type:NetProto,host:string,port:number,packetHandler:(data:Buffer)=>void){
        this._netProto = type;
        this._host = host;
        this._port = port;
        this._serialId =0 ;
        this._status = NetStatus.Closed;
        this._connected= false;
        this._packetHandler = packetHandler;
        this._rpcId=0;
//        this._cbs = new Map<number, (err:Error,reply:RpcMsg)=>void>();
        this._cbs = new Map<number,RpcCB>();
        this._cbsTimer = new Map<number, NodeJS.Timer>();
    }


    notify(msg:RpcMsg){
        let rpcId = this._rpcId;
        let header={
            rpcId:rpcId,
            serviceId:msg.id()
        }
        this.send( [  Buffer.from( JSON.stringify(header) ), msg.toBuf() ] )
    }
    req(msg:RpcMsg,cb:(err:Error,reply:RpcMsg)=>void){

        let rpcId = this._rpcId;
        let header={
            rpcId:rpcId,
            serviceId:msg.id()
        }
        this.send( [  Buffer.from( JSON.stringify(header) ), msg.toBuf() ] );

        this._cbs[rpcId] = cb;
        this._cbsTimer[ rpcId ] = setTimeout(()=>{
            //
            this._cbsTimer[rpcId]  = null;
            
            if( !!this._cbs[rpcId] ){
                this._cbs[rpcId].cb( new Error("time out"),null );
                this._cbs[rpcId] = null;
            }
        },10000),

        this._rpcId++;

    }
    recv(data:Array<Buffer>){
        // to do ,head include error.
        let header = JSON.parse( data[0].toString('utf8') );
        let rpc= this._cbs[header.rpcId];
        if( !!rpc){
            //to pro
            if( !!header.error ){
                rpc.cb(new Error(header.error),null );
            }else{
                let body = data[1];
                rpc.cb(null, rpc.decode(body) );
            }
        }
    }

    bind():boolean{
        let self =this;
        if( this._netProto == NetProto.TCP ){
            self._status = NetStatus.Connecting;


            this._session = new Session( this._packetHandler);
            let mailbox = new Mailbox(this._session,null,10,10);

            let socket = net.connect(this._port,this._host,()=>{
                self._connected = true;
                self._status = NetStatus.Connected; 

                let netEngine = new TcpEngine(socket);
                mailbox.netEngine = netEngine;

            })
            this._session.on('close',()=>{
                //reconnect?


            });
            return true;
        }else if(this._netProto == NetProto.UDP ){
            //notice .. server always use tcp.
            this._socket = dgram.createSocket('udp4');
            this._status = NetStatus.Connected;
            this._session = new Session(this._packetHandler);
            let netEngine = new UdpEngine();
            let mailbox = new Mailbox(this._session,netEngine,10,10);
 
            return true;
        }else{
            console.error(`can not create such type ${this._netProto}`);
            return false;
        }
    }


    send(data:Array<Buffer>):boolean{
        if( !this._session ){
            if( !this.bind() ){
                return false;
            }
        }
        return this._session.send(data);
    }
    
}



export {Router,Dealer,NetProto};



