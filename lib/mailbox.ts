
import {Session} from './session'
import {NetEngine} from './net-engine'


class QueueNode{
    public data:any;
    public next:QueueNode;
    constructor(data){
        this.data = data;
        this.next = null;
    }
}

class Queue{
    private head:QueueNode;
    private tail:QueueNode;
    public  _count:number;
    get count(){
        return this._count;
    }
    constructor(){
        this.head =  this.tail = null;
        this._count = 0;
    }
    getHead():QueueNode{
        return this.head;
    }
    add( node:QueueNode){
       if(this.head == null ) {
           this.head = this.tail =  node;
       }else{
           this.tail.next = node;
           node.next = null;
           this.tail = node;
       }
       this._count++;
    }
    remove(){
        if( this.head != null ){
            this.head = this.head.next;
            if(this.head == null ){
                this.tail = null;
            }
            this._count--;
        }
    }
}

class Mailbox{
    private _inputQ: Array< Array<Buffer>> ;
    private _outputQ: Array< Array<Buffer>> ;

    private _maxInputQLen:number;
    private _maxOutputQLen:number;

    private _netEngine:NetEngine;
    private _session:Session;
    private _sending:boolean;
    constructor(session:Session, netEngine:NetEngine, maxInputQLen:number = 0, maxOutputQLen:number=0){

        let self = this;
        this._maxInputQLen = maxInputQLen;
        this._maxOutputQLen = maxOutputQLen;
        this._inputQ = new Array< Array<Buffer> >();
        this._outputQ= new Array< Array<Buffer> >();
        this._session = session;
        this._session.setMailBox(this);
        this.netEngine = netEngine;
        this._sending = false;

    }
    get netEngine():NetEngine{
        return this._netEngine; 
    }
    set netEngine(netEngine:NetEngine){
        if( !this._netEngine && !!netEngine ){
            this._netEngine = netEngine
            this._netEngine.on('msg',this.recv.bind(this) );

            this._netEngine.on('close',(err)=>{
                this._session.onClose(err);
            });
            this.queueSend();
        }    
    }
    private queueSend(){
        let self=this; 
//        let node= this._outputQ.getHead();

        if( this._outputQ.length > 0  && this._sending == false && self._netEngine != null ){
            this._sending = true;
            let output = this._outputQ;
            this._outputQ = [];
            let count = 0;

            for (let idx = 0; idx < output.length ; idx++) {
                self._netEngine.send(output[idx], () => {
                    count++;
                    if( count == output.length ){
                        this._sending = false;
                        this.queueSend();
                    }
                })
            }
        }
    }
    private queueRecv(){
        let self=this; 
        let queue = this._inputQ;
        if( queue.length > 0 && self._netEngine != null ) {
            this._inputQ = [];
            let count=0; 
            for( let idx=0; idx<queue.length;idx++){
                self._session.recv( queue[idx],()=>{
                    count++;
                    if( count == queue.length ){
                        self.queueRecv();
                    }
                }) 
            }

        }
        
   }
    send(data:Array<Buffer>):boolean {
       /* if(this._maxOutputQLen == 0  ){
            this._netEngine.send(data);
            return true;
        }else 
        */
        if(this._maxOutputQLen <= this._outputQ.length ){
            //to do. logger.
            return false;
        }else{
            this._outputQ.push( data );
            if( this._outputQ.length == 1 ){
                this.queueSend( )
            }
            return true;
        }
    }

    recv(data:Array<Buffer>):boolean{
        console.log("mailbox recv:",data);
        if( this._maxInputQLen == 0 ){
            this._session.recv( data );
            return true;
        }else if(this._maxInputQLen <= this._inputQ.length){
            //to do.logger;
            console.error(` recv too much data:maxLen:${this._maxInputQLen} `)
            return false;
        }else{
            this._inputQ.push( data );
            if( this._inputQ.length == 1){
                this.queueRecv();
            }
        }
    }
}

export {Mailbox};