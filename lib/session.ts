
import {Buffer} from 'buffer';
import net = require('net');
import Event = require('events');

import {Mailbox} from './mailbox';
import {NetEngine} from './net-engine';

interface Receiver{
    recv(data:Array<Buffer>,session:Session);
}

class Session extends Event{
    private _mailbox:Mailbox;
    private _receiver:Receiver;
    private _processPacket:(data:Array<Buffer> )=>void;

 
    constructor(receiver:Receiver){
        super();
        this._receiver = receiver;
    }
    setMailBox(mb:Mailbox){
        this._mailbox = mb;
    }

    setPacketHandler( handler:(data:Array<Buffer>)=>void  ){
        this._processPacket = handler;
    }

    get netEngine():NetEngine{
        return this._mailbox.netEngine;
    }

    onData(data:Buffer){
//        this.emit('data',data);
        console.log("onData...")
    }
    onClose(err:boolean){
        console.log('session close.',err);
        this.emit('close');
    }

    recv(data:Array<Buffer>, cb?:()=>void ){
        //to  process 
//        this._processPacket( data, cb );
        this._receiver.recv(data,this);
        if(!!cb){
            cb();
        }
    }
    //every Buffer Array constructs a single msgpkg;
    send(data:Array<Buffer>):boolean{
        return this._mailbox.send(data);
    }
    /*
    send(data:Array<Buffer>[2]){

    }*/
}



export {Session,Receiver};