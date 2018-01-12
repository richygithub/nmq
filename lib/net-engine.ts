import Buffer=require('buffer');
import net = require('net');
import Event = require('events');
interface NetEngine extends Event{

    decode(data:Buffer);

    send(data:Buffer,cb?:()=>void);
}

class TcpEngine  extends Event implements NetEngine{
    private _socket:net.Socket;

    constructor(socket:net.Socket){
        super();
        this._socket= socket;

        let self = this;
        socket.on('data', this.decode.bind(this));
        socket.on('error',()=>{

        })
        socket.on('close',(err)=>{
            self.emit('close',err);
        })

    }

    decode(data:Buffer){
        // simple:
        this.emit('data',data);
    }

    send(data:Buffer,cb?:()=>void){
        console.log("tcp send:",data.length);
        this._socket.write(data,cb);
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

    send(data:Buffer,cb?:()=>void){
//        this._socket.write(data,cb);
    }

}

export {NetEngine,TcpEngine,UdpEngine};