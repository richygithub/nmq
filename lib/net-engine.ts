import {Buffer} from 'buffer';
import net = require('net');
import Event = require('events');
import {Coder,Coder_v1} from './coder';
interface NetEngine extends Event{

//    decode(data:Buffer);

    send(data: Array<Buffer>,cb:Function ):boolean ;
    
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
    }


    /*
    send(data:Buffer,cb?:()=>void){
        console.log("tcp send:",data.length);
        this._socket.write(data,cb);
    }
    */

    send(data: Array<Buffer>,cb:Function):boolean{
        let buf = this._coder.encode( data);
        if( buf == null ){
            cb();
            return false;
        }else{
            this._socket.write(buf,cb);
            return true;
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

    send(data: Array<Buffer>,cb:Function):boolean{
//        this._socket.write(data,cb);
        return true;
    }

}


export {NetEngine,TcpEngine,UdpEngine};