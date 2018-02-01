import {EventEmitter as Event } from 'events';
import {Buffer} from 'buffer';

interface Coder{
    encode( data:Array<Buffer>):Buffer;
    decode( data:Buffer);
}

const ST_READ_LENGTH = 1;
const ST_READ_DATA = 2;
const ST_ERROR       = 3;
const HEADSIZE = 4;


class Coder_v1 implements Coder {
    private _receiver:Event;

    private _maxMsgLen:number;
    private _status: number;
    private _buf : Buffer;
    private _offset:number =0 ;
    private _left:number = 0;
    private _length:number = 0;


    constructor( receiver:Event, maxMsgLen:number = 1024*1024 ){
        this._receiver = receiver;
        this._maxMsgLen =  maxMsgLen;
        this.reset();
    }
    reset(){
        this._status =  ST_READ_LENGTH;
        this._offset = 0;
        this._left = HEADSIZE; //headsize
        this._length = 0 ;
        this._buf = null;
    }
    private _readLength(data:Buffer,offset:number,end:number):number{
        let b, i, length = this._length, finish;
        let len = end >= this._left?this._left:end;

        for(i=0; i< len ; i++) {
          b = data.readUInt8(i + offset);
          length = (length<<8) | b ;
        }
        this._length = length;
        this._left-=len;

        if( this._left <0 || this._length > this._maxMsgLen ){
            console.log(`lenth is not correct.left:${this._left},lenth:${this._length}`);
            return -1;
        }
      
        if( this._left == 0 ) {
          this._status = ST_READ_DATA;
          this._offset = 0;
          this._left = this._length;
          this._buf = Buffer.alloc(this._length);
        }
        return i + offset;
    }
    private _readData(data:Buffer,offset:number,end:number):number{
        let left = end - offset;
        let size = Math.min(left, this._left);
        data.copy(this._buf, this._offset, offset, offset + size);
        this._left -= size;
        this._offset += size;
      
        if(this._left === 0) {
          let buf = this._buf;
          this.reset();

          this._receiver.emit('msg', this.extracMsg(buf) );
        }
      
        return offset + size;

    }

    private extracMsg(data:Buffer):Array<Buffer>{
        let buf=[];
        let offset =0 ;

        while (offset < data.length) {
            let len = data.readUInt16BE(offset);
            offset+=2;
            buf.push(Buffer.from(data.buffer, offset, len));
            offset += len;
        }
        return buf;
    }

    decode(data: Buffer){
        // simple:
        if (this._status === ST_ERROR) {
//            throw new Error('compose in error state, reset it first');
            this._receiver.emit('msg_err',new Error('status error.'));
        }

        let offset = 0;
        let end = data.length;
        while (offset < end) {
            if (this._status === ST_READ_LENGTH) {
                offset = this._readLength(data, offset, end);
            }

            if (this._status === ST_READ_DATA) {
                offset = this._readData(data, offset, end);
            }

            if (this._status === ST_ERROR) {
                break;
            }
        }

    }

    encode(data:Array<Buffer>):Buffer{
        let pkgLen =0 ;
        data.forEach( (buf)=>{
            pkgLen += buf.length;

        })
        pkgLen += data.length*2; // header length
        pkgLen += 4; //msg length;

        if( pkgLen > this._maxMsgLen ){
            //to do . error.
            console.log(` msg+head is ${pkgLen} larger than ${this._maxMsgLen} `,);
            return null;
        }

        let buf = Buffer.alloc(pkgLen);
        buf.writeUInt32BE( pkgLen-4,0);

        let offset = 4 ;
        for (let idx=0; idx < data.length ; idx++) {
            buf.writeUInt16BE(data[idx].length, offset);
            offset += 2;
            buf.set(data[idx], offset);
            offset += data[idx].length;
        }
        return buf;
    }
}

export { Coder,Coder_v1};