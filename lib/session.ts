
import Buffer=require('buffer');
import net = require('net');
import Event = require('events');

import {Mailbox} from './mailbox';
import {NetEngine} from './net-engine';

class Session extends Event{
    private _mailbox:Mailbox;
    private _processPacket:(data:Buffer,cb:()=>void )=>{};

 
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

    recv(data:Buffer, cb?:()=>void){
        //to  process 
//        this._processPacket( data, cb );
        console.log("session recv:",data);

    }
    send(data:Buffer):boolean{
        return this._mailbox.send(data);
    }
}

export {Session};