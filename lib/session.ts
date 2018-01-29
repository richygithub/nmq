
import {Buffer} from 'buffer';
import net = require('net');
import Event = require('events');

import {Mailbox} from './mailbox';
import {NetEngine} from './net-engine';


const SIGN_FLAG = 1<<31;
const MAX_MSG_LEN = 1024*1024;
class Session extends Event{
    private _mailbox:Mailbox;
    private _processPacket:(data:Buffer )=>void;

 
    constructor(packetHandler:( data:Buffer  )=>void){
        super();
        this._processPacket = packetHandler;
    }
    setMailBox(mb:Mailbox){
        this._mailbox = mb;
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

    recv(data:Buffer, cb?:()=>void):Array<Buffer>{
        //to  process 
//        this._processPacket( data, cb );
        let buf=[];

        for(let idx=0;idx<data.length; ){
            let len = data.readUInt16BE(idx);
            idx+=2;
            buf.push( Buffer.from(data.buffer,idx,len) );
            idx+=len;
        }
        /*
        if( !!cb ){
            cb();
        }*/
        console.log("session recv:",buf);
        return buf; 
//        console.log("session recv:",buf);

    }
    //every Buffer Array constructs a single msgpkg;
    send(data:Array<Buffer>):boolean{
        return this._mailbox.send(data);
    }
    /*
    send(data:Array<Buffer>[2]){

    }*/
}

export {Session};