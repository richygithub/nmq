import Buffer=require('buffer');
import net = require('net');
import dgram = require('dgram');

import Event = require('events');

import {Session} from './lib/session';
import {Mailbox} from './lib/mailbox';
import {NetEngine,TcpEngine,UdpEngine} from './lib/net-engine';

interface SocketBase{
//    send(sid:string,data:any,cb?);
}



enum NetProto{
    TCP=1,
    UDP
}

class Router implements SocketBase{
    private _server:net.Server|dgram.Socket;
    private _netProto:NetProto;
    private _host:string;
    private _port:number;
    private _sessions:Map<string,Session>;
    private _serialId:number;

    constructor(type:NetProto,host:string,port:number ){
        this._netProto = type;
        this._host = host;
        this._port = port;
        this._serialId =0 ;
        this._sessions = new Map<string,Session>();
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

                let session = new Session();
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
                    session = new Session();
                    let netEngine = new UdpEngine();
                    let mailbox = new Mailbox(session,netEngine,10,10);
                    self._sessions[info.address] = new Session();

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

class Dealer implements SocketBase{
    private _socket:net.Socket|dgram.Socket;
    private _netProto:NetProto;
    private _host:string;
    private _port:number;
    private _session:Session;
    private _serialId:number;

    private _status:NetStatus;
    private _connected:boolean;
    constructor(type:NetProto,host:string,port:number ){
        this._netProto = type;
        this._host = host;
        this._port = port;
        this._serialId =0 ;
        this._status = NetStatus.Closed;
        this._connected= false;
    }
    bind():boolean{
        let self =this;
        if( this._netProto == NetProto.TCP ){
            self._status = NetStatus.Connecting;


            this._session = new Session();
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
            this._session = new Session();
            let netEngine = new UdpEngine();
            let mailbox = new Mailbox(this._session,netEngine,10,10);
 
            return true;
        }else{
            console.error(`can not create such type ${this._netProto}`);
            return false;
        }
    }
    send(data:Buffer):boolean{
        if( !this._session ){
            if( !this.bind() ){
                return false;
            }
        }
        return this._session.send(data);
    }
}

export {Router,Dealer,NetProto};