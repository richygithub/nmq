import {Buffer} from 'buffer';
import net = require('net');
import dgram = require('dgram');

import Event = require('events');

import {Session, Receiver} from '../session';
import {Mailbox} from '../mailbox';
import {NetEngine,TcpEngine,UdpEngine} from '../net-engine';
import {NetProto} from '../../socketbase'
import { setTimeout } from 'timers';
class Services{
    constructor(){

    }
    async handler(serviceId:number,data:Buffer) {
        return data;     
    }
}

class RpcServer implements Receiver{
    private _server:net.Server|dgram.Socket;
    private _netProto:NetProto;
    private _host:string;
    private _port:number;
    private _sessions:Map<string,Session>;
    private _serialId:number;
    private _packetHandler:(data:Array<Buffer>)=>void;

    private _services:Services;
    
    constructor(type:NetProto,host:string,port:number,packetHandler:(data:Array<Buffer>)=>void ){
        this._netProto = type;
        this._host = host;
        this._port = port;
        this._serialId =0 ;
        this._sessions = new Map<string,Session>();
        this._packetHandler = packetHandler;
        this._services = new Services();
    }
    send(sid:string,data:Buffer,cb){
        let session = this._sessions[sid];
        if( !session ){
            console.error(`session ${sid} not found.`)
            return false;
        }
        return session.send(data,cb );
    }
    async recv(data:Array<Buffer>,session:Session){
        let header = JSON.parse( data[0].toString('utf8') );
        let ret = await this._services.handler(header.serviceId,data[1]) ;
        session.send( [header,ret] );
    }

    bind(){
        let self=this;
        if( self._netProto == NetProto.TCP ){
            self._server = new net.Server( (socket)=>{
                
                self._serialId++;
                
                let netEngine = new TcpEngine(socket);

                let session = new Session(this);
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
                    session = new Session(this);
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
