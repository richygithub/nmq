import {Buffer} from 'buffer';
import net = require('net');
import Event = require('events');
import {Coder,Coder_v1} from './coder';
interface NetEngine extends Event{

//    decode(data:Buffer);

    send(data: Array<Buffer>,cb:Function ) ;
    
}



class TcpEngine  extends Event implements NetEngine{
    private _socket:net.Socket;
    private _coder:Coder;

    constructor(socket:net.Socket){
        super();
        this._coder= new Coder_v1(this);

        this._socket= socket;
        let self = this;

        
        socket.on('data', this._coder.decode.bind(this._coder));
        socket.on('error',()=>{

        })
        socket.on('close',(err)=>{
            self.emit('close',err);
        })

        this.on('msg',(data:Array<Buffer>)=>{

        })
    }


    /*
    send(data:Buffer,cb?:()=>void){
        console.log("tcp send:",data.length);
        this._socket.write(data,cb);
    }
    */

    send(data: Array<Buffer>,cb:Function){
        let buf = this._coder.encode( data);
        if( buf == null ){
            cb();
        }else{
            this._socket.write(buf,cb);
        }
    }

}


class UdpEngine  extends Event implements NetEngine{
    constructor(){
        super();
    }
    decode(data:Buffer){
        // simple:
        // to do..
        this.emit('data',data);
    }

    send(data: Array<Buffer>,cb:Function){
//        this._socket.write(data,cb);
    }

}

export {NetEngine,TcpEngine,UdpEngine};