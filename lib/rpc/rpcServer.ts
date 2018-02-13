import {Buffer} from 'buffer';
import net = require('net');
import dgram = require('dgram');

import Event = require('events');

import {Session, Receiver} from '../session';
import {Mailbox} from '../mailbox';
import {NetEngine,TcpEngine,UdpEngine} from '../net-engine';
import {NetProto} from '../../socketbase'
import { setTimeout } from 'timers';
interface Services{
    process:(serviceId: number, type: string, data: Buffer)=>Promise<[any,Error]>;
}

export class RpcServer implements Receiver{
    private _server:net.Server|dgram.Socket;
    private _netProto:NetProto;
    private _host:string;
    private _port:number;
    private _sessions:Map<string,Session>;
    private _serialId:number;

    private _services:Services;
    

    constructor(type:NetProto,host:string,port:number){
        this._port = port;
        this._serialId =0 ;
        this._sessions = new Map<string,Session>();
        this._netProto = type;
    }
    setService(service:Services){
        this._services = service;
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
        console.log("..rpcServer recv:",header);
        let ret = await this._services.process(header.serviceId,header.type,data[1]) ;
        //to do. process error.
        if( !!ret[1]){
            header.err = ret[1].message;
        }
        if( !!ret[0]){
            session.send( [ Buffer.from( JSON.stringify(header) ),ret[0]] );
        }else{
            session.send( [ Buffer.from( JSON.stringify(header) ) ] );
        }
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
